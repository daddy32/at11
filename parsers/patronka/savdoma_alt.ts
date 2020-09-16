import cheerio from "cheerio";

import { IMenuItem } from "../IMenuItem";
import { IParser } from "../IParser";
import { format } from "date-fns";
import { sk } from "date-fns/locale";

export class SavDoma implements IParser {
    public parse(html: string, date: Date, doneCallback: (menu: IMenuItem[]) => void): void {
        const $ = cheerio.load(html);
        const dayMenu = new Array<IMenuItem>();

        console.log("Parsing SAV.");
        console.log("   date:" + date);
        var dayElements = $(".content_main table table td.day");
        console.log("   dayelements found: " + dayElements.length);

        var targetDayName = format(date, "EEEE", { locale: sk });
        targetDayName = targetDayName.substring(1, targetDayName.length - 1);
        console.log("       targetDayName:" + targetDayName);

        dayElements.each((i, elem) => {
            const node = $(elem);
            var text = node.text().trim().toLowerCase()
            text = text.substring(1, text.length - 2);
            console.log("       text:" + text);

            if (text === targetDayName) {
                console.log("       Found!");
                var currentNode = node.parent().next();
                do {
                    console.log(currentNode.text());
                    console.log("-----");
                    currentNode = currentNode.next();
                }
                while (currentNode.find("hr").length == 0);
            }

            /*dayMenu.push({
                isSoup: false,
                text: normalize(text),
                price: NaN
            });*/
        });

        doneCallback(dayMenu);

        function normalize(str: string) {
            return str.removeAlergens()
                .removeMetrics()
                .capitalizeFirstLetter();
        }
    }
 }