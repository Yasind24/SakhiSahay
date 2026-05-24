import { readFileSync, writeFileSync } from "fs";
import { join, dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = process.cwd().endsWith("SakhiSahay") ? process.cwd() : join(__dirname, "../..");
const OSC_FILE = join(ROOT, "artifacts/api-server/src/data/oscs.ts");

interface OscEntry {
  id: number;
  state: string;
  district: string;
  name: string;
  email: string;
  address: string;
  lat?: number;
  lon?: number;
}

interface CsvEntry {
  state: string;
  district: string;
  address: string;
  location: string;
  lat: number;
  lon: number;
}

function parseCsv(src: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < src.length; i++) {
    const char = src[i];
    const next = src[i + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        cell += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }

  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

function titleCase(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\b[a-z]/g, (char) => char.toUpperCase())
    .replace(/\bNct\b/g, "NCT")
    .replace(/\bYs\b/g, "Y.S.")
    .replace(/\bDr\b/g, "Dr.");
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isFallbackAddress(address: string, district: string, state: string): boolean {
  const normalizedAddress = normalize(address);
  return (
    normalizedAddress === normalize(`${district} ${state}`) ||
    normalizedAddress === normalize(`${district}, ${state}`) ||
    normalizedAddress === normalize(`${district} district ${state}`)
  );
}

function parseCoordinate(value: string): number {
  const cleaned = value
    .trim()
    .replace(/[°º"]/g, "")
    .replace(/\s*[NE]$/i, "")
    .trim();
  let parsed = Number(cleaned);
  while (Math.abs(parsed) > 180) {
    parsed = parsed / 10;
  }
  return parsed;
}

function normalizeCoordinatePair(lat: number, lon: number): { lat: number; lon: number } {
  const latLooksLikeLon = lat >= 68 && lat <= 98;
  const lonLooksLikeLat = lon >= 6 && lon <= 38;
  if (latLooksLikeLon && lonLooksLikeLat) {
    return { lat: lon, lon: lat };
  }
  return { lat, lon };
}

function isIndiaCoordinate(lat: number, lon: number): boolean {
  return lat >= 6 && lat <= 38 && lon >= 68 && lon <= 98;
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

function readOscs(src: string): OscEntry[] {
  const match = src.match(/export const ALL_OSCS: OscEntry\[] = (\[[\s\S]*?\n\]);/);
  if (!match) {
    throw new Error(`Could not find ALL_OSCS in ${OSC_FILE}`);
  }
  return Function(`"use strict"; return (${match[1]});`)() as OscEntry[];
}

function formatValue(value: string | number): string {
  return JSON.stringify(value);
}

function formatOscs(oscs: OscEntry[]): string {
  const lines = oscs.map((osc) => {
    const pieces = [
      `id: ${osc.id}`,
      `state: ${formatValue(osc.state)}`,
      `district: ${formatValue(osc.district)}`,
      `name: ${formatValue(osc.name)}`,
      `email: ${formatValue(osc.email)}`,
      `address: ${formatValue(osc.address)}`,
    ];

    if (typeof osc.lat === "number" && typeof osc.lon === "number") {
      pieces.push(`lat: ${formatValue(osc.lat)}`, `lon: ${formatValue(osc.lon)}`);
    }

    return `  { ${pieces.join(", ")} },`;
  });

  return `export interface OscEntry {
  id: number;
  state: string;
  district: string;
  name: string;
  email: string;
  address: string;
  lat?: number;
  lon?: number;
}

export const ALL_OSCS: OscEntry[] = [
${lines.join("\n")}
];
`;
}

function main() {
  const csvPath = process.argv[2];
  if (!csvPath) {
    throw new Error("Usage: tsx scripts/src/import-osc-coordinates.mts <csv-path>");
  }

  const baseOscPath = process.argv[3] ? resolve(process.argv[3]) : OSC_FILE;
  const current = readOscs(readFileSync(baseOscPath, "utf8"));
  const csvRows = parseCsv(readFileSync(resolve(csvPath), "utf8"));
  const [header, ...rows] = csvRows;
  const columns = new Map(header.map((name, index) => [name.trim(), index]));

  const csvEntries: CsvEntry[] = rows
    .filter((row) => row.length > 1)
    .map((row) => {
      const state = titleCase(row[columns.get("State") ?? -1] ?? "");
      const district = titleCase(row[columns.get("District") ?? -1] ?? "");
      const address = (row[columns.get("Address") ?? -1] ?? "").trim();
      const location = (row[columns.get("Location") ?? -1] ?? "").trim();
      const coords = normalizeCoordinatePair(
        parseCoordinate(row[columns.get("Latitude") ?? -1] ?? ""),
        parseCoordinate(row[columns.get("Longitude") ?? -1] ?? ""),
      );
      return { state, district, address, location, lat: coords.lat, lon: coords.lon };
    })
    .filter(
      (entry) =>
        entry.state &&
        entry.district &&
        Number.isFinite(entry.lat) &&
        Number.isFinite(entry.lon) &&
        isIndiaCoordinate(entry.lat, entry.lon),
    );

  const updated = current.map((osc) => ({ ...osc }));
  const usedOscIds = new Set<number>();
  const usedCsvIndexes = new Set<number>();
  let exactMatches = 0;
  let districtMatches = 0;
  let fuzzyMatches = 0;
  let filledAddresses = 0;
  let nextId = Math.max(...updated.map((osc) => osc.id)) + 1;

  function applyCsv(osc: OscEntry, csv: CsvEntry) {
    osc.lat = csv.lat;
    osc.lon = csv.lon;
    const csvAddress = csv.address || csv.location;
    if (!osc.address && csvAddress && !isFallbackAddress(csvAddress, csv.district, csv.state)) {
      osc.address = csvAddress;
      filledAddresses++;
    }
  }

  for (let csvIndex = 0; csvIndex < csvEntries.length; csvIndex++) {
    const csv = csvEntries[csvIndex];
    const csvAddress = csv.address || csv.location;
    const candidates = updated.filter(
      (osc) =>
        !usedOscIds.has(osc.id) &&
        normalize(osc.state) === normalize(csv.state) &&
        normalize(osc.district) === normalize(csv.district),
    );

    if (!candidates.length) continue;

    let match = candidates.find((osc) => osc.address && normalize(osc.address) === normalize(csvAddress));
    if (match) {
      exactMatches++;
    } else if (candidates.length === 1) {
      match = candidates[0];
      districtMatches++;
    } else {
      const scored = candidates
        .map((osc) => ({ osc, score: tokenScore(osc.address, csvAddress) }))
        .sort((a, b) => b.score - a.score);
      if (scored[0]?.score >= 0.45) {
        match = scored[0].osc;
        fuzzyMatches++;
      }
    }

    if (match) {
      applyCsv(match, csv);
      usedOscIds.add(match.id);
      usedCsvIndexes.add(csvIndex);
    }
  }

  let appended = 0;
  for (let csvIndex = 0; csvIndex < csvEntries.length; csvIndex++) {
    if (usedCsvIndexes.has(csvIndex)) continue;
    const csv = csvEntries[csvIndex];
    const address = csv.address || csv.location;
    updated.push({
      id: nextId++,
      state: csv.state,
      district: csv.district,
      name: "",
      email: "",
      address,
      lat: csv.lat,
      lon: csv.lon,
    });
    appended++;
  }

  updated.sort((a, b) => a.id - b.id);
  writeFileSync(OSC_FILE, formatOscs(updated));

  console.log(`CSV rows: ${csvEntries.length}`);
  console.log(`Existing records: ${current.length}`);
  console.log(`Updated coordinates: ${usedCsvIndexes.size}`);
  console.log(`Exact address matches: ${exactMatches}`);
  console.log(`Single district matches: ${districtMatches}`);
  console.log(`Fuzzy address matches: ${fuzzyMatches}`);
  console.log(`Filled blank addresses: ${filledAddresses}`);
  console.log(`Appended CSV-only records: ${appended}`);
  console.log(`Total records: ${updated.length}`);
}

main();
