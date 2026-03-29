import { Dock7 } from "../parsers/eurovea/dock7";
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
        }
    ]
};
