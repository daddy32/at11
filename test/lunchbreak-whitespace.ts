// Test for LunchBreak parser: whitespace between item and price

import { expect } from "chai";
import { LunchBreak } from "../parsers/patronka/lunchbreak";
import { IMenuItem } from "../parsers/IMenuItem";

describe("LunchBreak parser - whitespace handling", () => {
  it("should not drop items when whitespace separates item from price", (done) => {
    const parser = new LunchBreak();
    const testHtml = `
      <div class="et_pb_toggle_content clearfix">
        <h5>Streda 21.05.2025</h5>

        <!-- Control case: normal item -->
        <p><strong><span style="font-size: 12pt"><span style="font-size: 14pt">A,</span></span></strong><span style="font-size: 12pt">150g Kurací steak</span></p>
        <p><span style="font-size: 14pt"><strong>8,80 €</strong></span></p>

        <!-- Test case: item with whitespace before price -->
        <p><strong><span style="font-size: 12pt"><span style="font-size: 14pt">B,</span></span></strong><span style="font-size: 12pt">130g Hovädzia sviečková na smotane</span></p>
        <p>&nbsp;</p>
        <p><span style="font-size: 14pt"><strong>9,30 €</strong></span></p>
      </div>
    `;

    parser.parse(testHtml, new Date("2025-05-21"), (menu: IMenuItem[]) => {
      const items = menu.filter(item => !item.isSoup);

      // Should find both items
      expect(items).to.have.lengthOf(2, "Should find both menu items");

      // Verify first item (control case)
      expect(items[0].text).to.include("Kurací steak");
      expect(items[0].price).to.equal(8.80);

      // Verify second item (whitespace case)
      expect(items[1].text).to.include("Hovädzia sviečková");
      expect(items[1].price).to.equal(9.30);

      done();
    });
  });
});
