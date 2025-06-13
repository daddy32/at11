import type { Cheerio } from "cheerio";
import type { Element } from "domhandler";
import * as cheerio from "cheerio";

import { IMenuItem } from "../IMenuItem";
import { IParser } from "../IParser";
import { format } from "date-fns";
import { sk } from "date-fns/locale";

export class Foodseason implements IParser {
    public parse(html: string, date: Date, doneCallback: (menu: IMenuItem[]) => void): void {
        const $ = cheerio.load(html);
        const dayMenu = new Array<IMenuItem>();

        const dayElements = $("h3.av-special-heading-tag");
        const targetDayName = format(date, "EEEE", { locale: sk });

        dayElements.each((i, elem) => {
            const node = $(elem);
            const text = node.text().trim().toLowerCase();

            if (text === targetDayName) {
                // Robust: select next siblings directly after the <h3>
                const soupsNode = node.next();
                const foodsNode = soupsNode.next().next();

                dayMenu.push(...extractItems(soupsNode, true));
                dayMenu.push(...extractItems(foodsNode, false));
            }
        });

        doneCallback(dayMenu);

        function extractItems(element: Cheerio<Element>, areSoups: boolean): Array<IMenuItem> {
            const result = new Array<IMenuItem>();

            element.find("li .av-catalogue-title-container").each((k, soupElem) => {
                const soupNode = $(soupElem);
                const title = soupNode.find(".av-catalogue-title").text();
                const text = soupNode.find(".av-catalogue-price").text();
                const price = parseFloat(text.replace(",", "."));
                //console.info(`title: ${title}; text: ${text}; price: ${price}; `);

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
