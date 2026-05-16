import { TWIN_TOOLS, BIM_REGISTRY } from "./tools";
import { GENESIS_SYSTEM_PROMPT } from "./system-prompt";

// Allerion Genesis AI — Cloudflare Worker entrypoint.
//
// Routes:
//   POST /api/chat            — chat completion w/ tool-calling (SSE)
//   GET  /api/tools           — returns the twin tool catalog
//   GET  /api/bim/registry    — full open-source BIM/DT registry
//   GET  /api/bim/search?q=   — keyword search over the registry
//   GET  /api/health          — health check
//   *                         — static assets (demo chat UI)

type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
};

type ChatRequest = {
  messages: ChatMessage[];
  stream?: boolean;
  model?: string;
};

const DEFAULT_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

function corsHeaders(env: Env, origin: string | null): HeadersInit {
  const allow = env.ALLOWED_ORIGINS ?? "*";
  const allowed =
    allow === "*" || (origin && allow.split(",").map((s) => s.trim()).includes(origin))
      ? origin ?? "*"
      : "null";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(data: unknown, init: ResponseInit = {}, env?: Env, origin?: string | null): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(env ? corsHeaders(env, origin ?? null) : {}),
      ...(init.headers ?? {}),
    },
  });
}

function searchRegistry(q: string) {
  const needle = q.toLowerCase();
  return BIM_REGISTRY.map((entry) => {
    const hay = `${entry.name} ${entry.category} ${entry.language} ${entry.description}`.toLowerCase();
    let score = 0;
    for (const term of needle.split(/\s+/).filter(Boolean)) {
      if (hay.includes(term)) score += 1;
      if (entry.name.toLowerCase().includes(term)) score += 2;
      if (entry.category.toLowerCase().includes(term)) score += 1.5;
    }
    return { entry, score };
  })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((r) => r.entry);
}

// Stub federal-data responses. Real wiring would proxy USGS/NURE endpoints.
function usgsFixture(source: string, element?: string) {
  if (source === "nure") {
    return {
      source: "USGS NURE Hydrogeochemical and Stream Sediment Reconnaissance",
      area: "Hardin County, IL — Cave-in-Rock 1°x2° quad",
      sample_count: 45,
      highlighted: [
        { id: 5262163, lon: -88.2333, lat: 37.5349, Ce_ppm: 43 },
        { id: 5262170, lon: -88.3757, lat: 37.4641, Ce_ppm: 64 },
      ],
      note:
        element === "Ce"
          ? "Two samples within 2 mi of property show elevated Ce. Not on-parcel."
          : "Filter for an element via the 'element' arg for narrower results.",
      citation: "USGS NGDB / NURE 1980s, Cave-in-Rock quadrangle",
    };
  }
  if (source === "earth_mri") {
    return {
      source: "USGS Earth MRI",
      relevant_project_area: "Illinois–Kentucky Fluorspar District (IKFD)",
      commodities: ["F (fluorspar)", "REE", "Ba", "Zn", "Pb"],
      url: "https://www.usgs.gov/special-topics/earth-mri",
      note: "Project Genesis sits inside the IKFD coverage; Earth MRI geophysics is the authoritative federal layer.",
    };
  }
  if (source === "mrds") {
    return {
      source: "USGS Mineral Resources Data System",
      records_nearby: [
        { name: "Dubois Mine", commodity: "Fluorspar", status: "Past producer" },
        { name: "Indiana Mine", commodity: "Fluorspar", status: "Past producer" },
        { name: "Lavender Mine", commodity: "Fluorspar", status: "Prospect" },
      ],
      url: "https://mrdata.usgs.gov/mrds/",
    };
  }
  if (source === "usgs_3dep") {
    return {
      source: "USGS 3DEP (3D Elevation Program)",
      resolution: "1m LiDAR available for Hardin County (IL)",
      note: "Use for terrain truthing and underground void inference around historical shafts.",
    };
  }
  return { error: `Unknown source '${source}'.` };
}

// ── Workers AI provider ──────────────────────────────────────────────
async function chatWorkersAI(env: Env, body: ChatRequest): Promise<Response> {
  const model = body.model ?? env.LLM_MODEL ?? DEFAULT_MODEL;
  const messages: ChatMessage[] = [
    { role: "system", content: GENESIS_SYSTEM_PROMPT },
    ...body.messages,
  ];

  // Workers AI accepts the OpenAI-style tools/messages payload for
  // function-calling-capable models (Llama 3.x instruct family).
  const response = await env.AI.run(model as keyof AiModels, {
    messages,
    tools: TWIN_TOOLS,
    stream: false,
    max_tokens: 1024,
  } as never);

  return new Response(JSON.stringify(response), {
    headers: { "Content-Type": "application/json" },
  });
}

// ── Anthropic provider (optional, behind ANTHROPIC_API_KEY) ───────────
async function chatAnthropic(env: Env, body: ChatRequest): Promise<Response> {
  if (!env.ANTHROPIC_API_KEY) {
    return json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 501 });
  }
  const anthropicTools = TWIN_TOOLS.map((t) => ({
    name: t.function.name,
    description: t.function.description,
    input_schema: t.function.parameters,
  }));
  const userMessages = body.messages.filter((m) => m.role !== "system");
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: body.model ?? env.LLM_MODEL ?? "claude-sonnet-4-6",
      max_tokens: 1024,
      system: GENESIS_SYSTEM_PROMPT,
      tools: anthropicTools,
      messages: userMessages,
    }),
  });
  return new Response(await r.text(), {
    status: r.status,
    headers: { "Content-Type": "application/json" },
  });
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const origin = req.headers.get("Origin");

    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(env, origin) });
    }

    // ── API routes ───────────────────────────────────────────────────
    if (url.pathname === "/api/health") {
      return json({ ok: true, service: "allerion-genesis-ai" }, {}, env, origin);
    }

    if (url.pathname === "/api/tools") {
      return json({ tools: TWIN_TOOLS }, {}, env, origin);
    }

    if (url.pathname === "/api/bim/registry") {
      return json({ entries: BIM_REGISTRY, count: BIM_REGISTRY.length }, {}, env, origin);
    }

    if (url.pathname === "/api/bim/search") {
      const q = url.searchParams.get("q") ?? "";
      if (!q) return json({ error: "missing q" }, { status: 400 }, env, origin);
      return json({ query: q, results: searchRegistry(q) }, {}, env, origin);
    }

    if (url.pathname === "/api/usgs") {
      const source = url.searchParams.get("source") ?? "";
      const element = url.searchParams.get("element") ?? undefined;
      return json(usgsFixture(source, element), {}, env, origin);
    }

    if (url.pathname === "/api/chat" && req.method === "POST") {
      let body: ChatRequest;
      try {
        body = (await req.json()) as ChatRequest;
      } catch {
        return json({ error: "invalid JSON" }, { status: 400 }, env, origin);
      }
      if (!Array.isArray(body.messages) || body.messages.length === 0) {
        return json({ error: "messages required" }, { status: 400 }, env, origin);
      }
      const provider = env.PROVIDER ?? (env.ANTHROPIC_API_KEY ? "anthropic" : "workers-ai");
      const r =
        provider === "anthropic"
          ? await chatAnthropic(env, body)
          : await chatWorkersAI(env, body);
      const headers = new Headers(r.headers);
      for (const [k, v] of Object.entries(corsHeaders(env, origin))) {
        headers.set(k, v as string);
      }
      return new Response(r.body, { status: r.status, headers });
    }

    // ── Static assets ────────────────────────────────────────────────
    if (env.ASSETS) {
      return env.ASSETS.fetch(req);
    }
    return new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
