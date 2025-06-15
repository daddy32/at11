// Test for LunchBreak parser: soup extraction bug

import "../../../parsers/parserUtil";
import { expect } from "chai";
import { LunchBreak } from "../../../parsers/patronka/lunchbreak";
import { IMenuItem } from "../../../parsers/IMenuItem";
import { TestHelper } from "../../helpers/TestHelper";

const testHtml = `
<html>
<body>
<div class="et_pb_toggle_content clearfix">
  <h5>Štvrtok 22.05.2025</h5>
  <p><strong><span style="font-size: 14pt;color: #b87e17">POLIEVKA</span></strong></p>
  <p><span style="font-size: 12pt">0,25l  Šošovicová na kyslo, kôprový olej</span><span style="font-size: 12pt"> (7)</span></p>
  <p><span style="font-size: 12pt">0,25l   Kurací vývar so zeleninou a rezancami (1,3,9)</span><span style="font-size: 12pt"> </span></p>
  <hr>
  <p><strong><span style="font-size: 14pt;color: #b87e17">MENU</span></strong></p>
  <p><strong><span style="font-size: 12pt"><span style="font-size: 14pt">A,</span> </span></strong><span style="font-size: 12pt">150/200g    Kuracia tikka masala s kokosovým mliekom, jazmínová ryža s bylinkami, klíčky, pak choi, Naan Indický chlieb, koriander (-)</span></p>
  <p><span style="font-size: 14pt"><strong>8,80 €</strong></span></p>
</div>
</body>
</html>
`;

describe("LunchBreak Parser", () => {
  let parser: LunchBreak;
  let mockDate: Date;

  beforeEach(() => {
    parser = new LunchBreak();
    mockDate = TestHelper.createMockDate("2025-05-22");
  });

  afterEach(() => {
    TestHelper.cleanupMocks();
  });

  it("should extract both soups from the menu", (done) => {
    parser.parse(testHtml, mockDate, (menu: IMenuItem[]) => {
      const soups = menu.filter(item => item.isSoup);
      expect(soups.length).to.equal(2, "Should find exactly 2 soups");
      expect(soups[0].text).to.include("Šošovicová na kyslo");
      expect(soups[1].text).to.include("Kurací vývar");
      done();
    });
  });
});
