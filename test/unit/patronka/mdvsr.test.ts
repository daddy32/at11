// Test for Mdvsr parser: price extraction for PIATOK (23.05.2025)

import "../../../parsers/parserUtil";
import { expect } from "chai";
import { Mdvsr } from "../../../parsers/patronka/mdvsr";
import { IMenuItem } from "../../../parsers/IMenuItem";
import { TestHelper } from "../../helpers/TestHelper";
import sinon from "sinon";
import axios from "axios";
import fs from "fs";
import path from "path";

describe("Mdvsr Parser (PDF price extraction)", function () {
    beforeEach(() => {
        TestHelper.cleanupMocks();
    });

    afterEach(() => {
        TestHelper.cleanupMocks();
    });

    it("should extract prices for PIATOK (23.05.2025)", async function () {
        // Arrange: stub axios.get to return local PDF buffer
        const pdfPath = path.resolve(process.cwd(), "test/samples/jedalnylistok.pdf");
        const pdfBuffer = fs.readFileSync(pdfPath);
        const axiosStub = TestHelper.mockAxiosResponse(pdfBuffer);

        const parser = new Mdvsr();
        const date = TestHelper.createMockDate("2025-05-23");
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

    describe("Mdvsr parser (PDF price extraction)", function () {
        it("should extract all items for PIATOK (30.05.2025)", async function () {
            // Arrange: stub axios.get to return local PDF buffer
            const pdfPath = path.resolve(process.cwd(), "test/samples/jedalnylistok_2025-05-30.pdf");
            const pdfBuffer = fs.readFileSync(pdfPath);
            const axiosStub = TestHelper.mockAxiosResponse(pdfBuffer);

            const parser = new Mdvsr();
            const date = TestHelper.createMockDate("2025-05-30");
            let menu: IMenuItem[] = [];
            await parser.parse("", date, (result) => { menu = result; });

            // Clean up stub
            axiosStub.restore();

            // Assert: menu items and prices for PIATOK
            const expected = [
                { text: "Fazuľová na kyslo", price: 1.00 },
                { text: "Kelová so zemiakmi", price: 1.00 },
                { text: "Marinovaný losos, dusená zelenina, pečené zemiaky", price: 6.00 },
                { text: "Pečené sedliacke bravčové rebro na kapustných strapačkách", price: 5.00 },
                { text: "Kurací paprikáš, maslové halušky", price: 5.00 },
                { text: "Domáce pirohy so slivkovým lekvárom a opečenou škoricovou strúhankou", price: 5.00 },
                { text: "Grilovaná bravčová panenka s pečeným cesnakom, pečená zelenina", price: 5.00 }
            ];

            // Check that all expected items are present in the parsed menu
            for (const exp of expected) {
                const found = menu.find(
                    m => m.text.includes(exp.text) && Math.abs(m.price - exp.price) < 0.01
                );
                expect(found, `Missing: ${exp.text} ${exp.price}`).to.not.equal(undefined);
            }
        });
    });
});
