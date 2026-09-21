# Freedombox Residential Runner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Determine whether a residential runner on the always-on Freedombox can reliably fetch and parse the blocked `restauracie.sme.sk` and `menucka.sk` menus, without paying for ScraperAPI, before connecting the runner to production.

**Architecture:** Keep the runner in this repository under `runner/`, but make it a separate execution target from the web application. The first phase is a direct Debian/Node/Puppeteer process that runs sequential probes, writes structured diagnostics and parsed menus to local disk, and exposes no network listener. The existing production application remains a CapRover deployment built from the repository root `Dockerfile`; production ingestion is a later authenticated interface, not part of the prototype.

**Tech Stack:** Node.js `>=22`, npm `>=10 <12`, TypeScript 5.5, Puppeteer 24, Axios, Cheerio/PDF parsing already present in this repository, `systemd` timer on Freedombox after manual validation, and CapRover/Docker only for the existing production app or a later optional runner image.

## Global Constraints

- Run the prototype from Freedombox's normal residential public IP; do not use a proxy, ScraperAPI, Browserless, or another paid anti-bot service.
- Do not add a public HTTP listener to Freedombox for the prototype.
- Do not send probe results to production during the viability phase.
- Do not change the root `Dockerfile` or `captain-definition` to deploy the runner.
- Do not put cookies, authorization headers, API keys, or complete challenge-page HTML into normal probe output.
- Use one browser instance and one page at a time, with a delay between target requests.
- Use `Europe/Bratislava` for target dates and scheduling.
- Preserve the existing parser instances and restaurant URL factories from `locations/eurovea.ts` and `locations/patronka.ts` instead of maintaining a second restaurant registry.
- Treat a challenge page as a failed fetch even when the browser navigation itself returns HTTP 200.

---

## Context for the Freedombox agent

The current app fetches menus on demand and keeps them in an in-memory two-hour cache. The relevant source configuration is already in the repository:

| Source group | Current examples | Expected prototype value |
|---|---|---|
| SME | `eurovea-4` Kolkovna Eurovea, `eurovea-5` Brasserie La Marine, `patronka-3` Patrónsky pivovar, `patronka-5` Svadby a Kari | Main viability targets; HTTP requests receive 403 and browser pages may show Cloudflare's `Len chvíľu...` challenge. |
| Menučka | `eurovea-1` DOCK7, `eurovea-2` COMO, `eurovea-6` Canteen Priatelia, `eurovea-7` Veg Life, `eurovea-8` OBEDERIA, `patronka-1` and `patronka-2` | Regression/control targets; DOCK7 is currently known to work in production, while the others have shown 403-related failures. |
| Existing parser code | `locations/eurovea.ts`, `locations/patronka.ts`, `parsers/**` | Reuse the configured `urlFactory` and `parser` for each target. |

Production facts:

- Production runs on CapRover via Docker, using the root `captain-definition` and root `Dockerfile`.
- Azure is not the production deployment target for this project.
- The Freedombox runner is a separate execution target and must not be inferred from `NODE_ENV=production`; it is a residential fetch worker, not another CapRover web container.
- The current production app has no durable runner-ingestion API. Local probe artifacts are therefore the complete output of phase 1.

## Target directory layout

Create the following files only when their task is reached:

| Path | Responsibility |
|---|---|
| `runner/types.ts` | Versioned target, attempt, result, and output contracts. |
| `runner/targets.ts` | Selects existing restaurant configurations by stable IDs; does not duplicate URLs or parser instances. |
| `runner/probeSource.ts` | Performs one source probe, including direct HTTP, browser fallback, SME export PDF fallback, challenge detection, and parser invocation. |
| `runner/runOnce.ts` | CLI entry point; parses flags, runs targets sequentially, writes one JSON result, and sets a non-zero exit code for operational failures. |
| `runner/scripts/run-once.sh` | Debian-friendly wrapper that selects the repository, output directory, and Node executable without starting the web app. |
| `runner/deploy/at11-runner.service` | Future systemd service for one probe run. It must not listen on a port. |
| `runner/deploy/at11-runner.timer` | Future weekday schedule, enabled only after manual probe validation. |
| `runner/deploy/install-freedombox.sh` | Future idempotent installation/update script for the systemd units. |
| `.gitignore` | Ignores local runner artifacts, while keeping the runner source and sample fixtures tracked. |
| `package.json` | Adds explicit runner commands without changing `start`, CapRover, or the production image contract. |

The prototype should not initially add `runner/Dockerfile`. A container is useful only after direct-host execution is proven and the agent has a concrete reason such as reproducible Chromium dependencies or process isolation.

