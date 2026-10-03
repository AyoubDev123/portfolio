import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";
import ProjectPage from "./pages/ProjectPage";

// L'espace admin est chargé à la demande : il n'alourdit pas le bundle public.
const AdminPage = lazy(() => import("./admin/AdminPage"));

export default function App() {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-on-brand"
      >
        Aller au contenu
      </a>
      <Header />
      <main id="main" tabIndex={-1} className="outline-none">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/projets/:slug" element={<ProjectPage />} />
          <Route
            path="/admin"
            element={
              <Suspense fallback={<p className="container-page pt-20 text-muted">Chargement…</p>}>
                <AdminPage />
              </Suspense>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}
