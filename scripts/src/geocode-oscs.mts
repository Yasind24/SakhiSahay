/**
 * Geocodes all unique district+state combinations from OSC data
 * using Nominatim (OpenStreetMap). Saves results to geocache.json.
 * Rate-limited to 1 req/sec as per Nominatim usage policy.
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const CACHE_FILE = join(ROOT, "artifacts/api-server/src/data/geocache.json");
const OSC_FILE = join(ROOT, "artifacts/api-server/src/data/oscs.ts");

interface GeoEntry {
  lat: number;
  lon: number;
  displayName: string;
}

type GeoCache = Record<string, GeoEntry | null>;

function loadCache(): GeoCache {
  if (existsSync(CACHE_FILE)) {
    return JSON.parse(readFileSync(CACHE_FILE, "utf8"));
  }
  return {};
}

function saveCache(cache: GeoCache) {
  writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function geocode(district: string, state: string): Promise<GeoEntry | null> {
  const query = `${district} district, ${state}, India`;
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=in`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "SakhiSahay/1.0 (OSC locator for women safety; github educational project)",
        "Accept-Language": "en",
      },
    });

    if (!res.ok) {
      console.error(`HTTP ${res.status} for ${query}`);
      return null;
    }

    const data = await res.json() as Array<{ lat: string; lon: string; display_name: string }>;

    if (!data.length) {
      // Try broader query (state only)
      const url2 = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(state + ", India")}&format=json&limit=1&countrycodes=in`;
      await sleep(1100);
      const res2 = await fetch(url2, {
        headers: { "User-Agent": "SakhiSahay/1.0" },
      });
      const data2 = await res2.json() as Array<{ lat: string; lon: string; display_name: string }>;
      if (!data2.length) return null;
      return { lat: parseFloat(data2[0].lat), lon: parseFloat(data2[0].lon), displayName: data2[0].display_name };
    }

    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), displayName: data[0].display_name };
  } catch (e) {
    console.error(`Error geocoding ${query}:`, e);
    return null;
  }
}

function extractUniquePairs(src: string): Array<{ district: string; state: string }> {
  const matches = [...src.matchAll(/state:\s*"([^"]+)"[^}]*?district:\s*"([^"]+)"/gs)];
  const seen = new Set<string>();
  const pairs: Array<{ district: string; state: string }> = [];
  for (const m of matches) {
    const key = `${m[2]}|||${m[1]}`;
    if (!seen.has(key)) {
      seen.add(key);
      pairs.push({ district: m[2], state: m[1] });
    }
  }
  return pairs;
}

async function main() {
  const src = readFileSync(OSC_FILE, "utf8");
  const pairs = extractUniquePairs(src);

  console.log(`Found ${pairs.length} unique district+state combinations`);

  const cache = loadCache();
  const todo = pairs.filter(({ district, state }) => {
    const key = `${district}|||${state}`;
    return !(key in cache);
  });

  console.log(`Already cached: ${pairs.length - todo.length}, remaining: ${todo.length}`);

  let done = 0;
  let failed = 0;

  for (const { district, state } of todo) {
    const key = `${district}|||${state}`;
    const result = await geocode(district, state);
    cache[key] = result;
    done++;
    failed += result ? 0 : 1;

    if (done % 10 === 0 || result === null) {
      console.log(`[${done}/${todo.length}] ${result ? "✓" : "✗"} ${district}, ${state}${result ? ` → ${result.lat.toFixed(4)}, ${result.lon.toFixed(4)}` : " (not found)"}`);
      saveCache(cache);
    }

    await sleep(1100); // Nominatim: max 1 req/sec
  }

  saveCache(cache);
  const total = Object.keys(cache).length;
  const found = Object.values(cache).filter(Boolean).length;
  console.log(`\nDone! ${found}/${total} geocoded successfully (${failed} failed)`);
}

main().catch(console.error);
