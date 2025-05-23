// Test for Mdvsr parser: price extraction for PIATOK (23.05.2025)

import { expect } from "chai";
import { Mdvsr } from "../parsers/patronka/mdvsr";
import { IMenuItem } from "../parsers/IMenuItem";
import sinon from "sinon";
import axios from "axios";
import fs from "fs";
import path from "path";

describe("Mdvsr parser (PDF price extraction)", function () {
    it("should extract prices for PIATOK (23.05.2025)", async function () {
        // Arrange: stub axios.get to return local PDF buffer
        const pdfPath = path.resolve(process.cwd(), "test/samples/jedalnylistok.pdf");
        const pdfBuffer = fs.readFileSync(pdfPath);
        const axiosStub = sinon.stub(axios, "get").resolves({ data: pdfBuffer });

        const parser = new Mdvsr();
        const date = new Date("2025-05-23T10:00:00+02:00");
        let menu: IMenuItem[] = [];
        await parser.parse("", date, (result) => { menu = result; });

        // Clean up stub
        axiosStub.restore();

        // Assert: menu items and prices for PIATOK
        const expected = [
            { text: "Šošovicová na kyslo", price: 1.00 },
            { text: "Cibuľová s pohánkou", price: 1.00 },
            { text: "Vyprážaná aljašská treska v bylinkovom obale, zemiakové pyré", price: 5.00 },
            { text: "Chalupárska kuracia panvica, dusená ryža", price: 5.00 },
            { text: "Grilovaná bravčová panenka s údenou šunkou, hermelínom a baraním rohom, pečené farmárske zemiaky", price: 5.00 },
            { text: "Vanilkový ryžový nákyp s višňami a kúskami čokolády", price: 5.00 },
            { text: "Morčacie rezance s rukolovým pestom, pečená mrkva so sézamom", price: 5.00 }
        ];

        expect(menu.length).to.equal(expected.length);

        for (let i = 0; i < expected.length; i++) {
            expect(menu[i].text).to.include(expected[i].text);
            expect(menu[i].price).to.be.closeTo(expected[i].price, 0.01);
        }
    });
});
