// ─── APP.JSX ─────────────────────────────────────────────────────────────────
// نقطة الدخول الرئيسية — الموقع عام للزوار، ولوحة الإدارة على مسار ‎/solvix-dir‎ لفريق Solvix فقط

import { useState, useEffect } from "react";

import globalCSS from "./styles/global";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import AIChatButton from "./components/AIChatButton";
import Home from "./pages/Home";
import Projects from "./pages/Projects";
import ProjectDetails from "./pages/ProjectDetails";
import Estimator from "./pages/Estimator";
import Request from "./pages/Request";
import Track from "./pages/Track";
import Dashboard from "./dashboard/Dashboard";
import AdminLogin from "./pages/AdminLogin";
import ForceChangePassword from "./pages/ForceChangePassword";

const IS_ADMIN_PATH = window.location.pathname.startsWith("/solvix-dir");
const STAFF_ROLES = ["ceo", "admin", "developer"];

// A direct link to /projects/:slug opens that project's details page straight away.
const PROJECT_PATH_MATCH = window.location.pathname.match(/^\/projects\/([^/]+)\/?$/);

export default function App() {
  const [page, setPage] = useState(PROJECT_PATH_MATCH ? "projectDetails" : "home");
  const [selectedSlug, setSelectedSlug] = useState(PROJECT_PATH_MATCH ? decodeURIComponent(PROJECT_PATH_MATCH[1]) : null);
  const [staff, setStaff] = useState(() => {
    const stored = localStorage.getItem("solvix_user");
    const user = stored ? JSON.parse(stored) : null;
    return user && STAFF_ROLES.includes(user.role) ? user : null;
  });
  const [lang, setLang] = useState(() => localStorage.getItem("solvix_lang") || "ar");
  const [currency, setCurrency] = useState(() => localStorage.getItem("solvix_currency") || "dzd");

  useEffect(() => {
    localStorage.setItem("solvix_lang", lang);
  }, [lang]);

  useEffect(() => {
    localStorage.setItem("solvix_currency", currency);
  }, [currency]);

  // Keeps the URL in sync so a project details page is shareable/refreshable;
  // every other page stays state-only like before (no router needed).
  const navigate = (pageId) => {
    if (pageId !== "projectDetails" && window.location.pathname !== "/") {
      window.history.pushState(null, "", "/");
    }
    setPage(pageId);
  };
  const openProject = (slug) => {
    window.history.pushState(null, "", `/projects/${encodeURIComponent(slug)}`);
    setSelectedSlug(slug);
    setPage("projectDetails");
  };

  const handleStaffLogin = (userData) => {
    setStaff(userData);
    localStorage.setItem("solvix_user", JSON.stringify(userData));
  };

  const handlePasswordChanged = (userData, token) => {
    setStaff(userData);
    localStorage.setItem("solvix_user", JSON.stringify(userData));
    localStorage.setItem("solvix_token", token);
  };

  const handleStaffLogout = () => {
    setStaff(null);
    localStorage.removeItem("solvix_user");
    localStorage.removeItem("solvix_token");
  };

  // ── Admin area (/solvix-dir) — CEO & developers only ────────────────────────
  if (IS_ADMIN_PATH) {
    return (
      <>
        <style>{globalCSS}</style>
        {staff ? (
          staff.mustChangePassword ? (
            <ForceChangePassword user={staff} onChanged={handlePasswordChanged} lang={lang} setLang={setLang} />
          ) : (
            <Dashboard user={staff} lang={lang} setLang={setLang} onLogout={handleStaffLogout} />
          )
        ) : (
          <AdminLogin onLogin={handleStaffLogin} lang={lang} setLang={setLang} />
        )}
      </>
    );
  }

  // ── Public website ──────────────────────────────────────────────────────────
  return (
    <>
      <style>{globalCSS}</style>
      <Navbar page={page} setPage={navigate} lang={lang} setLang={setLang} currency={currency} setCurrency={setCurrency} />
      {page === "home"      && <Home      go={navigate} lang={lang} />}
      {page === "projects"  && <Projects  go={navigate} lang={lang} onSelectProject={openProject} />}
      {page === "projectDetails" && <ProjectDetails slug={selectedSlug} go={navigate} lang={lang} />}
      {page === "estimator" && <Estimator go={navigate} lang={lang} currency={currency} />}
      {page === "request"   && <Request   go={navigate} lang={lang} currency={currency} />}
      {page === "track"     && <Track     go={navigate} lang={lang} />}
      <Footer lang={lang} />
      <AIChatButton lang={lang} />
    </>
  );
}
