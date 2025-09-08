import { describe, it } from "mocha";
import { expect } from "chai";
import { normalize } from "../../../parsers/patronka/bigger";
import { Bigger } from "../../../parsers/patronka/bigger";
import { IMenuItem } from "../../../parsers/IMenuItem";

describe("normalize function", () => {
    it("should remove leading numbers and punctuation", () => {
        const input = "1. ROYAL BURGER";
        const expected = "ROYAL BURGER";
        const result = normalize(input);
        expect(result).to.equal(expected);
    });

    it("should handle strings without leading numbers", () => {
        const input = "ROYAL BURGER";
        const expected = "ROYAL BURGER";
        const result = normalize(input);
        expect(result).to.equal(expected);
    });

    it("should handle empty strings", () => {
        const input = "";
        const expected = "";
        const result = normalize(input);
        expect(result).to.equal(expected);
    });

    it("should handle strings with multiple leading numbers", () => {
        const input = "123. TRIPLE CHEESE BURGER";
        const expected = "TRIPLE CHEESE BURGER";
        const result = normalize(input);
        expect(result).to.equal(expected);
    });
});

describe("Bigger parser integration", function () {
    this.timeout(20000);

    it("should fetch and parse today's menu correctly", async () => {
        const parser = new Bigger();
        let menu: IMenuItem[] = [];
        await parser.parse("", new Date(), (result) => { menu = result; });

        // Debugging: Log the menu length
        console.log("\tMenu length:", menu?.length || "Menu not initialized");

        // Basic checks
        expect(menu).to.be.an("array").that.is.not.empty;
        const dishNames = menu.map(item => item.text);
        expect(dishNames.some(name => /burger|BURGER/i.test(name))).to.be.true;
        expect(dishNames.some(name => /burrito|BURRITO/i.test(name))).to.be.true;
        expect(dishNames.some(name => /wrap|WRAP/i.test(name))).to.be.true;
        expect(dishNames.some(name => /salad|SALAD|šalát|ŠALÁT/i.test(name))).to.be.true;
    });
});
