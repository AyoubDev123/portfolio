import { lazy, Suspense } from "react";
import { Route, Routes, useParams } from "react-router-dom";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { useLang } from "./lib/lang";
import { PortfolioProvider } from "./lib/portfolio";
import Home from "./pages/Home";
import Landing from "./pages/Landing";
import NotFound from "./pages/NotFound";
import ProjectPage from "./pages/ProjectPage";
import Signup from "./pages/Signup";

const AdminPage = lazy(() => import("./admin/AdminPage"));

/** Le portfolio d'un étudiant : tout ce qui vit sous /<slug>. */
function PortfolioSite() {
  const { slug = "" } = useParams();
  const { t } = useLang();
  return (
    <PortfolioProvider slug={slug}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-on-brand"
      >
        {t.skipToContent}
      </a>
      <Header />
      <main id="main" tabIndex={-1} className="outline-none">
        <Routes>
          <Route index element={<Home />} />
          <Route path="projects/:projectSlug" element={<ProjectPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </PortfolioProvider>
  );
}

export default function App() {
  const { t } = useLang();
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/signup" element={<Signup />} />
      <Route
        path="/admin"
        element={
          <Suspense fallback={<p className="container-page pt-20 text-muted">{t.loading}</p>}>
            <AdminPage />
          </Suspense>
        }
      />
      <Route path="/:slug/*" element={<PortfolioSite />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
