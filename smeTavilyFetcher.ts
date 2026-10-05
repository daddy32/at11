import Axios from "axios";

const endpoint = "https://api.tavily.com/extract";
const allowedHostnames = new Set(["restauracie.sme.sk", "www.restauracie.sme.sk"]);

interface TavilyExtractResult {
    url?: unknown;
    raw_content?: unknown;
}

interface TavilyExtractResponse {
    results?: TavilyExtractResult[];
}

function normalizeUrl(value: string): string | undefined {
    try {
        const parsed = new URL(value);
        parsed.hash = "";
        return parsed.toString();
    } catch {
        return undefined;
    }
}

export async function fetchSmeTavilyMarkdown(url: string, apiKey: string): Promise<string> {
    const requestedUrl = normalizeUrl(url);
    if (!requestedUrl) {
        throw new Error("Invalid SME URL for Tavily Extract");
    }

    if (!allowedHostnames.has(new URL(requestedUrl).hostname)) {
        throw new Error("Tavily Extract is restricted to SME restaurant pages");
    }

    if (!apiKey || !apiKey.trim()) {
        throw new Error("Tavily API key is not configured");
    }

    let response;
    try {
        response = await Axios.post<TavilyExtractResponse>(endpoint, {
            urls: requestedUrl,
            extract_depth: "advanced",
            include_images: false,
            format: "markdown"
        }, {
            timeout: 30000,
            headers: {
                Authorization: `Bearer ${apiKey.trim()}`,
                "Content-Type": "application/json"
            }
        });
    } catch {
        throw new Error("Tavily Extract request failed");
    }

    if (!Number.isInteger(response.status) || response.status < 200 || response.status >= 300) {
        throw new Error("Tavily Extract request failed");
    }

    const results = response.data?.results;
    const matchingResult = Array.isArray(results) ? results.find(result =>
        result !== null && typeof result === "object"
            && typeof result.url === "string" && normalizeUrl(result.url) === requestedUrl
    ) : undefined;
    if (!matchingResult || typeof matchingResult.raw_content !== "string" || !matchingResult.raw_content.trim()) {
        throw new Error("Tavily Extract returned no content for the requested SME page");
    }

    return matchingResult.raw_content;
}
