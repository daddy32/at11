import { IMenuItem } from "../IMenuItem";
import { IParser } from "../IParser";
import { Sme } from "../sme";
import { parsePrice } from "../parserUtil";

export class PatronskyPivovar extends Sme implements IParser {
    public parse(html: string, date: Date, doneCallback: (menu: IMenuItem[]) => void): void {
        const menuItems = super.parseBase(html, date);

        if(menuItems.length > 0) {
            menuItems[0].isSoup = true;
            menuItems.forEach(item=> {
                const result = parsePrice(item.text);
                item.price = result.price;
                item.text = result.text.replace(/^.*\|\s+/, "").replace(/\(obsahuje:/, "");
            });
        }

        doneCallback(menuItems);
    }
}
