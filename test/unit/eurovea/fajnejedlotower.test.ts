import "../../../parsers/parserUtil";
import { expect } from "chai";

import { extractTowerMenuFromText } from "../../../parsers/eurovea/fajnejedlotower";

describe("Fajne Jedlo Tower Parser", () => {
    it("splits Tower OCR text into soups, mains, and the weekly special", () => {
        const date = new Date("2026-03-30T00:00:00.000Z");
        const ocrText = `
PONDELOK | 30.marec S
S: Polievka 1: Zemiaková kulajda (3,7) SA S 4
v Rolievka 2: Slepačí vývar so zeleninou, mäsom a rezancami (1,3,9) KAEEY
s zari, MENU: Kurací steak s citrónovou omáčkou a špargľou, zemiaková kaša (7) “ur
EC TENÚ Ed Bravčové ragú na hrášku s pečenou mrkvou, tarhoňa Z
dá MENU 3: Morčacie kung pao, ryža (6,9)
va JAKY MENU 4: Zeleninová paella so strúhaným parmezánom, rukola (7,9)
Sud ExKluslý: BBO Ranch wrap — tortilla plnená kuracím s medovou BBO, slaninou,
ZE pečenou mrkvou a syrom, šalát, hranolky, jogurtový dip (1,7,6)
ms UTOROK 31.marec
`;

        const items = extractTowerMenuFromText(ocrText, date);

        expect(items).to.have.length(7);

        expect(items.filter(item => item.isSoup).map(item => item.text)).to.deep.equal([
            "Zemiaková kulajda",
            "Slepačí vývar so zeleninou, mäsom a rezancami"
        ]);

        const chicken = items.find(item => !item.isSoup && item.text.startsWith("Kurací steak s citrónovou omáčkou"));
        expect(chicken).to.not.equal(undefined);

        const pork = items.find(item => !item.isSoup && item.text.startsWith("Bravčové ragú na hrášku"));
        expect(pork).to.not.equal(undefined);
        expect(pork?.text).to.not.include("Kurací steak");

        const turkey = items.find(item => !item.isSoup && item.text.startsWith("Morčacie kung pao"));
        expect(turkey).to.not.equal(undefined);

        const paella = items.find(item => !item.isSoup && item.text.startsWith("Zeleninová paella"));
        expect(paella).to.not.equal(undefined);

        const wrap = items.find(item => !item.isSoup && item.text.startsWith("BBO Ranch wrap"));
        expect(wrap).to.not.equal(undefined);
        expect(wrap?.text).to.include("jogurtový dip");
    });
});
