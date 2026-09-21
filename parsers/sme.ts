import * as cheerio from "cheerio";

import { IMenuItem } from "./IMenuItem";
import { getDateRegex, parsePrice } from "./parserUtil";

type ExpectedKind = "soup" | "main" | undefined;

export const SME_PDF_TEXT_PREFIX = "SME_PDF_TEXT:\n";

export abstract class Sme {
    protected parseBase(html: string, date: Date): IMenuItem[] {
        if (!html || typeof html !== "string") {
            console.error("[Sme parser] Provided HTML is not a string or is undefined.");
            return [];
        }

        if (html.startsWith(SME_PDF_TEXT_PREFIX)) {
            return this.parsePdfText(html.slice(SME_PDF_TEXT_PREFIX.length), date);
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

    private parsePdfText(text: string, date: Date): IMenuItem[] {
        const lines = text
            .split(/\r?\n/)
            .map(line => line.normalizeWhitespace())
            .filter(Boolean);
        const dateRegex = getDateRegex(date);
        const dayHeaderIndexes = lines
            .map((line, index) => this.isPdfDayHeader(line) ? index : -1)
            .filter(index => index >= 0);
        const startIndex = dayHeaderIndexes.find(index => dateRegex.test(lines[index]));

        if (startIndex === undefined) {
            return [];
        }

        const nextDayIndex = dayHeaderIndexes.find(index => index > startIndex);
        const endIndex = nextDayIndex === undefined ? lines.length : nextDayIndex;
        const items: IMenuItem[] = [];
        let expectedKind: ExpectedKind;
        let currentItem: IMenuItem | undefined;

        for (const line of lines.slice(startIndex + 1, endIndex)) {
            if (this.isPdfMetadata(line)) {
                continue;
            }

            if (this.isSoupHeading(line)) {
                expectedKind = "soup";
                currentItem = undefined;
                continue;
            }

            if (this.isMainHeading(line)) {
                expectedKind = "main";
                currentItem = undefined;
                continue;
            }

            const parsed = parsePrice(line);
            if (!parsed.text) {
                if (currentItem && !Number.isNaN(parsed.price)) {
                    currentItem.price = parsed.price;
                }
                continue;
            }

            const normalizedText = this.normalize(parsed.text);
            if (!normalizedText) {
                continue;
            }

            const inlineKind = this.getInlineItemKind(line);
            if (inlineKind || expectedKind) {
                currentItem = {
                    text: normalizedText,
                    price: parsed.price,
                    isSoup: (inlineKind || expectedKind) === "soup"
                };
                items.push(currentItem);
                expectedKind = undefined;
                continue;
            }

            if (currentItem && Number.isNaN(parsed.price)) {
                currentItem.text = this.normalize(`${currentItem.text} ${normalizedText}`);
                continue;
            }

            currentItem = {
                text: normalizedText,
                price: parsed.price,
                isSoup: false
            };
            items.push(currentItem);
        }

        return items.filter(item => item.text.length > 0);
    }

    private isPdfDayHeader(text: string): boolean {
        return /^(pondelok|utorok|streda|štvrtok|piatok|sobota|nedeľa)\s+\d{1,2}\.\d{1,2}\.\d{4}$/i.test(text);
    }

    private isPdfMetadata(text: string): boolean {
        return /^(?:prajeme vám dobrú chuť|www\.restauracie\.sk|vytvorené dňa|obedové menu|cena\b|daily chef's special\b)/i.test(text);
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
