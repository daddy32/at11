import { expect } from "chai";
import { Config } from "../../config";

describe("Config", () => {
    it("exposes locations keyed by slug", () => {
        const config = new Config();

        expect([...config.locations.keys()]).to.deep.equal(["patronka", "eurovea"]);
        expect(config.locations.get("patronka")?.displayName).to.equal("Patrónka");
        expect(config.locations.get("eurovea")?.displayName).to.equal("Eurovea");
    });
});
