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
            name: "Plná miska",
            url: "https://www.instagram.com/plnamiska.bratislava/?__d=11"
        },
        {
            name: "KFC",
            url: "https://www.kfcslovakia.sk/produkty"
        },
        {
            name: "Sunshine",
            url: "https://www.bistro.sk/restauracia/sunshine-eurovea-2"
        },
        {
            name: "Mondieu",
            url: "https://mondieu.sk/menu/bratislava/eurovea/"
        },
        {
            name: "Konn Steakbar",
            url: "https://www.konn.sk/menu/?gad_source=1&gad_campaignid=23695352384&gbraid=0AAAAAqZFlo3L1C8XizloB-NjJA7jlqgO3&gclid=CjwKCAjwvqjOBhAGEiwAngeQnS-H6L1Mljai2hwHTEVxHvXLZ7Jh9wXuKTomRQA_bTsxAX2DyCKHgxoC_gAQAvD_BwE&filter_product_cat=specialitky"
        },
        {
            name: "Rams",
            url: "https://ramsfood.sk/menu/section:menu/predjedla"
        },
        {
            name: "McDonalds",
            url: "https://www.mcdonalds.sk/menu/"
        },
        {
            name: "Al Faro",
            url: "https://www.sassy.sk/upload/files/Alfaro_menu_jun_2025_web_1750845421.pdf"
        },
        {
            name: "Le Bar",
            url: "https://sassy.sk/upload/files/HM_SK_12_25_web_1765192653.pdf"
        },
        {
            name: "Sajado",
            url: "https://www.sajado.sk/sajado-eurovea#jedalny-listok-1"
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
