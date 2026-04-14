// Simple Google Maps API library, for /lunch usage

const apiKey = process.env.GOOGLE_MAPS_API_KEY!;

export interface GeoCode {
    coords: { lat: number; lng: number };
    formattedAddress: string;
}

// Turns a text-based address string and turns it into properly formatted GeoCoded data.
export async function geocode(address: string): Promise<GeoCode | null> {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
    const json = await (await fetch(url)).json();
    if (json.status === "ZERO_RESULTS") return null;
    if (json.status !== "OK") {
        throw new Error(`holy shit. its so over man its so fucking over ${json.status}: ${JSON.stringify(json)}`);
    }
    return {
        coords: json.results[0].geometry.location,
        formattedAddress: json.results[0].formatted_address,
    };
}

// Looks for nearby restaurants. Uses a hardcoded radius (I am lazy, and the number seems fine)
export async function searchNearbyRestaurants(lat: number, lng: number): Promise<string[]> {
    interface Place {
        displayName: { text: string };
    }

    const response = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask": "places.displayName",
        },
        // pretty simple request
        body: JSON.stringify({
            includedTypes: ["restaurant"],
            maxResultCount: 20,
            locationRestriction: {
                circle: {
                    center: { latitude: lat, longitude: lng },
                    radius: 3300.0,
                },
            },
        }),
    });
    if (!response.ok) {
        const body = await response.text();
        throw new Error(`google places has died and gone to hell (rip) ${response.status}: ${body}`);
    }

    const json = await response.json();
    if (!json.places || json.places.length === 0) return [];

    // grab just the display names as plain text
    const places: string[] = json.places.map((place: Place) => place.displayName.text);

    return places;
}
