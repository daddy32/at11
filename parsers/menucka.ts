import type { Cheerio, CheerioAPI } from "cheerio";
import type { Element } from "domhandler";
import * as cheerio from "cheerio";

import { IMenuItem } from "./IMenuItem";
import { getDateRegex } from "./parserUtil";


export abstract class Menucka {
    protected parseBase(html: string, date: Date): IMenuItem[] {
        if (!html || typeof html !== "string") {
            return [];
        }
        const $ = cheerio.load(html);
        const dateRegex = getDateRegex(date);

        const dayMenu = new Array<IMenuItem>();

        // Find the .day-title for the requested date
        let currentDay: Cheerio<Element> | undefined;
        let nextDay: Cheerio<Element> | undefined;
        $(".day-title").each((i, elem) => {
            const node = $(elem);
            // Try to find the date in a <p> or fallback to .text()
            let dateText = node.find("p").text().trim();
            if (!dateText) dateText = node.text().trim();
            // Extract date from parentheses if present
            const parenMatch = dateText.match(/\(([\d.\s]+)\)/);
            let dateToTest = dateText;
            if (parenMatch) {
                dateToTest = parenMatch[1];
            }
            if (!currentDay && dateRegex.test(dateToTest)) {
                currentDay = node;
            } else if (currentDay && !nextDay) {
                nextDay = node;
                return false;
            }
        });

        if (!currentDay) return [];

        // Traverse siblings after the .day-title's parent until the next .day-title's parent
        let menuElems: Cheerio<Element>[] = [];
        const parent = currentDay.parent();
        let sibling = parent.next();
        while (sibling.length && (!nextDay || !sibling.is(nextDay.parent()))) {
            // Only consider <div> siblings with text content
            if (sibling[0].type === "tag" && sibling.text().trim()) {
                menuElems.push(sibling);
            }
            sibling = sibling.next();
        }

        // Enhanced: Combine adjacent description and price divs
        for (let i = 0; i < menuElems.length; i++) {
            const elem = menuElems[i];
            const raw = elem.text().trim();
            if (!raw) continue;

            // Check if next element is a price div
            const nextElem = menuElems[i + 1];
            if (
                nextElem &&
                nextElem.hasClass("price") &&
                nextElem.text().trim()
            ) {
                // Combine description and price
                const text = raw;
                const priceRaw = nextElem.text().trim();
                const { price } = require("./parserUtil").parsePrice(priceRaw);
                dayMenu.push({ isSoup: false, text, price });
                i++; // Skip the price div
            } else {
                // Fallback: parse as before
                const { price, text } = require("./parserUtil").parsePrice(raw);
                dayMenu.push({ isSoup: false, text, price });
            }
        }
        return dayMenu;
    }
}
