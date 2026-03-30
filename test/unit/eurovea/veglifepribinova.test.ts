import "../../../parsers/parserUtil";
import { expect } from "chai";

import { getLocationBySlug } from "../../../locations";
import { TestHelper } from "../../helpers/TestHelper";

describe("Eurovea Veg life Pribinova", () => {
    const html = `
        <div class="day-wrapper"><div class="day-title">Pondelok (30.03.2026)</div></div>
        <div>Polievka: Miso zeleninový vývar s tofu (B,V)</div>
        <div>1. Gnocchi s krémovou ricottovo - paradajkovou omáčkou [1,3,7]</div>
        <div>2. Šošovicový guláš s pečenou hlivou, ryža jasmínová B,V [9]</div>
        <div>Šalát: Feniklový s hráškom B,V</div>
        <div>Dezert: RAW zdrawáčik B,V [8]</div>
        <div class="day-wrapper"><div class="day-title">Utorok (31.03.2026)</div></div>
    `;

    it("adds Veg life Pribinova to eurovea and reuses the menu parser on Menucka markup", (done) => {
        const restaurant = getLocationBySlug("eurovea")?.restaurants.find(x => x.name === "Veg life");

        expect(restaurant, "restaurant missing from eurovea config").to.not.equal(undefined);
        if (!restaurant) {
            return;
        }

        expect(restaurant.urlFactory(TestHelper.createMockDate("2026-03-30"))).to.equal(
            "https://menucka.sk/denne-menu/bratislava/veg-life-pribinova"
        );

        restaurant.parser.parse(html, TestHelper.createMockDate("2026-03-30"), menu => {
            expect(menu).to.have.length(5);
            expect(menu[0]).to.deep.include({
                isSoup: true,
                text: "Miso zeleninový vývar s tofu"
            });
            expect(menu[1].text).to.equal("Gnocchi s krémovou ricottovo - paradajkovou omáčkou");
            expect(menu[2].text).to.equal("Šošovicový guláš s pečenou hlivou, ryža jasmínová");
            expect(menu[3].text).to.equal("Šalát: Feniklový s hráškom");
            expect(menu[4].text).to.equal("Dezert: RAW zdrawáčik");
            done();
        });
    });
});
