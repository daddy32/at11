import { format } from "date-fns";
import { sk } from "date-fns/locale";

import { IParser } from "./parsers/IParser";

import { Priatelia } from "./parsers/patronka/priatelia";
import { VegLife } from "./parsers/patronka/veglife";
import { PatronskyPivovar } from "./parsers/patronka/patronskypivovar";
import { Kari } from "./parsers/patronka/kari";
import { SavDoma } from "./parsers/patronka/savdoma";
import { Bigger } from "./parsers/patronka/bigger";

export interface IConfig {
    readonly isProduction: boolean;
    readonly scraperApiKey: string;
    readonly appInsightsInstrumentationKey: string;
    readonly port: number;
    readonly bypassCache: boolean;
    readonly cacheExpiration: number;
    readonly requestTimeout: number;
    readonly parserTimeout: number;
    readonly restaurants: Map<string, ReadonlyArray<{ id: number, name: string, urlFactory: (date: Date) => string, parser: IParser}>>;
}

/* eslint-disable max-len */
export class Config implements IConfig {
    public readonly isProduction = process.env.NODE_ENV === "production";
    public readonly scraperApiKey = process.env.SCRAPER_API_KEY;
    public readonly appInsightsInstrumentationKey = process.env.APPINSIGHTS_INSTRUMENTATIONKEY;
    public readonly port: number = process.env.PORT as unknown as number || 54321;
    public readonly bypassCache: boolean = process.env.AT11_NO_CACHE === "true";
    public readonly cacheExpiration = 2 * 60 * 60; // 2h
    public readonly requestTimeout = 15 * 1000; // 15s
    public readonly parserTimeout = 15 * 1000; // 15s
    public readonly restaurants = new Map<string, ReadonlyArray<{ id: number, name: string, urlFactory: (date: Date) => string, parser: IParser}>>([
        ["Patrónka", [
            {
                id: 1, name: "Canteen Priatelia",
                urlFactory: _ => "https://menucka.sk/denne-menu/bratislava/canteen-priatelia-westend",
                parser: new Priatelia()
            },
            {
                id: 2, name: "Veg Life",
                urlFactory: _ => "https://menucka.sk/denne-menu/bratislava/veg-life-westend",
                parser: new VegLife()
            },
            {
                id: 3, name: "Patrónsky pivovar",
                urlFactory: _ => "https://restauracie.sme.sk/restauracia/patronsky-pivovar_4270-stare-mesto_2949/denne-menu",
                parser: new PatronskyPivovar()
            },
            {
                id: 4, name: "Jedáleň SAV (Doma)",
                urlFactory: (date: Date) => {
                    console.log('date: ' + date);
                    var targetDayName = format(date, "EEEE", { locale: sk }).replace("š", "s");
                    return "https://www.restauracia-doma.sk/" + targetDayName
                },
                parser: new SavDoma()
                // Alternativny web: http://www.stravovanie.sav.sk/site/doma, pokus o parser je v savdoma_alt.ts
            },
            {
                id: 5, name: "Svadby a Kari",
                urlFactory: _ => "http://www.svadbykari.sk/denne-menu/",
                parser: new Kari()
            },
            {
                id: 6, name: "Restaurant BEMI",
                urlFactory: _ => "https://bemiservis.sk/bemi/",
                parser: new PatronskyPivovar() // TODO: parser
            },
            {
                id: 7, name: "Food Season",
                urlFactory: _ => "https://www.foodseason.sk/#obedove",
                parser: new PatronskyPivovar() // TODO: parser
            },
            {
                id: 8, name: "Bigger",
                urlFactory: _ => "http://bigger.sk/lamacska#menu",
                parser: new Bigger()
            },
            {
                id: 9, name: "Lunch Break Westend Plazza",
                urlFactory: _ => "http://www.lunch-break.sk/menu-westend-plazza/",
                parser: new PatronskyPivovar() // TODO: parser
            },
            {
                id: 10, name: "Jedáleň MDV SR (link, pdf)",
                urlFactory: _ => "http://intelsys.sk/jedalnylistok.pdf",
                parser: new PatronskyPivovar() // TODO: parser
            },
        ]],
    ])
}

/*
TODO: Nove restauracie vo Westend Plazza:
    - Quan Ngon - Vietnamese Cuisine
        - Bez menu online?
        - https://www.westend.sk/kto-u-nas-sidli/quanngon/
        - https://menucka.sk/ulica/Quan%20Ngon,%20Lama%C4%8Dsk%C3%A1%20cesta,%20Karlova%20Ves,%20Slovensko
    - Greek Style
        - Bez menu online?
        - https://www.westend.sk/kto-u-nas-sidli/greekstyle/
    - Sushi Time
        - Nemaju denne menu (vzdy to iste v ponuke)?
        - https://www.sushitime.sk/sk/menu/
    - Sajado
        - Nemaju denne menu (vzdy to iste v ponuke)?
        - http://www.sajado.sk/-menu-expres-westend
        - https://restauracie.sme.sk/restauracia/restauracia-sajado_3833-bratislava_2983/denne-menu
    - fresh garden salads
        - Nemaju denne menu (vzdy to iste v ponuke)?
        - http://www.freshgarden.sk/sk/menu/
    - Anatolia Kebab
        - Nemaju denne menu (vzdy to iste v ponuke)?
        - http://www.anatolia.sk/
    - Thali - 100% Veggie
        - Bez menu online? Resp maju v pdf formate; spolocne pre vsetky prevadzky?
        - http://www.thali.sk/najdi-nas/
TODO: Zvazit pridanie zoznamu liniek na neparsovane restauracie
*/