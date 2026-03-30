import * as cheerio from "cheerio";

import { IMenuItem } from "../IMenuItem";
import { IParser } from "../IParser";
import { getDateRegex, parsePrice } from "../parserUtil";

type ExpectedKind = "soup" | "main" | undefined;

export class KolkovnaEurovea implements IParser {
    public parse(html: string, date: Date, doneCallback: (menu: IMenuItem[]) => void): void {
        const rows = this.collectRows(html, date);
        const menu: IMenuItem[] = [];
        let expectedKind: ExpectedKind;
        let currentItem: IMenuItem | undefined;

        rows.forEach(row => {
            const text = row.normalizeWhitespace();
            if (!text || this.isDateRow(text)) {
                return;
            }

            if (/^denn[áa] polievka$/i.test(text)) {
                expectedKind = "soup";
                currentItem = undefined;
                return;
            }

            if (/^jedlo d[ňn]a/i.test(text)) {
                expectedKind = "main";
                currentItem = undefined;
                return;
            }

            const parsed = parsePrice(text);
            const normalizedText = this.normalizeDishText(parsed.text || text);
            const parsedPrice = parsed.price;

            if (!normalizedText && !Number.isNaN(parsedPrice) && currentItem) {
                currentItem.price = parsedPrice;
                return;
            }

            if (expectedKind) {
                currentItem = {
                    text: normalizedText,
                    price: parsedPrice,
                    isSoup: expectedKind === "soup"
                };
                menu.push(currentItem);
                expectedKind = undefined;
                return;
            }

            if (currentItem && !Number.isNaN(parsedPrice)) {
                currentItem.price = parsedPrice;
            }
        });

        doneCallback(menu.filter(item => item.text.length > 0));
    }

    private collectRows(html: string, date: Date): string[] {
        if (!html || typeof html !== "string") {
            return [];
        }

        const $ = cheerio.load(html);
        const dateRegex = getDateRegex(date);
        const currentMenu = $(".dnesne_menu, .ostatne_menu").filter((_i, elem) => {
            const heading = $(elem).find("h2").text();
            return dateRegex.test(heading);
        }).first();

        return currentMenu.find(".jedlo_polozka .left").toArray()
            .map(elem => $(elem).text().replace(/\s+/g, " ").trim());
    }

    private isDateRow(text: string): boolean {
        return /^\d{1,2}\.\d{1,2}\.\d{4}$/.test(text);
    }

    private normalizeDishText(text: string): string {
        return text
            .replace(/\s*[\|I/]\s*\d{1,2}(?:\s*,\s*\d{1,2})*[\|I/]\s*$/g, "")
            .replace(/\s+\d{1,2}(?:\s*,\s*\d{1,2})+\s*$/g, "")
            .removeMetrics()
            .removeAlergens()
            .normalizeWhitespace()
            .toLocaleLowerCase("sk")
            .capitalizeFirstLetter();
    }
}
