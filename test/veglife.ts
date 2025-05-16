import fuzz from "fuzzball";
// Test for VegLife parser fuzzy promo filtering

import { VegLife } from "../parsers/patronka/veglife";
import { IMenuItem } from "../parsers/IMenuItem";

const promoText = "Nestihli ste u nás obed? Príďte k nám medzi 14:00 a 15:00 a za jedlo na váhu alebo polievku zaplatíte cenu zníženú o 40 %. Happy hour sa nevzťahuje na dezerty, nápoje a donášku. Buďte v správny čas na správnom mieste a užite si skvelé jedlo za výhodnú cenu! Vo Freshmarkete začína happy hour o 15:00.";
const normalText = "Šošovicová polievka s párkom";
const promoTemplates = [
    "Nestihli ste u nás obed? Príďte k nám medzi 14:00 a 15:00 a za jedlo na váhu alebo polievku zaplatíte cenu zníženú o 40 %. Happy hour sa nevzťahuje na dezerty, nápoje a donášku. Buďte v správny čas na správnom mieste a užite si skvelé jedlo za výhodnú cenu! Vo Freshmarkete začína happy hour o 15:00.",
    "Vo Freshmarkete začína happy hour o 15:00.",
    "Happy hour sa nevzťahuje na dezerty, nápoje a donášku.",
];
const promoThreshold = 80;
console.log("SIMILARITY promoText:", promoTemplates.map(t => fuzz.ratio(promoText, t)));
console.log("SIMILARITY normalText:", promoTemplates.map(t => fuzz.ratio(normalText, t)));
const html = ""; // HTML is not used by parseBase in this test context

(async () => {
    const parser = new VegLife(() => JSON.parse(JSON.stringify(fakeMenu)));
    const today = new Date();
    // Simulate parseBase output
    const fakeMenu: IMenuItem[] = [
        { text: promoText, isSoup: false, price: 0 },
        { text: normalText, isSoup: false, price: 0 }
    ];
console.log("FAKE MENU BEFORE PARSE:", fakeMenu);
    // Patch parseBase to return our fake menu
    (VegLife.prototype as any).parseBase = () => JSON.parse(JSON.stringify(fakeMenu));

    await parser.parse(html, today, (menu: IMenuItem[]) => {
        console.log("Filtered menu:", menu);
        if (menu.some(item => item.text === promoText)) {
            throw new Error("Promo text was not filtered out!");
        }
        if (!menu.some(item => item.text === "Šošovicová s párkom")) {
            throw new Error("Normal menu item was not preserved and cleaned!");
        }
console.log("MENU AFTER PARSE, BEFORE ASSERT:", menu);
menu.forEach((item, idx) => {
            console.log(`ITEM ${idx}:`, JSON.stringify(item.text), "LEN:", item.text.length);
        });
        console.log("VegLife fuzzy promo filter test passed.");
    });
})();
