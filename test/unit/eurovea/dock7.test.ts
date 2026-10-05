import "../../../parsers/parserUtil";
import { expect } from "chai";
import axios from "axios";
import fs from "fs";
import NodeCache from "node-cache";
import path from "path";
import { restore, stub } from "sinon";

import { Config } from "../../../config";
import { euroveaLocation } from "../../../locations/eurovea";
import { MenuFetcher, IMenuResult } from "../../../menuFetcher";
import { Dock7 } from "../../../parsers/eurovea/dock7";
import { IMenuItem } from "../../../parsers/IMenuItem";
import { TestHelper } from "../../helpers/TestHelper";

describe("Dock7 Parser", () => {
    let parser: Dock7;
    let mockDate: Date;

    beforeEach(() => {
        parser = new Dock7();
        mockDate = TestHelper.createMockDate("2026-03-30");
    });

    afterEach(() => {
        TestHelper.cleanupMocks();
        restore();
    });

    it("parses the captured Menucka page into mains and a soup", (done) => {
        const html = fs.readFileSync(
            path.join(__dirname, "../../samples/dock7-menucka-2026-03-29.html"),
            "utf-8"
        );

        parser.parse(html, mockDate, menu => {
            expect(menu).to.have.length(3);

            const soup = menu.find(item => item.isSoup);
            expect(soup).to.not.equal(undefined);
            expect(soup?.text).to.include("Mrkový krém");
            expect(soup?.price).to.equal(2.8);

            const chicken = menu.find(item => item.text.includes("Kuracie prsia sous-vide"));
            expect(chicken).to.not.equal(undefined);
            expect(chicken?.text).to.include("cannelloni");
            expect(chicken?.text).to.not.include("[ * 1, 3, 7, 9 ]");
            expect(chicken?.text).to.not.include("|");
            expect(chicken?.price).to.equal(11.9);

            const salad = menu.find(item => item.text.includes("Šalát z miešaných listov"));
            expect(salad).to.not.equal(undefined);
            expect(salad?.text).to.include("grilované hrušky");
            expect(salad?.text).to.not.include("[ * 7, 8, 12 ]");
            expect(salad?.price).to.equal(10.9);

            expect(menu.some(item => item.text.includes("s denným menu"))).to.equal(false);
            done();
        });
    });

    it("parses the current weekly Menučka offer with inline prices", (done) => {
        const html = `
            <div class="restaurant-weekmenu">
                <div class="continuing-offer-block">
                    <div class="continuing-offer-title">Týždenná ponuka 21.-25.9.2026</div>
                    <div class="continuing-offer-line">
                        POLIEVKA<br>
                        Boršč – cvikla, kapusta a zemiaky 7,9,12 – 250 ml/45 g –
                        <div id="cena"><b>2,50 €</b></div><br>
                        Boršč s hlavným jedlom –
                        <div id="cena"><b>1,50 €</b></div><br>
                        HLAVNÉ JEDLÁ<br>
                        Kačacie stehno, pyré a fazuľky 7,9 – 400/250 g –
                        <div id="cena"><b>13,50 €</b></div><br>
                    </div>
                </div>
            </div>
        `;

        parser.parse(html, TestHelper.createMockDate("2026-09-21"), menu => {
            expect(menu).to.have.length(2);
            expect(menu).to.deep.include.members([
                { text: "Boršč – cvikla, kapusta a zemiaky", price: 2.5, isSoup: true },
                { text: "Kačacie stehno, pyré a fazuľky", price: 13.5, isSoup: false }
            ]);
            done();
        });
    });

    it("parses the current Dock7 weekly PDF linked from its official menu page", async () => {
        const pdfBytes = fs.readFileSync(path.join(__dirname, "../../samples/dock7-weekly-2026-10-05.pdf"));
        const pdfUrl = "https://www.dock7.sk/wp-content/uploads/DOCK7_tyzdenna_ponuka_154x250_05-09_10_2026_WEB.pdf";
        const html = `<a href="${pdfUrl}" title="Týždenná ponuka">Zobraziť</a>`;
        stub(axios, "get").resolves({ data: pdfBytes });

        const menu = await new Promise<IMenuItem[]>(resolve => {
            parser.parse(html, TestHelper.createMockDate("2026-10-05"), resolve);
        });

        expect(menu).to.have.length(6);
        expect(menu).to.deep.include.members([
            { text: "Krémová zeleninová (v) orechové pesto", price: 2.5, isSoup: true },
            {
                text: "Naša sekaná so zemiakovou kašou pečená mletá fašírka z teľacieho a bravčového mäsa, nakladaná zelenina",
                price: 12.9,
                isSoup: false
            },
            { text: "Caesar šalát s lososom rímsky šalát, chicharrón mrvenička, caesar dresing, krutóny, grana padano syr", price: 13.2, isSoup: false },
            { text: "Pečené rolované prasiatko pečené baby zemiaky, BBQ, uhorkový šalát", price: 13.5, isSoup: false },
            { text: "Grilované kuracie prsia cuketa, baby špenát, fialové zemiaky, omáčka z grana padano syra", price: 11.9, isSoup: false },
            { text: "Vegetariánsky burger (v) maslová brioška, údené tofu, chimichurri, šalát coleslaw, batatové hranolky", price: 11.5, isSoup: false }
        ]);
    });

    it("does not serve an expired official weekly PDF", async () => {
        const pdfBytes = fs.readFileSync(path.join(__dirname, "../../samples/dock7-weekly-2026-10-05.pdf"));
        const pdfUrl = "https://www.dock7.sk/wp-content/uploads/DOCK7_tyzdenna_ponuka_154x250_05-09_10_2026_WEB.pdf";
        stub(axios, "get").resolves({ data: pdfBytes });

        const menu = await new Promise<IMenuItem[]>(resolve => {
            parser.parse(
                `<a href="${pdfUrl}" title="Týždenná ponuka">Zobraziť</a>`,
                TestHelper.createMockDate("2026-10-12"),
                resolve
            );
        });

        expect(menu).to.have.length(0);
    });

    it("fetches this week's Dock7 menu from the official source", async () => {
        const pdfBytes = fs.readFileSync(path.join(__dirname, "../../samples/dock7-weekly-2026-10-05.pdf"));
        const pdfUrl = "https://www.dock7.sk/wp-content/uploads/DOCK7_tyzdenna_ponuka_154x250_05-09_10_2026_WEB.pdf";
        const html = `<a href="${pdfUrl}" title="Týždenná ponuka">Zobraziť</a>`;
        stub(axios, "get").callsFake(async (url: string) => {
            if (url === "https://www.dock7.sk/menu/") {
                return { status: 200, data: html };
            }
            if (url === pdfUrl) {
                return { status: 200, data: pdfBytes };
            }
            throw new Error(`Unexpected source: ${url}`);
        });
        const restaurant = euroveaLocation.restaurants.find(item => item.id === 1);
        const fetcher = new MenuFetcher(new Config(), new NodeCache());
        const date = TestHelper.createMockDate("2026-10-05");

        const result = await new Promise<IMenuResult>(resolve => {
            fetcher.fetchMenu(restaurant.urlFactory, date, restaurant.parser, resolve, { forceRefresh: true });
        });

        expect(result.value).to.be.an("array");
        expect(result.value).to.have.length(6);
    });

    it("returns an error when the official PDF cannot be fetched", async () => {
        const pdfUrl = "https://www.dock7.sk/wp-content/uploads/DOCK7_tyzdenna_ponuka_154x250_05-09_10_2026_WEB.pdf";
        const html = `<a href="${pdfUrl}" title="Týždenná ponuka">Zobraziť</a>`;
        stub(axios, "get").callsFake(async (url: string) => {
            if (url === "https://www.dock7.sk/menu/") {
                return { status: 200, data: html };
            }
            throw new Error("PDF unavailable");
        });
        const restaurant = euroveaLocation.restaurants.find(item => item.id === 1);
        const fetcher = new MenuFetcher(new Config(), new NodeCache());

        const result = await new Promise<IMenuResult>(resolve => {
            fetcher.fetchMenu(
                restaurant.urlFactory,
                TestHelper.createMockDate("2026-10-05"),
                restaurant.parser,
                resolve,
                { forceRefresh: true }
            );
        });

        expect(result.value).to.be.instanceOf(Error);
        expect((result.value as Error).message).to.equal("PDF unavailable");
    });
});