## Output contract

Each run writes one UTF-8 JSON document named `probe-<UTC timestamp>.json` under the configured output directory. The schema is versioned and should have this shape:

```json
{
  "schemaVersion": 1,
  "runId": "2026-09-21T10-30-00.000Z",
  "runnerHost": "freedombox",
  "timezone": "Europe/Bratislava",
  "targetDate": "2026-09-21",
  "results": [
    {
      "sourceId": "eurovea-4",
      "restaurant": "Kolkovna Eurovea",
      "requestedUrl": "https://restauracie.sme.sk/restauracia/kolkovna-eurovea_4138-stare-mesto_2949/denne-menu",
      "finalUrl": "https://restauracie.sme.sk/restauracia/kolkovna-eurovea_4138-stare-mesto_2949/denne-menu",
      "transport": "sme-export-pdf",
      "httpStatus": 200,
      "title": "",
      "classification": "success",
      "challengeDetected": false,
      "menuItemCount": 4,
      "items": [],
      "startedAt": "2026-09-21T10:30:01.000Z",
      "elapsedMs": 8421,
      "error": null
    }
  ]
}
```

The actual `items` array must contain the parsed `IMenuItem` values for successful results. The example leaves it empty only to keep the contract readable. For a challenge, empty menu, or error, retain the observed status/title/final URL and set `items` to `[]`.

Use these classifications:

- `success`: the parser returned at least one menu item for the requested local date.
- `no-menu`: the source responded normally but has no menu for that date; record this distinctly from a technical failure.
- `challenge`: the browser returned a challenge/interstitial page or the content marker never appeared and the page title/body indicates blocking.
- `empty`: the page was not recognized as a challenge but contained no parseable menu.
- `error`: navigation, PDF download, parsing, or local output failed.

Normal output must not include raw HTML, PDF bytes, cookies, request headers, or secrets. Add an explicit `--save-raw` flag for temporary debugging; when enabled, save sanitized HTML/text/PDF-derived text beside the JSON and document that those files may contain restaurant content.

## Viability decision

The Freedombox agent should report a table with one row per target and these measurements:

| Measurement | Required observation |
|---|---|
| Fetch mode | Direct HTTP, browser HTML, or SME export PDF. |
| Technical success rate | Successful parsed menu results divided by attempts, excluding deliberately configured `no-menu` dates. |
| Challenge rate | Challenge classifications divided by attempts. |
| Parse count | Number of `IMenuItem` values returned. |
| Latency | Median and 95th-percentile end-to-end duration. |
| Consecutive failures | Longest failure streak per target. |
| Output durability | Whether files remain readable after process restart and host reboot. |

Call the direct residential approach viable when all of the following are true:

1. Each critical SME target (`eurovea-4`, `eurovea-5`, `patronka-3`, and `patronka-5`) has at least 20 weekday attempts spanning at least two lunch windows.
2. Each critical target has at least 95% successful parsed-menu results, with no more than one consecutive technical failure.
3. The Menučka control `eurovea-1` continues to parse successfully and the other configured Menučka targets are measured rather than silently skipped.
4. The challenge classification rate is at most 5% per critical target, and no target requires a human to solve a CAPTCHA or challenge.
5. The 95th-percentile duration is at most 45 seconds per target, and the sequential run completes within the timer interval.
6. No paid proxy/API key is required.

Call it not viable for unattended production ingestion if a target repeatedly returns a challenge page, needs manual interaction, or fails the 95% threshold across two weekday lunch windows. A single source may then be retired, replaced by a restaurant-specific source, or evaluated separately; do not lower the threshold by silently serving stale or empty data.

## Task 1: Add the script-only runner contracts and target selection

**Files:**

- Create: `runner/types.ts`
- Create: `runner/targets.ts`
- Modify: `package.json`
- Modify: `.gitignore`
- Test: `test/unit/runner/targets.test.ts`

**Interfaces:**

- `getRunnerTargets(ids?: string[]): RunnerTarget[]` returns the selected configured targets in deterministic order.
- `RunnerTarget` contains `sourceId`, `locationSlug`, `restaurantName`, `urlFactory`, and `parser`.
- `ProbeResult` and `ProbeRun` match the output contract above.

- [ ] **Step 1: Write the target-selection test.**

  Assert that `getRunnerTargets(["eurovea-4", "eurovea-1"])` returns Kolkovna Eurovea first and DOCK7 second, and that an unknown ID throws an error naming the ID.

- [ ] **Step 2: Run the focused test and confirm it fails because the runner module does not exist.**

  Run:

  ```bash
  npm test -- --grep "runner target"
  ```

  Expected result before implementation: the focused test fails with a module-not-found or missing-export error.

