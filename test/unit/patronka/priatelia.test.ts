import "../../../parsers/parserUtil";
import { expect } from "chai";
import { Priatelia } from "../../../parsers/patronka/priatelia";
import { TestHelper } from "../../helpers/TestHelper";
import fs from "fs";
import path from "path";
import * as cheerio from "cheerio";

describe("Priatelia Parser", () => {
  let parser: Priatelia;
  let mockDate: Date;

  beforeEach(() => {
    parser = new Priatelia();
    // Use a date that matches the real HTML sample: Pondelok (02.06.2025)
    mockDate = TestHelper.createMockDate("2025-06-02");
  });

  afterEach(() => {
    TestHelper.cleanupMocks();
  });

  it("DEBUG: inspect .day-title and parent structure", () => {
    const html = fs.readFileSync(path.join(__dirname, "../../samples/priatelia-real.html"), "utf-8");
    const $ = cheerio.load(html);
    $(".day-title").each((i, elem) => {
      const node = $(elem);
      console.log(`.day-title[${i}]:`, node.text());
      const parent = node.parent();
      console.log("  parent tag:", parent[0]?.tagName);
      console.log("  parent html:", parent.html()?.slice(0, 500));
      const next = parent.next();
      console.log("  parent's next tag:", next[0]?.tagName);
      console.log("  parent's next html:", next.html()?.slice(0, 500));
    });
  });

  it("should parse real menu HTML and extract menu items", (done) => {
    const html = fs.readFileSync(path.join(__dirname, "../../samples/priatelia-real.html"), "utf-8");
    parser.parse(html, mockDate, (menu) => {
      expect(menu).to.be.an("array").with.length.greaterThan(0);
      expect(menu[0]).to.have.property("text").that.is.a("string");
      expect(menu[0]).to.have.property("price");
      done();
    });
  });

  it("should correctly parse Friday (06.06.2025) menu items as single entries (description + price)", (done) => {
    const html = fs.readFileSync(
      path.join(__dirname, "../../samples/priatelia-real.html"),
      "utf-8"
    );
    const parser = new Priatelia();
    const mockDate = TestHelper.createMockDate("2025-06-06");
    parser.parse(html, mockDate, (menu) => {
      // Expect each menu item to have both text and price, not split into two entries
      const hasSplit = menu.some(
        (item, idx, arr) =>
          item.text &&
          (!item.price || item.price === 0) &&
          arr[idx + 1] &&
          arr[idx + 1].price &&
          !arr[idx + 1].text
      );
      // Should not find any split description/price pairs
      expect(hasSplit).to.equal(false);
      // Should find at least one menu item for Friday
      expect(menu.length).to.be.greaterThan(0);
      done();
    });
  });

  it("should remove trailing allergen markers like 1,3/ from menu item text", (done) => {
    const html = fs.readFileSync(
      path.join(__dirname, "../../samples/priatelia-menucka.html"),
      "utf-8"
    );
    const todayDate = TestHelper.createMockDate("2026-01-12");
    parser.parse(html, todayDate, (menu) => {
      expect(menu.length).to.be.greaterThan(0);
      const trailingPattern = /\d{1,2}(?:,\d{1,2})*\/\s*$/;
      const hasTrailingAllergens = menu.some((item) =>
        trailingPattern.test(item.text || "")
      );
      expect(hasTrailingAllergens).to.equal(false);
      done();
    });
  });
});
