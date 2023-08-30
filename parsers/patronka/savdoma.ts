import cheerio from "cheerio";

import { IMenuItem } from "../IMenuItem";
import { IParser } from "../IParser";
import { format } from "date-fns";
import { sk } from "date-fns/locale";

export class SavDoma implements IParser {
    public parse(html: string, date: Date, doneCallback: (menu: IMenuItem[]) => void): void {
        const $ = cheerio.load(html);
        const dayMenu = new Array<IMenuItem>();

        const menuItemSelector = "div.mt div.mt-i-c";
        const itemTextSelector = ">div:nth-of-type(1)";
        const itemPriceSelector = ">div:nth-of-type(2)";

        const alergPattern = /\/*\s*\/(\s*\d\s?[.,]?\s?)+\/\s*/g;
        const junkPattern = /^\d\s*\.*\s*/;
        const junkPattern2 = /0g \/\/|0,33l \/\//;

        // console.log("Parsing SAV.");
        // console.log("   date:" + date);
        const foundElements = $(menuItemSelector);
        // console.log("   foundElements: " + foundElements.length);

        foundElements.each((i, elem) => {
            const node = $(elem);
            const text = node.find(itemTextSelector).text().trim().toLowerCase();
            const price = parseFloat(node.find(itemPriceSelector).text().replace(",", ".").replace("€",""));
            // console.log("       text:" + text);
            // console.log("       price:" + price);

            if (junkPattern2.test(text)) {
                // console.log("           Junk");
                return;
            } else {
                dayMenu.push({
                    isSoup: i === 0,
                    text: normalize(text),
                    price: price
                });
            }
        });

        doneCallback(dayMenu);

        function normalize(str: string) {
            return str
                .replace(alergPattern, "")
                .replace(junkPattern, "")
                .removeMetrics()
                .capitalizeFirstLetter();
        }
    }
 }