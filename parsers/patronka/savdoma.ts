import cheerio from "cheerio";

import { IMenuItem } from "../IMenuItem";
import { IParser } from "../IParser";
import { format } from "date-fns";
import { sk } from "date-fns/locale";

export class SavDoma implements IParser {
    public parse(html: string, date: Date, doneCallback: (menu: IMenuItem[]) => void): void {
        const $ = cheerio.load(html);
        const dayMenu = new Array<IMenuItem>();

        //console.log("Parsing SAV.");
        //console.log("   date:" + date);
        var foundElements = $(".section-inner .mt-price .mt-border");
        //console.log("   foundElements: " + foundElements.length);

        foundElements.each((i, elem) => {
            const node = $(elem);
            var text = node.text().trim().toLowerCase()
            //console.log("       text:" + text);

            dayMenu.push({
                isSoup: i === 0,
                text: normalize(text),
                price: NaN
            });
        });

        doneCallback(dayMenu);

        function normalize(str: string) {
            return str.removeAlergens()
                .removeMetrics()
                .capitalizeFirstLetter();
        }
    }
 }