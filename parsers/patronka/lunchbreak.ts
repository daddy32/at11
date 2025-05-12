import * as cheerio from "cheerio";

import { IMenuItem } from "../IMenuItem";
import { IParser } from "../IParser";
import { format } from "date-fns";
import { sk } from "date-fns/locale";

export class LunchBreak implements IParser {
    public parse(html: string, date: Date, doneCallback: (menu: IMenuItem[]) => void): void {
        const $ = cheerio.load(html);
        const dayMenu = new Array<IMenuItem>();

        const junkPattern = /^\s*\/*\s*|(\+\s*Polievka\s*:.*)/g
        const dropJunk = /\s*MENU\s*$|^$/g
        const pricePattern = /(\d+,\d+)\s*[e€]/i;
        const alergPattern = /\/*\s*[\/(](\s*\d\s?[.,]?\s?)+[\/)]\s*/g;
        const soupPattern = /POLIEVKA/;

        const targetDayName = format(date, "EEEE", { locale: sk });
        const selector = "h5:contains('" + targetDayName.substring(2) + "')"
        var dayMenuElement = $(selector);
        // console.log("dayMenuElement: ")
        // console.log(dayMenuElement)
        // console.log(dayMenuElement.text())
        // console.log(dayMenuElement.length)
        if (dayMenuElement.length < 1) {
          console.error(`No dayMenuElement found! Selector: "${selector}". Trying by date...`)
          const targetDayDate = format(date, "d.LL.yyyy", { locale: sk });
          const selectorDate = `h5:contains("${targetDayDate}")`
          // console.log(` selectorDate: ${selectorDate}`)
          var dayMenuElement = $(selector);
          if (dayMenuElement.length >= 1) {
            // console.log(` Found!`)
          } else {
            console.error(` Not found!`)
            return
          }
        }

        let parentElement = dayMenuElement.parent();
        // console.log("parentElement:")
        // console.log(parentElement)

        var text = ""
        var prevText = ""
        var price = NaN;

        parentElement.find("div>p").each(function() {
          prevText = text;
          text = $(this).text();
          if (!text.trim()) {
            return;
          }
          // console.log(`text: "${text}"`);
          if (dropJunk.test(text)) {
            // console.log("\tdropJunk");
            // console.log("------------------------");
            return;
          } else {
            // console.log("\tdropJunk not matched");
          }

          if (prevText.match(soupPattern)) {
            // console.log("\tsoupPattern matched on prevText");
            text.split("/").forEach(function (item) {
              dayMenu.push({
                isSoup: true,
                text: normalize(item),
                price: NaN
              });
            });
            // console.log("------------------------");
            return;
          }

          const priceMatch = text.match(pricePattern);
          if (priceMatch) {
            // console.log("\tpricePattern matched");
            try {
              const pricenum = parseFloat(priceMatch[1].replace(/\s+/, "").replace(",", "."));
              price = pricenum;
              text = normalize(prevText);
              // console.log(`text: "${text}"`)
              // console.log(`price: "${price}"`)
              if (text.length == 0) {
                // console.log(`\tEmpty text, dropping.`);
                // console.log("------------------------");
                return;
              }
              dayMenu.push({
                isSoup: false,
                text: text,
                price: price
              });
            } catch (err) {
              // console.warn("\t\tprice not parsed");
            }
          } else {
            // console.log("\tpricePattern not matched");
          }
          // console.log("------------------------");
        });

        doneCallback(dayMenu);

        function normalize(str: string) {
            return str
              .replace(alergPattern, "")
              .replace(pricePattern, "")
              .normalizeWhitespace()
              .removeItemNumbering()
              .removeMetrics()
              .correctCommaSpacing()
              .replace(junkPattern, "")
              ;
          }
    }
 }
