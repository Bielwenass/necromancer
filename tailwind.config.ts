import type { Config } from "tailwindcss";
export default {
	content: ["./index.html", "./src/**/*.{ts,tsx}"],
	theme: {
		extend: {
			colors: {
				bone: "#e8dcc0",
				parchm: "#c9b893",
				muted: "#8a795b",
				dim: "#5a4e3a",
				faint: "#3a3225",

				rule: "#1a1a1a",
				"rule-strong": "#8a795b",

				"bg-canvas": "#0d0a07",
				"bg-panel": "#15110b",
				"bg-panel-2": "#1d1810",
				"bg-inset": "#0a0805",
				"bg-hover": "#221c14",

				coin: "#d4a857",
				soul: "#9b7ad6",

				"sq-skeleton": "#e8dcc0",
				"sq-zombie": "#95b87a",
				"sq-wraith": "#7eb0d6",

				"r-common": "#6b7280",
				"r-uncommon": "#6fa962",
				"r-rare": "#5b8fd6",
				"r-epic": "#a06fd6",
				"r-legendary": "#d68a3a",

				"hp-good": "#6fa962",
				"hp-warn": "#d4a857",
				"hp-crit": "#c45a3e",

				ember: "#d67a30",
			},
			fontFamily: {
				display: ["var(--f-display)"],
				body: ["var(--f-body)"],
				mono: ["var(--f-mono)"],
			},
		},
	},
	plugins: [],
} satisfies Config;
