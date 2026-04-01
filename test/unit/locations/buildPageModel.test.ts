import { expect } from "chai";
import { buildPageModel } from "../../../locations/buildPageModel";
import { euroveaLocation, patronkaLocation } from "../../../locations";

describe("buildPageModel", () => {
    it("builds canonical nav links from slugs", () => {
        const model = buildPageModel(
            patronkaLocation,
            [patronkaLocation, euroveaLocation],
            new Date("2026-03-24")
        );

        expect(model.locations.map(x => x.href)).to.deep.equal(["/patronka", "/eurovea"]);
        expect(model.restaurants.every(x => x.id.startsWith("patronka-"))).to.equal(true);
    });

    it("uses slug-based restaurant ids for client state isolation", () => {
        const model = buildPageModel(
            euroveaLocation,
            [patronkaLocation, euroveaLocation],
            new Date("2026-03-24")
        );

        expect(model.restaurants.every(x => x.id.startsWith("eurovea-"))).to.equal(true);
    });

    it("exposes dummy restaurants in the page model for initial tile styling", () => {
        const model = buildPageModel(
            euroveaLocation,
            [patronkaLocation, euroveaLocation],
            new Date("2026-03-24")
        );

        const dummyRestaurantNames = [
            "Kinka Ramen",
            "Iná Haluška",
            "Regal Burger",
            "Chilantro",
            "Plná miska",
            "KFC",
            "Sunshine",
            "Mondieu",
            "Konn Steakbar",
            "Rams",
            "McDonalds",
            "Al Faro",
            "Le Bar",
            "Sajado"
        ];

        expect(
            model.restaurants.filter(x => x.isDummy).map(x => x.name)
        ).to.deep.equal(dummyRestaurantNames);
    });
});
