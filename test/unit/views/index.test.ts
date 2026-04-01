import { expect } from "chai";
import { readFileSync } from "fs";

describe("index view", () => {
    it("omits the ERNI header link and uses the expanded D32 footer text", () => {
        const template = readFileSync("views/index.html", "utf8");

        expect(template).to.not.include("https://www.betterask.erni/");
        expect(template).to.not.include("img/erni_logo.png");
        expect(template).to.include("Eurovea and Patrónka versions by D32");
        expect(template).to.not.include("Patrónka version by D32");
    });

    it("renders dummy restaurants with the dummy-menu class immediately", () => {
        const template = readFileSync("views/index.html", "utf8");

        expect(template).to.include('<article data-restaurant-id="{{this.id}}" {{#if this.isDummy}}class="dummy-menu"{{/if}}>');
    });
});
