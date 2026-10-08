import "../../../parsers/parserUtil";
import axios from "axios";
import { expect } from "chai";
import fs from "fs";
import path from "path";
import { stub } from "sinon";
import Tesseract from "tesseract.js";

import { PatronskyPivovar } from "../../../parsers/patronka/patronskypivovar";
import { IMenuItem } from "../../../parsers/IMenuItem";
import { TestHelper } from "../../helpers/TestHelper";

const IMAGE_URL = "https://restauracie.smedata.sk/usmedata/pictures/menu/4270/31/menu_1_1791144731_orig.jpg?670";
const IMAGE_ONLY_HTML = `<div class="dnesne_menu"><h2>Obedové menu (05.10.2026 - 09.10.2026)</h2>
  <div class="daily-menu-container"><a href="${IMAGE_URL}"><img src="/thumb.webp"></a></div>
</div>`;
const THURSDAY_OCR = `Stvrtok
0,251 Boršč s chlebom (A 1)
130 g Bravčový čiernohorský rezeň s pečenými zemiakmi a coleslaw šalátom (A 1,3,7) 8,40 €
150 g Restovaná kačacia pečeň so zemiakovými lokšami /2ks/ (A 1,3,7) 10,40 €
Piatok
250 g Kuracie stehno ala bažant s dusenou ryžou 8,40 €`;

describe("Patronsky Pivovar Parser", () => {
    let parser: PatronskyPivovar;
    let mockDate: Date;

    beforeEach(() => {
        parser = new PatronskyPivovar();
        mockDate = TestHelper.createMockDate("2026-03-30");
    });

    afterEach(() => {
        TestHelper.cleanupMocks();
    });

    it("keeps parsing classic SME rows with prices after the shared SME refactor", (done) => {
        const html = `
            <div class="dnesne_menu">
                <h2>Obedové menu Pondelok (30.03.2026)</h2>
                <div class="jedlo_polozka"><div class="left">Polievka</div></div>
                <div class="jedlo_polozka"><div class="left">Gulášová 0,33 l |1| 2.20 €</div></div>
                <div class="jedlo_polozka"><div class="left">Hlavné jedlo</div></div>
                <div class="jedlo_polozka"><div class="left">Bravčový rezeň, zemiakový šalát |1,3,7| 9.50 €</div></div>
            </div>
        `;

        parser.parse(html, mockDate, menu => {
            expect(menu).to.have.length(2);
            expect(menu[0]).to.deep.include({
                text: "Gulášová",
                price: 2.2,
                isSoup: true
            });
            expect(menu[1]).to.deep.include({
                text: "Bravčový rezeň, zemiakový šalát",
                price: 9.5,
                isSoup: false
            });
            done();
        });
    });

    it("parses the requested weekday from the linked image on an image-only SME page", async () => {
        const imageRequest = stub(axios, "get").resolves({ data: Buffer.from("image") } as never);
        const ocr = stub(Tesseract, "recognize").resolves({ data: { text: THURSDAY_OCR } } as never);
        const date = new Date(2026, 9, 8);
        const menu = await new Promise<IMenuItem[]>(resolve => parser.parse(IMAGE_ONLY_HTML, date, resolve));

        expect(menu).to.have.length(3);
        expect(menu.map(item => item.text)).to.deep.equal([
            "Boršč s chlebom",
            "Bravčový čiernohorský rezeň s pečenými zemiakmi a coleslaw šalátom",
            "Restovaná kačacia pečeň so zemiakovými lokšami /2ks/"
        ]);
        expect(menu[0].isSoup).to.equal(true);
        expect(Number.isNaN(menu[0].price)).to.equal(true);
        expect(menu[1].price).to.equal(8.4);
        expect(menu[2].price).to.equal(10.4);
        expect(imageRequest.firstCall.args[0]).to.equal(IMAGE_URL);
        expect(ocr.firstCall.args[1]).to.equal("slk");
    });

    it("finds the Patronsky menu image when the page omits its wrapper class", async () => {
        const imageRequest = stub(axios, "get").resolves({ data: Buffer.from("image") } as never);
        stub(Tesseract, "recognize").resolves({ data: { text: THURSDAY_OCR } } as never);
        const html = `<div><a href="${IMAGE_URL}"><img src="/thumb.webp"></a></div>`;

        await new Promise<IMenuItem[]>(resolve => parser.parse(html, new Date(2026, 9, 8), resolve));

        expect(imageRequest.calledOnce).to.equal(true);
        expect(imageRequest.firstCall.args[0]).to.equal(IMAGE_URL);
    });

    it("parses Thursday from the supplied original menu image", async function() {
        this.timeout(180000);

        const imagePath = path.resolve(process.cwd(), "test/samples/patronsky_pivovar/menu_1_1791144731_orig.jpg");
        stub(axios, "get").resolves({ data: fs.readFileSync(imagePath) } as never);
        const date = new Date(2026, 9, 8);
        const menu = await new Promise<IMenuItem[]>(resolve => parser.parse(IMAGE_ONLY_HTML, date, resolve));

        expect(menu).to.have.length(3);
        expect(menu[0].text).to.equal("Boršč s chlebom");
        expect(menu[1].price).to.equal(8.4);
        expect(menu[2].price).to.equal(10.4);
    });
});
