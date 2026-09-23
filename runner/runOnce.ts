import fs from "fs/promises";
import os from "os";
import path from "path";
import puppeteer from "puppeteer";
import type { Browser } from "puppeteer";

import { probeSource, ProbeOptions } from "./probeSource";
import { getRunnerTargets } from "./targets";
import { ProbeResult, ProbeRun, RunnerTarget } from "./types";

interface RunnerArgs {
    date: string;
    sourceIds?: string[];
    outputDirectory: string;
    saveRaw: boolean;
    dryRun: boolean;
    help: boolean;
}

interface RunnerDependencies {
    now?: () => Date;
    hostname?: () => string;
    launchBrowser?: () => Promise<Browser>;
    probe?: (target: RunnerTarget, date: Date, options: ProbeOptions) => Promise<ProbeResult>;
    sleep?: (ms: number) => Promise<void>;
    log?: (line: string) => void;
}

const usage = "Usage: node dist/runner/runOnce.js [--date YYYY-MM-DD] [--source ID,...] [--output DIR] [--save-raw] [--dry-run]";

function localDateString(now: Date): string {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "Europe/Bratislava",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(now);
    const value = (type: string) => parts.find(part => part.type === type)?.value;
    return `${value("year")}-${value("month")}-${value("day")}`;
}

function validateDate(value: string): void {
    const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!parts) {
        throw new Error(`Invalid date: ${value}. Expected YYYY-MM-DD.`);
    }
    const year = Number(parts[1]);
    const month = Number(parts[2]);
    const day = Number(parts[3]);
    const candidate = new Date(Date.UTC(year, month - 1, day));
    if (candidate.getUTCFullYear() !== year || candidate.getUTCMonth() + 1 !== month || candidate.getUTCDate() !== day) {
        throw new Error(`Invalid date: ${value}. Expected a real calendar date.`);
    }
}

export function parseRunnerArgs(argv: string[], now = new Date()): RunnerArgs {
    const args: RunnerArgs = {
        date: localDateString(now),
        outputDirectory: "./runner-output",
        saveRaw: false,
        dryRun: false,
        help: false
    };

    for (let index = 0; index < argv.length; index += 1) {
        const flag = argv[index];
        if (flag === "--help" || flag === "-h") {
            args.help = true;
            continue;
        }
        if (flag === "--save-raw") {
            args.saveRaw = true;
            continue;
        }
        if (flag === "--dry-run") {
            args.dryRun = true;
            continue;
        }
        if (flag === "--date" || flag === "--source" || flag === "--output") {
            const value = argv[index + 1];
            if (!value || value.startsWith("--")) {
                throw new Error(`Missing value for ${flag}`);
            }
            index += 1;
            if (flag === "--date") {
                args.date = value;
            } else if (flag === "--source") {
                args.sourceIds = value.split(",").map(id => id.trim());
                if (args.sourceIds.some(id => !id)) {
                    throw new Error("--source requires comma-separated source IDs");
                }
            } else {
                args.outputDirectory = value;
            }
            continue;
        }
        throw new Error(`Unknown option: ${flag}`);
    }

    if (!args.help) {
        validateDate(args.date);
    }
    return args;
}

function unexpectedFailure(target: RunnerTarget, date: Date): ProbeResult {
    return {
        sourceId: target.sourceId,
        restaurant: target.restaurantName,
        requestedUrl: target.urlFactory(date),
        finalUrl: null,
        transport: "none",
        httpStatus: null,
        title: "",
        contentLength: 0,
        contentMarkerCount: 0,
        classification: "error",
        challengeDetected: false,
        menuItemCount: 0,
        items: [],
        startedAt: new Date().toISOString(),
        elapsedMs: 0,
        error: "Unexpected source probe failure"
    };
}

async function writeRun(outputDirectory: string, run: ProbeRun): Promise<string> {
    await fs.mkdir(outputDirectory, { recursive: true, mode: 0o700 });
    await fs.chmod(outputDirectory, 0o700);
    const filename = `probe-${run.runId}.json`;
    const finalPath = path.join(outputDirectory, filename);
    const temporaryPath = path.join(outputDirectory, `.${filename}.${process.pid}.tmp`);
    try {
        await fs.writeFile(temporaryPath, JSON.stringify(run, null, 2) + "\n", { encoding: "utf8", mode: 0o600, flag: "wx" });
        await fs.rename(temporaryPath, finalPath);
    } catch (error) {
        await fs.unlink(temporaryPath).catch(() => undefined);
        throw error;
    }
    return finalPath;
}

export async function runOnce(argv: string[], dependencies: RunnerDependencies = {}): Promise<string | undefined> {
    const now = dependencies.now || (() => new Date());
    const args = parseRunnerArgs(argv, now());
    const log = dependencies.log || console.log;
    if (args.help) {
        log(usage);
        return undefined;
    }
    const targets = getRunnerTargets(args.sourceIds);
    if (args.dryRun) {
        log(`Dry run for ${args.date}; output directory: ${args.outputDirectory}`);
        targets.forEach(target => log(`${target.sourceId} ${target.restaurantName}`));
        return undefined;
    }
    process.env.TZ = "Europe/Bratislava";
    const [year, month, day] = args.date.split("-").map(Number);
    const date = new Date(year, month - 1, day, 12);
    const runId = now().toISOString().replace(/:/g, "-");
    const run: ProbeRun = {
        schemaVersion: 1,
        runId,
        runnerHost: (dependencies.hostname || os.hostname)(),
        timezone: "Europe/Bratislava",
        targetDate: args.date,
        results: []
    };
    const browser = await (dependencies.launchBrowser || (() => puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"]
    })))();
    try {
        for (let index = 0; index < targets.length; index += 1) {
            if (index > 0) {
                await (dependencies.sleep || (ms => new Promise(resolve => setTimeout(resolve, ms))))(1500);
            }
            const target = targets[index];
            let result: ProbeResult;
            try {
                result = await (dependencies.probe || probeSource)(target, date, {
                    requestTimeoutMs: 15000,
                    saveRaw: args.saveRaw,
                    rawOutputDirectory: path.join(args.outputDirectory, "raw"),
                    browser
                });
            } catch {
                result = unexpectedFailure(target, date);
            }
            run.results.push(result);
            log(`${result.sourceId} ${result.classification} ${result.transport} ${result.menuItemCount} items ${result.elapsedMs} ms`);
        }
    } finally {
        await browser.close();
    }
    return writeRun(args.outputDirectory, run);
}

if (require.main === module) {
    runOnce(process.argv.slice(2)).catch(error => {
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
    });
}
