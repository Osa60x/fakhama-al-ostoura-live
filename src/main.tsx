import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";
import "./luxury.css";
import "./admin.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode><App /></StrictMode>
);
