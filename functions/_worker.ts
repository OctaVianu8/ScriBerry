// Cloudflare Pages advanced-mode Worker entry point.
// Pages picks up this file directly, bypassing wrangler.toml Worker config.
// All logic lives in worker/index.ts — this is just the Pages entry point.
export { default } from '../worker/index'
