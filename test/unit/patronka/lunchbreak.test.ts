/**
 * Test for LunchBreak parser: "(-)" allergen bug reproduction (CommonJS)
 */
const { expect } = require("chai");
const { LunchBreak } = require("../../../dist/parsers/patronka/lunchbreak.js");

const problematicInput = `
<html>
  <body>
    <div>
      <h5>Pondelok 09.06.2025</h5>
      <div>
        <p>POLIEVKA</p>
        <p>0,25l   Mrkvový krém s kokosovým mliekom (-)</p>
        <p>MENU</p>
        <p>A, 150g/200g    Kuracie prsia zabalené v prosciutte, omáčka zo zeleného korenia, jazmínová ryža, parená brokolica na masle (7) + Polievka: 0,25l  Mrkvový krém s kokosovým mliekom (-)</p>
        <p>9,30 €</p>
        <p>B, 130g/200g   Enchilades – Hovädzie ragú v tortille zapečené paradajkovou salsou a mozzarellou, americké zemiaky, šalátik, bylinkový dip  (-)  + Polievka: 0,25l Mrkvový krém s kokosovým mliekom (-)</p>
        <p>9,90 €</p>
        <p>BEZMÄSITÉ MENU</p>
        <p>C, 330g   Karfiolové karbonátky s mozzarellou, petržlenové zemiaky, domáca tatárska omáčka  (1,3,7)   + Polievka: 0,25l   Mrkvový krém s kokosovým mliekom (-)</p>
        <p>8,90 €</p>
        <p>ŠALÁT MENU</p>
        <p>330g  Šalát s grilovaným syrom Encián – Grilovaný Encián, miešany listový šalát, šalátová uhorka, chery paradajky, červená cibuľa, vlašské orechy, granátové jablko, balsamico redukcia s medom (7) + Polievka: 0,25l  Mrkvový krém s kokosovým mliekom (-)</p>
        <p>10,90 €</p>
        <p>330g  Halloumi šalát – Grilovaný halloumi syr, rukola, pečená hokaido tekvica, marínovaná cvikla, cherry paradajky, uhorkové ribony, tekvicové semiačka, horčicovo-medový dresing (7,10) + Polievka: 0,25l  Mrkvový krém s kokosovým mliekom (-)</p>
        <p>10,90 €</p>
        <p>ŠPECIAL MENU</p>
        <p>150g/200g   (3,7) + Polievka: 0,25l  Mrkvový krém s kokosovým mliekom (-)</p>
        <p>10,90 €</p>
        <p>150g/200g    + Polievka: 0,25l</p>
        <p>9,90 €</p>
      </div>
    </div>
  </body>
</html>
`;

describe("LunchBreak parser allergen bug", function () {
  it("should not include (-) at the end of menu items", function (done) {
    const parser = new LunchBreak();
    const date = new Date("2025-06-09");
    parser.parse(problematicInput, date, function (menu) {
      // Check that no menu item text ends with "(-)"
      for (const item of menu) {
        expect(item.text.trim().endsWith("(-)")).to.be.false;
      }
      done();
    });
  });
});
