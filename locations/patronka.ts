import { format } from "date-fns";
import { sk } from "date-fns/locale";

import { Bigger } from "../parsers/patronka/bigger";
import { FajneJedlo } from "../parsers/patronka/fajnejedlo";
import { Kari } from "../parsers/patronka/kari";
import { LunchBreak } from "../parsers/patronka/lunchbreak";
import { Mdvsr } from "../parsers/patronka/mdvsr";
import { PatronskyPivovar } from "../parsers/patronka/patronskypivovar";
import { Priatelia } from "../parsers/patronka/priatelia";
import { SavDoma } from "../parsers/patronka/savdoma";
import { VegLife } from "../parsers/patronka/veglife";
import { ILocationConfig } from "./types";

export const patronkaLocation: ILocationConfig = {
    slug: "patronka",
    displayName: "Patrónka",
    metaDescription: "Obedové menu pri Patrónke",
    footerLabel: "Patrónka version",
    restaurants: [
        {
            id: 1,
            name: "Canteen Priatelia",
            urlFactory: _ => "https://menucka.sk/denne-menu/bratislava/canteen-priatelia-westend",
            parser: new Priatelia()
        },
        {
            id: 2,
            name: "Veg Life",
            urlFactory: _ => "https://menucka.sk/denne-menu/bratislava/veg-life-westend",
            parser: new VegLife()
        },
        {
            id: 4,
            name: "Jedáleň SAV (Doma)",
            urlFactory: (date: Date) => {
                const targetDayName = format(date, "EEEE", { locale: sk }).replace("š", "s");
                return "https://www.restauracia-doma.sk/" + targetDayName;
            },
            parser: new SavDoma()
        },
        {
            id: 5,
            name: "Svadby a Kari",
            urlFactory: _ => "https://restauracie.sme.sk/restauracia/svadby-a-kari-patronka_10341-stare-mesto_2949/denne-menu",
            parser: new Kari()
        },
        {
            id: 8,
            name: "Bigger",
            urlFactory: _ => "https://www.foodbooking.com/ordering/restaurant/menu?company_uid=2d9fcc59-e13a-4152-b6cb-d587e182dd1c&restaurant_uid=c5622c60-4cca-4961-acb4-a9c2a9a61006",
            parser: new Bigger()
        },
        {
            id: 9,
            name: "Lunch Break Westend Plazza",
            urlFactory: _ => "http://www.lunch-break.sk/menu-westend-plazza/",
            parser: new LunchBreak()
        },
        {
            id: 10,
            name: "Jedáleň MDV SR",
            urlFactory: _ => "http://intelsys.sk/jedalnylistok.pdf",
            parser: new Mdvsr()
        },
        {
            id: 3,
            name: "Patrónsky pivovar",
            urlFactory: _ => "https://restauracie.sme.sk/restauracia/patronsky-pivovar_4270-stare-mesto_2949/denne-menu",
            parser: new PatronskyPivovar()
        },
        {
            id: 11,
            name: "Fajne jedlo (OCR)",
            urlFactory: _ => "https://fajnejedlo.sk/menu-tyzdnove-bistro/",
            parser: new FajneJedlo()
        }
    ]
};
