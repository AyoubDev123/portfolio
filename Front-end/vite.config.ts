/// <reference types="vitest/config" />
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type Plugin } from "vite";

/** Injecte l'URL publique du site dans index.html.
 *
 * Les balises Open Graph exigent des URLs absolues : une image d'aperçu en
 * chemin relatif n'est pas résolue par les scrapers de LinkedIn ou Slack.
 * Le repli garantit qu'un build sans VITE_SITE_URL produit quand même une URL
 * valide plutôt qu'un marqueur littéral.
 */
function siteUrl(url: string): Plugin {
  return {
    name: "inject-site-url",
    transformIndexHtml: (html) => html.replaceAll("__SITE_URL__", url.replace(/\/+$/, "")),
  };
}

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ""), ...process.env };
  const api = env.VITE_API_PROXY ?? "http://localhost:8000";

  return {
    plugins: [react(), tailwindcss(), siteUrl(env.VITE_SITE_URL ?? "http://localhost:5173")],
    server: { port: 5173, proxy: { "/api": api } },
    preview: { proxy: { "/api": api } },
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: ["./src/test-setup.ts"],
      css: false,
    },
  };
});
