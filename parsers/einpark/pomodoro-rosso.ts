import { load } from "cheerio";

import { IMenuItem, IParser } from "../types.js";
import { endOfWeek, format, startOfWeek, subDays } from "date-fns";
import { sk } from "date-fns/locale";

export class PomodoroRosso implements IParser {
    public urlFactory(d: Date): string {
        const weekStart = startOfWeek(d, { locale: sk });
        const dayBeforeStart = subDays(weekStart, 1);
        const weekEnd = endOfWeek(d, { locale: sk });
        const fridayBeforeEnd = subDays(weekEnd, 2);
        return (
            "https://www.pizzeriapomodororosso.sk/" +
            format(dayBeforeStart, "yyyy/MM/dd", { locale: sk }) +
            `/denne-menu-${format(weekStart, "d-M-yyyy", { locale: sk })}-${format(fridayBeforeEnd, "d-M-yyyy", { locale: sk })}/`
        );
    }

    public parse(html: string, date: Date): Promise<IMenuItem[]> {
        const $ = load(html);
        const currentDayName = format(date, "eeee", { locale: sk });

        // New format: structured day panels
        const panelId = `panel-${currentDayName.charAt(0).toUpperCase() + currentDayName.slice(1)}`;
        const panel = $(`#${panelId}`);
        if (panel.length > 0) {
            const menu: IMenuItem[] = [];
            panel.find(".soup").each((_, el) => {
                const text = $(el)
                    .text()
                    .replace(/Polievka:?/i, "")
                    .trim();
                menu.push({
                    isSoup: true,
                    text: this.normalize(text),
                    price: NaN,
                });
            });
            panel.find(".meal-row").each((_, el) => {
                const text = $(el).find("strong").text().trim();
                const priceStr = $(el).find(".price").text().trim();
                const price = parseFloat(
                    priceStr.replace(",", ".").replace(/[€\s]/g, ""),
                );
                menu.push({ isSoup: false, text: this.normalize(text), price });
            });
            return Promise.resolve(menu);
        }

        return Promise.resolve([]);
    }

    private normalize(str: string) {
        return str
            .removeMetrics()
            .removeItemNumbering()
            .capitalizeFirstLetter();
    }
}
