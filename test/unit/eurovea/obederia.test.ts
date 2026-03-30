import "../../../parsers/parserUtil";
import { expect } from "chai";

import { getLocationBySlug } from "../../../locations";
import { TestHelper } from "../../helpers/TestHelper";

describe("Eurovea Obederia", () => {
    const html = `
        <div class="day-wrapper"><div class="day-title">Pondelok (30.03.2026)</div></div>
        <div>Polievka: 0,33 l Zeleninová polievka so zemiakmi a ligurčerkom 9</div>
        <div class="price">1,50 €</div>
        <div>0,33 l Šošovicová polievka na kyslo s čerstvým kôprom 1,7,12</div>
        <div class="price">1,50 €</div>
        <div>Jedlo 1: 350 g Bryndzové pirohy s opraženou slaninou alebo mladou cibuľkou, pažítková smotana 1,3,7</div>
        <div class="price">6,90 €</div>
        <div>Cena menu = cena jedla + polievka v cene</div>
        <div class="price">0,60 €</div>
        <div class="day-wrapper"><div class="day-title">Utorok (31.03.2026)</div></div>
    `;

    it("adds Obederia to eurovea and parses soups without keeping the surcharge row", (done) => {
        const restaurant = getLocationBySlug("eurovea")?.restaurants.find(x => x.name === "OBEDERIA");

        expect(restaurant, "restaurant missing from eurovea config").to.not.equal(undefined);
        if (!restaurant) {
            return;
        }

        expect(restaurant.urlFactory(TestHelper.createMockDate("2026-03-30"))).to.equal(
            "https://menucka.sk/denne-menu/bratislava/obederia-bratislava"
        );

        restaurant.parser.parse(html, TestHelper.createMockDate("2026-03-30"), menu => {
            expect(menu).to.have.length(3);
            expect(menu[0]).to.deep.include({
                isSoup: true,
                text: "Zeleninová polievka so zemiakmi a ligurčerkom",
                price: 1.5
            });
            expect(menu[1]).to.deep.include({
                isSoup: true,
                text: "Šošovicová polievka na kyslo s čerstvým kôprom",
                price: 1.5
            });
            expect(menu[2]).to.deep.include({
                isSoup: false,
                text: "Bryndzové pirohy s opraženou slaninou alebo mladou cibuľkou, pažítková smotana",
                price: 6.9
            });
            done();
        });
    });
});
