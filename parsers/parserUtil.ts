import { IMenuItem } from "./IMenuItem";

declare global {
    interface String {
        tidyAfterOCR: () => string;
        normalizeWhitespace: () => string
        removeMetrics: () => string;
        removeAlergens: () => string;
        correctCommaSpacing: () => string;
        capitalizeFirstLetter: () => string;
        removeItemNumbering: () => string;
        removeOCRArtifacts: () => string;
    }
}

// Removes common OCR artifacts at the end of menu items
String.prototype.removeOCRArtifacts = function() {
    let s = this.trim();
    // Remove trailing number-dot sequences (e.g. " 1.3.", " 2.1. ")
    s = s.replace(/(\s*\d{1,2}(\.\d{1,2})+\.*\s*)$/g, "");
    // Remove trailing 1-3 uppercase letter words (e.g. " Ť", " TE", " ABC")
    s = s.replace(/(\s+[A-ZÁČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ]{1,3})+$/u, "");
    // Remove trailing single uppercase letter with possible punctuation (e.g. " Ť.", " T,")
    s = s.replace(/(\s+[A-ZÁČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ][.?!,;:]*)+$/u, "");
    return s.trim();
};

export function parsePrice(item: string): { price: number, text: string} {
    const priceRegex = /(\d+(?:[.,]\d+)?)[.,]?\s*(?:€|Eur)/ig;
    let price = NaN;
    const text = item.replace(priceRegex, (matchStr, group1) => {
        price = parseFloat(group1.replace(/\s/g, "").replace(",", "."));
        return "";
    });
    return {
        price,
        text: text.trim()
    };
}

export function getDateRegex(date: Date): RegExp {
   return new RegExp(`0?${date.getDate()}[.\\s]{1}\\s?0?${date.getMonth() + 1}[.\\s]{1}\\s?${date.getFullYear()}`);
}

const accentPairs: {[key: string]: string} = { a: "á", e: "é", i: "í", o: "ó", u: "ú", y: "ý", t: "ť", l: "ľ" };

String.prototype.tidyAfterOCR = function(): string {
    return this.replace(/(\w)[`']/g, (m: string, g: string) => {
        return accentPairs[g] || m;
    }).replace("%:", "€");
};

String.prototype.normalizeWhitespace = function() {
    // also single spaces are replaced as there are different charcodes for space (32 vs. 160)
    // and we need to be consistent because of comparisons in tests
    return this.trim().replace(/\s+/g, " ");
};

String.prototype.correctCommaSpacing = function() {
    return this.replace(/(\S) *(,|\.) *(\S)/g, "$1$2 $3");
};

String.prototype.removeMetrics = function() {
    return this.replace(/\s*\(?(?:\d+\/)?( ?\d[\doO\s]*)+ *(?:[,.]\d[\doO]*)? *[lLgG]+\)?\.?\s*/g, " ").trim();
};

String.prototype.removeAlergens = function() {
    return this.replace(/\s*[A\s(\d,)]+$|\/[A-Z0-9,\s]+\/{0,1}/g, "");
};

String.prototype.capitalizeFirstLetter = function() {
    return this.replace(/(^[A-Za-z\u00C0-\u017F])/, (a: string) => a.toUpperCase());
};

String.prototype.removeItemNumbering = function() {
    return this.trim().replace(/^\W\s+/, "").replace(/^[\dA-Z][ ).,:;]+(?:[AB]\s+)?/, "").trim();
};

// Soup first menu item comparere
export function compareMenuItems(first: IMenuItem, second: IMenuItem): number {
    const f = first.isSoup ? 0 : 1;
    const s = second.isSoup ? 0 : 1;
    return f - s;
}
// Sanitizes and encodes URLs to prevent unescaped character errors
export function sanitizeUrl(url: string): string {
    try {
        // Prefer modern URL API for robust parsing and encoding
        const parsedUrl = new URL(url);
        return parsedUrl.toString();
    } catch {
        // fallback: encode as-is
        try {
            return encodeURI(decodeURI(url));
        } catch {
            return encodeURI(url);
        }
    }
}

// Validates if a string is a well-formed URL
export function isValidUrl(url: string): boolean {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}
