import { expect } from "chai";
import fs from "fs";
import path from "path";

import { IMenuItem } from "../../../parsers/IMenuItem";
import { KolkovnaEurovea } from "../../../parsers/eurovea/kolkovnaeurovea";

const snapshot = fs.readFileSync(
    path.join(__dirname, "../../samples/kolkovna-eurovea-official-2026-10-05.html"),
    "utf-8"
);

function parseFor(date: Date, html = snapshot): IMenuItem[] {
    let result: IMenuItem[] = [];
    new KolkovnaEurovea().parse(html, date, menu => { result = menu; });
    return result;
}

describe("Kolkovna Eurovea official menu parser", () => {
    it("extracts Monday's soup and three mains from the restaurant page", () => {
        expect(parseFor(new Date(2026, 9, 5))).to.deep.equal([
            { text: "Karfiolová na kyslo", price: 1.99, isSoup: true },
            { text: "Bravčové pliecko po bratislavsky s kolienkami", price: 7.29, isSoup: false },
            { text: "Gnocchi s kuracím mäsom a nivovou omáčkou", price: 6.49, isSoup: false },
            { text: "Medailónky z panenky s duseným špenátom a pečenými zemiakmi", price: 9.99, isSoup: false }
        ]);
    });

    it("selects the requested day rather than the active day", () => {
        const menu = parseFor(new Date(2026, 9, 9));
        expect(menu).to.have.length(4);
        expect(menu[0]).to.deep.equal({ text: "Hlivová polievka", price: 1.99, isSoup: true });
        expect(menu[1].text).to.equal("Kurací gyros s hranolkami a zeleninovým šalátom");
        expect(menu[2].text).to.equal("Lokše s kačacou pečienkou a cibuľkou");
    });

    it("returns no menu for a date outside the published week", () => {
        expect(parseFor(new Date(2026, 9, 12))).to.deep.equal([]);
    });
});
