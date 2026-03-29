import { euroveaLocation } from "./eurovea";
import { patronkaLocation } from "./patronka";
import { ILocationConfig } from "./types";

const locations: ReadonlyArray<ILocationConfig> = [patronkaLocation, euroveaLocation];

export function getLocations(): ReadonlyArray<ILocationConfig> {
    return locations;
}

export function getDefaultLocation(): ILocationConfig {
    return locations[0];
}

export function getLocationBySlug(slug: string): ILocationConfig | undefined {
    return locations.find(location => location.slug === slug);
}

export { euroveaLocation, patronkaLocation };
export type { ILocationConfig, IRestaurantConfig } from "./types";
