import "../../../parsers/parserUtil";
import { expect } from "chai";
import fs from "fs";
import path from "path";

import { KolkovnaEurovea } from "../../../parsers/eurovea/kolkovnaeurovea";
import { TestHelper } from "../../helpers/TestHelper";

describe("Kolkovna Eurovea Parser", () => {
    let parser: KolkovnaEurovea;
    let mockDate: Date;

    beforeEach(() => {
        parser = new KolkovnaEurovea();
        mockDate = TestHelper.createMockDate("2026-03-30");
    });

    afterEach(() => {
        TestHelper.cleanupMocks();
    });

    it("parses dish and price rows interleaved in the SME menu", (done) => {
        const html = `
            <div class="dnesne_menu">
                <h2>Obedové menu Pondelok (30.03.2026)</h2>
                <div class="jedlo_polozka"><div class="left">30.03.2026</div></div>
                <div class="jedlo_polozka"><div class="left">Denná polievka</div></div>
                <div class="jedlo_polozka"><div class="left">Cesnaková krémová s krutónmi 0,33 l |1,3,7|</div></div>
                <div class="jedlo_polozka"><div class="left">1.99 €</div></div>
                <div class="jedlo_polozka"><div class="left">Jedlo dňa č.1</div></div>
                <div class="jedlo_polozka"><div class="left">Kuracie soté s dusenou ryžou 150 g I1,3,7I</div></div>
                <div class="jedlo_polozka"><div class="left">7.29 €</div></div>
                <div class="jedlo_polozka"><div class="left">Jedlo dňa č.2</div></div>
                <div class="jedlo_polozka"><div class="left">Lasagne Bolognese s bazalkovým pestom |1,3,7,8,9|</div></div>
                <div class="jedlo_polozka"><div class="left">6.49 €</div></div>
                <div class="jedlo_polozka"><div class="left">Jedlo dňa č.3</div></div>
                <div class="jedlo_polozka"><div class="left">Kuracie stehno v BBQ omáčke s restovanými zemiakmi 220g/1,3,7/</div></div>
                <div class="jedlo_polozka"><div class="left">9.99 €</div></div>
            </div>
        `;

        parser.parse(html, mockDate, menu => {
            expect(menu).to.have.length(4);

            expect(menu[0].isSoup).to.equal(true);
            expect(menu[0].text).to.equal("Cesnaková krémová s krutónmi");
            expect(menu[0].price).to.equal(1.99);

            expect(menu[1].text).to.equal("Kuracie soté s dusenou ryžou");
            expect(menu[1].price).to.equal(7.29);

            expect(menu[2].text).to.equal("Lasagne bolognese s bazalkovým pestom");
            expect(menu[2].price).to.equal(6.49);

            expect(menu[3].text).to.equal("Kuracie stehno v bbq omáčke s restovanými zemiakmi");
            expect(menu[3].price).to.equal(9.99);
            done();
        });
    });

    it("parses the captured SME page snapshot with inline soup and main dish rows", (done) => {
        const html = fs.readFileSync(
            path.join(__dirname, "../../samples/kolkovna-eurovea-sme-2026-04-24.html"),
            "utf-8"
        );

        parser.parse(html, TestHelper.createMockDate("2026-04-24"), menu => {
            expect(menu).to.have.length(4);

            expect(menu[0].isSoup).to.equal(true);
            expect(menu[0].text).to.equal("Polievka domáca fazuľová s klobásou");
            expect(menu[0].price).to.equal(1.99);

            expect(menu[1].text).to.equal("Jedlo č.1 Kuracie stehno v panko strúhanke, štuchané zemiaky s cibuľou");
            expect(menu[1].price).to.equal(7.29);

            expect(menu[2].text).to.equal("Jedlo č.2 Ravioli so syrovou omáčkou a baby špenátom");
            expect(menu[2].price).to.equal(6.49);

            expect(menu[3].text).to.equal("Jedlo č.3 Kačacie prsia na batátoch s granátovým jablkom a citrusovou om.");
            expect(menu[3].price).to.equal(9.99);
            done();
        });
    });
});
