import axios from "axios";
import * as cheerio from "cheerio";
import type { Element } from "domhandler";
import pdf from "pdf-parse";

import { IMenuItem } from "../IMenuItem";
import { IParser } from "../IParser";
import { getDateRegex, parsePrice } from "../parserUtil";

interface IMenuRow {
    text: string;
    price: number;
    isSoup?: boolean;
}

export class Dock7 implements IParser {
    public parse(
        html: string,
        date: Date,
        doneCallback: (menu: IMenuItem[]) => void,
        errorCallback?: (error: Error) => void
    ): void {
        if (!html || typeof html !== "string") {
            doneCallback([]);
            return;
        }

        const $ = cheerio.load(html);
        const officialPdfHref = $("a[title='Týždenná ponuka'][href]").first().attr("href");
        if (officialPdfHref) {
            const pdfUrl = new URL(officialPdfHref, "https://www.dock7.sk/menu/").toString();
            void this.parseOfficialWeeklyPdf(pdfUrl, date)
                .then(doneCallback)
                .catch(error => {
                    if (errorCallback) {
                        errorCallback(error instanceof Error ? error : new Error(String(error)));
                    } else {
                        console.error("Could not parse Dock7 weekly PDF:", error);
                        doneCallback([]);
                    }
                });
            return;
        }

        const currentDay = this.findCurrentDay($, date);
        const rows = currentDay
            ? this.collectRows($, currentDay)
            : this.collectWeeklyRows($, date);
        const menu = this.buildMenu(rows);
        doneCallback(menu);
    }

    private async parseOfficialWeeklyPdf(pdfUrl: string, date: Date): Promise<IMenuItem[]> {
        const response = await axios.get<ArrayBuffer>(pdfUrl, { responseType: "arraybuffer", timeout: 15000 });
        const rawText = (await pdf(Buffer.from(response.data))).text;
        const year = Number(pdfUrl.match(/(?:19|20)\d{2}(?!\d)/g)?.pop());
        const range = rawText.match(/^(\d{1,2})\.(\d{1,2})\.\s*[-–]\s*(\d{1,2})\.(\d{1,2})\./m);

        if (!year || !range) {
            return [];
        }

        const startMonth = Number(range[2]);
        const endMonth = Number(range[4]);
        const start = new Date(startMonth > endMonth ? year - 1 : year, startMonth - 1, Number(range[1]));
        const end = new Date(year, endMonth - 1, Number(range[3]));
        const requested = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        if (requested < start || requested > end) {
            return [];
        }

        const lines = rawText
            .replace(/(\d+),\s*(\d{2})\s*€/g, "$1,$2 €")
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(Boolean);
        const soupIndex = lines.findIndex(line => /^POLIEVKA\s*\|\s*SOUP$/i.test(line));
        const mainsIndex = lines.findIndex(line => /^HLAVNÉ JEDLÁ\s*\|\s*MAIN COURSES$/i.test(line));
        if (soupIndex < 0 || mainsIndex <= soupIndex) {
            return [];
        }

        const menu: IMenuItem[] = [];
        const cleanTitle = (title: string) => title
            .replace(/\[[^\]]+\]/g, " ")
            .replace(/\b\d+(?:[.,]\d+)?\s*(?:g|ml|l)\b/gi, " ")
            .replace(/\|/g, " ")
            .normalizeWhitespace();
        const soupPriceText = lines.slice(soupIndex + 1, mainsIndex).join("\n")
            .match(/samostatne\b[\s\S]*?(\d+,\d{2}\s*€)/i)?.[1];
        const descriptionAfter = (index: number) => {
            const description: string[] = [];
            for (let next = index + 1; next < lines.length && /^\p{Ll}/u.test(lines[next]); next += 1) {
                description.push(lines[next]);
            }
            return description.join(" ");
        };
        const soupTitle = cleanTitle(`${lines[soupIndex + 1]} ${descriptionAfter(soupIndex + 1)}`);
        const soupPrice = parsePrice(soupPriceText || "").price;
        if (soupTitle && Number.isFinite(soupPrice)) {
            menu.push({ text: soupTitle, price: soupPrice, isSoup: true });
        }

        for (let index = mainsIndex + 1; index < lines.length; index += 1) {
            const line = lines[index];
            const match = line.match(/^(.+?)\s+(\d+,\d{2}\s*€)$/);
            if (!match) {
                continue;
            }

            const title = cleanTitle(`${match[1]} ${descriptionAfter(index)}`);
            const price = parsePrice(match[2]).price;
            if (title && Number.isFinite(price)) {
                menu.push({ text: title, price, isSoup: false });
            }
        }

