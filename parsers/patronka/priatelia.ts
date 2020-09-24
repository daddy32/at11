import { IMenuItem } from "../IMenuItem";
import { IParser } from "../IParser";
import { Menucka } from "../menucka";

export class Priatelia extends Menucka implements IParser {
    public parse(html: string, date: Date, doneCallback: (menu: IMenuItem[]) => void): void {
        const menuItems = super.parseBase(html, date);
        const junkPattern  = /\/\s*A:/
        const junkPattern2 = /\/\s*A\s*:(\d+\s*,*)+.*/
        const junkPattern3 = /facebook/i

        if (menuItems.length > 0) {
            menuItems.forEach((item, i) => {
                //console.log(item.text);
                if (i==0) {
                    item.isSoup = true;
                    item.text = item.text.replace(junkPattern2, '');
                }

                if (junkPattern3.test(item.text)) {
                    item.text = '';
                } else {
                    item.text = item.text
                        .removeAlergens()
                        .removeMetrics()
                        .removeItemNumbering()
                        .replace(junkPattern, '');
                }
                //console.log('   => ', item.text);
            });
        }

        doneCallback(menuItems);
    }
 }
