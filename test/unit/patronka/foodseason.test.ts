import "../../../parsers/parserUtil";
import { expect } from "chai";
import { Foodseason } from "../../../parsers/patronka/foodseason";
import { TestHelper } from "../../helpers/TestHelper";
import { MockData } from "../../helpers/MockData";

describe("Foodseason Parser", () => {
  let parser: Foodseason;
  let mockDate: Date;

  beforeEach(() => {
    parser = new Foodseason();
    // 2025-05-23 is a Friday ("piatok" in Slovak)
    mockDate = TestHelper.createMockDate("2025-05-23");
  });

  afterEach(() => {
    TestHelper.cleanupMocks();
  });

  it("should parse menu items from valid HTML", (done) => {
    const html = TestHelper.createMockHTML(MockData.validHTML.foodseason);
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
});
