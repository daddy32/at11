import * as cheerio from "cheerio";

import "../parserUtil";
import { IMenuItem } from "../IMenuItem";
import { IParser } from "../IParser";
import { format } from "date-fns";
import { sk } from "date-fns/locale";

export class LunchBreak implements IParser {
    public parse(html: string, date: Date, doneCallback: (menu: IMenuItem[]) => void): void {
        const $ = cheerio.load(html);
        const dayMenu = new Array<IMenuItem>();

        const junkPattern = /^\s*\/*\s*|(\+\s*Polievka\s*:.*)/g;
        const dropJunk = /\s*MENU\s*$|^$/g;
        const pricePattern = /(\d+,\d+)\s*[e€]/i;
        const alergPattern = /\/*\s*[/(](\s*[\d-+*]\s?[.,]?\s?)*[/)]\s*/g;
        const soupPattern = /POLIEVKA/;

        const targetDayName = format(date, "EEEE", { locale: sk });
        const selector = "h5:contains('" + targetDayName.substring(2) + "')";
        let dayMenuElement = $(selector);
        // console.log("dayMenuElement: ")
        // console.log(dayMenuElement)
        // console.log(dayMenuElement.text())
        // console.log(dayMenuElement.length)
        if (dayMenuElement.length < 1) {
          console.error(`LunchBreak: No dayMenuElement found! Selector: "${selector}". Trying by date...`);
          const targetDayDate = format(date, "d.LL.yyyy", { locale: sk });
          const selectorDate = `h5:contains("${targetDayDate}")`;
          // console.log(` selectorDate: ${selectorDate}`)
          dayMenuElement = $(selectorDate);
          if (dayMenuElement.length >= 1) {
            // console.log(` Found!`)
          } else {
            console.error(" Not found!");
            return;
          }
        }

        const parentElement = dayMenuElement.parent();
        // console.log("parentElement:")
        // console.log(parentElement)

        let text = "";
        let prevText = "";
        let price = NaN;

        // --- Soup section fix ---
        let inSoupSection = false;
        let lastMenuItemText: string | null = null;
        parentElement.find("div>p").each(function() {
          prevText = text;
          text = $(this).text();
          if (!text.trim() || text.trim() === "\u00A0" || text.trim().toLowerCase() === "&nbsp;") {
            // whitespace-only line: do not clear lastMenuItemText, just skip
            return;
          }
          // Section header detection (any line containing "MENU", case-insensitive)
          if (/MENU/i.test(text)) {
            inSoupSection = false;
            lastMenuItemText = null;
            return; // do not process this line as soup
          }
          if (text.match(soupPattern)) {
            inSoupSection = true;
            lastMenuItemText = null;
            return;
          }
          if (inSoupSection) {
            // skip price lines and empty lines
            if (!pricePattern.test(text) && !dropJunk.test(text)) {
              dayMenu.push({
                isSoup: true,
                text: normalize(text),
                price: NaN
              });
            }
            return;
          }

          const priceMatch = text.match(pricePattern);
          if (priceMatch) {
            // Try to pair with last non-empty menu item text
            try {
              const pricenum = parseFloat(priceMatch[1].replace(/\s+/, "").replace(",", "."));
              price = pricenum;
              let itemText = lastMenuItemText ? normalize(lastMenuItemText) : normalize(prevText);
              // If itemText is empty, fallback to prevText or skip
              if (!itemText || itemText.length === 0) {
                itemText = normalize(prevText);
              }
              if (itemText.length == 0) {
                // If still empty, fail gracefully: skip adding, but do not crash
                return;
              }
              dayMenu.push({
                isSoup: false,
                text: itemText,
                price: price
              });
              lastMenuItemText = null; // reset after pairing
            } catch (err) {
              // console.warn("\t\tprice not parsed");
              lastMenuItemText = null;
            }
          } else {
            // Not a price: remember as possible menu item
            lastMenuItemText = text;
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
