import "../../../parsers/parserUtil";
import { expect } from "chai";
import fs from "fs";
import path from "path";

import { Como } from "../../../parsers/eurovea/como";
import { TestHelper } from "../../helpers/TestHelper";

describe("Como Parser", () => {
    let parser: Como;
    let mockDate: Date;

    beforeEach(() => {
        parser = new Como();
        mockDate = TestHelper.createMockDate("2026-03-30");
    });

    afterEach(() => {
        TestHelper.cleanupMocks();
    });

    it("parses the captured Menucka page into a soup and two mains", (done) => {
        const html = fs.readFileSync(
            path.join(__dirname, "../../samples/como-menucka-2026-03-29.html"),
            "utf-8"
        );

        parser.parse(html, mockDate, menu => {
            expect(menu).to.have.length(3);

            const soup = menu.find(item => item.isSoup);
            expect(soup).to.not.equal(undefined);
            expect(soup?.text).to.include("Šampiňónový krém s kyslou smotanou");
            expect(soup?.text).to.include("krutóny");
            expect(soup?.text).to.not.include("[* 1, 7, 9]");
            expect(soup?.text).to.not.include("s hlavným jedlom");
            expect(soup?.price).to.equal(3.5);

            const burger = menu.find(item => item.text.includes("Burger s trhaným hovädzím mäsom"));
            expect(burger).to.not.equal(undefined);
            expect(burger?.text).to.include("čedar");
            expect(burger?.text).to.not.include("[* 1, 3, 7, 11, 12]");
            expect(burger?.text).to.not.include("|");
            expect(burger?.price).to.equal(13.9);

            const pasta = menu.find(item => item.text.includes("Maccheroni pomodoro"));
            expect(pasta).to.not.equal(undefined);
            expect(pasta?.text).to.include("sušené paradajky");
            expect(pasta?.price).to.equal(11.9);

            done();
        });
    });
});
