import { IMenuItem } from "../IMenuItem";
import { IParser } from "../IParser";
import { Menucka } from "../menucka";

export class Obederia extends Menucka implements IParser {
    public parse(html: string, date: Date, doneCallback: (menu: IMenuItem[]) => void): void {
        const menuItems = super.parseBase(html, date);
        const cleanedMenu = menuItems
            .map(item => this.cleanItem(item))
            .filter((item): item is IMenuItem => item !== undefined);

        doneCallback(cleanedMenu);
    }

    private cleanItem(item: IMenuItem): IMenuItem | undefined {
        if (/^Cena menu\s*=/i.test(item.text)) {
            return undefined;
        }

        const isSoup = /polievka|krém|vývar|demikát/i.test(item.text);
        const text = item.text
            .replace(/^Polievka:\s*/i, "")
            .replace(/^Jedlo\s*\d+\s*:\s*/i, "")
            .removeAlergens()
            .removeMetrics()
            .normalizeWhitespace()
            .replace(/^[,:;\s-]+/, "")
            .replace(/[, ]+$/, "");

        if (!text) {
            return undefined;
        }

        return {
            ...item,
            text,
            isSoup
        };
    }
}
