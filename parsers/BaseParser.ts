import * as cheerio from "cheerio";
import { IMenuItem } from "./IMenuItem";
import { IParser } from "./IParser";

export abstract class BaseParser implements IParser {
    protected safeLoad(html: string): cheerio.CheerioAPI | null {
        if (!html || typeof html !== "string") {
            return null;
        }
        try {
            return cheerio.load(html);
        } catch (error) {
            console.error("Failed to load HTML:", error);
            return null;
        }
    }

    public abstract parse(
        html: string,
        date: Date,
        doneCallback: (menu: IMenuItem[]) => void
    ): Promise<void>;
}
