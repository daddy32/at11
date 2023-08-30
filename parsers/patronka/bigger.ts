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
        const mainCoursesPattern =
            "section .elementor-top-column[data-settings]   .elementor-widget-container p strong, " +
            "section .elementor-col-100                     .elementor-widget-container p strong";

        // console.log("Parsing Bigger.");
        // console.log("   date:" + date);

        const foundElements = $(mainCoursesPattern);
        // console.log("   foundElements: " + foundElements.length);

        foundElements.each((i, elem) => {
            const node = $(elem);
            var text = node.text().trim();//.toLowerCase()
            // console.log("       text:" + text);

            if (!(junkPattern.test(text)) && text !== '') {
                var textNodes = extractDescNodes(node.parent());
                if (textNodes.length == 0 || textNodes.text().trim() == "") {
                    // console.log("           Desc nodes not found, trying again.")
                    textNodes = extractDescNodes(node.parent().add(node.parent().next('p')));
                    if (textNodes.length == 0 || textNodes.text().trim() == "") {
                        // console.log("               Desc nodes still not found, trying yet again.")
                        const secondP = node.parent().parent().parent().next('div').find('p');
                        // console.log(secondP);
                        textNodes = extractDescNodes(secondP);
                    }
                }

                const descText = textNodes.text().trim();
                text = normalize(text)
                // console.log(`       text: "${text}"`);
                // console.log(`       desc: "${descText}"`);

                if (text!=='') {
                    dayMenu.push({
                        isSoup: false,
                        text: text + " <small>(" + normalize(descText) + ")</small>",
                        price: NaN
                    });
                } else {
                    // console.log(`           Empty text => skipping.`);
                }
            } else {
                // console.log(`           => junk.`);
            }
            // console.log(`----------------------------`)
        });

        doneCallback(dayMenu);

        function extractDescNodes(parent: cheerio.Cheerio) {
            return parent.contents().filter(function() {
                return this.nodeType === 3 && $(this).parent().is('p');
            });
        }

        function normalize(str: string): string {
            return str.removeAlergens()
                .removeMetrics()
                .replace(junkPattern2, "")
                .trim()
                .capitalizeFirstLetter();
        }
    }
 }