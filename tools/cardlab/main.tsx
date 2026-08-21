import React from "react";
import ReactDOM from "react-dom/client";
import "../../src/index.css";
import { CardLab } from "./CardLab";

// biome-ignore lint/style/noNonNullAssertion: the mount point is in index.html
ReactDOM.createRoot(document.getElementById("root")!).render(
	<React.StrictMode>
		<CardLab />
	</React.StrictMode>,
);
