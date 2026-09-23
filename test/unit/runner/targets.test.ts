import { expect } from "chai";

import { getRunnerTargets } from "../../../runner/targets";

describe("runner target selection", () => {
    it("preserves requested source order and uses the configured restaurants", () => {
        const targets = getRunnerTargets(["eurovea-4", "eurovea-1"]);

        expect(targets.map(target => target.sourceId)).to.deep.equal(["eurovea-4", "eurovea-1"]);
        expect(targets.map(target => target.restaurantName)).to.deep.equal(["Kolkovna Eurovea", "DOCK7"]);
    });

    it("names an unknown source ID in the error", () => {
        expect(() => getRunnerTargets(["missing-99"])).to.throw("missing-99");
    });
});
