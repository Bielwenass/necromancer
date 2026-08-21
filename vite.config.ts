import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// `tools/` holds the dev surfaces outside the game app. The dev server serves
// their pages from the project root; only `index.html` is a build input, so they
// ship nowhere.
export default defineConfig({
	plugins: [react()],
	build: {
		rollupOptions: {
			input: { main: resolve(__dirname, "index.html") },
		},
	},
});
