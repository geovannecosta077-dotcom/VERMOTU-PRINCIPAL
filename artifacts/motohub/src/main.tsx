import { createRoot } from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./error-boundary";
import "./index.css";

const root = document.getElementById("root");
if (!root) throw new Error("No #root element found in index.html");

createRoot(root).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
