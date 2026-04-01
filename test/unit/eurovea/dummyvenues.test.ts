import "../../../parsers/parserUtil";
import { expect } from "chai";

import { getLocationBySlug } from "../../../locations";
import { TestHelper } from "../../helpers/TestHelper";

describe("Eurovea dummy venues", () => {
    const dummyVenues = [
        {
            name: "Regal Burger",
            url: "https://www.menucka.sk/denne-menu/bratislava/regal-burger-eurovea-2"
        },
        {
            name: "Chilantro",
            url: "https://oceurovea.chilantro.sk/section:menu"
        },
        {
            name: "Plna miska",
            url: "https://www.instagram.com/plnamiska.bratislava/?__d=11"
        },
        {
            name: "KFC",
            url: "https://www.kfcslovakia.sk/produkty"
        }
    ];

    for (const dummyVenue of dummyVenues) {
        it(`adds ${dummyVenue.name} to eurovea as a link-only venue with the dummy parser`, (done) => {
            const restaurant = getLocationBySlug("eurovea")?.restaurants.find(x => x.name === dummyVenue.name);

            expect(restaurant, "restaurant missing from eurovea config").to.not.equal(undefined);
            if (!restaurant) {
                return;
            }

            expect(restaurant.urlFactory(TestHelper.createMockDate("2026-03-30"))).to.equal(dummyVenue.url);

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
    }
});
