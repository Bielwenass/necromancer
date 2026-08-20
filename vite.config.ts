import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// `tune.html` is the combat tuning page, a dev surface outside the game app. The
// dev server serves it from the project root; it is absent from the build input,
// so it ships nowhere.
export default defineConfig({
	plugins: [react()],
	build: {
		rollupOptions: {
			input: { main: resolve(__dirname, "index.html") },
		},
	},
});
