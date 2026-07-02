// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { nitro } from "nitro/vite";

// Use NITRO_PRESET env var to switch targets:
//   development / Vercel:  unset (defaults to "vercel")
//   EC2 / Node.js server:  NITRO_PRESET=node-server npm run build
const preset = (process.env.NITRO_PRESET as string) || "vercel";

export default defineConfig({
	vite: {
		plugins: [nitro({ preset })],
		server: {
			allowedHosts: [
				"0ee1-2401-4900-8840-d923-997c-1949-a3b9-1c84.ngrok-free.app",
				"f357-2401-4900-8fd9-283c-294f-556d-7ec9-941f.ngrok-free.app",
			],
		},
	},
});
