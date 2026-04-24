import { IMenuItem } from "../IMenuItem";
import { IParser } from "../IParser";
import { Sme } from "../sme";
import { parsePrice } from "../parserUtil";

export class Kari extends Sme implements IParser {
    public parse(html: string, date: Date, doneCallback: (menu: IMenuItem[]) => void): void {
        const menuItemsOrig = super.parseBase(html, date);
        const menuItemsFinal: IMenuItem[] = [];
        const junkPattern = /(\d+\.*){1,}$/;
        let seenSoup = false;
        // console.log("Parsing Kari.");
        // console.log("   date:" + date);

        menuItemsOrig.forEach(item=> {
            // console.log("       text:" + item.text);
            if (junkPattern.test(item.text)) {
                // console.log("           Junk");
                return;
            }
            const result = parsePrice(item.text);

            if (!seenSoup) {
                item.isSoup = true;
                seenSoup = true;
            }

            item.price = Number.isNaN(result.price) ? item.price : result.price;
            item.text = result.text.replace(/^(\d+\.*){1,}/, "").replace(/^.*\|\s+/, "").replace(/\(obsahuje:/, "").removeAlergens();
            menuItemsFinal.push(item);
        });

        doneCallback(menuItemsFinal);
    }
}
