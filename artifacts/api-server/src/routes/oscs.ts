import { Router } from "express";
import { ALL_OSCS } from "../data/oscs.js";

const router = Router();

router.get("/oscs", (req, res) => {
  const { state, district, q, page = "1", limit = "20" } = req.query as Record<string, string>;

  let filtered = ALL_OSCS;

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
  const data = filtered.slice((pageNum - 1) * limitNum, pageNum * limitNum);

  res.json({ data, total, page: pageNum, limit: limitNum, totalPages });
});

router.get("/oscs/stats", (_req, res) => {
  const total = ALL_OSCS.length;
  const stateMap = new Map<string, number>();
  const districtSet = new Set<string>();

  for (const osc of ALL_OSCS) {
    stateMap.set(osc.state, (stateMap.get(osc.state) ?? 0) + 1);
    districtSet.add(`${osc.state}::${osc.district}`);
  }

  const topStates = [...stateMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([state, count]) => ({ state, count }));

  res.json({
    totalOscs: total,
    totalStates: stateMap.size,
    totalDistricts: districtSet.size,
    topStates,
  });
});

router.get("/oscs/states", (_req, res) => {
  const stateMap = new Map<string, number>();
  for (const osc of ALL_OSCS) {
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
  for (const osc of ALL_OSCS) {
    if (osc.state.toLowerCase() === state.toLowerCase()) {
      distMap.set(osc.district, (distMap.get(osc.district) ?? 0) + 1);
    }
  }

  const districts = [...distMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([district, count]) => ({ district, count }));

  res.json({ districts, state });
});

router.get("/oscs/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const osc = ALL_OSCS.find(o => o.id === id);
  if (!osc) {
    res.status(404).json({ error: "OSC not found" });
    return;
  }
  res.json(osc);
});

export { router as oscsRouter };
