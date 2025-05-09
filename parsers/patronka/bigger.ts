import puppeteer from "puppeteer";

// Helper to bootstrap session cookies and tracker using Puppeteer
// Usage: await getSessionCookiesAndTracker()
// Returns: { cookies: string, tracker: string }
export async function getSessionCookiesAndTracker(): Promise<{ cookies: string, tracker: string }> {
    const url = "https://www.foodbooking.com/ordering/restaurant/menu?company_uid=2d9fcc59-e13a-4152-b6cb-d587e182dd1c&restaurant_uid=c5622c60-4cca-4961-acb4-a9c2a9a61006";
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    let tracker = "";
    // Intercept XHR/fetch requests to capture tracker value from payload
    await page.setRequestInterception(true);
    page.on("request", req => {
        try {
            const url = req.url();
            const method = req.method();
            const postData = req.postData();
            if (method === "POST" && postData) {
                console.log("[Puppeteer] Intercepted request:", url);
                console.log("[Puppeteer] Payload:", postData);
                try {
                    const parsed = JSON.parse(postData);
                    if (parsed.tracker) {
                        tracker = parsed.tracker;
                        console.log("[Puppeteer] Found tracker in payload:", tracker);
                    }
                } catch (e) {
                    console.log("[Puppeteer] Failed to parse payload as JSON");
                }
            }
        } catch (e) {
            console.log("[Puppeteer] Error in request interception:", e);
        }
        req.continue();
    });

    await page.goto(url, { waitUntil: "networkidle2" });
    await new Promise(resolve => setTimeout(resolve, 1000)); // Give time for XHRs to fire and tracker to be set

    // Get all cookies as a string
    const cookiesArr = await page.cookies();
    const cookies = cookiesArr.map(c => `${c.name}=${c.value}`).join("; ");

    // Log cookies and HTML for inspection
    // Print cookies and HTML to process.stdout directly for visibility
    process.stdout.write("[Puppeteer] Cookies after page load: " + cookies + "\n");
    const html = await page.content();
    process.stdout.write("[Puppeteer] HTML after page load (first 2000 chars):\n" + html.slice(0, 2000) + "\n");

    if (!tracker) {
        throw new Error("Could not extract tracker from Puppeteer session.");
    }

    await browser.close();
    return { cookies, tracker };
}
import { IMenuItem } from "../IMenuItem";
import { IParser } from "../IParser";
import fetch, { Headers } from 'node-fetch';

// Helper to extract cookies from Set-Cookie headers
function extractCookies(setCookieHeaders: string[] | undefined): string {
    if (!setCookieHeaders) return "";
    return setCookieHeaders
        .map(cookieStr => cookieStr.split(";")[0])
        .join("; ");
}


// Fetches menu data from the API with all required headers and cookies
async function fetchCartDataWithCookies(cookies: string, tracker: string): Promise<any> {
    const url = "https://www.foodbooking.com/api/cart/init";
    const payload = {
        "#": null,
        "company_uid": "2d9fcc59-e13a-4152-b6cb-d587e182dd1c",
        "restaurant_uid": "c5622c60-4cca-4961-acb4-a9c2a9a61006",
        "payload": {
            "language_code": "en",
            "init": 1,
            "source": "website",
            "reference": null
        },
        "tracker": tracker
    };

    const headers = {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:138.0) Gecko/20100101 Firefox/138.0",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-GB,en;q=0.8,sk;q=0.5,en-US;q=0.3",
        "Accept-Encoding": "gzip, deflate, br, zstd",
        "Content-Type": "application/json",
        "Origin": "https://www.foodbooking.com",
        "DNT": "1",
        "Sec-GPC": "1",
        "Connection": "keep-alive",
        "Referer": "https://www.foodbooking.com/ordering/restaurant/menu?company_uid=2d9fcc59-e13a-4152-b6cb-d587e182dd1c&restaurant_uid=c5622c60-4cca-4961-acb4-a9c2a9a61006",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
        "TE": "trailers"
    };
    if (cookies && cookies.length > 0) {
        headers["Cookie"] = cookies;
    }

    console.log("[Bigger parser debug] API request headers:", headers);
    console.log("[Bigger parser debug] API request payload:", JSON.stringify(payload));

    const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        let bodyText = "";
        try {
            bodyText = await response.text();
        } catch (e) {
            bodyText = "[unavailable]";
        }
        console.error(`[Bigger parser debug] API response status: ${response.status}`);
        console.error(`[Bigger parser debug] API response body: ${bodyText}`);
        throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return await response.json();
}

