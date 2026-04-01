import { IMenuItem } from "../IMenuItem";
import { IParser } from "../IParser";
import { Sme } from "../sme";

export class Dummy extends Sme implements IParser {
    public parse(html: string, date: Date, doneCallback: (menu: IMenuItem[]) => void): void {
        const menuItems = new Array<IMenuItem>();
        menuItems.push({
            text: "<center>Klik &#128070; (stále menu)</center>",
            price: 0,
            isSoup: true,
            isDummy: true
        });

        doneCallback(menuItems);
    }
}
