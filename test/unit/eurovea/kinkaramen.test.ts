import "../../../parsers/parserUtil";
import { expect } from "chai";

import { getLocationBySlug } from "../../../locations";
import { TestHelper } from "../../helpers/TestHelper";

describe("Eurovea Kinka Ramen", () => {
    it("adds Kinka Ramen to eurovea as a link-only venue with the dummy parser", (done) => {
        const restaurant = getLocationBySlug("eurovea")?.restaurants.find(x => x.name === "Kinka Ramen");

        expect(restaurant, "restaurant missing from eurovea config").to.not.equal(undefined);
        if (!restaurant) {
            return;
        }

        expect(restaurant.urlFactory(TestHelper.createMockDate("2026-03-30"))).to.equal(
            "https://www.kinkaramen.sk/menu"
        );

        restaurant.parser.parse("", TestHelper.createMockDate("2026-03-30"), menu => {
            expect(menu).to.have.length(1);
            expect(menu[0]).to.deep.include({
                price: 0,
                isSoup: true,
                isDummy: true
            });
            done();
        });
    });
});
