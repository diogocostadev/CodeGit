// React is used by JSX, keep import even though it appears unused
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";
import "./design-system.css";
import "./responsive.css";
import "./contextMenu.css";
import "./contextMenu.ts";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <App />
);