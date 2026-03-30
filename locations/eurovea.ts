import { Como } from "../parsers/eurovea/como";
import { Dock7 } from "../parsers/eurovea/dock7";
import { FajneJedloTower } from "../parsers/eurovea/fajnejedlotower";
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
        }
    ]
};
