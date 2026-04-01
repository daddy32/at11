import { BrasserieLaMarine } from "../parsers/eurovea/brasserielamarine";
import { Como } from "../parsers/eurovea/como";
import { Dock7 } from "../parsers/eurovea/dock7";
import { FajneJedloTower } from "../parsers/eurovea/fajnejedlotower";
import { KolkovnaEurovea } from "../parsers/eurovea/kolkovnaeurovea";
import { Obederia } from "../parsers/eurovea/obederia";
import { Dummy } from "../parsers/patronka/dummy";
import { Priatelia } from "../parsers/patronka/priatelia";
import { VegLife } from "../parsers/patronka/veglife";
import { ILocationConfig } from "./types";

export const euroveaLocation: ILocationConfig = {
    slug: "eurovea",
    displayName: "Eurovea",
    metaDescription: "Obedové menu v Eurovei",
    footerLabel: "Eurovea version",
    restaurants: [
        {
            id: 1,
            name: "DOCK7",
            urlFactory: _ => "https://menucka.sk/denne-menu/bratislava/dock7",
            parser: new Dock7()
        },
        {
            id: 2,
            name: "COMO",
            urlFactory: _ => "https://menucka.sk/denne-menu/bratislava/como-eurovea-2",
            parser: new Como()
        },
        {
            id: 3,
            name: "Fajne Jedlo Tower",
            urlFactory: _ => "https://fajnejedlo.sk/menu-tyzdnove-tower/",
            parser: new FajneJedloTower()
        },
        {
            id: 4,
            name: "Kolkovna Eurovea",
            urlFactory: _ => "https://restauracie.sme.sk/restauracia/kolkovna-eurovea_4138-stare-mesto_2949/denne-menu",
            parser: new KolkovnaEurovea()
        },
        {
            id: 5,
            name: "Brasserie La Marine",
            urlFactory: _ => "https://restauracie.sme.sk/restauracia/brasserie-la-marine_3850-stare-mesto_2949/denne-menu",
            parser: new BrasserieLaMarine()
        },
        {
            id: 6,
            name: "Canteen Priatelia",
            urlFactory: _ => "https://menucka.sk/denne-menu/bratislava/canteen-priatelia-landererova-12",
            parser: new Priatelia()
        },
        {
            id: 7,
            name: "Veg life",
            urlFactory: _ => "https://menucka.sk/denne-menu/bratislava/veg-life-pribinova",
            parser: new VegLife()
        },
        {
            id: 8,
            name: "OBEDERIA",
            urlFactory: _ => "https://menucka.sk/denne-menu/bratislava/obederia-bratislava",
            parser: new Obederia()
        },
        {
            id: 9,
            name: "Kinka Ramen",
            urlFactory: _ => "https://www.kinkaramen.sk/menu",
            parser: new Dummy(),
            isDummy: true
        },
        {
            id: 10,
            name: "Iná Haluška",
            urlFactory: _ => "https://www.bistro.sk/restauracia/ina-haluska-ba",
            parser: new Dummy(),
            isDummy: true
        },
        {
            id: 11,
            name: "Regal Burger",
            urlFactory: _ => "https://www.menucka.sk/denne-menu/bratislava/regal-burger-eurovea-2",
            parser: new Dummy(),
            isDummy: true
        },
        {
            id: 12,
            name: "Chilantro",
            urlFactory: _ => "https://oceurovea.chilantro.sk/section:menu",
            parser: new Dummy(),
            isDummy: true
        },
        {
            id: 13,
            name: "Plná miska",
            urlFactory: _ => "https://www.instagram.com/plnamiska.bratislava/?__d=11",
            parser: new Dummy(),
            isDummy: true
        },
        {
            id: 14,
            name: "KFC",
            urlFactory: _ => "https://www.kfcslovakia.sk/produkty",
            parser: new Dummy(),
            isDummy: true
        },
        {
            id: 15,
            name: "Sunshine",
            urlFactory: _ => "https://www.bistro.sk/restauracia/sunshine-eurovea-2",
            parser: new Dummy(),
            isDummy: true
        },
        {
            id: 16,
            name: "Mondieu",
            urlFactory: _ => "https://mondieu.sk/menu/bratislava/eurovea/",
            parser: new Dummy(),
            isDummy: true
        },
        {
            id: 17,
            name: "Konn Steakbar",
            urlFactory: _ => "https://www.konn.sk/menu/?gad_source=1&gad_campaignid=23695352384&gbraid=0AAAAAqZFlo3L1C8XizloB-NjJA7jlqgO3&gclid=CjwKCAjwvqjOBhAGEiwAngeQnS-H6L1Mljai2hwHTEVxHvXLZ7Jh9wXuKTomRQA_bTsxAX2DyCKHgxoC_gAQAvD_BwE&filter_product_cat=specialitky",
            parser: new Dummy(),
            isDummy: true
        },
        {
            id: 18,
            name: "Rams",
            urlFactory: _ => "https://ramsfood.sk/menu/section:menu/predjedla",
            parser: new Dummy(),
            isDummy: true
        },
        {
            id: 19,
            name: "McDonalds",
            urlFactory: _ => "https://www.mcdonalds.sk/menu/",
            parser: new Dummy(),
            isDummy: true
        },
        {
            id: 20,
            name: "Al Faro",
            urlFactory: _ => "https://www.sassy.sk/upload/files/Alfaro_menu_jun_2025_web_1750845421.pdf",
            parser: new Dummy(),
            isDummy: true
        },
        {
            id: 21,
            name: "Le Bar",
            urlFactory: _ => "https://sassy.sk/upload/files/HM_SK_12_25_web_1765192653.pdf",
            parser: new Dummy(),
            isDummy: true
        },
        {
            id: 22,
            name: "Sajado",
            urlFactory: _ => "https://www.sajado.sk/sajado-eurovea#jedalny-listok-1",
            parser: new Dummy(),
            isDummy: true
        },
        {
            id: 23,
            name: "Primi",
            urlFactory: _ => "https://www.primieurovea.sk/wp-content/uploads/2026/03/menu_primi_eurovea_210x260_2026-3_SK.pdf",
            parser: new Dummy(),
            isDummy: true
        },
        {
            id: 24,
            name: "La Crema",
            urlFactory: _ => "https://eurovea.lacrema.sk/wp-content/uploads/2025/08/LaCrema_EUROVEA_04_2025.pdf",
            parser: new Dummy(),
            isDummy: true
        },
        {
            id: 25,
            name: "Wagamama",
            urlFactory: _ => "https://www.wagamama.sk/nase-jedlo?category=main-dishes",
            parser: new Dummy(),
            isDummy: true
        }
    ]
};
