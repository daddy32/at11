import { describe, it } from "mocha";
import { expect } from "chai";
import { normalize } from "../../../parsers/patronka/bigger";

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
