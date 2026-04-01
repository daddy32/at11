import { IParser } from "../parsers/IParser";

export interface IRestaurantConfig {
    readonly id: number;
    readonly name: string;
    readonly urlFactory: (date: Date) => string;
    readonly parser: IParser;
    readonly isDummy?: boolean;
}

export interface ILocationConfig {
    readonly slug: string;
    readonly displayName: string;
    readonly metaDescription: string;
    readonly footerLabel: string;
    readonly restaurants: ReadonlyArray<IRestaurantConfig>;
}
