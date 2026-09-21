import "../../../parsers/parserUtil";
import { expect } from "chai";
import fs from "fs";
import path from "path";

import { Dock7 } from "../../../parsers/eurovea/dock7";
import { TestHelper } from "../../helpers/TestHelper";

describe("Dock7 Parser", () => {
    let parser: Dock7;
    let mockDate: Date;

    beforeEach(() => {
        parser = new Dock7();
        mockDate = TestHelper.createMockDate("2026-03-30");
    });

    afterEach(() => {
        TestHelper.cleanupMocks();
    });

    it("parses the captured Menucka page into mains and a soup", (done) => {
        const html = fs.readFileSync(
            path.join(__dirname, "../../samples/dock7-menucka-2026-03-29.html"),
            "utf-8"
        );

        parser.parse(html, mockDate, menu => {
            expect(menu).to.have.length(3);

            const soup = menu.find(item => item.isSoup);
            expect(soup).to.not.equal(undefined);
            expect(soup?.text).to.include("Mrkový krém");
            expect(soup?.price).to.equal(2.8);

            const chicken = menu.find(item => item.text.includes("Kuracie prsia sous-vide"));
            expect(chicken).to.not.equal(undefined);
            expect(chicken?.text).to.include("cannelloni");
            expect(chicken?.text).to.not.include("[ * 1, 3, 7, 9 ]");
            expect(chicken?.text).to.not.include("|");
            expect(chicken?.price).to.equal(11.9);

            const salad = menu.find(item => item.text.includes("Šalát z miešaných listov"));
            expect(salad).to.not.equal(undefined);
            expect(salad?.text).to.include("grilované hrušky");
            expect(salad?.text).to.not.include("[ * 7, 8, 12 ]");
            expect(salad?.price).to.equal(10.9);

            expect(menu.some(item => item.text.includes("s denným menu"))).to.equal(false);
            done();
        });
    });

    it("parses the current weekly Menučka offer with inline prices", (done) => {
        const html = `
            <div class="restaurant-weekmenu">
                <div class="continuing-offer-block">
                    <div class="continuing-offer-title">Týždenná ponuka 21.-25.9.2026</div>
                    <div class="continuing-offer-line">
                        POLIEVKA<br>
                        Boršč – cvikla, kapusta a zemiaky 7,9,12 – 250 ml/45 g –
                        <div id="cena"><b>2,50 €</b></div><br>
                        Boršč s hlavným jedlom –
                        <div id="cena"><b>1,50 €</b></div><br>
                        HLAVNÉ JEDLÁ<br>
                        Kačacie stehno, pyré a fazuľky 7,9 – 400/250 g –
                        <div id="cena"><b>13,50 €</b></div><br>
                    </div>
                </div>
            </div>
        `;

        parser.parse(html, TestHelper.createMockDate("2026-09-21"), menu => {
            expect(menu).to.have.length(2);
            expect(menu).to.deep.include.members([
                { text: "Boršč – cvikla, kapusta a zemiaky", price: 2.5, isSoup: true },
                { text: "Kačacie stehno, pyré a fazuľky", price: 13.5, isSoup: false }
            ]);
            done();
        });
    });
});
