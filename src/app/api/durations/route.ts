import { createDurationsHandler } from "@/lib/durations/handler";
import { QuotaBudget, RateLimiter } from "@/lib/durations/guards";

export const maxDuration = 15;

const env = (name: string, fallback: number) => {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

export const POST = createDurationsHandler({
  apiKey: process.env.YOUTUBE_API_KEY,
  mock: process.env.YOUTUBE_API_MOCK === "1",
  limiter: new RateLimiter(env("DURATIONS_RATE_LIMIT", 10), env("DURATIONS_RATE_WINDOW_SEC", 600) * 1000),
  budget: new QuotaBudget(env("YOUTUBE_DAILY_UNIT_BUDGET", 9000)),
});
