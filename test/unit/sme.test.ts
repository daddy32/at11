import "../../parsers/parserUtil";
import { expect } from "chai";
import fs from "fs";
import path from "path";

import { Sme } from "../../parsers/sme";

class SmeProbe extends Sme {
    public parse(html: string, date: Date) {
        return this.parseBase(html, date);
    }
}

describe("Sme parser base", () => {
    let parser: SmeProbe;

    beforeEach(() => {
        parser = new SmeProbe();
    });

    it("parses classic SME rows with left and right columns into logical menu items", () => {
        const html = `
            <div class="dnesne_menu">
                <h2>Obedové menu Pondelok (30.03.2026)</h2>
                <div class="jedlo_polozka"><div class="left">Polievka</div></div>
                <div class="jedlo_polozka"><div class="left">Hubový krém s tymianom</div></div>
                <div class="jedlo_polozka"><div class="left">Hlavné jedlo</div></div>
                <div class="jedlo_polozka"><div class="left">Kurací supreme s pyré</div><div class="right">8.90</div></div>
            </div>
        `;

        const menu = parser.parse(html, new Date("2026-03-30"));

        expect(menu).to.have.length(2);
        expect(menu[0].isSoup).to.equal(true);
        expect(menu[0].text).to.equal("Hubový krém s tymianom");
        expect(Number.isNaN(menu[0].price)).to.equal(true);

        expect(menu[1].isSoup).to.equal(false);
        expect(menu[1].text).to.equal("Kurací supreme s pyré");
        expect(menu[1].price).to.equal(8.9);
    });

    it("parses inline and split SME rows from the captured Kolkovna snapshot", () => {
        const html = fs.readFileSync(
            path.join(__dirname, "../samples/kolkovna-eurovea-sme-2026-04-24.html"),
            "utf-8"
        );

        const menu = parser.parse(html, new Date("2026-04-24"));

        expect(menu).to.have.length(4);
        expect(menu[0]).to.deep.include({
            text: "Polievka Domáca fazuľová s klobásou",
            price: 1.99,
            isSoup: true
        });
        expect(menu[1]).to.deep.include({
            text: "Jedlo č.1 Kuracie stehno v panko strúhanke, štuchané zemiaky s cibuľou",
            price: 7.29,
            isSoup: false
        });
        expect(menu[2]).to.deep.include({
            text: "Jedlo č.2 Ravioli so syrovou omáčkou a baby špenátom",
            price: 6.49,
            isSoup: false
        });
        expect(menu[3]).to.deep.include({
            text: "Jedlo č.3 Kačacie prsia na batátoch s granátovým jablkom a citrusovou om.",
            price: 9.99,
            isSoup: false
        });
    });
});
