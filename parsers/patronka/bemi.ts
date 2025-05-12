import * as cheerio from "cheerio";

import { IMenuItem } from "../IMenuItem";
import { IParser } from "../IParser";
import { format } from "date-fns";
import { sk } from "date-fns/locale";

export class Bemi implements IParser {
    public parse(html: string, date: Date, doneCallback: (menu: IMenuItem[]) => void): void {
        const $ = cheerio.load(html);
        const dayMenu = new Array<IMenuItem>();

        const junkPattern = /^\s*$/;
        const junkPattern2 = /^MENU\s*\d[:,]\s*/g;
        const pricePattern = /(\d+,\d+)\s*[e€]/i;
        const alergPattern = /\/*\s*\/(\s*\d\s?[.,]?\s?)+\/\s*/g;

        const n = date.getDay();
        const dayMenuElement = $("#ktmain .entry-content .tab-content>div:nth-of-type(" + n + ")");

        dayMenuElement.find("p, li").each(function() {
          const text = $(this).text();
          let price = NaN;

          if ((junkPattern.test(text))) {
            return;
          }

          try {
            const priceMatch = text.match(pricePattern);
            const pricenum = parseFloat(priceMatch[1].replace(/\s+/, "").replace(",", "."));
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
          const result = str
              .replace(alergPattern, "")
              .replace(pricePattern, "")
              .replace(junkPattern2, "")
              .normalizeWhitespace()
              .removeItemNumbering()
              .removeMetrics()
              .correctCommaSpacing();
          //console.log(' -> ', result);
          return result;
        }
    }
 }
