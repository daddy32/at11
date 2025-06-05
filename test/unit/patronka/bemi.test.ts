import "../../../parsers/parserUtil";
import { expect } from "chai";
import { Bemi } from "../../../parsers/patronka/bemi";
import { TestHelper } from "../../helpers/TestHelper";

describe("Bemi Parser", () => {
  let parser: Bemi;
  let mockDate: Date;

  beforeEach(() => {
    parser = new Bemi();
    // Use a Monday for deterministic tab-content index
    mockDate = TestHelper.createMockDate("2025-05-19");
  });

  afterEach(() => {
    TestHelper.cleanupMocks();
  });

  it("should extract menu items and prices from valid HTML", (done) => {
    // Simulate the expected HTML structure for Bemi
    const html = TestHelper.createMockHTML(
      '<div id="ktmain"><div class="entry-content"><div class="tab-content">' +
      '<div><p>Polievka 1,50 €</p><p>Menu 5,90 €</p></div>' +
      '<div><p>Polievka 2,00 €</p><p>Menu 6,50 €</p></div>' +
      '</div></div></div>'
    );
    parser.parse(html, mockDate, (menu) => {
      expect(menu).to.be.an("array").with.length.greaterThan(0);
      expect(menu[0]).to.have.property("text").that.is.a("string");
      expect(menu[0]).to.have.property("price").that.is.a("number");
      expect(menu.some(item => item.price === 1.5)).to.be.true;
      expect(menu.some(item => item.price === 5.9)).to.be.true;
      done();
    });
  });

  it("should handle empty HTML gracefully", (done) => {
    parser.parse("", mockDate, (menu) => {
      expect(menu).to.be.an("array");
      done();
    });
  });

  it("should skip junk/empty lines", (done) => {
    const html = TestHelper.createMockHTML(
      '<div id="ktmain"><div class="entry-content"><div class="tab-content">' +
      '<div><p>   </p><p>Menu 5,90 €</p></div>' +
      '</div></div></div>'
    );
    parser.parse(html, mockDate, (menu) => {
      expect(menu.some(item => item.text.trim() === "")).to.be.false;
      done();
    });
  });
});
