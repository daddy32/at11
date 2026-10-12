import * as cheerio from "cheerio";

import { IMenuItem } from "../IMenuItem";
import { IParser } from "../IParser";
import { getDateRegex, parsePrice } from "../parserUtil";
import { Sme } from "../sme";

export class BrasserieLaMarine extends Sme implements IParser {
    public parse(html: string, date: Date, doneCallback: (menu: IMenuItem[]) => void): void {
        const officialMenu = this.parseOfficialMenu(html, date);
        const hasOfficialMenu = officialMenu.length > 0;
        const menu = (officialMenu.length > 0 ? officialMenu : super.parseBase(html, date))
            .map(item => this.normalizeItem(item))
            .filter(item => item.text.length > 0)
            .filter(item => !/^(polievka|hlavn[eé] jedlo)$/i.test(item.text));

        if (menu.length > 0 && !hasOfficialMenu) {
            menu[0].isSoup = true;
        }

        doneCallback(menu);
    }

    private parseOfficialMenu(html: string, date: Date): IMenuItem[] {
        const $ = cheerio.load(html);
        const dateRegex = getDateRegex(date);
        const dayHeading = $("#dailymenu .restaurant-menu-day").filter((_index, heading) =>
            dateRegex.test($(heading).next(".daily-date").text())
        ).first();

        if (!dayHeading.length) {
            return [];
        }

        const parsedPrice = parsePrice($("#dailymenu .daily-details").first().text()).price;
        const price = Number.isNaN(parsedPrice) ? 0 : parsedPrice;

        return dayHeading
            .nextUntil(".restaurant-menu-day, .daily-meal")
            .filter(".daily-description")
            .toArray()
            .map((description, index) => {
                const text = $(description).text().replace(/\s+/g, " ").trim();
                return {
                    text,
                    price: index === 1 ? price : 0,
                    isSoup: index === 0 && /\b(?:kr[eé]m|polievk\w*|minestrone|v[yý]var)\b/i.test(text)
                };
            })
            .filter(item => item.text.length > 0);
    }

    private normalizeItem(item: IMenuItem): IMenuItem {
        const parsed = parsePrice(item.text);

        return {
            ...item,
            text: parsed.text.normalizeWhitespace(),
            price: Number.isNaN(parsed.price) ? item.price : parsed.price
        };
    }
}
