import { expect } from "chai";
import { Config } from "../../config";

describe("Config", () => {
    it("uses the development port when PORT is not configured", () => {
        const previousNodeEnv = process.env.NODE_ENV;
        const previousPort = process.env.PORT;
        process.env.NODE_ENV = "development";
        delete process.env.PORT;

        try {
            expect(new Config().port).to.equal(3000);
        } finally {
            if (previousNodeEnv === undefined) {
                delete process.env.NODE_ENV;
            } else {
                process.env.NODE_ENV = previousNodeEnv;
            }
            if (previousPort === undefined) {
                delete process.env.PORT;
            } else {
                process.env.PORT = previousPort;
            }
        }
    });

    it("keeps the production port when PORT is not configured", () => {
        const previousNodeEnv = process.env.NODE_ENV;
        const previousPort = process.env.PORT;
        process.env.NODE_ENV = "production";
        delete process.env.PORT;

        try {
            expect(new Config().port).to.equal(54321);
        } finally {
            if (previousNodeEnv === undefined) {
                delete process.env.NODE_ENV;
            } else {
                process.env.NODE_ENV = previousNodeEnv;
            }
            if (previousPort === undefined) {
                delete process.env.PORT;
            } else {
                process.env.PORT = previousPort;
            }
        }
    });

    it("exposes locations keyed by slug", () => {
        const config = new Config();

        expect([...config.locations.keys()]).to.deep.equal(["patronka", "eurovea"]);
        expect(config.locations.get("patronka")?.displayName).to.equal("Patrónka");
        expect(config.locations.get("eurovea")?.displayName).to.equal("Eurovea");
    });
});
