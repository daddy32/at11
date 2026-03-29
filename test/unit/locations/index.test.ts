import { expect } from "chai";
import { getDefaultLocation, getLocationBySlug, getLocations } from "../../../locations";

describe("locations registry", () => {
    it("exports both canonical location slugs", () => {
        expect(getLocations().map(x => x.slug)).to.deep.equal(["patronka", "eurovea"]);
    });

    it("returns patronka as the default location", () => {
        expect(getDefaultLocation().slug).to.equal("patronka");
    });

    it("resolves eurovea by slug", () => {
        expect(getLocationBySlug("eurovea")?.displayName).to.equal("Eurovea");
    });

    it("starts eurovea as a valid empty location", () => {
        const eurovea = getLocationBySlug("eurovea");

        expect(eurovea).to.not.equal(undefined);
        expect(eurovea?.restaurants).to.deep.equal([]);
    });
});
