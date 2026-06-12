import { expect } from "chai";
import sinon from "sinon";
import NodeCache from "node-cache";

import { createStartupCache } from "../../cacheFactory";

describe("createStartupCache", () => {
    afterEach(() => {
        sinon.restore();
    });

    it("flushes the whole in-memory cache on app startup", () => {
        const flushAllStub = sinon.stub(NodeCache.prototype, "flushAll");

        const cache = createStartupCache(7200);

        expect(cache).to.be.instanceOf(NodeCache);
        expect(flushAllStub.calledOnce).to.equal(true);
    });
});