export class Bigger implements IParser {
    public async parse(html: string, date: Date, doneCallback: (menu: IMenuItem[]) => void): Promise<void> {
        try {
            // Step 1: Use Puppeteer to get tracker (and cookies, if any)
            const { cookies, tracker } = await getSessionCookiesAndTracker();

            // Step 2: Use those cookies in the API call
            const apiData = await fetchCartDataWithCookies(cookies, tracker);

            if (!apiData || !apiData.restaurant || !apiData.restaurant.menu || !Array.isArray(apiData.restaurant.menu.categories)) {
                console.error("[Bigger parser debug] API response missing menu categories", apiData);
                doneCallback([]);
                return;
            }

            const menu: IMenuItem[] = [];
            for (const category of apiData.restaurant.menu.categories) {
                if (!category.items || !Array.isArray(category.items)) continue;
                for (const item of category.items) {
                    if (!item.name || typeof item.price !== "number") continue;
                    // Normalize name and description
                    const text = normalize(item.name);
                    const desc = item.description ? normalize(item.description) : "";
                    menu.push({
                        isSoup: false,
                        text: desc ? `${text} <small>(${desc})</small>` : text,
                        price: item.price
                    });
                }
            }

            console.log("[Bigger parser debug] Parsed menu items:", menu);
            doneCallback(menu);
        } catch (error) {
            console.error("[Bigger parser debug] Failed to fetch or parse Bigger menu:", error);
            doneCallback([]);
        }
    }
}

// Normalization helpers (copied from previous version)
const junkPattern2 = /[A-Z]\d*:/g;

function normalize(str: string): string {
    if (!str) return "";

    // 1. Remove leading number and dash (e.g., "6 – ")
    // let s = str.replace(/^\s*\d+\s*[–-]\s*/, "");

    // 3. Replace all-uppercase dish name (with dashes, diacritics, spaces, unicode) before first parenthesis or end with Title Case
    let s = str.replace(
        /([\p{Lu}\-’' ]+)(?=\s*\(|\s*$)/u,
        (m) =>
            m
                .toLocaleLowerCase("sk")
                .replace(/(^|\s|-|’|')[\p{Ll}]/gu, (c) =>
                    c.toLocaleUpperCase("sk")
                )
                .trim()
    );

    // 4. Remove unmatched extra opening or closing parenthesis after dish name
    s = s.replace(/\(\s*\(/g, "(");
    s = s.replace(/\)\s*\)/g, ")");

    // 5. Remove any trailing "(", " (", or " (" with spaces
    s = s.replace(/(\s*\(\s*)+$/, "");

    // 6. Continue with previous normalization
    s = s
        .removeAlergens?.()
        .removeMetrics?.()
        .replace(junkPattern2, "")
        .trim()
        .capitalizeFirstLetter?.();

    console.log("[Bigger parser debug] Normalizing string:", s);
    // 2. Remove extra parenthesis after dish name (e.g., "((..." -> "(")
    s = s.replace(/\s*\(\s*$/g, "");
    console.log("[Bigger parser debug] After removing extra parenthesis:", s);

    return s
}

// Standalone runner for Puppeteer session bootstrap (debugging only)
if (require.main === module) {
    (async () => {
        try {
            const result = await getSessionCookiesAndTracker();
            process.stdout.write("\n[Standalone] Result:\n" + JSON.stringify(result, null, 2) + "\n");
        } catch (e) {
            process.stderr.write("[Standalone] Error: " + (e?.stack || e) + "\n");
        }
    })();
}