- [ ] **Step 3: Implement target selection by importing `getLocations()` and matching `${location.slug}-${restaurant.id}`.**

  Do not copy URL strings into `runner/targets.ts`. Skip `isDummy` restaurants unless the CLI explicitly requests an ID that is dummy; the initial default set is the eight source IDs listed in the context table.

- [ ] **Step 4: Add runner commands and artifact ignores.**

  Add scripts that do not alter the existing web commands:

  ```json
  "runner:build": "tsc",
  "runner:probe": "ts-node runner/runOnce.ts"
  ```

  Ignore `runner-output/`, `runner-output/**`, and `runner-raw/`, but do not ignore source files under `runner/` or tests under `test/`.

- [ ] **Step 5: Run the focused test and TypeScript build.**

  ```bash
  npm test -- --grep "runner target"
  npm run build
  ```

  Both commands must exit with code 0.

- [ ] **Step 6: Commit the isolated runner contract.**

  ```bash
  git add runner/types.ts runner/targets.ts test/unit/runner/targets.test.ts package.json .gitignore
  git commit -m "feat: add residential runner target contracts"
  ```

## Task 2: Implement one direct residential source probe

**Files:**

- Create: `runner/probeSource.ts`
- Create: `test/unit/runner/probeSource.test.ts`
- Modify: `menuFetcher.ts` only if a small shared helper is extracted rather than copied

**Interfaces:**

- `probeSource(target: RunnerTarget, date: Date, options: ProbeOptions): Promise<ProbeResult>` performs one complete probe.
- `ProbeOptions` contains `requestTimeoutMs`, `saveRaw`, `rawOutputDirectory`, and an injectable HTTP/browser implementation for unit tests.

- [ ] **Step 1: Write tests for classification and parser behavior.**

  Cover these inputs:

  1. A normal HTML response containing the target parser's menu returns `classification: "success"` and a non-zero `menuItemCount`.
  2. An SME challenge page titled `Len chvíľu...` returns `classification: "challenge"` even if navigation reports HTTP 200.
  3. An SME export response beginning with `%PDF` is parsed through the existing SME PDF path and returns `transport: "sme-export-pdf"`.
  4. A non-challenge page with no menu rows returns `classification: "empty"`.
  5. A transport or parser exception returns `classification: "error"` and does not throw out of the batch.

- [ ] **Step 2: Run the focused test and confirm it fails.**

  ```bash
  npm test -- --grep "source probe"
  ```

- [ ] **Step 3: Implement the fetch order.**

  Use the same behavior as the production fallback, while keeping the probe diagnostic-rich:

  1. Build the URL from the existing target `urlFactory(date)`.
  2. Attempt Axios with the existing Slovak `Accept-Language` and browser-like `User-Agent` headers.
  3. For `restauracie.sme.sk` and `menucka.sk`, use Puppeteer after HTTP 403 or 429.
  4. In the browser, record HTTP status, final URL, title, content length, and source-specific menu-marker count.
  5. Retry navigation once after a one-second delay when the content marker is missing.
  6. For SME URLs, derive the existing `/export/resmenu/{restaurantId}` URL and fetch the PDF from the same browser page when the menu page is challenged or empty. Parse it with `pdf-parse` and the repository's `SME_PDF_TEXT_PREFIX` convention.
  7. Never switch the same request between different proxy/IP providers. The browser and its PDF fetch must use Freedombox's direct connection.
  8. Close the page in a `finally` block; close the browser once after the batch finishes.

  Detect at least these challenge indicators: HTTP 403/429, title `Len chvíľu...`, Cloudflare challenge markers, and a missing source content marker after the retry. Do not classify any page with zero menu rows as success.

- [ ] **Step 4: Run the focused tests and the complete existing test suite.**

  ```bash
  npm test -- --grep "source probe"
  npm test
  npm run build
  ```

  All commands must exit 0. Unit tests must not make real network requests.

- [ ] **Step 5: Commit the probe.**

  ```bash
  git add runner/probeSource.ts test/unit/runner/probeSource.test.ts menuFetcher.ts
  git commit -m "feat: add residential source probe"
  ```

  Omit `menuFetcher.ts` from the commit if no shared helper was needed.

## Task 3: Add the one-shot CLI and local diagnostics

**Files:**

- Create: `runner/runOnce.ts`
- Create: `runner/scripts/run-once.sh`
- Create: `test/unit/runner/runOnce.test.ts`

**Interfaces:**

