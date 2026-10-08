import "../../../parsers/parserUtil";
import { expect } from "chai";

import { Kari } from "../../../parsers/patronka/kari";
import { SME_TAVILY_MARKDOWN_PREFIX } from "../../../parsers/sme";
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

    it("parses unlabelled current-day dishes from Tavily markdown", (done) => {
        const markdown = `${SME_TAVILY_MARKDOWN_PREFIX}## Obedové menu Štvrtok (08.10.2026)

Mexická paradajková polievka s limetou a tortillami /A9/
Indické VEGAN Aloo Gobi s karfiolom, baby zemiakmi a hráškom
Kuracie stehná v rogan josh omáčke s bylinkovým jogurtom /A7/
Cícerový šalát s tahini, uhorkou a paradajkami /A11/`;

        parser.parse(markdown, new Date("2026-10-08T00:00:00.000Z"), menu => {
            expect(menu.map(item => item.text)).to.deep.equal([
                "Mexická paradajková polievka s limetou a tortillami",
                "Indické VEGAN Aloo Gobi s karfiolom, baby zemiakmi a hráškom",
                "Kuracie stehná v rogan josh omáčke s bylinkovým jogurtom",
                "Cícerový šalát s tahini, uhorkou a paradajkami"
            ]);
            expect(menu.map(item => item.isSoup)).to.deep.equal([true, false, false, false]);
            done();
        });
    });

    it("stops parsing the Tavily section at the end-of-menu link", (done) => {
        const markdown = `${SME_TAVILY_MARKDOWN_PREFIX}## Denné menu Štvrtok (08.10.2026)

Poctivá ostro-kyslá polievka s kuracím vývarom a tofu
Indický VEGAN Dhal z červenej šošovice s pečenou cviklou
Indické maslové Butter Chicken s kuracími stehnami
Ázijský kapustový šalát[Zobraziť celý týždeň](https://restauracie.sme.sk/restauracia/svadby-a-kari-patronka_10341-stare-mesto_2949/denne-menu#)
Celkové hodnotenie: dobré Jedlo: Obsluha: Atmosféra: Ceny:
[Zobraziť hodnotenia(5)](https://restauracie.sme.sk/restauracia/svadby-a-kari-patronka_10341-stare-mesto_2949#hodnotenia)
[Caffe Restaurant 66](https://restauracie.sme.sk/restauracia/caffe-66_472-bratislava_2983), Bratislava`;

        parser.parse(markdown, new Date("2026-10-08T00:00:00.000Z"), menu => {
            expect(menu.map(item => item.text)).to.deep.equal([
                "Poctivá ostro-kyslá polievka s kuracím vývarom a tofu",
                "Indický VEGAN Dhal z červenej šošovice s pečenou cviklou",
                "Indické maslové Butter Chicken s kuracími stehnami",
                "Ázijský kapustový šalát"
            ]);
            done();
        });
    });
});
