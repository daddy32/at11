import cheerio from "cheerio";

import { IMenuItem } from "../IMenuItem";
import { IParser } from "../IParser";
import { format } from "date-fns";
import { sk } from "date-fns/locale";

import fetch from 'node-fetch';

async function fetchCartData() {
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
        "tracker": "aQXpqo6F91yN7dnx"
    };

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "User-Agent": "Mozilla/5.0", // Avoid bot detection
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        //console.log("API Response:", data);
        return data;
    } catch (error) {
        console.error("Error fetching cart data:", error);
    }
}


export class Bigger implements IParser {
    public parse(html: string, date: Date, doneCallback: (menu: IMenuItem[]) => void): void {
        const $ = cheerio.load(html);
        const dayMenu = new Array<IMenuItem>();
        const junkPattern = /hranolky|polievka|Podľa dennej ponuky|^\d[^–]*–$/i;
        const junkPattern2 = /[A-Z]\d*:/g;
        const mainCoursesPattern = "app-menu-items"

        console.log("fetching cart data");
        const cartData = fetchCartData();
        cartData.then((data) => {
            console.log(data);
        });

        console.log("Parsing Bigger.");
        console.log("   date:" + date);

        const foundElements = $(mainCoursesPattern);
        console.log("   foundElements: " + foundElements.length);
        if (foundElements.length == 0) {
            console.error("   No elements found, returning.");
            // console.error("   html: " + html);
            doneCallback([]);
            return;
        }

        foundElements.each((i, elem) => {
            const node = $(elem);
            var text = node.text().trim();//.toLowerCase()
            console.log(`       text: "${text}"`);

            if (!(junkPattern.test(text)) && text !== '') {
                var textNodes = extractDescNodes(node.parent());
                if (textNodes.length == 0 || textNodes == "" || normalize(textNodes) == normalize(text)) {
                    console.log("           Desc nodes not found, trying again.")
                    textNodes = extractDescNodes(node.parent().add(node.parent().next('p')));
                }
                if (textNodes.length == 0 || textNodes == "" || normalize(textNodes) == normalize(text)) {
                    console.log("           Desc nodes still not found, trying yet again.")
                    const secondP = node.parent().parent().parent().next('div').find('p');
                    console.log(secondP);
                    textNodes = extractDescNodes(secondP);
                }
                if (textNodes.length == 0 || textNodes == "" || normalize(textNodes) == normalize(text)) {
                    console.warn("           Desc nodes not found.")
                }

                const descText = normalize(textNodes);
                text = normalize(text)
                console.log(`       text: "${text}"`);
                console.log(`       desc: "${descText}"`);

                if (text!=='') {
                    dayMenu.push({
                        isSoup: false,
                        text: text + " <small>(" + normalize(descText) + ")</small>",
                        price: NaN
                    });
                } else {
                    console.log(`           Empty text => skipping.`);
                }
            } else {
                console.log(`           => junk.`);
            }
            console.log(`----------------------------`)
        });

        doneCallback(dayMenu);


        function extractDescNodes(parent: cheerio.Cheerio): string {
            // Check if there's a span inside the <p> tag and get its text
            const spanText = parent.find('span').text().trim();

            if (spanText) {
                return spanText;
            }

            // For the original structure
            const textNodes = parent.contents().filter(function() {
                return this.nodeType === 3 && $(this).parent().is('p');
            });

            let resultText = "";
            textNodes.each(function() {
                resultText += $(this).text();
            });

            return resultText.trim();
        }



        function normalize(str: string): string {
            return str.removeAlergens()
                .removeMetrics()
                .replace(junkPattern2, "")
                .trim()
                .capitalizeFirstLetter();
        }
    }
 }
