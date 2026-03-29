import * as cheerio from "cheerio";
import type { Element } from "domhandler";

import { IMenuItem } from "../IMenuItem";
import { IParser } from "../IParser";
import { getDateRegex, parsePrice } from "../parserUtil";

interface IMenuRow {
    text: string;
    price: number;
}

export class Dock7 implements IParser {
    public parse(html: string, date: Date, doneCallback: (menu: IMenuItem[]) => void): void {
        if (!html || typeof html !== "string") {
            doneCallback([]);
            return;
        }

        const $ = cheerio.load(html);
        const currentDay = this.findCurrentDay($, date);
        if (!currentDay) {
            doneCallback([]);
            return;
        }

        const rows = this.collectRows($, currentDay);
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

    private buildMenu(rows: IMenuRow[]): IMenuItem[] {
        const menu: IMenuItem[] = [];
        let currentItem: IMenuItem | undefined;

        const flushCurrentItem = () => {
            if (!currentItem) {
                return;
            }

            currentItem.text = currentItem.text
                .normalizeWhitespace()
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
            const hasPrice = !Number.isNaN(row.price);

            if (hasPrice && !isSoup) {
                flushCurrentItem();
                currentItem = {
                    text: row.text,
                    price: row.price,
                    isSoup: false
                };
                return;
            }

            if (isSoup && currentItem && !currentItem.isSoup) {
                flushCurrentItem();
                currentItem = {
                    text: row.text,
                    price: hasPrice ? row.price : NaN,
                    isSoup: true
                };
                return;
            }

            if (isSoup && !currentItem) {
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
                    isSoup
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
