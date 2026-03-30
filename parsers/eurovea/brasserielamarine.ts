import { IMenuItem } from "../IMenuItem";
import { IParser } from "../IParser";
import { parsePrice } from "../parserUtil";
import { Sme } from "../sme";

export class BrasserieLaMarine extends Sme implements IParser {
    public parse(html: string, date: Date, doneCallback: (menu: IMenuItem[]) => void): void {
        const menu = super.parseBase(html, date)
            .map(item => this.normalizeItem(item))
            .filter(item => item.text.length > 0)
            .filter(item => !/^(polievka|hlavn[eé] jedlo)$/i.test(item.text));

        if (menu.length > 0) {
            menu[0].isSoup = true;
        }

        doneCallback(menu);
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
