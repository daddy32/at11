import cheerio from "cheerio";

import { IMenuItem } from "../IMenuItem";
import { IParser } from "../IParser";
import { format } from "date-fns";
import { sk } from "date-fns/locale";

export class Bigger implements IParser {
    public parse(html: string, date: Date, doneCallback: (menu: IMenuItem[]) => void): void {
        const $ = cheerio.load(html);
        const dayMenu = new Array<IMenuItem>();
        const junkPattern = /hranolky|polievka|Podľa dennej ponuky/i;
        const junkPattern2 = /[A-Z]\d*:/g;
        const mainCoursesPattern = "section .elementor-col-100 .elementor-widget-container p strong";

        // console.log("Parsing Bigger.");
        // console.log("   date:" + date);

        const foundElements = $(mainCoursesPattern);
        // console.log("   foundElements: " + foundElements.length);

        foundElements.each((i, elem) => {
            const node = $(elem);
            const text = node.text().trim();//.toLowerCase()
            // console.log("       text:" + text);

            if (!(junkPattern.test(text))) {
                const textNodes = node.parent().contents().filter(function() {
                    return this.nodeType === 3 && $(this).parent().is('p');
                });

                const descText = textNodes.text().trim();
                // console.log(`       desc: "${descText}"`);

                dayMenu.push({
                    isSoup: false,
                    text: normalize(text) + " <small>(" + normalize(descText) + ")</small>",
                    price: NaN
                });
            }
        });

        doneCallback(dayMenu);

        function normalize(str: string) {
            return str.removeAlergens()
                .removeMetrics()
                .replace(junkPattern2, "")
                .trim()
                .capitalizeFirstLetter();
        }
    }
 }