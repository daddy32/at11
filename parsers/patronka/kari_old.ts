import cheerio from "cheerio";

import { IMenuItem } from "../IMenuItem";
import { IParser } from "../IParser";
import { getDateRegex } from "../parserUtil";

export class Kari implements IParser {
    public parse(html: string, date: Date, doneCallback: (menu: IMenuItem[]) => void): void {
        const polievkaPattern = /[Pp]olievka|Tom Yum/;
        const dayPattern = /[^\s]*\s(\d{1,2}[.\s]{1}){2}.*/;
        const lineBreakPattern = /(<[Bb][Rr]>)+/;
        const todayRegex = getDateRegex(date);
        //console.log(`todayRegex: ${todayRegex}`);

        const $ = cheerio.load(html);
        const dayMenu = new Array<IMenuItem>();

        //console.log("Parsing Kari.");
        const elements = $(".cff-wrapper .cff-item .cff-post-text .cff-text");
        //console.log("   elements found: " + elements.length);

        // Showing only first element
        if (elements.length>0) {
            const node = $(elements[0]);
            const text = node.html();
            //console.log(text);
            var lineItems = text.split(lineBreakPattern);
            //console.log(lineItems);
            var seenToday = false;

            for (const x of lineItems) {
                var isPolievka = false;
                var isDay = false;
                var isToday = false;

                if (!lineBreakPattern.test(x)) {
                    //console.log(`"${x}"`);
                    if (polievkaPattern.test(x)) {
                        isPolievka = true;
                    }
                    if (dayPattern.test(x)) {
                        isDay = true;
                    }
                    if (todayRegex.test(x)) {
                        isToday = true;
                        seenToday = true;
                    }
                    //console.log(`   isPolievka:\t${isPolievka}`);
                    //console.log(`   isDay:\t${isDay}`);
                    if (isDay) {
                        //console.log(`   isToday:\t${isToday}`);
                        if (seenToday && !isToday) {
                            break;
                        }
                    } else if (seenToday) {
                        dayMenu.push({
                            isSoup: isPolievka,
                            text: normalize(x),
                            price: NaN
                        });
                    }
                }
            };
            if (!seenToday) {
                dayMenu.push({
                    isSoup: false,
                    text: normalize(text),
                    price: NaN
                });
            }
        }

        doneCallback(dayMenu);

        function normalize(str: string) {
            return str.removeAlergens()
                .removeMetrics()
                .capitalizeFirstLetter();
        }
    }
 }
