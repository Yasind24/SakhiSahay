export interface Coordinates {
  lat: number;
  lon: number;
}

export function distanceInKm(a: Coordinates, b: Coordinates): number {
  const earthRadiusKm = 6371;
  const latDelta = toRadians(b.lat - a.lat);
  const lonDelta = toRadians(b.lon - a.lon);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const haversine =
    Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(lonDelta / 2) * Math.sin(lonDelta / 2);

  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function googleMapsDirectionsUrl(destination: Coordinates, origin?: Coordinates): string {
  const params = new URLSearchParams({
    api: "1",
    destination: `${destination.lat},${destination.lon}`,
    travelmode: "driving",
  });

  if (origin) {
    params.set("origin", `${origin.lat},${origin.lon}`);
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function googleMapsSearchUrl(destination: Coordinates): string {
  const params = new URLSearchParams({
    api: "1",
    query: `${destination.lat},${destination.lon}`,
  });

  return `https://www.google.com/maps/search/?${params.toString()}`;
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}
