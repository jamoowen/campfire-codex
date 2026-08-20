/// <reference types="@cloudflare/workers-types" />

interface RateLimitBinding {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

interface Env {
  RECIPES: R2Bucket;
  SEARCH_RATE_LIMITER: RateLimitBinding;
  DETAIL_RATE_LIMITER: RateLimitBinding;
  APP_ENV: 'development' | 'production';
}
