import { createRoot } from "react-dom/client";
import { setBaseUrl } from "@workspace/api-client-react";
import App from "./App";
import { ErrorBoundary } from "./error-boundary";
import "./index.css";

// In production the API lives on a separate domain.
// Set VITE_API_URL in Vercel env vars (e.g. https://api.vermotu.com.br) so
// all generated API hooks point to the right server.
const apiUrl = import.meta.env.VITE_API_URL as string | undefined;
if (apiUrl) {
  setBaseUrl(apiUrl);
}

const root = document.getElementById("root");
if (!root) throw new Error("No #root element found in index.html");

createRoot(root).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
