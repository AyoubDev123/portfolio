import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import App from "../App";
import { PortfolioProvider } from "../lib/portfolio";
import { ThemeProvider } from "../lib/theme";

function renderAt(path: string) {
  return render(
    <ThemeProvider>
      <PortfolioProvider>
        <MemoryRouter initialEntries={[path]}>
          <App />
        </MemoryRouter>
      </PortfolioProvider>
    </ThemeProvider>,
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
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/Ayoub\s*El Abbassi/);
    expect(screen.getByText(/Safran Aircraft Engines/, { selector: "h3" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/export statique/)).toBeInTheDocument());
  });

  it("filtre les projets par thème", async () => {
    const user = userEvent.setup();
    renderAt("/");
    const section = screen.getByRole("region", { name: /Ce que j'ai construit/ });
    const total = within(section).getAllByRole("article").length;
    await user.click(within(section).getByRole("button", { name: "Développement web" }));
    const filtered = within(section).getAllByRole("article");
    expect(filtered.length).toBeLessThan(total);
    expect(filtered).toHaveLength(1);
    await user.click(within(section).getByRole("button", { name: "Tous" }));
    expect(within(section).getAllByRole("article")).toHaveLength(total);
  });

  it("affiche la page d'un projet et une 404 sinon", () => {
    const { unmount } = renderAt("/projets/valeur-fonciere");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/valeur foncière/i);
    unmount();
    renderAt("/projets/inexistant");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/n'existe pas/);
  });

  it("propose le repli e-mail quand l'envoi du formulaire échoue", async () => {
    const user = userEvent.setup();
    renderAt("/");
    await user.type(screen.getByLabelText("Nom"), "Camille Dupont");
    await user.type(screen.getByLabelText("E-mail"), "camille@example.com");
    await user.type(screen.getByLabelText("Sujet"), "Proposition");
    await user.type(screen.getByLabelText("Message"), "Bonjour, un message suffisamment long.");
    await user.click(screen.getByRole("button", { name: /Envoyer/ }));
    expect(await screen.findByText(/momentanément indisponible/)).toBeInTheDocument();
  });

  it("bascule le thème", async () => {
    const user = userEvent.setup();
    renderAt("/");
    await user.click(screen.getByRole("button", { name: /thème (sombre|clair)/ }));
    expect(["dark", "light"]).toContain(document.documentElement.dataset.theme);
  });
});
