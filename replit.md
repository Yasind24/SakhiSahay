# SakhiSahay

A React web app helping women in India find One Stop Centres (OSCs / Sakhi Kendras) — government-run crisis support centres offering free medical, legal, police, shelter and counselling services.

## Architecture

**Monorepo** (pnpm workspaces):

| Package | Path | Role |
|---|---|---|
| `@workspace/sakhi-sahay` | `artifacts/sakhi-sahay` | React + Vite frontend (preview path `/`) |
| `@workspace/api-server` | `artifacts/api-server` | Express API server (preview path `/api`) |

## Key Files

- `artifacts/api-server/src/data/oscs.ts` — All 762 OSC entries (authoritative dataset from MoWCD PDF)
- `artifacts/api-server/src/routes/oscs.ts` — REST API: GET /api/oscs, /api/oscs/states, /api/oscs/districts, /api/oscs/:id
- `artifacts/sakhi-sahay/src/App.tsx` — Routing (wouter): /, /centres, /centres/:id, /states
- `artifacts/sakhi-sahay/src/pages/Home.tsx` — Landing with 181 helpline hero
- `artifacts/sakhi-sahay/src/pages/Centres.tsx` — Search + filter across all 762 centres
- `artifacts/sakhi-sahay/src/pages/CentreDetail.tsx` — Individual centre detail view
- `artifacts/sakhi-sahay/src/pages/States.tsx` — Browse by state
- `artifacts/sakhi-sahay/src/index.css` — Saffron-rose-cream theme (HSL variables)

## Data

- **762 OSCs** across all states/UTs of India
- Source: `attached_assets/printdirectoryDetail_1777728953351.pdf` (Ministry of Women & Child Development)
- Fields: id, state, district, name (administrator), email, address

## API Routes

| Route | Description |
|---|---|
| `GET /api/oscs` | Paginated list with `?q=`, `?state=`, `?district=`, `?page=`, `?limit=` |
| `GET /api/oscs/states` | All states with centre counts |
| `GET /api/oscs/districts?state=` | Districts in a state |
| `GET /api/oscs/:id` | Single centre by numeric ID |
| `GET /api/oscs/stats` | Aggregate statistics |

## Design

- **Theme**: Warm saffron (#FF6B00), rose (#C9184A), gold (#FFB300), cream background
- **Helpline 181** prominent everywhere (navbar, hero, footer, detail pages)
- Mobile-first responsive layout
- No grays — warm orange palette throughout

## Running

Workflows are managed by Replit:
- `artifacts/api-server: API Server` — builds and starts Express on assigned port
- `artifacts/sakhi-sahay: web` — Vite dev server
