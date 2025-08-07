// React is used by JSX, keep import even though it appears unused
import ReactDOM from "react-dom/client";
import App from "./App";
import "./enhanced-design-system.css";
import "./button-alignment-fixes.css";
import "./micro-interactions.css";
import "./styles.css";
import "./design-system.css";
import "./responsive.css";
import "./contextMenu.css";
import "./contextMenu.ts";

// Clean up old localStorage data if version mismatch
try {
  const saved = localStorage.getItem('codegit_app_state');
  if (saved) {
    const parsed = JSON.parse(saved);
    if (parsed.version && parsed.version !== '3.0.0') {
      localStorage.removeItem('codegit_app_state');
      console.log('Cleared old state for onboarding update');
    }
  }
} catch {
  // Ignore errors in cleanup
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <App />
);