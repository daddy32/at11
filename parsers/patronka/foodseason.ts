import cheerio from "cheerio";

import { IMenuItem } from "../IMenuItem";
import { IParser } from "../IParser";
import { format } from "date-fns";
import { sk } from "date-fns/locale";

export class Foodseason implements IParser {
    public parse(html: string, date: Date, doneCallback: (menu: IMenuItem[]) => void): void {
        const $ = cheerio.load(html);
        const dayMenu = new Array<IMenuItem>();

        var dayElements = $("h3.av-special-heading-tag");
        var targetDayName = format(date, "EEEE", { locale: sk });

        dayElements.each((i, elem) => {
            const node = $(elem);
            var text = node.text().trim().toLowerCase()
            text = text.substring(0, text.length - 1);

            if (text === targetDayName) {
                const soupsNode = node.parent().next().next();
                const foodsNode = soupsNode.next().next();

                dayMenu.push(...extractItems(soupsNode, true));
                dayMenu.push(...extractItems(foodsNode, false));
            }
        });

        doneCallback(dayMenu);

        function extractItems(element: Cheerio, areSoups: boolean): Array<IMenuItem> {
            var result = new Array<IMenuItem>();

            element.find('li .av-catalogue-title-container').each((k, soupElem) => {
                const soupNode = $(soupElem);
                const title = soupNode.find('.av-catalogue-title').text();
                const price = parseFloat(soupNode.find('.av-catalogue-price').text());

                result.push({
                    isSoup: areSoups,
                    text: normalize(title),
                    price: price
                });
            });

            return result;
        }

        function normalize(str: string) {
            return str.removeAlergens()
                .removeMetrics()
                .capitalizeFirstLetter();
        }
    }
 }