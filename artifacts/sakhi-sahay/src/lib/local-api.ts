import { ALL_OSCS, type OscEntry } from "../../../api-server/src/data/oscs";
import geoCacheJson from "../../../api-server/src/data/geocache.json";

interface GeoEntry {
  lat: number;
  lon: number;
  displayName: string;
}

type GeoCache = Record<string, GeoEntry | null>;

const geoCache = geoCacheJson as GeoCache;

export interface OscWithCoords extends Omit<OscEntry, "lat" | "lon"> {
  lat: number | null;
  lon: number | null;
}

export interface OscsResponse {
  data: OscWithCoords[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface StatesResponse {
  states: Array<{ state: string; count: number }>;
  total: number;
}

export interface DistrictsResponse {
  districts: Array<{ district: string; count: number }>;
  state: string;
}

export interface MapResponse {
  data: Array<OscEntry & { lat: number; lon: number }>;
  total: number;
}

function getCoords(district: string, state: string) {
  return geoCache[`${district}|||${state}`] ?? null;
}

function withCoords(osc: OscEntry): OscWithCoords {
  if (typeof osc.lat === "number" && typeof osc.lon === "number") {
    return { ...osc, lat: osc.lat, lon: osc.lon };
  }
  const coords = getCoords(osc.district, osc.state);
  return { ...osc, lat: coords?.lat ?? null, lon: coords?.lon ?? null };
}

export function getOscs(params: {
  state?: string;
  district?: string;
  q?: string;
  page?: number;
  limit?: number;
}): OscsResponse {
  const { state, district, q } = params;
  let filtered = ALL_OSCS;

  if (state) {
    filtered = filtered.filter((osc) => osc.state.toLowerCase() === state.toLowerCase());
  }

  if (district) {
    filtered = filtered.filter((osc) => osc.district.toLowerCase() === district.toLowerCase());
  }

  if (q) {
    const query = q.toLowerCase();
    filtered = filtered.filter(
      (osc) =>
        osc.state.toLowerCase().includes(query) ||
        osc.district.toLowerCase().includes(query) ||
        osc.name.toLowerCase().includes(query) ||
        osc.address.toLowerCase().includes(query),
    );
  }

  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(100, Math.max(1, params.limit ?? 20));
  const total = filtered.length;
  const totalPages = Math.ceil(total / limit);
  const data = filtered.slice((page - 1) * limit, page * limit).map(withCoords);

  return { data, total, page, limit, totalPages };
}

export function getStates(): StatesResponse {
  const stateMap = new Map<string, number>();

  for (const osc of ALL_OSCS) {
    stateMap.set(osc.state, (stateMap.get(osc.state) ?? 0) + 1);
  }

  const states = [...stateMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([state, count]) => ({ state, count }));

  return { states, total: states.length };
}

export function getDistricts(state: string): DistrictsResponse {
  const districtMap = new Map<string, number>();

  for (const osc of ALL_OSCS) {
    if (osc.state.toLowerCase() === state.toLowerCase()) {
      districtMap.set(osc.district, (districtMap.get(osc.district) ?? 0) + 1);
    }
  }

  const districts = [...districtMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([district, count]) => ({ district, count }));

  return { districts, state };
}

export function getMapOscs(state?: string): MapResponse {
  const oscs = state
    ? ALL_OSCS.filter((osc) => osc.state.toLowerCase() === state.toLowerCase())
    : ALL_OSCS;

  const data = oscs.flatMap((osc) => {
    const withLocation = withCoords(osc);
    return withLocation.lat !== null && withLocation.lon !== null
      ? [{ ...osc, lat: withLocation.lat, lon: withLocation.lon }]
      : [];
  });

  return { data, total: data.length };
}

export function getOscById(id: number): OscWithCoords | undefined {
  const osc = ALL_OSCS.find((entry) => entry.id === id);
  return osc ? withCoords(osc) : undefined;
}
