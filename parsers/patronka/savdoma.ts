import cheerio from "cheerio";

import { IMenuItem } from "../IMenuItem";
import { IParser } from "../IParser";
import { format } from "date-fns";
import { sk } from "date-fns/locale";

export class SavDoma implements IParser {
    public parse(html: string, date: Date, doneCallback: (menu: IMenuItem[]) => void): void {
        const $ = cheerio.load(html);
        const dayMenu = new Array<IMenuItem>();

        var menuItemSelector = "div.mt div.mt-i-c";
        var itemTextSelector = ">div:nth-of-type(1)";
        var itemPriceSelector = ">div:nth-of-type(2)";

        var alergPattern = /\/*\s*\/(\s*\d\s?[.,]?\s?)+\/\s*/g;
        var junkPattern = /^\d\s*\.*\s*/;

        //console.log("Parsing SAV.");
        //console.log("   date:" + date);
        var foundElements = $(menuItemSelector);
        //console.log("   foundElements: " + foundElements.length);

        foundElements.each((i, elem) => {
            const node = $(elem);
            var text = node.find(itemTextSelector).text().trim().toLowerCase();
            var price = parseFloat(node.find(itemPriceSelector).text().replace(',', '.').replace('€',''));
            //console.log("       text:" + text);
            //console.log("       price:" + price);

            dayMenu.push({
                isSoup: i === 0,
                text: normalize(text),
                price: price
            });
        });

        doneCallback(dayMenu);

        function normalize(str: string) {
            return str
                .replace(alergPattern, '')
                .replace(junkPattern, '')
                .removeMetrics()
                .capitalizeFirstLetter();
        }
    }
 }