- CLI usage:

  ```text
  node dist/runner/runOnce.js [--date YYYY-MM-DD] [--source ID,...] [--output DIR] [--save-raw]
  ```

- Defaults:

  - Date: current date in `Europe/Bratislava`.
  - Sources: `eurovea-4,eurovea-5,patronka-3,patronka-5,eurovea-1,eurovea-2,eurovea-6,eurovea-7,eurovea-8,patronka-1,patronka-2`.
  - Output: `./runner-output`.
  - Raw capture: disabled.

- [ ] **Step 1: Write CLI tests for argument parsing, deterministic ordering, and output naming.**

  Assert that `--source eurovea-1,eurovea-4` preserves the requested order, an invalid date exits with a useful message, and a run creates one `probe-*.json` document containing `schemaVersion: 1`.

- [ ] **Step 2: Run the focused test and confirm it fails.**

  ```bash
  npm test -- --grep "runner CLI"
  ```

- [ ] **Step 3: Implement the batch runner.**

  Launch one browser for the batch, run targets sequentially, wait at least 1.5 seconds between source requests, and continue after an individual target failure. Print a one-line summary per target containing source ID, classification, transport, item count, and elapsed milliseconds. Write the JSON atomically by writing a temporary file in the same directory and renaming it to the final filename.

  Exit with code 0 when the run completed and produced results, even if one source failed; exit non-zero for invalid arguments, browser startup failure, or inability to write the result file. The JSON result remains the source of truth for per-target failures.

- [ ] **Step 4: Implement the Debian wrapper.**

  `runner/scripts/run-once.sh` must:

  1. Resolve its repository directory from the script location.
  2. Set `TZ=Europe/Bratislava` unless the caller already provided it.
  3. Create the output directory with mode `0700`.
  4. Run `node dist/runner/runOnce.js` from the repository root.
  5. Pass through all CLI arguments and return the Node exit code.

  The wrapper must not run `npm start`, bind a port, or use Docker.

- [ ] **Step 5: Run the tests and build.**

  ```bash
  npm test -- --grep "runner CLI"
  npm test
  npm run build
  ```

- [ ] **Step 6: Commit the one-shot runner.**

  ```bash
  git add runner/runOnce.ts runner/scripts/run-once.sh test/unit/runner/runOnce.test.ts
  git commit -m "feat: add one-shot residential runner"
  ```

## Task 4: Run the Freedombox manual viability experiment

Do this on Freedombox, not on the CapRover host and not through a production container.

- [ ] **Step 1: Verify host prerequisites.**

  ```bash
  uname -a
  node --version
  npm --version
  command -v chromium || command -v chromium-browser || true
  free -h
  df -h
  curl -I https://restauracie.sme.sk/restauracia/kolkovna-eurovea_4138-stare-mesto_2949/denne-menu
  ```

  Node must satisfy `>=22`, npm must satisfy `>=10 <12`, and the host must have enough disk for Chromium and local diagnostics. Record the observed versions and whether the direct curl receives 403; a 403 is expected and is not itself a failed experiment.

- [ ] **Step 2: Install the repository without modifying the production image.**

  ```bash
  sudo install -d -m 0750 /opt/at11
  sudo chown "$USER":"$USER" /opt/at11
  git clone <repository-url> /opt/at11
  cd /opt/at11
  npm ci
  npm run build
  npx puppeteer browsers install chrome
  ```

  If a system Chromium is already installed, record its path and test it only through an explicit runner option; do not silently change the production Puppeteer launch behavior.

- [ ] **Step 3: Execute a smoke run with the known-good control and two SME targets.**

  ```bash
  cd /opt/at11
  runner/scripts/run-once.sh \
    --date "$(TZ=Europe/Bratislava date +%F)" \
    --source eurovea-1,eurovea-4,eurovea-5 \
    --output /var/lib/at11-runner/probes
  ```

  Inspect the JSON, not only the console log. Confirm that DOCK7 is independently successful and inspect whether the SME sources are `success`, `sme-export-pdf`, `challenge`, `empty`, or `error`.

- [ ] **Step 4: Run the complete target set manually at three times on two weekdays.**

  Use approximately 08:30, 10:30, and 12:30 Europe/Bratislava on two weekdays. Wait at least 30 minutes between full runs. Do not use `--save-raw` for every run; enable it only for a single failed target when diagnosing a classification.

- [ ] **Step 5: Run the 20-attempt experiment.**

  Run the target set during at least two weekday lunch windows until each critical SME source has 20 attempts. Keep the JSON artifacts and summarize success rate, challenge rate, parse count, p50/p95 duration, and longest failure streak using the decision criteria above.

