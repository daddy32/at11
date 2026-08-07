import assert from "assert";
import fs from "fs";
import { describe, it } from "mocha";

import { IMenuItem } from "../parsers/types.js";
import { PomodoroRosso } from "../parsers/einpark/pomodoro-rosso.js";

describe("PomodoroRosso", () => {
    const parser = new PomodoroRosso();

    describe("URL factory", () => {
        [
            "2025-03-17",
            "2025-03-18",
            "2025-03-19",
            "2025-03-20",
            "2025-03-21",
        ].forEach((date) => {
            it(`should return correct url for ${date}`, () => {
                const url = parser.urlFactory(new Date(date));
                assert.equal(
                    url,
                    "https://www.pizzeriapomodororosso.sk/2025/03/16/denne-menu-17-3-2025-21-3-2025/",
                );
            });
        });

        [
            "2025-03-10",
            "2025-03-11",
            "2025-03-12",
            "2025-03-13",
            "2025-03-14",
        ].forEach((date) => {
            it(`should return correct url for ${date}`, () => {
                const url = parser.urlFactory(new Date(date));
                assert.equal(
                    url,
                    "https://www.pizzeriapomodororosso.sk/2025/03/09/denne-menu-10-3-2025-14-3-2025/",
                );
            });
        });
    });

    describe("parsing new format", () => {
        const html = fs.readFileSync("./test/samples/Pomodoro Rosso.html", {
            encoding: "utf-8",
        });

        describe("menu for 'pondelok'", () => {
            let menu: IMenuItem[];

            before(() => {
                return parser
                    .parse(html, new Date(2026, 7, 3))
                    .then((menuItems) => {
                        menu = menuItems;
                    });
            });

            it("should return correct number of items", () => {
                assert.equal(menu.length, 5);
            });

            it("1st item correct", () => {
                assert.equal(menu[0].isSoup, true);
                assert.equal(menu[0].text, "Slepačí vývar s rezancami");
                assert.equal(isNaN(menu[0].price), true);
            });

            it("2nd item correct", () => {
                assert.equal(menu[1].isSoup, false);
                assert.equal(
                    menu[1].text,
                    "Kurací steak, anglická zelenina, ryža",
                );
                assert.equal(menu[1].price, 9.5);
            });

            it("3rd item correct", () => {
                assert.equal(menu[2].isSoup, false);
                assert.equal(
                    menu[2].text,
                    "Cviklové rizoto s kozím syrom, rukola",
                );
                assert.equal(menu[2].price, 8.5);
            });

            it("4th item correct", () => {
                assert.equal(menu[3].isSoup, false);
                assert.equal(
                    menu[3].text,
                    "Bažantie stehná na tymiáne, krémové hubové krupoto, píniové oriešky, zavárané brusnice",
                );
                assert.equal(menu[3].price, 12.9);
            });

            it("5th item correct", () => {
                assert.equal(menu[4].isSoup, false);
                assert.equal(
                    menu[4].text,
                    "Caesar šalát s kuracím mäsom alebo mozzarellou, slaninkové chipsy, pizza tyčinka",
                );
                assert.equal(menu[4].price, 9.9);
            });
        });

        describe("menu for 'utorok'", () => {
            let menu: IMenuItem[];

            before(() => {
                return parser
                    .parse(html, new Date(2026, 7, 4))
                    .then((menuItems) => {
                        menu = menuItems;
                    });
            });

            it("should return correct number of items", () => {
                assert.equal(menu.length, 5);
            });

            it("1st item correct", () => {
                assert.equal(menu[0].isSoup, true);
                assert.equal(menu[0].text, "Hrachová");
                assert.equal(isNaN(menu[0].price), true);
            });

            it("2nd item correct", () => {
                assert.equal(menu[1].isSoup, false);
                assert.equal(
                    menu[1].text,
                    "Bravčové stehno na šípkovej omáčke, zemiaková kaša, listový šalát",
                );
                assert.equal(menu[1].price, 9.5);
            });

            it("3rd item correct", () => {
                assert.equal(menu[2].isSoup, false);
                assert.equal(menu[2].text, "Linguine Carbonara");
                assert.equal(menu[2].price, 8.5);
            });

            it("4th item correct", () => {
                assert.equal(menu[3].isSoup, false);
                assert.equal(
                    menu[3].text,
                    "Bažantie stehná na tymiáne, krémové hubové krupoto, píniové oriešky, zavárané brusnice",
                );
                assert.equal(menu[3].price, 12.9);
            });

            it("5th item correct", () => {
                assert.equal(menu[4].isSoup, false);
                assert.equal(
                    menu[4].text,
                    "Caesar šalát s kuracím mäsom alebo mozzarellou, slaninkové chipsy, pizza tyčinka",
                );
                assert.equal(menu[4].price, 9.9);
            });
        });

        describe("menu for 'streda'", () => {
            let menu: IMenuItem[];

            before(() => {
                return parser
                    .parse(html, new Date(2026, 7, 5))
                    .then((menuItems) => {
                        menu = menuItems;
                    });
            });

            it("should return correct number of items", () => {
                assert.equal(menu.length, 5);
            });

            it("1st item correct", () => {
                assert.equal(menu[0].isSoup, true);
                assert.equal(menu[0].text, "Cesnaková krémová s krutónmi");
                assert.equal(isNaN(menu[0].price), true);
            });

            it("2nd item correct", () => {
                assert.equal(menu[1].isSoup, false);
                assert.equal(
                    menu[1].text,
                    "Balkánska pleskavica, pečené zemiaky, ajvar, ľadový šalát",
                );
                assert.equal(menu[1].price, 9.5);
            });

            it("3rd item correct", () => {
                assert.equal(menu[2].isSoup, false);
                assert.equal(
                    menu[2].text,
                    "Cuketové placky s bryndzou a pažitkou",
                );
                assert.equal(menu[2].price, 8.5);
            });

            it("4th item correct", () => {
                assert.equal(menu[3].isSoup, false);
                assert.equal(
                    menu[3].text,
                    "Bažantie stehná na tymiáne, krémové hubové krupoto, píniové oriešky, zavárané brusnice",
                );
                assert.equal(menu[3].price, 12.9);
            });

            it("5th item correct", () => {
                assert.equal(menu[4].isSoup, false);
                assert.equal(
                    menu[4].text,
                    "Caesar šalát s kuracím mäsom alebo mozzarellou, slaninkové chipsy, pizza tyčinka",
                );
                assert.equal(menu[4].price, 9.9);
            });
        });

        describe("menu for 'štvrtok'", () => {
            let menu: IMenuItem[];

            before(() => {
                return parser
                    .parse(html, new Date(2026, 7, 6))
                    .then((menuItems) => {
                        menu = menuItems;
                    });
            });

            it("should return correct number of items", () => {
                assert.equal(menu.length, 5);
            });

            it("1st item correct", () => {
                assert.equal(menu[0].isSoup, true);
                assert.equal(menu[0].text, "Tekvicová");
                assert.equal(isNaN(menu[0].price), true);
            });

            it("2nd item correct", () => {
                assert.equal(menu[1].isSoup, false);
                assert.equal(
                    menu[1].text,
                    "Hovädzie varené, kôprová omáčka, domáca knedľa",
                );
                assert.equal(menu[1].price, 9.5);
            });

            it("3rd item correct", () => {
                assert.equal(menu[2].isSoup, false);
                assert.equal(
                    menu[2].text,
                    "Palacinky s lesným ovocím a zmrzlinou",
                );
                assert.equal(menu[2].price, 8.5);
            });

            it("4th item correct", () => {
                assert.equal(menu[3].isSoup, false);
                assert.equal(
                    menu[3].text,
                    "Bažantie stehná na tymiáne, krémové hubové krupoto, píniové oriešky, zavárané brusnice",
                );
                assert.equal(menu[3].price, 12.9);
            });

            it("5th item correct", () => {
                assert.equal(menu[4].isSoup, false);
                assert.equal(
                    menu[4].text,
                    "Caesar šalát s kuracím mäsom alebo mozzarellou, slaninkové chipsy, pizza tyčinka",
                );
                assert.equal(menu[4].price, 9.9);
            });
        });

        describe("menu for 'piatok'", () => {
            let menu: IMenuItem[];

            before(() => {
                return parser
                    .parse(html, new Date(2026, 7, 7))
                    .then((menuItems) => {
                        menu = menuItems;
                    });
            });

            it("should return correct number of items", () => {
                assert.equal(menu.length, 5);
            });

            it("1st item correct", () => {
                assert.equal(menu[0].isSoup, true);
                assert.equal(menu[0].text, "Frankfurtská s párkom");
                assert.equal(isNaN(menu[0].price), true);
            });

            it("2nd item correct", () => {
                assert.equal(menu[1].isSoup, false);
                assert.equal(
                    menu[1].text,
                    "Pečené vykostené kuracie stehno, barbecue omáčka, pečené parmezánové hranolky",
                );
                assert.equal(menu[1].price, 9.5);
            });

            it("3rd item correct", () => {
                assert.equal(menu[2].isSoup, false);
                assert.equal(
                    menu[2].text,
                    "Tagliatelle s gorgonzolovou omáčkou, orechy, rukola",
                );
                assert.equal(menu[2].price, 8.5);
            });

            it("4th item correct", () => {
                assert.equal(menu[3].isSoup, false);
                assert.equal(
                    menu[3].text,
                    "Bažantie stehná na tymiáne, krémové hubové krupoto, píniové oriešky, zavárané brusnice",
                );
                assert.equal(menu[3].price, 12.9);
            });

            it("5th item correct", () => {
                assert.equal(menu[4].isSoup, false);
                assert.equal(
                    menu[4].text,
                    "Caesar šalát s kuracím mäsom alebo mozzarellou, slaninkové chipsy, pizza tyčinka",
                );
                assert.equal(menu[4].price, 9.9);
            });
        });
    });
});
