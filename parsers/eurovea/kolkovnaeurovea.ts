import * as cheerio from "cheerio";

import { IMenuItem } from "../IMenuItem";
import { IParser } from "../IParser";
import { parsePrice } from "../parserUtil";

export class KolkovnaEurovea implements IParser {
    public parse(html: string, date: Date, doneCallback: (menu: IMenuItem[]) => void): void {
        if (!html || typeof html !== "string") {
            doneCallback([]);
            return;
        }

        const $ = cheerio.load(html);
        const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
        const day = $(`.op-menus .op-menu-day[data-date="${dateKey}"] .food-list-daily`).first();
        const menu: IMenuItem[] = [];
        let isSoup: boolean | undefined;
        let description = "";

        day.contents().each((_index, node) => {
            if (node.type === "text") {
                description += ` ${$(node).text()}`;
                return;
            }

            const element = $(node);
            if (element.is("strong")) {
                const heading = element.text().normalizeWhitespace();
                isSoup = /^denná polievka$/i.test(heading) ? true
                    : /^jedlo dňa č\.\d+$/i.test(heading) ? false : undefined;
                description = "";
                return;
            }

            if (element.hasClass("price")) {
                const price = parsePrice(element.text()).price;
                const text = description
                    .replace(/\s*[|I]\s*\d{1,2}(?:\s*,\s*\d{1,2})*\s*[|I]\s*$/iu, "")
                    .removeMetrics()
                    .normalizeWhitespace();
                if (isSoup !== undefined && text && Number.isFinite(price)) {
                    menu.push({ text, price, isSoup });
                }
                description = "";
                isSoup = undefined;
            }
        });

        doneCallback(menu);
    }
}
