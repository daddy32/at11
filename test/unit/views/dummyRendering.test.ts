import { expect } from "chai";
import { readFileSync } from "fs";

describe("dummy menu rendering", () => {
    it("marks dummy menu rows in the script and scopes the CSS tweaks to dummy-only articles", () => {
        const script = readFileSync("static/script.js", "utf8");
        const style = readFileSync("static/style.css", "utf8");

        expect(script).to.include('if (item.isDummy) {');
        expect(script).to.include('li.addClass("dummy-item")');
        expect(script).to.include('article.addClass("dummy-menu")');
        expect(script).to.include('article.removeClass("dummy-menu")');

        expect(style).to.include("article.dummy-menu ul li.dummy-item");
        expect(style).to.include("font-size: 1em;");
        expect(style).to.include("article.dummy-menu ul li.dummy-item.soup:before");
        expect(style).to.include("display: none;");
        expect(style).to.include("article.dummy-menu > i.timeago");
        expect(style).to.include("article.dummy-menu h2");
        expect(style).to.include("font-size: 2em;");
        expect(style).to.include("article.dummy-menu {");
        expect(style).to.include("width: 15em;");
    });
});