        return menu;
    }

    private findCurrentDay($: cheerio.CheerioAPI, date: Date): cheerio.Cheerio<Element> | undefined {
        const dateRegex = getDateRegex(date);
        let currentDay: cheerio.Cheerio<Element> | undefined;

        $(".day-title").each((_i, elem) => {
            const node = $(elem);
            const dateText = node.text().trim();
            const parenMatch = dateText.match(/\(([\d.\s]+)\)/);
            const dateToTest = parenMatch ? parenMatch[1] : dateText;

            if (dateRegex.test(dateToTest)) {
                currentDay = node;
                return false;
            }

            return undefined;
        });

        return currentDay;
    }

    private collectRows($: cheerio.CheerioAPI, currentDay: cheerio.Cheerio<Element>): IMenuRow[] {
        const rows: IMenuRow[] = [];
        let textNode = currentDay.parent().next();

        while (textNode.length) {
            if (textNode.find(".day-title").length > 0) {
                break;
            }

            if (textNode.hasClass("col-xs-10") && textNode.hasClass("col-sm-10")) {
                const priceNode = textNode.next();
                const text = textNode.text().replace(/\u00a0/g, " ").trim();
                const priceText = priceNode.text().replace(/\u00a0/g, " ").trim();
                const { price } = parsePrice(priceText);

                rows.push({ text, price });
                textNode = priceNode.next();
                continue;
            }

            textNode = textNode.next();
        }

        return rows;
    }

    private collectWeeklyRows($: cheerio.CheerioAPI, date: Date): IMenuRow[] {
        const weeklyOffer = $(".continuing-offer-block").filter((_i, elem) => {
            const title = $(elem).find(".continuing-offer-title").text().trim();
            return this.weeklyOfferIncludesDate(title, date);
        }).first();

        if (!weeklyOffer.length) {
            return [];
        }

        const rows: IMenuRow[] = [];
        let currentText = "";
        let sectionKind: boolean | undefined;
        const line = weeklyOffer.find(".continuing-offer-line").first();

        const flushText = (price: number = Number.NaN) => {
            const text = this.normalizeWeeklyText(currentText);
            currentText = "";

            if (!text) {
                return;
            }

            if (/^polievka$/i.test(text)) {
                sectionKind = true;
                return;
            }

            if (/^hlavn[eé]\s+jedl[aá]$/i.test(text)) {
                sectionKind = false;
                return;
            }

            if (/s hlavným jedlom/i.test(text)) {
                return;
            }

            rows.push({ text, price, isSoup: sectionKind });
        };

        line.contents().each((_i, elem) => {
            if (elem.type === "tag" && $(elem).is("#cena")) {
                flushText(parsePrice($(elem).text().trim()).price);
                return;
            }

            if (elem.type === "tag" && elem.name === "br") {
                flushText();
                return;
            }

            if (elem.type === "text") {
                currentText += elem.data;
            }
        });

        flushText();
        return rows;
    }

    private weeklyOfferIncludesDate(title: string, date: Date): boolean {
        const rangeMatch = title.match(/(\d{1,2})\.\s*-\s*(\d{1,2})\.(\d{1,2})\.(\d{4})/);
        if (rangeMatch) {
            const startDay = Number.parseInt(rangeMatch[1], 10);
            const endDay = Number.parseInt(rangeMatch[2], 10);
            const month = Number.parseInt(rangeMatch[3], 10);
            const year = Number.parseInt(rangeMatch[4], 10);
            return date.getFullYear() === year
                && date.getMonth() + 1 === month
                && date.getDate() >= startDay
                && date.getDate() <= endDay;
        }

        return getDateRegex(date).test(title);
    }

    private normalizeWeeklyText(text: string): string {
        return text
            .replace(/\s+/g, " ")
            .trim()
            .replace(/\s+[–-]\s*$/, "")
            .replace(/\s+[–-]\s*(?:\d+\s*[a-zA-Z]+(?:\s*\/\s*\d+\s*[a-zA-Z]+)?|\d+\s*\/\s*\d+\s*[a-zA-Z]+)$/, "");
    }

    private buildMenu(rows: IMenuRow[]): IMenuItem[] {
        const menu: IMenuItem[] = [];
        let currentItem: IMenuItem | undefined;
        let sectionKind: boolean | undefined;

        const flushCurrentItem = () => {
            if (!currentItem) {
                return;
            }

            currentItem.text = currentItem.text
                .replace(/\[\s*\*\s*[\d,\s]+\]/g, " ")
                .replace(/\s*\|\s*/g, " ")
                .normalizeWhitespace()
                .replace(/\s+[–-]\s*$/, "")
                .removeAlergens()
                .removeMetrics()
                .replace(/[, ]+$/, "")
                .capitalizeFirstLetter();

            if (currentItem.text) {
                menu.push(currentItem);
            }

            currentItem = undefined;
        };

        rows.forEach(row => {
            if (!row.text) {
                return;
            }

            if (/^polievka$/i.test(row.text)) {
                sectionKind = true;
                return;
            }

            if (/^hlavn[eé]\s+jedl[aá]$/i.test(row.text)) {
                sectionKind = false;
                return;
            }

            if (/s hlavným jedlom/i.test(row.text)) {
                return;
            }

            if (/v tento deň sa denné menu nepodáva/i.test(row.text)) {
                flushCurrentItem();
                return;
            }

            if (/^s denným menu$/i.test(row.text)) {
                return;
            }

            if (/^samostatne$/i.test(row.text)) {
                if (currentItem && Number.isNaN(currentItem.price) && !Number.isNaN(row.price)) {
                    currentItem.price = row.price;
                }
                return;
            }

            const isSoup = /polievka|krém|vývar/i.test(row.text);
            const itemIsSoup = row.isSoup ?? sectionKind ?? isSoup;
            const hasPrice = !Number.isNaN(row.price);

            if (hasPrice && !itemIsSoup) {
                flushCurrentItem();
                currentItem = {
                    text: row.text,
                    price: row.price,
                    isSoup: false
                };
                return;
            }

            if (itemIsSoup && currentItem && !currentItem.isSoup) {
                flushCurrentItem();
                currentItem = {
                    text: row.text,
                    price: hasPrice ? row.price : NaN,
                    isSoup: true
                };
                return;
            }

            if (itemIsSoup && !currentItem) {
                currentItem = {
                    text: row.text,
                    price: hasPrice ? row.price : NaN,
                    isSoup: true
                };
                return;
            }

            if (!currentItem) {
                currentItem = {
                    text: row.text,
                    price: hasPrice ? row.price : NaN,
                    isSoup: itemIsSoup
                };
                return;
            }

            currentItem.text += ` ${row.text}`;
            if (Number.isNaN(currentItem.price) && hasPrice) {
                currentItem.price = row.price;
            }
        });

        flushCurrentItem();

        return menu;
    }
}
