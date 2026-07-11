import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary] Uncaught error:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          fontFamily: "sans-serif",
          background: "#0d0d0d",
          color: "#f5f5f5",
          gap: "1rem",
        }}>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#ef4444" }}>
            Algo deu errado
          </h1>
          <p style={{ fontSize: "0.875rem", color: "#a3a3a3", textAlign: "center", maxWidth: 480 }}>
            {this.state.error.message}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: "0.5rem",
              padding: "0.5rem 1.5rem",
              background: "#ef4444",
              color: "#fff",
              border: "none",
              borderRadius: "0.5rem",
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            Recarregar página
          </button>
          {import.meta.env.DEV && (
            <pre style={{
              marginTop: "1rem",
              padding: "1rem",
              background: "#1a1a1a",
              borderRadius: "0.5rem",
              fontSize: "0.75rem",
              color: "#fca5a5",
              maxWidth: "90vw",
              overflow: "auto",
              whiteSpace: "pre-wrap",
            }}>
              {this.state.error.stack}
            </pre>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
