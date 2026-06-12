import * as appInsights from "applicationinsights";
import express from "express";
import hbs from "hbs";

import { createStartupCache } from "./cacheFactory";
import { Config } from "./config";
import { buildPageModel } from "./locations/buildPageModel";
import { MenuFetcher, IMenuResult } from "./menuFetcher";
/**
 * Node.js 20+ does not export isError from "util".
 * Custom type guard for Error objects.
 */
function isError(value: unknown): value is Error {
    return value instanceof Error;
}
import { sk } from "date-fns/locale";
import { formatDistance, parse, isValid } from "date-fns";

console.debug("Initializing...");
const config = new Config();
const cache = createStartupCache(config.cacheExpiration);
const menuFetcher = new MenuFetcher(config, cache);

if (config.appInsightsInstrumentationKey) {
    appInsights.setup(config.appInsightsInstrumentationKey).setAutoCollectConsole(true, true);
    appInsights.start();
}

const actions = new Map<string, ((date: Date, forceRefresh: boolean, done: (result: IMenuResult) => void) => void)>();
for (const location of config.locations.values()) {
    for (const restaurant of location.restaurants) {
        console.log(`Processing: ${location.slug}/${restaurant.id} - ${restaurant.name}`);
        try {
            const id = location.slug + "-" + restaurant.id;
            if (actions.has(id)) {
                throw new Error("Non unique id '" + id + "' provided within '" + location.slug + "' restaurants");
            }
            actions.set(id, (date, forceRefresh, doneCallback) => menuFetcher.fetchMenu(
                restaurant.urlFactory,
                date,
                restaurant.parser,
                doneCallback,
                {
                    forceRefresh,
                    skipFetch: restaurant.isDummy === true
                }
            ));
        } catch (e) {
            console.warn(e);
        }
    }
}

if (actions.size === 0) {
    throw new Error("Actions initialization failed");
}

console.debug("Express setup...");
const app = express();
app.set("view engine", "html");
app.engine("html", hbs.__express);
app.use(express.static(__dirname + "/../static"));

app.get("/", (_, res) => {
    res.redirect(302, `/${config.defaultLocation.slug}`);
});

app.get("/:locationSlug", (req, res) => {
    res.setHeader("Content-Type", "text/html; charset=UTF-8");
    res.setHeader("Content-Language", "sk");
    const location = config.locations.get(req.params.locationSlug);

    if (!location) {
        res.status(404).send(`Location '${req.params.locationSlug}' not found`);
        return;
    }

    res.render(__dirname + "/../views/index.html", {
        ...buildPageModel(location, [...config.locations.values()], new Date()),
        appInsightsKey: config.appInsightsInstrumentationKey
    });
});
app.get("/menu/:id", (req, res) => {
    const date = parse(req.query.date as string, "yyyy-M-d", new Date());
    if (!isValid(date)) {
        res.statusCode = 400;
        res.send("Missing/incorrect 'date' query parameter");
        return;
    }

    if (!actions.has(req.params.id)) {
        res.statusCode = 404;
        res.send("Restaurant " + req.params.id + " not found");
        return;
    }

    const forceRefresh = req.query.forceRefresh === "1" || req.query.forceRefresh === "true";

    actions.get(req.params.id)(date, forceRefresh, result => {
        const timeago = formatDistance(result.timestamp, new Date(), { addSuffix: true, locale: sk });
        if (isError(result.value)) {
            res.status(500).json({ error: result.value.toString(), timeago });
        } else {
            res.json({ menu: result.value, timeago });
        }
    });
});
const server = app.listen(config.port, () => {
  console.info("Done, listening on", server.address());
});
