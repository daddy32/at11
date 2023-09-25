import cheerio from "cheerio";

import { IMenuItem } from "../IMenuItem";
import { IParser } from "../IParser";
import { format } from "date-fns";
import { sk } from "date-fns/locale";

export class LunchBreak implements IParser {
    public parse(html: string, date: Date, doneCallback: (menu: IMenuItem[]) => void): void {
        const $ = cheerio.load(html);
        const dayMenu = new Array<IMenuItem>();

        const junkPattern = /\s*\+\s*Polievka\s*:.*$|\(-\)/g;
        const dropJunk = /^[——–\-\s]+$/g
        const pricePattern = /(\d+,\d+)\s*e/;
        const alergPattern = /\/*\s*[/(](\s*\d\s?[.,]?\s?)+[/)]\s*/g;
        const soupPattern = /olievka/;

        const targetDayName = format(date, "EEEE", { locale: sk });
        const selector = "td:contains('" + targetDayName.substring(2) + "')"
        var dayMenuElement = $(selector);
        // console.log("dayMenuElement: ")
        // console.log(dayMenuElement.text())
        // console.log(dayMenuElement.length)
        if (dayMenuElement.length < 1) {
          console.error(`No dayMenuElement found! Selector: "${selector}". Trying by date...`)
          const targetDayDate = format(date, "d.LL.yyyy", { locale: sk });
          const selectorDate = `td:contains("${targetDayDate}")`
          console.log(` selectorDate: ${selectorDate}`)
          var dayMenuElement = $(selector);
          if (dayMenuElement.length >= 1) {
            // console.log(` Found!`)
          } else {
            console.error(` Not found!`)
            return
          }
        }
        let rowElement = dayMenuElement.parent();
        let i = 0;

        do {

          i += 1;
          if (i>10) {
            break;
          }

          const tdElements = rowElement.children("td");
          // console.log('i: ', i, ' Element count:', tdElements.length);
          //console.log(`rowElement: ${rowElement.text()}`)
          // console.log(rowElement)
          // console.log(rowElement.text())

          if (tdElements.length < 6) {
            continue;
          }
          if ((i > 1) && ($(tdElements.get(0)).text().length > 0 )) {
            break;
          }

          let text = normalize($(tdElements.get(3)).text());

          if (text.match(dropJunk)) {
            // console.log('dropJunk')
            continue
          }

          if (text === "") {
            text = normalize($(tdElements.get(1)).text())
              .toLowerCase()
              .capitalizeFirstLetter();
          }
          const price = parseFloat($(tdElements.get(5)).text().replace(",", "."));
          // console.log('text: ', text);
          // console.log('price: ', price);

          dayMenu.push({
            isSoup: soupPattern.test($(tdElements.get(1)).text()),
            text: normalize(text),
            price: price
          });

          rowElement = rowElement.next();
        } while (rowElement);

        doneCallback(dayMenu);

        function normalize(str: string) {
            return str
              .replace(alergPattern, "")
              .replace(junkPattern, "")
              .replace(pricePattern, "")
              .normalizeWhitespace()
              .removeItemNumbering()
              .removeMetrics()
              .correctCommaSpacing();
          }
    }
 }