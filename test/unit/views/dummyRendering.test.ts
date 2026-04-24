import { expect } from "chai";
import { readFileSync } from "fs";

describe("dummy menu rendering", () => {
    it("marks dummy menu rows in the script and scopes the CSS tweaks to dummy-only articles", () => {
        const script = readFileSync("static/script.js", "utf8");
        const style = readFileSync("static/style.css", "utf8");

        expect(script).to.include('if (item.isDummy) {');
        expect(script).to.include('li.addClass("dummy-item")');
        expect(script).to.include('li.attr("title", item.tooltip)');
        expect(script).to.include('article.addClass("dummy-menu")');
        expect(script).to.include('article.removeClass("dummy-menu")');
        expect(script).to.include('columnWidth: ".grid-sizer"');
        expect(script).to.include("gutter: 20");
        expect(script).to.include('itemSelector: "article"');

        expect(style).to.include("article.dummy-menu ul li.dummy-item");
        expect(style).to.include("font-size: 1em;");
        expect(style).to.include("article.dummy-menu ul li.dummy-item span");
        expect(style).to.include("text-align: center;");
        expect(style).to.include("article.dummy-menu ul li.dummy-item.soup:before");
        expect(style).to.include("display: none;");
        expect(style).to.include("article.dummy-menu > i.timeago");
        expect(style).to.include("article.dummy-menu h2");
        expect(style).to.include("font-size: 2em;");
        expect(style).to.include("margin: 0 0 20px;");
        expect(style).to.include("box-sizing: border-box;");
        expect(style).to.include(".grid-sizer {");
        expect(style).to.include("width: calc((33em - 20px) / 2);");
        expect(style).to.include("article.dummy-menu {");
        expect(style).to.include("width: calc((33em - 20px) / 2);");
    });

    it("keeps today's menu visible until 16:00 before switching to tomorrow", () => {
        const script = readFileSync("static/script.js", "utf8");

        expect(script).to.include("var MENU_ROLLOVER_HOUR = 16;");
        expect(script).to.include("if (date.getHours() >= MENU_ROLLOVER_HOUR) {");
        expect(script).to.not.include("if (date.getHours() >= 16) {");
    });
});
