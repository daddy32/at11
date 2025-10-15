import { describe, it } from "mocha";
import { expect } from "chai";
import { normalize, normalizeDescription, Bigger } from "../../../parsers/patronka/bigger";
import { IMenuItem } from "../../../parsers/IMenuItem";

describe("normalize function", () => {
    it("should convert to Title Case and remove leading numbers", () => {
        const input = "1. ROYAL BURGER";
        const expected = "Royal Burger";
        const result = normalize(input);
        expect(result).to.equal(expected);
    });

    it("should convert uppercase strings to Title Case", () => {
        const input = "ROYAL BURGER";
        const expected = "Royal Burger";
        const result = normalize(input);
        expect(result).to.equal(expected);
    });

    it("should handle empty strings", () => {
        const input = "";
        const expected = "";
        const result = normalize(input);
        expect(result).to.equal(expected);
    });

    it("should handle multiple leading numbers and convert to Title Case", () => {
        const input = "123. TRIPLE CHEESE BURGER";
        const expected = "Triple Cheese Burger";
        const result = normalize(input);
        expect(result).to.equal(expected);
    });

    it("should trim trailing whitespace and convert to Title Case", () => {
        const input = "BLUE CHEESE BURGER    ";
        const expected = "Blue Cheese Burger";
        const result = normalize(input);
        expect(result).to.equal(expected);
    });

    it("should remove allergen codes at the end", () => {
        expect(normalize("BLUE CHEESE BURGER 1,3,7")).to.equal("Blue Cheese Burger");
        expect(normalize("ROYAL BURGER (A: 1,3,7)")).to.equal("Royal Burger");
        expect(normalize("CAESAR ŠALÁT A-1,3,7,10")).to.equal("Caesar Šalát");
    });

    it("should handle diacritics correctly in Title Case", () => {
        const input = "ŠALÁT S KURACÍM MÄSOM";
        const expected = "Šalát S Kuracím Mäsom";
        const result = normalize(input);
        expect(result).to.equal(expected);
    });

    it("should preserve dashes and convert surrounding text to Title Case", () => {
        const input = "KURACÍ-HOVÄDZÍ BURGER";
        const expected = "Kurací-Hovädzí Burger";
        const result = normalize(input);
        expect(result).to.equal(expected);
    });
});

describe("Bigger parser integration", function () {
    this.timeout(1200000); // Increased timeout to 20 minutes to handle long-running tests

    it("should fetch and parse today's menu correctly", async () => {
        const parser = new Bigger();
        const menu = await new Promise<IMenuItem[]>((resolve, reject) => {
            parser.parse("", new Date(), (result) => {
                if (result) resolve(result);
                else reject(new Error("Failed to parse menu"));
            });
        });

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

    it("should not add '– ' prefix to non-soup items", async function () {
        this.timeout(10000); // Increase timeout to handle longer operations
        const parser = new Bigger();
        const menu: IMenuItem[] = await new Promise((resolve, reject) => {
            parser.parse("", new Date(), (result) => {
                if (result) resolve(result);
                else reject(new Error("Failed to parse menu"));
            });
        });

        // Validate non-soup items
        const nonSoupItems = menu.filter(item => !item.isSoup);
        nonSoupItems.forEach(item => {
            expect(item.text.startsWith("– ")).to.equal(false);
        });
    });
});

describe("normalizeDescription function", () => {
    it("should remove metric measurements", () => {
        const input = "Briošková žemľa, 100g hovädzie mäso, 0.33l cola";
        const expected = "Briošková žemľa, hovädzie mäso, cola";
        expect(normalizeDescription(input)).to.equal(expected);
    });

    it("should remove allergen listings", () => {
        expect(normalizeDescription("(A: 1,3,7) kurací vývar")).to.equal("kurací vývar");
        expect(normalizeDescription("hovädzie (Alergény: 1,7)")).to.equal("hovädzie");
        expect(normalizeDescription("A-1,3,7 kuracie prsia")).to.equal("kuracie prsia");
    });

    it("should clean up extra spaces and commas", () => {
        const input = "hovädzie  mäso ,  zelenina  ,   ryža  ";
        const expected = "hovädzie mäso, zelenina, ryža";
        expect(normalizeDescription(input)).to.equal(expected);
    });
});
