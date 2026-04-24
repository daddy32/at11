import { IMenuItem } from "../IMenuItem";
import { IParser } from "../IParser";
import { Sme } from "../sme";

export class KolkovnaEurovea extends Sme implements IParser {
    public parse(html: string, date: Date, doneCallback: (menu: IMenuItem[]) => void): void {
        const menu = super.parseBase(html, date)
            .map(item => this.normalizeItem(item))
            .filter(item => item.text.length > 0);

        doneCallback(menu);
    }

    private normalizeItem(item: IMenuItem): IMenuItem {
        const normalizedText = item.text
            .toLocaleLowerCase("sk")
            .capitalizeFirstLetter()
            .replace(/^(Jedlo č\.\d+\s+)([a-záäčďéíĺľňóôŕšťúýž])/u, (_match, prefix: string, firstLetter: string) => {
                return `${prefix}${firstLetter.toLocaleUpperCase("sk")}`;
            });

        return {
            ...item,
            text: normalizedText
        };
    }
}
