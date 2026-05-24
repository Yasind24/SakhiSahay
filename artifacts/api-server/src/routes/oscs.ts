import { Router } from "express";
import { readFileSync, watchFile } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { ALL_OSCS } from "../data/oscs.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_FILE = join(__dirname, "../data/geocache.json");

interface GeoEntry {
  lat: number;
  lon: number;
  displayName: string;
}

type GeoCache = Record<string, GeoEntry | null>;

let geoCache: GeoCache = {};
const SAMPLE_COORDINATE_MATCH_THRESHOLD = 0.6;

function loadGeoCache() {
  try {
    geoCache = JSON.parse(readFileSync(CACHE_FILE, "utf8"));
  } catch {
    geoCache = {};
  }
}

loadGeoCache();
// Reload cache when geocoding script updates it
watchFile(CACHE_FILE, { interval: 5000 }, loadGeoCache);

function getCoords(district: string, state: string) {
  const key = `${district}|||${state}`;
  return geoCache[key] ?? null;
}

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

function isSampleCoordinateRow(osc: { name: string; email: string; lat?: number; lon?: number }) {
  return !osc.name && !osc.email && typeof osc.lat === "number" && typeof osc.lon === "number";
}

function findMatchingSampleCoordinate<T extends { state: string; district: string; address: string; name: string; email: string }>(osc: T) {
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

function isDuplicateSampleCoordinate(osc: { state: string; district: string; address: string; name: string; email: string; lat?: number; lon?: number }) {
  if (!isSampleCoordinateRow(osc)) return false;

  return ALL_OSCS.some(
    (candidate) =>
      !isSampleCoordinateRow(candidate) &&
      candidate.state === osc.state &&
      candidate.district === osc.district &&
      tokenScore(candidate.address, osc.address) >= SAMPLE_COORDINATE_MATCH_THRESHOLD,
  );
}

function visibleOscs() {
  return ALL_OSCS.filter((osc) => !isDuplicateSampleCoordinate(osc));
}

function withCoords<T extends { district: string; state: string; lat?: number; lon?: number }>(osc: T) {
  if ("name" in osc && "email" in osc && "address" in osc) {
    const sampleCoordinate = findMatchingSampleCoordinate(
      osc as T & { name: string; email: string; address: string },
    );
    if (sampleCoordinate) {
      return { ...osc, lat: sampleCoordinate.lat ?? null, lon: sampleCoordinate.lon ?? null };
    }
  }

  if (typeof osc.lat === "number" && typeof osc.lon === "number") {
    return { ...osc, lat: osc.lat, lon: osc.lon };
  }
  const coords = getCoords(osc.district, osc.state);
  return { ...osc, lat: coords?.lat ?? null, lon: coords?.lon ?? null };
}

const router = Router();

router.get("/oscs", (req, res) => {
  const { state, district, q, page = "1", limit = "20" } = req.query as Record<string, string>;

  let filtered = visibleOscs();

  if (state) {
    filtered = filtered.filter(o => o.state.toLowerCase() === state.toLowerCase());
  }

  if (district) {
    filtered = filtered.filter(o => o.district.toLowerCase() === district.toLowerCase());
  }

  if (q) {
    const query = q.toLowerCase();
    filtered = filtered.filter(o =>
      o.state.toLowerCase().includes(query) ||
      o.district.toLowerCase().includes(query) ||
      o.name.toLowerCase().includes(query) ||
      (o.address ?? "").toLowerCase().includes(query)
    );
  }

  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
  const total = filtered.length;
  const totalPages = Math.ceil(total / limitNum);
  const data = filtered.slice((pageNum - 1) * limitNum, pageNum * limitNum).map(withCoords);

  res.json({ data, total, page: pageNum, limit: limitNum, totalPages });
});

router.get("/oscs/stats", (_req, res) => {
  const oscs = visibleOscs();
  const total = oscs.length;
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

  const geocodedCount = oscs.filter((osc) => {
    const withLocation = withCoords(osc);
    return withLocation.lat !== null && withLocation.lon !== null;
  }).length;

  res.json({
    totalOscs: total,
    totalStates: stateMap.size,
    totalDistricts: districtSet.size,
    geocodedDistricts: geocodedCount,
    topStates,
  });
});

router.get("/oscs/states", (_req, res) => {
  const stateMap = new Map<string, number>();
  for (const osc of visibleOscs()) {
    stateMap.set(osc.state, (stateMap.get(osc.state) ?? 0) + 1);
  }
  const states = [...stateMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([state, count]) => ({ state, count }));
  res.json({ states, total: states.length });
});

router.get("/oscs/districts", (req, res) => {
  const { state } = req.query as { state?: string };
  if (!state) {
    res.status(400).json({ error: "state query parameter is required" });
    return;
  }

  const distMap = new Map<string, number>();
  for (const osc of visibleOscs()) {
    if (osc.state.toLowerCase() === state.toLowerCase()) {
      distMap.set(osc.district, (distMap.get(osc.district) ?? 0) + 1);
    }
  }

  const districts = [...distMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([district, count]) => ({ district, count }));

  res.json({ districts, state });
});

// Map endpoint: return all OSCs that have coordinates (for the map view)
router.get("/oscs/map", (req, res) => {
  const { state } = req.query as { state?: string };
  let oscs = visibleOscs();
  if (state) {
    oscs = oscs.filter(o => o.state.toLowerCase() === state.toLowerCase());
  }

  const mapped = oscs
    .map(withCoords)
    .filter(o => o.lat !== null && o.lon !== null);

  res.json({ data: mapped, total: mapped.length });
});

router.get("/oscs/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const osc = ALL_OSCS.find(o => o.id === id);
  if (!osc) {
    res.status(404).json({ error: "OSC not found" });
    return;
  }
  res.json(withCoords(osc));
});

export { router as oscsRouter };
