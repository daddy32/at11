import * as cheerio from "cheerio";

import { IMenuItem } from "./IMenuItem";
import { getDateRegex, parsePrice } from "./parserUtil";

type ExpectedKind = "soup" | "main" | undefined;

export abstract class Sme {
    protected parseBase(html: string, date: Date): IMenuItem[] {
        if (!html || typeof html !== "string") {
            console.error("[Sme parser] Provided HTML is not a string or is undefined.");
            return [];
        }

        try {
            const $ = cheerio.load(html);
            const dateRegex = getDateRegex(date);
            const currentMenu = $(".dnesne_menu, .ostatne_menu").filter((_i, elem) => {
                const heading = $(elem).find("h2").text();
                return dateRegex.test(heading);
            }).first();

            const items: IMenuItem[] = [];
            let expectedKind: ExpectedKind;
            let currentItem: IMenuItem | undefined;

            currentMenu.find(".jedlo_polozka").each((_i, elem) => {
                const leftText = $(".left", elem).text().replace(/\s+/g, " ").trim();
                const rightText = $(".right", elem).text().replace(/\s+/g, " ").trim();
                const rowText = [leftText, rightText].filter(Boolean).join(" ").trim();

                if (!rowText || this.isDateRow(rowText)) {
                    return;
                }

                if (this.isSoupHeading(rowText)) {
                    expectedKind = "soup";
                    currentItem = undefined;
                    return;
                }

                if (this.isMainHeading(rowText)) {
                    expectedKind = "main";
                    currentItem = undefined;
                    return;
                }

                const parsed = parsePrice(rowText);
                const parsedPrice = this.parseRowPrice(parsed.price, rightText, rowText);
                const normalizedSourceText = parsed.text.length > 0 || Number.isNaN(parsedPrice)
                    ? (parsed.text || rowText)
                    : parsed.text;
                const normalizedText = this.normalize(normalizedSourceText);

                const inlineKind = this.getInlineItemKind(rowText);
                if (inlineKind && normalizedText) {
                    currentItem = {
                        text: normalizedText,
                        price: parsedPrice,
                        isSoup: inlineKind === "soup"
                    };
                    items.push(currentItem);
                    expectedKind = undefined;
                    return;
                }

                if (!normalizedText && !Number.isNaN(parsedPrice) && currentItem) {
                    currentItem.price = parsedPrice;
                    return;
                }

                if (expectedKind && normalizedText) {
                    currentItem = {
                        text: normalizedText,
                        price: parsedPrice,
                        isSoup: expectedKind === "soup"
                    };
                    items.push(currentItem);
                    expectedKind = undefined;
                    return;
                }

                if (normalizedText) {
                    currentItem = {
                        text: normalizedText,
                        price: parsedPrice,
                        isSoup: false
                    };
                    items.push(currentItem);
                }
            });

            return items.filter(item => item.text.length > 0);
        } catch (error) {
            console.error("[Sme parser] Error during Cheerio parsing:", error);
            return [];
        }
    }

    private normalize(str: string): string {
        return str.normalizeWhitespace()
            .replace(/\s*[|I/]\s*\d{1,2}(?:\s*,\s*\d{1,2})*[|I/]\s*$/g, "")
            .replace(/^\s*[|I/]\s*\d{1,2}(?:\s*,\s*\d{1,2})*[|I/]\s*$/g, "")
            .removeMetrics()
            .removeItemNumbering()
            .capitalizeFirstLetter()
            .removeAlergens()
            .replace(/\s*€\s*$/g, "")
            .normalizeWhitespace();
    }

    private parseRowPrice(parsedPrice: number, rightText: string, rowText: string): number {
        if (!Number.isNaN(parsedPrice)) {
            return parsedPrice;
        }

        const numericRightPrice = parseFloat(rightText.replace(",", "."));
        if (!Number.isNaN(numericRightPrice)) {
            return numericRightPrice;
        }

        const numericRowMatch = rowText.match(/^\d+(?:[.,]\d+)?$/);
        if (numericRowMatch) {
            return parseFloat(numericRowMatch[0].replace(",", "."));
        }

        return parsedPrice;
    }

    private isDateRow(text: string): boolean {
        return /^\d{1,2}\.\d{1,2}\.\d{4}$/.test(text);
    }

    private isSoupHeading(text: string): boolean {
        return /^(denn\S*\s+polievka|polievka)$/i.test(text);
    }

    private isMainHeading(text: string): boolean {
        return /^(hlavn\S*\s+jedlo|jedlo d\S*a(?:\s+č\.\d+)?)$/i.test(text);
    }

    private getInlineItemKind(text: string): ExpectedKind {
        if (/^polievka\b/i.test(text)) {
            return "soup";
        }

        if (/^jedlo (?:č\.\d+|d[ňn]a\b)/i.test(text)) {
            return "main";
        }

        return undefined;
    }
}
