import { getLocations } from "../locations";
import { RunnerTarget } from "./types";

const defaultSourceIds = [
    "eurovea-4",
    "eurovea-5",
    "patronka-3",
    "patronka-5",
    "eurovea-1",
    "eurovea-2",
    "eurovea-6",
    "eurovea-7",
    "eurovea-8",
    "patronka-1",
    "patronka-2"
];

export function getRunnerTargets(ids: string[] = defaultSourceIds): RunnerTarget[] {
    const configured = new Map<string, RunnerTarget>();

    for (const location of getLocations()) {
        for (const restaurant of location.restaurants) {
            const sourceId = `${location.slug}-${restaurant.id}`;
            configured.set(sourceId, {
                sourceId,
                locationSlug: location.slug,
                restaurantName: restaurant.name,
                urlFactory: restaurant.urlFactory,
                parser: restaurant.parser
            });
        }
    }

    return ids.map(id => {
        const target = configured.get(id);
        if (!target) {
            throw new Error(`Unknown runner source ID: ${id}`);
        }
        return target;
    });
}
