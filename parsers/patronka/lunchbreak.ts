import cheerio from "cheerio";

import { IMenuItem } from "../IMenuItem";
import { IParser } from "../IParser";
import { format } from "date-fns";
import { sk } from "date-fns/locale";

export class LunchBreak implements IParser {
    public parse(html: string, date: Date, doneCallback: (menu: IMenuItem[]) => void): void {
        const $ = cheerio.load(html);
        const dayMenu = new Array<IMenuItem>();

        var junkPattern = /\s*\+\s*Polievka\s*:.*$|\(-\)/g;
        var pricePattern = /(\d+,\d+)\s*e/;
        var alergPattern = /\/*\s*[\/\(](\s*\d\s?[.,]?\s?)+[\/\)]\s*/g;
        var soupPattern = /olievka/;

        var targetDayName = format(date, "EEEE", { locale: sk });
        var dayMenuElement = $('td:contains(\'' + targetDayName.substr(1) + '\')');
        var rowElement = dayMenuElement.parent();
        var i = 0;

        do {
          i += 1;
          if (i>10) {
            break;
          }

          var tdElements = rowElement.children('td');
          //console.log('i: ', i, ' Element count:', tdElements.length);

          if (tdElements.length < 6) {
            continue;
          }
          if ((i > 1) && ($(tdElements.get(0)).text().length > 0 )) {
            break;
          }

          var text = $(tdElements.get(3)).text();
          var price = parseFloat($(tdElements.get(5)).text().replace(',', '.'));
          //console.log('text: ', text);
          //console.log('price: ', price);

          dayMenu.push({
            isSoup: soupPattern.test($(tdElements.get(1)).text()),
            text: normalize(text),
            price: price
          });

          rowElement = rowElement.next();
        } while (rowElement)

        doneCallback(dayMenu);

        function normalize(str: string) {
            return str
              .replace(alergPattern, '')
              .replace(junkPattern, '')
              .replace(pricePattern, '')
              .normalizeWhitespace()
              .removeItemNumbering()
              .removeMetrics()
              .correctCommaSpacing();
          }
    }
 }