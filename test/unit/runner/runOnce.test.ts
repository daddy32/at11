import { expect } from "chai";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import type { Browser } from "puppeteer";

import { parseRunnerArgs, runOnce } from "../../../runner/runOnce";
import { ProbeResult } from "../../../runner/types";

describe("runner CLI", () => {
    it("rejects an impossible calendar date with a useful message", () => {
        expect(() => parseRunnerArgs(["--date", "2026-02-30"])).to.throw("Invalid date: 2026-02-30");
    });

    it("exits non-zero for invalid arguments without launching a browser", () => {
        const result = spawnSync(process.execPath, ["-r", "ts-node/register", "runner/runOnce.ts", "--date", "2026-02-30"], {
            cwd: path.join(__dirname, "../../.."),
            encoding: "utf8"
        });

        expect(result.status).to.equal(1);
        expect(result.stderr).to.include("Invalid date: 2026-02-30");
    });

    it("previews a run without starting a browser or creating output in dry-run mode", async () => {
        const directory = await fs.mkdtemp(path.join(os.tmpdir(), "at11-runner-dry-test-"));
        const output = path.join(directory, "probes");
        const lines: string[] = [];
        try {
            const result = await runOnce(["--date", "2026-09-21", "--source", "eurovea-1", "--output", output, "--dry-run"], {
                launchBrowser: async () => { throw new Error("Browser must not start"); },
                log: line => { lines.push(line); }
            });

            expect(result).to.equal(undefined);
            expect(lines.join("\n")).to.include("eurovea-1");
            expect(await fs.readdir(directory)).to.deep.equal([]);
        } finally {
            await fs.rm(directory, { recursive: true, force: true });
        }
    });

    it("writes one versioned JSON result in requested order and closes the shared browser", async () => {
        const directory = await fs.mkdtemp(path.join(os.tmpdir(), "at11-runner-test-"));
        let launches = 0;
        let closes = 0;
        const delays: number[] = [];
        const browser = { close: async () => { closes += 1; } } as unknown as Browser;
        try {
            await runOnce(["--date", "2026-09-21", "--source", "eurovea-1,eurovea-4", "--output", directory], {
                now: () => new Date("2026-09-21T10:30:00.000Z"),
                hostname: () => "test-host",
                launchBrowser: async () => { launches += 1; return browser; },
                sleep: async ms => { delays.push(ms); },
                log: () => undefined,
                probe: async target => ({
                    sourceId: target.sourceId,
                    restaurant: target.restaurantName,
                    requestedUrl: target.urlFactory(new Date(2026, 8, 21, 12)),
                    finalUrl: target.urlFactory(new Date(2026, 8, 21, 12)),
                    transport: "direct-http",
                    httpStatus: 200,
                    title: "Menu",
                    contentLength: 100,
                    contentMarkerCount: 1,
                    classification: "success",
                    challengeDetected: false,
                    menuItemCount: 1,
                    items: [{ text: "Soup", price: 2, isSoup: true }],
                    startedAt: "2026-09-21T10:30:01.000Z",
                    elapsedMs: 5,
                    error: null
                } as ProbeResult)
            });

            const files = await fs.readdir(directory);
            expect(files).to.deep.equal(["probe-2026-09-21T10-30-00.000Z.json"]);
            const output = JSON.parse(await fs.readFile(path.join(directory, files[0]), "utf8"));
            expect(output.schemaVersion).to.equal(1);
            expect(output.runnerHost).to.equal("test-host");
            expect(output.targetDate).to.equal("2026-09-21");
            expect(output.results.map((result: ProbeResult) => result.sourceId)).to.deep.equal(["eurovea-1", "eurovea-4"]);
            expect(launches).to.equal(1);
            expect(closes).to.equal(1);
            expect(delays).to.deep.equal([1500]);
        } finally {
            await fs.rm(directory, { recursive: true, force: true });
        }
    });

    it("runs the Debian wrapper from the repository with private output permissions", async () => {
        const directory = await fs.mkdtemp(path.join(os.tmpdir(), "at11-wrapper-test-"));
        const fakeNode = path.join(directory, "fake-node.sh");
        const capture = path.join(directory, "capture.txt");
        const output = path.join(directory, "probes");
        await fs.writeFile(fakeNode, "#!/bin/sh\nprintf '%s\\n' \"$PWD\" \"$TZ\" \"$@\" > \"$AT11_CAPTURE_FILE\"\n", { mode: 0o755 });
        try {
            const result = spawnSync("bash", ["runner/scripts/run-once.sh", "--date", "2026-09-21", "--output", output], {
                cwd: path.join(__dirname, "../../.."),
                encoding: "utf8",
                env: { ...process.env, TZ: "Europe/Bratislava", NODE_BIN: fakeNode, AT11_CAPTURE_FILE: capture }
            });

            expect(result.status).to.equal(0, result.stderr);
            const lines = (await fs.readFile(capture, "utf8")).trim().split("\n");
            expect(lines[0]).to.equal(path.join(__dirname, "../../.."));
            expect(lines[1]).to.equal("Europe/Bratislava");
            expect(lines.slice(2)).to.deep.equal(["dist/runner/runOnce.js", "--date", "2026-09-21", "--output", output]);
            expect((await fs.stat(output)).mode & 0o777).to.equal(0o700);
        } finally {
            await fs.rm(directory, { recursive: true, force: true });
        }
    });

    it("does not create an output directory through the wrapper in dry-run mode", async () => {
        const directory = await fs.mkdtemp(path.join(os.tmpdir(), "at11-wrapper-dry-test-"));
        const fakeNode = path.join(directory, "fake-node.sh");
        const output = path.join(directory, "probes");
        await fs.writeFile(fakeNode, "#!/bin/sh\nexit 0\n", { mode: 0o755 });
        try {
            const result = spawnSync("bash", ["runner/scripts/run-once.sh", "--output", output, "--dry-run"], {
                cwd: path.join(__dirname, "../../.."),
                encoding: "utf8",
                env: { ...process.env, NODE_BIN: fakeNode }
            });

            expect(result.status).to.equal(0, result.stderr);
            expect(await fs.readdir(directory)).to.deep.equal(["fake-node.sh"]);
        } finally {
            await fs.rm(directory, { recursive: true, force: true });
        }
    });

    it("runs the checked-out wrapper directly without invoking Bash explicitly", () => {
        const result = spawnSync(path.join(__dirname, "../../../runner/scripts/run-once.sh"), [
            "--dry-run", "--date", "2026-09-21", "--source", "eurovea-1"
        ], {
            cwd: path.join(__dirname, "../../.."),
            encoding: "utf8"
        });

        expect(result.error).to.equal(undefined);
        expect(result.status).to.equal(0, result.stderr);
        expect(result.stdout).to.include("eurovea-1 DOCK7");
    });
});
