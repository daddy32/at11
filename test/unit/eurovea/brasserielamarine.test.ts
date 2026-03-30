import "../../../parsers/parserUtil";
import { expect } from "chai";

import { BrasserieLaMarine } from "../../../parsers/eurovea/brasserielamarine";
import { TestHelper } from "../../helpers/TestHelper";

describe("Brasserie La Marine Parser", () => {
    let parser: BrasserieLaMarine;
    let mockDate: Date;

    beforeEach(() => {
        parser = new BrasserieLaMarine();
        mockDate = TestHelper.createMockDate("2026-03-30");
    });

    afterEach(() => {
        TestHelper.cleanupMocks();
    });

    it("parses the current SME menu structure with section labels but no prices", (done) => {
        const html = `
            <div class="dnesne_menu">
                <h2>Obedové menu Pondelok (30.03.2026)</h2>
                <div class="jedlo_polozka"><div class="left"><b>Polievka</b></div></div>
                <div class="jedlo_polozka"><div class="left">Hubový krém s tymianom</div></div>
                <div class="jedlo_polozka"><div class="left"><b>Hlavné jedlo</b></div></div>
                <div class="jedlo_polozka"><div class="left">Kurací supreme s kukuričným pyré, smotanovo-horčicová omáčka</div></div>
            </div>
        `;

        parser.parse(html, mockDate, menu => {
            expect(menu).to.have.length(2);

            expect(menu[0].isSoup).to.equal(true);
            expect(menu[0].text).to.equal("Hubový krém s tymianom");
            expect(Number.isNaN(menu[0].price)).to.equal(true);

            expect(menu[1].isSoup).to.equal(false);
            expect(menu[1].text).to.equal("Kurací supreme s kukuričným pyré, smotanovo-horčicová omáčka");
            expect(Number.isNaN(menu[1].price)).to.equal(true);
            done();
        });
    });
});
