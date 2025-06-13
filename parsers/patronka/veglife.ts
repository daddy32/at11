import { IMenuItem } from "../IMenuItem";
import { IParser } from "../IParser";
import { Menucka } from "../menucka";
import fuzz from "fuzzball";

export class VegLife extends Menucka implements IParser {
    private _parseBase: (html: string, date: Date) => IMenuItem[];
    constructor(parseBase?: (html: string, date: Date) => IMenuItem[]) {
        super();
        this._parseBase = parseBase ?? ((html, date) => super.parseBase(html, date));
    }
    public parse(html: string, date: Date, doneCallback: (menu: IMenuItem[]) => void): void {
        const menuItems = this._parseBase(html, date);
        const junkPattern = /\(*([BVP],*)+[\s()]+|\(*([BVP],*)+[\s()]*$/g;
        const junkPattern2 = /Uvedené ceny|Nájdete nás|Pri osobnej|Objednajte si|wolt|veglife.sk|bistro/;
        const polievkaPattern = /[Pp]olievka/;

        if (menuItems.length > 0) {
            let prev_text = "";
            const promoTemplates = [
                "Nestihli ste u nás obed? Príďte k nám medzi 14:00 a 15:00 a za jedlo na váhu alebo polievku zaplatíte cenu zníženú o 40 %. Happy hour sa nevzťahuje na dezerty, nápoje a donášku. Buďte v správny čas na správnom mieste a užite si skvelé jedlo za výhodnú cenu! Vo Freshmarkete začína happy hour o 15:00.",
                "Vo Freshmarkete začína happy hour o 15:00.",
                "Happy hour sa nevzťahuje na dezerty, nápoje a donášku.",
                "Donáška a osobný odber:",
                "HAPPY HOUR - Šťastná hodinka - 40% zľava!"
                // Add more templates as needed
            ];
            const promoThreshold = 80;

            menuItems.forEach((item, i) => {
                //console.log(item.text);
                // Fuzzy promo filter
                const isPromo = promoTemplates.some(template => fuzz.ratio(item.text, template) > promoThreshold);
                if (process.env.DEBUG_PROMO === "1") {
                    promoTemplates.forEach(template => {
                        const score = fuzz.ratio(item.text, template);
                        // eslint-disable-next-line no-console
                        console.log("DEBUG PROMO:", { text: item.text, template, score });
                    });
                }
                if (isPromo) {
                    item.text = "";
                    return;
                }
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
                // Debug: log final item text after cleaning
                // eslint-disable-next-line no-console
                // console.log("DEBUG FINAL ITEM TEXT:", JSON.stringify(item.text));
                // console.log(item.text);
            });
        }
        doneCallback(menuItems);
    }
 }
