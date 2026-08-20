import React from "react";
import ReactDOM from "react-dom/client";
import "../index.css";
import { TunePage } from "./TunePage";

// biome-ignore lint/style/noNonNullAssertion: the mount point is in tune.html
ReactDOM.createRoot(document.getElementById("root")!).render(
	<React.StrictMode>
		<TunePage />
	</React.StrictMode>,
);
