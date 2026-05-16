interface Env {
  AI: Ai;
  ASSETS: Fetcher;
  ALLOWED_ORIGINS?: string;
  ANTHROPIC_API_KEY?: string;
  LLM_MODEL?: string;
  PROVIDER?: "workers-ai" | "anthropic";
}
