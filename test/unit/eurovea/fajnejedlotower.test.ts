import "../../../parsers/parserUtil";
import { expect } from "chai";
import path from "path";
import Tesseract from "tesseract.js";

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

        const pork = items.find(item =>
            !item.isSoup &&
            item.text.includes("rag") &&
            item.text.includes("tarho")
        );
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

    it("keeps Monday Tower items when OCR mangles menu labels and next-day date separators", () => {
        const date = new Date("2026-06-01T00:00:00.000Z");
        const ocrText = `
ži Á A
a VANÝ sú SJ SY Z
ve PONDELOK | 1.jún S
a Polievka 1: Mrkvová s kalerábom a hráškom S a
S „Polievka 2: Gulášová polievka (1,12) s
a So aje MENU T Kuracie prsia Peri-peri - pikantná citrusovo bylinková omáčka, pečené zemiaký (12) "
m PENU > Restovaná kuracia pečienka na cibuľke, ryža s hráškom (1) Sž
a A Pra MENU $3: Thajské morčacie kari s mangom a citrónovou trávou, basmati ryža (6,9)
va JAKY MENU 4: Grilovaný hermelín, maslové zemiaky s vňaťou, brusnicová omáčka (7,12)
ad Bxkluslý: Pizza salami s olivami (1,7)
ks UTOROK 2jún
S Polievka 1: Talianska paradajková s čerstvou bazalkou
Polievka 2: Zemiaková mliečna na kyslo s čerstvým kôprom (1,7)
MENU: Vypr. kurací rezeň v cereálnom obale so sezamom, zemiaková kaša (1,3,7,11)
MENU 2: Bravčové čevapčiči s cibuľou, horčicou, zemiaky s vňaťou (1,3,10)
MENU 3: Hovädzie na hubách a kyslej uhorke, ryža
MENU 4: Batatový bow -cícer, uhorka, kus-kus, vajíčko a cherry rajčinky, jogurtový dresing (1,5,7)
Exklusiv: Morčacie rezančeky gyros, tzatziky, hranolky, šalát (7)
`;

        const items = extractTowerMenuFromText(ocrText, date);

        expect(items).to.have.length(7);
        expect(items.map(item => item.text)).to.deep.equal([
            "Mrkvová s kalerábom a hráškom",
            "Gulášová polievka",
            "Kuracie prsia Peri-peri - pikantná citrusovo bylinková omáčka, pečené zemiaký",
            "Restovaná kuracia pečienka na cibuľke, ryža s hráškom",
            "Thajské morčacie kari s mangom a citrónovou trávou, basmati ryža",
            "Grilovaný hermelín, maslové zemiaky s vňaťou, brusnicová omáčka",
            "Pizza salami s olivami"
        ]);
    });

    it("parses Monday menu from JEDLIS-TOWER-0601_0605-1.jpg", async function() {
        this.timeout(180000);

        const date = new Date("2026-06-01T00:00:00.000Z");
        const imagePath = path.resolve(process.cwd(), "test/samples/JEDLIS-TOWER-0601_0605-1.jpg");
        const ocrResult = await Tesseract.recognize(imagePath, "slk");
        const items = extractTowerMenuFromText(ocrResult.data.text, date);
        const mains = items.filter(item => !item.isSoup);
        const normalizedTexts = items.map(item =>
            item.text
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toLowerCase()
        );

        expect(items).to.have.length(7);
        expect(items.filter(item => item.isSoup)).to.have.length(2);
        expect(mains).to.have.length(5);
        expect(normalizedTexts.some(text => text.includes("kuracie prsia peri-peri"))).to.equal(true);
        expect(normalizedTexts.some(text => text.includes("restovana kuracia pecienka"))).to.equal(true);
        expect(normalizedTexts.some(text => text.includes("thajske morcacie kari"))).to.equal(true);
        expect(normalizedTexts.some(text => text.includes("grilovany hermelin"))).to.equal(true);
        expect(normalizedTexts.some(text => text.includes("pizza salami s olivami"))).to.equal(true);
        expect(normalizedTexts.some(text => text.includes("talianska paradajkova"))).to.equal(false);
    });
});
