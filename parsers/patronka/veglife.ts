import { IMenuItem } from "../IMenuItem";
import { IParser } from "../IParser";
import { Menucka } from "../menucka";

export class VegLife extends Menucka implements IParser {
    public parse(html: string, date: Date, doneCallback: (menu: IMenuItem[]) => void): void {
        const menuItems = super.parseBase(html, date);
        const junkPattern = /\(*([BVP],*)+[\s()]+|\(*([BVP],*)+[\s()]*$/g
        const junkPattern2 = /Uvedené ceny|Nájdete nás|Pri osobnej|Objednajte si/

        if (menuItems.length > 0) {
            menuItems.forEach((item, i) => {
                console.log(item.text);
                if (i==0) {
                    item.isSoup = true;
                    item.text = item.text.replace(/polievka:?\s*/i, "");
                }

                if (junkPattern2.test(item.text)) {
                    item.text = '';
                } else {
                    item.text = item.text
                        .replace(junkPattern, '')
                        .removeAlergens()
                        .removeMetrics()
                        .removeItemNumbering();
                }
                console.log(item.text);
            });
        }
        doneCallback(menuItems);
    }
 }
