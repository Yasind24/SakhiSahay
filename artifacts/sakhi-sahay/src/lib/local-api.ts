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

export interface OscStatsResponse {
  totalOscs: number;
  totalStates: number;
  totalDistricts: number;
  geocodedDistricts: number;
  topStates: Array<{ state: string; count: number }>;
}

const SAMPLE_COORDINATE_MATCH_THRESHOLD = 0.6;

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenScore(a: string, b: string): number {
  const aTokens = new Set(normalize(a).split(" ").filter((token) => token.length > 2));
  const bTokens = new Set(normalize(b).split(" ").filter((token) => token.length > 2));
  if (!aTokens.size || !bTokens.size) return 0;

  let intersection = 0;
  for (const token of aTokens) {
    if (bTokens.has(token)) intersection++;
  }

  return intersection / Math.max(aTokens.size, bTokens.size);
}

function isSampleCoordinateRow(osc: OscEntry): boolean {
  return !osc.name && !osc.email && typeof osc.lat === "number" && typeof osc.lon === "number";
}

function findMatchingSampleCoordinate(osc: OscEntry): OscEntry | undefined {
  if (isSampleCoordinateRow(osc)) return undefined;

  return ALL_OSCS
    .filter(
      (sample) =>
        isSampleCoordinateRow(sample) &&
        sample.state === osc.state &&
        sample.district === osc.district &&
        tokenScore(osc.address, sample.address) >= SAMPLE_COORDINATE_MATCH_THRESHOLD,
    )
    .sort((a, b) => tokenScore(osc.address, b.address) - tokenScore(osc.address, a.address))[0];
}

function isDuplicateSampleCoordinate(osc: OscEntry): boolean {
  if (!isSampleCoordinateRow(osc)) return false;

  return ALL_OSCS.some(
    (candidate) =>
      !isSampleCoordinateRow(candidate) &&
      candidate.state === osc.state &&
      candidate.district === osc.district &&
      tokenScore(candidate.address, osc.address) >= SAMPLE_COORDINATE_MATCH_THRESHOLD,
  );
}

function visibleOscs(): OscEntry[] {
  return ALL_OSCS.filter((osc) => !isDuplicateSampleCoordinate(osc));
}

function getCoords(district: string, state: string) {
  return geoCache[`${district}|||${state}`] ?? null;
}

function withCoords(osc: OscEntry): OscWithCoords {
  const sampleCoordinate = findMatchingSampleCoordinate(osc);
  if (sampleCoordinate) {
    return { ...osc, lat: sampleCoordinate.lat ?? null, lon: sampleCoordinate.lon ?? null };
  }

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
  let filtered = visibleOscs();

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

  for (const osc of visibleOscs()) {
    stateMap.set(osc.state, (stateMap.get(osc.state) ?? 0) + 1);
  }

  const states = [...stateMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([state, count]) => ({ state, count }));

  return { states, total: states.length };
}

export function getDistricts(state: string): DistrictsResponse {
  const districtMap = new Map<string, number>();

  for (const osc of visibleOscs()) {
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
    ? visibleOscs().filter((osc) => osc.state.toLowerCase() === state.toLowerCase())
    : visibleOscs();

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

export function getOscStats(): OscStatsResponse {
  const oscs = visibleOscs();
  const stateMap = new Map<string, number>();
  const districtSet = new Set<string>();

  for (const osc of oscs) {
    stateMap.set(osc.state, (stateMap.get(osc.state) ?? 0) + 1);
    districtSet.add(`${osc.state}::${osc.district}`);
  }

  const topStates = [...stateMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([state, count]) => ({ state, count }));

  const geocodedDistricts = oscs.filter((osc) => {
    const withLocation = withCoords(osc);
    return withLocation.lat !== null && withLocation.lon !== null;
  }).length;

  return {
    totalOscs: oscs.length,
    totalStates: stateMap.size,
    totalDistricts: districtSet.size,
    geocodedDistricts,
    topStates,
  };
}
