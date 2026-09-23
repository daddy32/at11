import { IMenuItem } from "../parsers/IMenuItem";
import { IParser } from "../parsers/IParser";

export interface RunnerTarget {
    sourceId: string;
    locationSlug: string;
    restaurantName: string;
    urlFactory: (date: Date) => string;
    parser: IParser;
}

export type ProbeTransport = "direct-http" | "browser-html" | "sme-export-pdf" | "none";
export type ProbeClassification = "success" | "no-menu" | "challenge" | "empty" | "error";

export interface ProbeResult {
    sourceId: string;
    restaurant: string;
    requestedUrl: string;
    finalUrl: string | null;
    transport: ProbeTransport;
    httpStatus: number | null;
    title: string;
    contentLength: number;
    contentMarkerCount: number;
    classification: ProbeClassification;
    challengeDetected: boolean;
    menuItemCount: number;
    items: IMenuItem[];
    startedAt: string;
    elapsedMs: number;
    error: string | null;
}

export interface ProbeRun {
    schemaVersion: 1;
    runId: string;
    runnerHost: string;
    timezone: "Europe/Bratislava";
    targetDate: string;
    results: ProbeResult[];
}
