import { IMenuItem } from "../IMenuItem";
import { IParser } from "../IParser";
import { Menucka } from "../menucka";

export class Priatelia extends Menucka implements IParser {
    public parse(html: string, date: Date, doneCallback: (menu: IMenuItem[]) => void): void {
        const menuItems = super.parseBase(html, date);
        const junkPatternMeal  = /\/\s*A:/
        const junkPatternSoup = /\/\s*A\s*:[-,\s]*(\d+\s*,*)+.*/g
        const junkPattern3 = /facebook|POLIEVKA K/i

        if (menuItems.length > 0) {
            menuItems.forEach((item, i) => {
                //console.log(item.text);
                if (i==0) {
                    item.isSoup = true;
                    item.text = item.text
                        .replace(junkPatternSoup, '')
                        ;
                }

                if (junkPattern3.test(item.text)) {
                    item.text = '';
                    item.price = 0;
                } else {
                    item.text = item.text
                        .removeAlergens()
                        .removeMetrics()
                        .removeItemNumbering()
                        .replace(junkPatternMeal, '');
                }
                //console.log('   => ', item.text);
            });
        }

        doneCallback(menuItems);
    }
 }
