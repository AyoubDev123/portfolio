import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import { PortfolioProvider } from "./lib/portfolio";
import { ThemeProvider } from "./lib/theme";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <PortfolioProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </PortfolioProvider>
    </ThemeProvider>
  </StrictMode>,
);
