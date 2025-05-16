import { IMenuItem } from "../IMenuItem";
import { IParser } from "../IParser";
import { Menucka } from "../menucka";

export class Priatelia extends Menucka implements IParser {
    public parse(html: string, date: Date, doneCallback: (menu: IMenuItem[]) => void): void {
        const menuItems = super.parseBase(html, date);
        const junkPatternMeal  = /A:|\s:|^\s*:\s*$/g;
        const junkPatternSoup = /\/\s*A\s*:[-,\s]*(\d+\s*,*)+.*/g;
        const junkPattern3 = /facebook|POLIEVKA K/i;

        if (menuItems.length > 0) {
            // Remove lines that are only allergen info (e.g. "/A:1.3.7", "/A:1,3,4,7")
            const allergenLinePattern = /^\/A:[\d.,\s]+$/;
            for (let i = menuItems.length - 1; i >= 0; i--) {
                if (allergenLinePattern.test(menuItems[i].text.trim())) {
                    // If this allergen line has a price, assign it to the previous item if missing
                    if (
                        i > 0 &&
                        typeof menuItems[i].price === "number" &&
                        menuItems[i].price > 0 &&
                        (!menuItems[i - 1].price || menuItems[i - 1].price === 0)
                    ) {
                        menuItems[i - 1].price = menuItems[i].price;
                    }
                    menuItems.splice(i, 1);
                }
            }

            menuItems.forEach((item, i) => {
                // console.log(item.text, '   => ');
                if (i==0) {
                    item.isSoup = true;
                    item.text = item.text
                        .replace(junkPatternSoup, "")
                        ;
                }

                if (junkPattern3.test(item.text)) {
                    item.text = "";
                    item.price = 0;
                } else {
                    item.text = item.text
                        .removeAlergens()
                        .removeMetrics()
                        .removeItemNumbering()
                        .replace(junkPatternMeal, "");
                }
                // console.log(item.text);
            });
        }

        doneCallback(menuItems);
    }
 }
