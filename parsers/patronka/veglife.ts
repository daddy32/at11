import { IMenuItem } from "../IMenuItem";
import { IParser } from "../IParser";
import { Menucka } from "../menucka";

export class VegLife extends Menucka implements IParser {
    public parse(html: string, date: Date, doneCallback: (menu: IMenuItem[]) => void): void {
        const menuItems = super.parseBase(html, date);
        const junkPattern = /\(*([BVP],*)+[\s()]+|\(*([BVP],*)+[\s()]*$/g;
        const junkPattern2 = /Uvedené ceny|Nájdete nás|Pri osobnej|Objednajte si|wolt|veglife.sk|bistro/;
        const polievkaPattern = /[Pp]olievka/;

        if (menuItems.length > 0) {
            var prev_text = ""
            menuItems.forEach((item, i) => {
                //console.log(item.text);
                if (polievkaPattern.test(item.text)) {
                    item.isSoup = true;
                    item.text = item.text.replace(/polievka:?\s*/i, "");
                }

                if (junkPattern2.test(item.text)) {
                    item.text = "";
                } else {
                    item.text = item.text
                        .replace(junkPattern, "")
                        .removeAlergens()
                        .removeMetrics()
                        .removeItemNumbering();
                }
                if (item.text == prev_text) {
                    item.text = "";
                }

                prev_text = item.text;
                //console.log(item.text);
            });
        }
        doneCallback(menuItems);
    }
 }
