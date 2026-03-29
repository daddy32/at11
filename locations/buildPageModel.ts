import { ILocationConfig } from "./types";

export function buildPageModel(
    currentLocation: ILocationConfig,
    allLocations: ReadonlyArray<ILocationConfig>,
    now: Date
) {
    return {
        currentLocation,
        pageTitle: `@11 - ${currentLocation.displayName}`,
        metaDescription: currentLocation.metaDescription,
        locations: allLocations.map(location => ({
            slug: location.slug,
            name: location.displayName,
            href: `/${location.slug}`,
            selected: location.slug === currentLocation.slug
        })),
        restaurants: currentLocation.restaurants.map(restaurant => ({
            id: `${currentLocation.slug}-${restaurant.id}`,
            name: restaurant.name,
            url: restaurant.urlFactory(now)
        }))
    };
}
