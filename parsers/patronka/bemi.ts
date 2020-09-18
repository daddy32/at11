import cheerio from "cheerio";

import { IMenuItem } from "../IMenuItem";
import { IParser } from "../IParser";
import { format } from "date-fns";
import { sk } from "date-fns/locale";

export class Bemi implements IParser {
    public parse(html: string, date: Date, doneCallback: (menu: IMenuItem[]) => void): void {
        const $ = cheerio.load(html);
        const dayMenu = new Array<IMenuItem>();

        var junkPattern = /^\s*$/;
        var pricePattern = /(\d+,\d+)\s*e/;
        var alergPattern = /\/*\s*\/(\s*\d\s?[\.,]?\s?)+\/\s*/;

        var n = date.getDay();
        var dayMenuElement = $('#ktmain .entry-content .tab-content>div:nth-of-type(' + n + ')');

        dayMenuElement.find('p').each(function() {
          var text = $(this).text();
          var price = NaN;

          if ((junkPattern.test(text))) {
            return;
          }

          try {
            var priceMatch = text.match(pricePattern)
            var pricenum = parseFloat(priceMatch[1].replace(/\s+/, '').replace(',', '.'));
            price = pricenum;
          } catch (err) {
            console.log("price not parsed");
          }

          dayMenu.push({
            isSoup: false,
            text: normalize(text),
            price: price
          });
        });

        doneCallback(dayMenu);

        function normalize(str: string) {
            return str
              .replace(pricePattern, '')
              .replace(alergPattern, '')
              .normalizeWhitespace()
              .removeItemNumbering()
              .removeMetrics()
              .correctCommaSpacing();
          }
    }
 }