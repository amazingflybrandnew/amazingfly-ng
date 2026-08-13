import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Nitro target:
// - Lovable builds (sandbox) always force `cloudflare-module`; anything set here is ignored there.
// - On Vercel we pin the `vercel` preset so Nitro emits the Build Output API layout
//   (.vercel/output/config.json + .vercel/output/functions/__server.func). Do NOT override
//   `output` — the preset's own paths are what the generated config.json routes to.
const isVercel = !!process.env["VERCEL"];

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    server: { entry: "server" },
  },
  ...(isVercel ? { nitro: { preset: "vercel" } } : {}),
});
