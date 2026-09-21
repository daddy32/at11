import * as cheerio from "cheerio";
import type { Element } from "domhandler";

import { IMenuItem } from "../IMenuItem";
import { IParser } from "../IParser";
import { getDateRegex, parsePrice } from "../parserUtil";

interface IMenuRow {
    text: string;
    price: number;
    isSoup?: boolean;
}

export class Dock7 implements IParser {
    public parse(html: string, date: Date, doneCallback: (menu: IMenuItem[]) => void): void {
        if (!html || typeof html !== "string") {
            doneCallback([]);
            return;
        }

        const $ = cheerio.load(html);
        const currentDay = this.findCurrentDay($, date);
        const rows = currentDay
            ? this.collectRows($, currentDay)
            : this.collectWeeklyRows($, date);
        const menu = this.buildMenu(rows);
        doneCallback(menu);
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
