import "../../../parsers/parserUtil";
import { expect } from "chai";

import { Kari } from "../../../parsers/patronka/kari";
import { TestHelper } from "../../helpers/TestHelper";

describe("Kari Parser", () => {
    let parser: Kari;
    let mockDate: Date;

    beforeEach(() => {
        parser = new Kari();
        mockDate = TestHelper.createMockDate("2026-03-30");
    });

    afterEach(() => {
        TestHelper.cleanupMocks();
    });

    it("keeps parsing classic SME rows after the shared SME refactor", (done) => {
        const html = `
            <div class="dnesne_menu">
                <h2>Obedové menu Pondelok (30.03.2026)</h2>
                <div class="jedlo_polozka"><div class="left">Polievka</div></div>
                <div class="jedlo_polozka"><div class="left">Tom kha gai 0,33 l |1,7| 2.50 €</div></div>
                <div class="jedlo_polozka"><div class="left">Hlavné jedlo</div></div>
                <div class="jedlo_polozka"><div class="left">1. Kuracie kari s ryžou |1,7| 8.90 €</div></div>
            </div>
        `;

        parser.parse(html, mockDate, menu => {
            expect(menu).to.have.length(2);
            expect(menu[0].isSoup).to.equal(true);
            expect(menu[0].text).to.equal("Tom kha gai");
            expect(menu[1].isSoup).to.equal(false);
            expect(menu[1].text).to.equal("Kuracie kari s ryžou");
            done();
        });
    });
});
