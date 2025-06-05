import "../../../parsers/parserUtil";
import { expect } from "chai";
import { Dummy } from "../../../parsers/patronka/dummy";
import { TestHelper } from "../../helpers/TestHelper";

describe("Dummy Parser", () => {
  let parser: Dummy;
  let mockDate: Date;

  beforeEach(() => {
    parser = new Dummy();
    mockDate = TestHelper.createMockDate("2025-05-23");
  });

  afterEach(() => {
    TestHelper.cleanupMocks();
  });

  it("should return a single menu item with placeholder text", (done) => {
    parser.parse("", mockDate, (menu) => {
      expect(menu).to.be.an("array").with.lengthOf(1);
      expect(menu[0].text).to.include("Klik");
      expect(menu[0].isSoup).to.be.true;
      done();
    });
  });
});
