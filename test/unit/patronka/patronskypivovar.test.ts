import "../../../parsers/parserUtil";
import { expect } from "chai";

import { PatronskyPivovar } from "../../../parsers/patronka/patronskypivovar";
import { TestHelper } from "../../helpers/TestHelper";

describe("Patronsky Pivovar Parser", () => {
    let parser: PatronskyPivovar;
    let mockDate: Date;

    beforeEach(() => {
        parser = new PatronskyPivovar();
        mockDate = TestHelper.createMockDate("2026-03-30");
    });

    afterEach(() => {
        TestHelper.cleanupMocks();
    });

    it("keeps parsing classic SME rows with prices after the shared SME refactor", (done) => {
        const html = `
            <div class="dnesne_menu">
                <h2>Obedové menu Pondelok (30.03.2026)</h2>
                <div class="jedlo_polozka"><div class="left">Polievka</div></div>
                <div class="jedlo_polozka"><div class="left">Gulášová 0,33 l |1| 2.20 €</div></div>
                <div class="jedlo_polozka"><div class="left">Hlavné jedlo</div></div>
                <div class="jedlo_polozka"><div class="left">Bravčový rezeň, zemiakový šalát |1,3,7| 9.50 €</div></div>
            </div>
        `;

        parser.parse(html, mockDate, menu => {
            expect(menu).to.have.length(2);
            expect(menu[0]).to.deep.include({
                text: "Gulášová",
                price: 2.2,
                isSoup: true
            });
            expect(menu[1]).to.deep.include({
                text: "Bravčový rezeň, zemiakový šalát",
                price: 9.5,
                isSoup: false
            });
            done();
        });
    });
});
