import * as cheerio from "cheerio";

import { IMenuItem } from "../IMenuItem";
import { IParser } from "../IParser";
import { format } from "date-fns";
import { sk } from "date-fns/locale";

export class SavDoma implements IParser {
    public parse(html: string, date: Date, doneCallback: (menu: IMenuItem[]) => void): void {
        const $ = cheerio.load(html);
        const dayMenu = new Array<IMenuItem>();

        // Try new structure first (menucka.sk real data)
        const textNodes = $("div.col-xs-10.col-sm-10");
        const priceNodes = $("div.col-xs-2.col-sm-2.price");

        if (textNodes.length > 0 && priceNodes.length > 0 && textNodes.length === priceNodes.length) {
            textNodes.each((i, elem) => {
                let text = $(elem).text().trim().toLowerCase();
                let price = parseFloat($(priceNodes[i]).text().replace(",", ".").replace("€", ""));
                if (!text || !/\w/.test(text)) return;
                dayMenu.push({
                    isSoup: /polievka|vývar|krém|soup/.test(text),
                    text: normalize(text),
                    price: price
                });
            });
        } else {
            // Fallback to old structure
            const menuItemSelector = "div.mt div.mt-i-c";
            const itemTextSelector = ">div:nth-of-type(1)";
            const itemPriceSelector = ">div:nth-of-type(2)";
            const foundElements = $(menuItemSelector);
            foundElements.each((i, elem) => {
                const node = $(elem);
                const text = node.find(itemTextSelector).text().trim().toLowerCase();
                const price = parseFloat(node.find(itemPriceSelector).text().replace(",", ".").replace("€", ""));
                if (!text) return;
                dayMenu.push({
                    isSoup: i === 0,
                    text: normalize(text),
                    price: price
                });
            });
        }

        doneCallback(dayMenu);

        function normalize(str: string) {
            return str
                .replace(/\/*\s*\/(\s*\d\s?[.,]?\s?)+\/\s*/g, "")
                .replace(/^\d\s*\.*\s*/, "")
                .removeMetrics()
                .replace(/ ?\/\/+$/, "") // Remove trailing " //" or similar
                .replace(/[, ]+$/, "") // Remove trailing commas and spaces
                .capitalizeFirstLetter();
        }
    }
}
