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
        const soupCandidatesPattern = ".menu-list__item-desc .desc__content";
        const mainCoursesPattern = ".menu-list__item h4.menu-list__item-title";

        //console.log("Parsing Bigger.");
        //console.log("   date:" + date);

        const targetDayName = format(date, "EEEE", { locale: sk });
        //console.log("   targetDayName:" + targetDayName);

        // TODO: Polievka
        const soupCandidates = $(soupCandidatesPattern);
        //console.log("   soupCandidates: " + soupCandidates.length);

        soupCandidates.each((i, elem) => {
            const node = $(elem);
            let text = node.text().trim();
            //console.log("       text:" + text);

            if (text.toLowerCase().startsWith(targetDayName)) {
                //console.log("           hit");
                text = text.substring(targetDayName.length + 2);
                dayMenu.push({
                    isSoup: true,
                    text: normalize(text),
                    price: NaN
                });
            }
        });

        const foundElements = $(mainCoursesPattern);
        //console.log("   foundElements: " + foundElements.length);

        foundElements.each((i, elem) => {
            const node = $(elem);
            const text = node.text().trim();//.toLowerCase()
            //console.log("       text:" + text);

            if (!(junkPattern.test(text))) {
                const descNode = node.next();
                const descText = descNode.text();
                //console.log("       desc:" + descText);

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