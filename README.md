# Allerion Genesis AI — LLM Platform Backend

Allerion Intelligence's first LLM platform, built natively against the
[Critical Mineral Digital Twin](https://github.com/jalleeeee/Allerion-Digital-Twin).
Runs on Cloudflare Workers + Workers AI. The chat model is given a tool
catalog that drives the live Cesium twin (fly-to, toggle layers, drop drill
targets, load IFC/BIM overlays, query USGS/NURE) instead of just talking
about it.

## Architecture

```
┌──────────────────────────────┐          ┌────────────────────────────────┐
│ Allerion-Digital-Twin (web)  │  POST    │ llm-chat-app-template (this)   │
│                              │ /api/chat│  Cloudflare Worker             │
│  Cesium 3D viewer            │ ───────► │  Workers AI · Llama 3.3 70B    │
│  Genesis AI chat panel       │          │  Tool catalog · System prompt  │
│  TwinTools.* dispatcher      │ ◄─────── │  BIM registry · USGS proxy     │
│  (executes tool calls)       │ tool_calls└────────────────────────────────┘
└──────────────────────────────┘                       │
                                                       ├── @cf/meta/llama-3.3-70b-instruct-fp8-fast (default)
                                                       └── claude-sonnet-4-6 (if ANTHROPIC_API_KEY set)
```

## Routes

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/chat` | Tool-calling chat. Body: `{ messages: [...] }`. |
| `GET`  | `/api/tools` | Tool catalog (the same one given to the LLM). |
| `GET`  | `/api/bim/registry` | Full open-source BIM / digital-twin registry. |
| `GET`  | `/api/bim/search?q=…` | Keyword search across the registry. |
| `GET`  | `/api/usgs?source=earth_mri\|nure\|mrds\|usgs_3dep` | Federal-data fixtures. |
| `GET`  | `/api/health` | Health check. |
| `GET`  | `/` | Standalone demo chat UI. |

## Twin tools the LLM can call

- `fly_to` — move the Cesium camera (named site or lon/lat).
- `toggle_layer` — show/hide a thematic layer (mines, cores, HREE, BIM, …).
- `drop_drill_target` — place a justified drill-target pin.
- `set_view_mode` — 3D / 2D / satellite / xray / drone / dual-sync.
- `load_bim_model` — load an IFC file via ThatOpen Components / web-ifc.
- `query_usgs` — pull from Earth MRI / NURE / MRDS / 3DEP.
- `search_bim_registry` — find an open-source library by capability.
- `annotate_feature` — pin a callout on an existing feature.

## Curated open-source BIM / digital-twin integrations

The registry (`src/tools.ts`) covers:
ThatOpen Components, web-ifc, xeokit-sdk, IfcOpenShell, Bonsai/BlenderBIM,
Speckle, buildingSMART bSDD, OpenUSD, iTwin.js, Eclipse Ditto, Azure DTDL,
CesiumJS, Resium, Open3D, PDAL, PostGIS, MapLibre, Three.js, FreeCAD,
Apache SeaTunnel.

The Allerion twin already wires **ThatOpen Components** (IFC) and **CesiumJS**
in production (`js/bim-loader.js`). The rest can be added incrementally.

## Local development

```bash
pnpm install              # or npm install
pnpm wrangler dev         # serves on http://127.0.0.1:8787
```

Open the demo UI at `http://127.0.0.1:8787/`.

The Cesium twin (in the sibling repo) is configured to call this Worker
when run together — see `Allerion-Digital-Twin/js/genesis-ai.js`.

## Deploy

```bash
pnpm wrangler deploy
```

`wrangler.jsonc` already declares the Workers AI binding (`AI`) and the
static-asset binding (`ASSETS` → `./public`). To use the Anthropic
provider instead, set the secret:

```bash
pnpm wrangler secret put ANTHROPIC_API_KEY
```

## Configuration

| Variable | Purpose | Default |
| --- | --- | --- |
| `PROVIDER` | `workers-ai` or `anthropic` | `workers-ai` (or `anthropic` if key present) |
| `LLM_MODEL` | Model id override | `@cf/meta/llama-3.3-70b-instruct-fp8-fast` |
| `ALLOWED_ORIGINS` | Comma list of allowed origins for CORS | `*` |
| `ANTHROPIC_API_KEY` | Secret, enables Anthropic provider | — |

## License

Internal to Allerion Intelligence. Open-source dependencies retain their
upstream licenses (see `src/tools.ts` registry).
