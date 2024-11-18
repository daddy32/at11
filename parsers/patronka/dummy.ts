import { IMenuItem } from "../IMenuItem";
import { IParser } from "../IParser";
import { Sme } from "../sme";
import { parsePrice } from "../parserUtil";

export class Dummy extends Sme implements IParser {
    public parse(html: string, date: Date, doneCallback: (menu: IMenuItem[]) => void): void {
        const menuItems = new Array<IMenuItem>();
        menuItems.push({ text: "<center>Klik 👆</center>", price: 0, isSoup: false });

        doneCallback(menuItems);
    }
}
