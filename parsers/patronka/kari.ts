import cheerio from "cheerio";

import { IMenuItem } from "../IMenuItem";
import { IParser } from "../IParser";
import { format } from "date-fns";
import { sk } from "date-fns/locale";

export class Kari implements IParser {
    public parse(html: string, date: Date, doneCallback: (menu: IMenuItem[]) => void): void {
        const $ = cheerio.load(html);
        const dayMenu = new Array<IMenuItem>();

        //console.log("Parsing Kari.");
        var elements = $(".cff-wrapper .cff-item .cff-post-text .cff-text");
        //console.log("   elements found: " + elements.length);
        elements.each((i, elem) => {
            const node = $(elem);
            const text = node.text().trim();
            //console.log(text);

            dayMenu.push({
                isSoup: false,
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
