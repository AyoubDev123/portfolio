import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import App from "../App";
import { LangProvider } from "../lib/lang";
import { PortfolioProvider } from "../lib/portfolio";
import { ThemeProvider } from "../lib/theme";

function renderAt(path: string) {
  return render(
    <LangProvider>
      <ThemeProvider>
        <PortfolioProvider>
          <MemoryRouter initialEntries={[path]}>
            <App />
          </MemoryRouter>
        </PortfolioProvider>
      </ThemeProvider>
    </LangProvider>,
  );
}

beforeEach(() => {
  window.scrollTo = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
  // L'API est « injoignable » : le site doit fonctionner avec l'export statique.
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("réseau indisponible")));
});

afterEach(() => vi.unstubAllGlobals());

describe("site public (repli statique)", () => {
  it("affiche le profil et les expériences sans API", async () => {
    renderAt("/");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/Ayoub\s*EL ABBASSI/);
    expect(screen.getByText(/Safran Aircraft Engines/, { selector: "h3" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/static export/)).toBeInTheDocument());
  });

  it("filtre les projets par thème", async () => {
    const user = userEvent.setup();
    renderAt("/");
    const section = screen.getByRole("region", { name: /What I've built/ });
    const total = within(section).getAllByRole("article").length;
    await user.click(within(section).getByRole("button", { name: "BI & DataViz" }));
    const filtered = within(section).getAllByRole("article");
    expect(filtered.length).toBeLessThan(total);
    expect(filtered).toHaveLength(1);
    await user.click(within(section).getByRole("button", { name: "All" }));
    expect(within(section).getAllByRole("article")).toHaveLength(total);
  });

  it("affiche la page d'un projet et une 404 sinon", () => {
    const { unmount } = renderAt("/projects/valeur-fonciere");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/Land Value Prediction/i);
    unmount();
    renderAt("/projects/inexistant");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/doesn't exist/i);
  });

  it("propose le repli e-mail quand l'envoi du formulaire échoue", async () => {
    const user = userEvent.setup();
    renderAt("/");
    await user.type(screen.getByLabelText("Name"), "Camille Dupont");
    await user.type(screen.getByLabelText("Email"), "camille@example.com");
    await user.type(screen.getByLabelText("Subject"), "Proposition");
    await user.type(screen.getByLabelText("Message"), "Bonjour, un message suffisamment long.");
    await user.click(screen.getByRole("button", { name: /Send/ }));
    expect(await screen.findByText(/temporarily unavailable/)).toBeInTheDocument();
  });

  it("bascule le thème", async () => {
    const user = userEvent.setup();
    renderAt("/");
    await user.click(screen.getByRole("button", { name: /Switch to (light|dark) theme/ }));
    expect(["dark", "light"]).toContain(document.documentElement.dataset.theme);
  });
});
