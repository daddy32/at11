import "../../../parsers/parserUtil";
import { expect } from "chai";

import { getLocationBySlug } from "../../../locations";
import { TestHelper } from "../../helpers/TestHelper";

describe("Eurovea Priatelia Landererova", () => {
    const html = `
        <div class="day-wrapper"><div class="day-title">Pondelok (30.03.2026)</div></div>
        <div>0,25l Silný hovädzí vývar s cestovinou /A:1,3 aj bez 1,3</div>
        <div class="price">2,00 €</div>
        <div>Menu 1:150g/200g Madarsky bravčový tokáň Halušky A1,3,7</div>
        <div class="price">7,90 €</div>
        <div class="day-wrapper"><div class="day-title">Utorok (31.03.2026)</div></div>
    `;

    it("adds the nearby Priatelia venue to eurovea and parses its Menucka menu", (done) => {
        const restaurant = getLocationBySlug("eurovea")?.restaurants.find(x => x.name === "Canteen Priatelia");

        expect(restaurant, "restaurant missing from eurovea config").to.not.equal(undefined);
        if (!restaurant) {
            return;
        }

        expect(restaurant.urlFactory(TestHelper.createMockDate("2026-03-30"))).to.equal(
            "https://menucka.sk/denne-menu/bratislava/canteen-priatelia-landererova-12"
        );

        restaurant.parser.parse(html, TestHelper.createMockDate("2026-03-30"), menu => {
            expect(menu).to.have.length(2);
            expect(menu[0]).to.deep.include({
                isSoup: true,
                text: "Silný hovädzí vývar s cestovinou",
                price: 2
            });
            expect(menu[1]).to.deep.include({
                isSoup: false,
                text: "Menu 1: Madarsky bravčový tokáň Halušky",
                price: 7.9
            });
            done();
        });
    });
});
