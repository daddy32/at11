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
        var junkPattern2 = /^MENU\s*\d:\s*/;
        var pricePattern = /(\d+,\d+)\s*[e€]/i;
        var alergPattern = /\/*\s*\/(\s*\d\s?[.,]?\s?)+\/\s*/g;

        var n = date.getDay();
        var dayMenuElement = $('#ktmain .entry-content .tab-content>div:nth-of-type(' + n + ')');

        dayMenuElement.find('p, li').each(function() {
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
            console.warn("price not parsed");
          }

          dayMenu.push({
            isSoup: false,
            text: normalize(text),
            price: price
          });
        });

        doneCallback(dayMenu);

        function normalize(str: string) {
          //console.log(str);
          var result = str
              .replace(alergPattern, '')
              .replace(pricePattern, '')
              .replace(junkPattern2, '')
              .normalizeWhitespace()
              .removeItemNumbering()
              .removeMetrics()
              .correctCommaSpacing();
          //console.log(' -> ', result);
          return result;
        };
    }
 }