- [ ] **Step 6: Record the decision in a dated report.**

  Create `docs/research/YYYY-MM-DD-freedombox-runner-viability.md` with the host versions, exact commit, dates/times, target table, representative JSON filenames, observed failure modes, and a clear `viable`, `not viable`, or `source-specific` conclusion. Do not claim success from a single smoke run.

## Task 5: Add a systemd timer only after the manual experiment passes

**Files:**

- Create: `runner/deploy/at11-runner.service`
- Create: `runner/deploy/at11-runner.timer`
- Create: `runner/deploy/install-freedombox.sh`

- [ ] **Step 1: Add a service that runs one probe and exits.**

  The unit must use `/opt/at11` as `WorkingDirectory`, `/var/lib/at11-runner/probes` as output, `Environment=TZ=Europe/Bratislava`, a non-root `User`, `NoNewPrivileges=true`, `PrivateTmp=true`, and a read/write path only for the repository and output directory. It must not expose a socket or port.

- [ ] **Step 2: Add a weekday timer.**

  Schedule runs at `Mon..Fri *-*-* 08:30,10:30,12:30:00 Europe/Bratislava`, set `Persistent=true`, and set a randomized delay of at most five minutes to avoid synchronized bursts. Set the service timeout longer than the measured p95 duration but no longer than ten minutes.

- [ ] **Step 3: Make installation idempotent.**

  The installer must validate that `/opt/at11/dist/runner/runOnce.js` exists, create `/var/lib/at11-runner/probes` with mode `0700`, install the units under `/etc/systemd/system`, run `systemctl daemon-reload`, and print the commands needed to enable the timer. It must not enable the timer automatically until the operator chooses to do so.

- [ ] **Step 4: Verify service behavior.**

  ```bash
  sudo systemctl daemon-reload
  sudo systemctl start at11-runner.service
  sudo systemctl status at11-runner.service --no-pager
  sudo journalctl -u at11-runner.service -n 100 --no-pager
  sudo find /var/lib/at11-runner/probes -maxdepth 1 -type f -name 'probe-*.json' -ls
  ```

  Then, only if the manual experiment passed:

  ```bash
  sudo systemctl enable --now at11-runner.timer
  systemctl list-timers at11-runner.timer --all
  ```

- [ ] **Step 5: Commit the systemd deployment scripts.**

  ```bash
  git add runner/deploy
  git commit -m "feat: add Freedombox runner systemd deployment"
  ```

## Task 6: Define the later CapRover integration, without implementing it in the prototype

The residential runner should not write directly into the current in-memory cache. After viability is established, implement a narrow authenticated ingestion path in the CapRover web app.

Recommended future contract:

```text
POST /internal/menu-runner/v1/menus
Authorization: Bearer <rotated secret>
Content-Type: application/json
```

Payload:

```json
{
  "sourceId": "eurovea-4",
  "date": "2026-09-21",
  "items": [
    { "text": "...", "price": 8.9, "isSoup": false }
  ],
  "fetchedAt": "2026-09-21T10:30:01.000Z",
  "transport": "sme-export-pdf",
  "runnerVersion": "git-sha"
}
```

The later implementation must validate the source ID, date, item shape, item count, and freshness; reject challenge/empty/error results; keep a durable last-known-good record; and make publication idempotent by `(sourceId, date, runnerVersion or fetchedAt)`. The runner should send parsed menu JSON, not raw HTML or PDFs, by default.

Use the CapRover HTTPS hostname as the ingestion URL. Store the bearer secret only in Freedombox's protected environment or systemd credentials and in CapRover's environment settings. Do not open an unauthenticated LAN endpoint and do not assume that being on the same home network creates a secure trust boundary.

The later decision to add `runner/Dockerfile` is justified only if the direct-host systemd deployment is viable and containerization improves reproducibility or operations. The runner image, if added, must have its own Dockerfile and entry point; it must not replace or alter the root CapRover image.

## Verification checklist before handing off

- [ ] `npm test` passes on the implementation commit.
- [ ] `npm run build` emits `dist/runner/runOnce.js`.
- [ ] A unit test proves challenge pages are not classified as successful menus.
- [ ] A Freedombox smoke run has a JSON artifact for DOCK7 and both SME Eurovea targets.
- [ ] The 20-attempt experiment has been completed for every critical SME target.
- [ ] The viability report includes actual success/challenge/latency measurements.
- [ ] No ScraperAPI key is required for the viable path.
- [ ] No prototype process listens on a port or writes to CapRover.
- [ ] Any later CapRover integration is separately authenticated, durable, and tested before production enablement.
