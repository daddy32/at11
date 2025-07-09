import "../../../parsers/parserUtil";
import { expect } from "chai";
import { SavDoma } from "../../../parsers/patronka/savdoma";
import { TestHelper } from "../../helpers/TestHelper";
import { MockData } from "../../helpers/MockData";

describe("SavDoma Parser", () => {
  let parser: SavDoma;
  let mockDate: Date;

  beforeEach(() => {
    parser = new SavDoma();
    mockDate = TestHelper.createMockDate("2025-05-23");
  });

  afterEach(() => {
    TestHelper.cleanupMocks();
  });

  it("should parse menu items from valid HTML", (done) => {
    const html = TestHelper.createMockHTML(MockData.validHTML.savdoma);
    parser.parse(html, mockDate, (menu) => {
      expect(menu).to.be.an("array").with.length.greaterThan(0);
      expect(menu[0]).to.have.property("text").that.is.a("string");
      expect(menu[0]).to.have.property("price").that.is.a("number");
      done();
    });
  });

  it("should handle empty HTML gracefully", (done) => {
    parser.parse("", mockDate, (menu) => {
      expect(menu).to.be.an("array");
      done();
    });
  });
it("should not produce trailing comma or space in soup text (real data)", (done) => {
  const fs = require("fs");
  const html = fs.readFileSync("test/samples/Streda__Restauracia-doma.html", "utf8");
  parser.parse(html, mockDate, (menu) => {
    // Log all menu items for visual inspection
    console.log("Parsed menu items:");
    menu.forEach((item, idx) => {
      console.log(`[${idx}] ${item.isSoup ? "[SOUP]" : "[MAIN]"} "${item.text}" (${item.price})`);
    });
    expect(menu[0].text).to.not.match(/[, ]+$/);
    done();
  });
});
});
