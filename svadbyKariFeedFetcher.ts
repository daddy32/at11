import Axios from "axios";

import { getDateRegex } from "./parsers/parserUtil";

const feedUrl = "https://www.svadbykari.sk/instagram-feed.php";
const expectedUsername = "svadbyakari";

interface SvadbyKariPost {
    caption?: unknown;
}

interface SvadbyKariFeed {
    username?: unknown;
    posts?: unknown;
}

const weekdayHeading = /^(?:pondelok|utorok|streda|štvrtok|piatok|sobota|nedeľa)\s+\d{1,2}\.\d{1,2}\.?\s+\d{4}\s*$/i;
const patronkaScope = /\b(?:patr[oó]nka|d[uú]bravsk[aá]\s+cesta(?:\s+1)?|podchod\s+patr[oó]nka)\b/i;
const allBranchesScope = /\b(?:(?:všetk(?:y|ých)\s+(?:tri\s+)?(?:prev[aá]dzk(?:y|ach)|pobočk(?:y|ách)))|(?:každ(?:á|ej)\s+(?:prev[aá]dzk|pobočk)))/i;
const otherBranchScope = /\b(?:americk(?:á|ej)\s+2|vysok(?:á|ej)\s+28)\b/i;

function isPatronkaMenuPost(caption: string): boolean {
    const coversAllBranches = allBranchesScope.test(caption);
    const mentionsPatronka = patronkaScope.test(caption);
    const mentionsAnotherBranch = otherBranchScope.test(caption);

    return (mentionsPatronka || coversAllBranches)
        && (!mentionsAnotherBranch || coversAllBranches);
}

function extractCurrentDateMenu(caption: string, date: Date): string | undefined {
    const lines = caption.replace(/\r/g, "").split("\n").map(line => line.trim());
    const dateRegex = getDateRegex(date);
    const dayHeadingIndexes = lines
        .map((line, index) => weekdayHeading.test(line) ? index : -1)
        .filter(index => index >= 0);
    const startIndex = dayHeadingIndexes.find(index => dateRegex.test(lines[index]));

    if (startIndex === undefined) {
        return undefined;
    }

    const nextDayIndex = dayHeadingIndexes.find(index => index > startIndex);
    const endIndex = nextDayIndex === undefined ? lines.length : nextDayIndex;
    const menuLines = lines.slice(startIndex + 1, endIndex).filter(Boolean);
    if (menuLines.length === 0) {
        return undefined;
    }

    const dateHeading = `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`;
    return `## Menu (${dateHeading})\n\n${menuLines.join("\n")}`;
}

export async function fetchSvadbyKariPatronkaMenu(date: Date): Promise<string | undefined> {
    const response = await Axios.get<SvadbyKariFeed>(feedUrl, {
        timeout: 15000,
        headers: {
            Accept: "application/json",
            "User-Agent": "Mozilla/5.0",
            Referer: "https://www.svadbykari.sk/"
        }
    });

    const feed = response.data;
    if (response.status !== 200 || feed?.username !== expectedUsername || !Array.isArray(feed.posts)) {
        throw new Error("Official Svadby a Kari feed response is invalid");
    }

    for (const post of feed.posts as SvadbyKariPost[]) {
        if (!post || typeof post.caption !== "string" || !isPatronkaMenuPost(post.caption)) {
            continue;
        }

        const menu = extractCurrentDateMenu(post.caption, date);
        if (menu) {
            return menu;
        }
    }

    return undefined;
}
