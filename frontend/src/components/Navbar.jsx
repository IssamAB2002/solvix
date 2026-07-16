// ─── NAVBAR ───────────────────────────────────────────────────────────────────

import { useState } from "react";
import C from "../styles/colors";
import { t } from "../i18n";
import { LanguageSwitcher, CurrencySwitcher } from "./UI";

const NAV_LINKS = ["home", "projects", "estimator", "request"];

export default function Navbar({ page, setPage, lang, setLang, currency, setCurrency }) {
  const [open, setOpen] = useState(false);
  const go = (id) => { setPage(id); setOpen(false); };

  const links = (
    <>
      {NAV_LINKS.map(id => (
        <button
          key={id}
          onClick={() => go(id)}
          style={{
            background: page === id ? C.accentDim : "transparent",
            border: page === id ? `1px solid rgba(108,99,255,.3)` : "1px solid transparent",
            borderRadius: 8, padding: "7px 14px",
            fontSize: 13, fontWeight: 500,
            color: page === id ? "#fff" : C.muted,
            cursor: "pointer",
            fontFamily: "Inter, sans-serif",
            transition: "all .15s",
          }}
        >
          {t(lang, `nav.${id}`)}
        </button>
      ))}

      <button
        onClick={() => go("track")}
        style={{
          background: page === "track" ? C.accentLight : C.accent,
          border: "none", borderRadius: 9,
          padding: "8px 18px", fontSize: 13, fontWeight: 600,
          color: "#fff", cursor: "pointer",
          fontFamily: "Inter, sans-serif", marginRight: 8,
        }}
      >
        🔑 {t(lang, "nav.track")}
      </button>

      <LanguageSwitcher lang={lang} setLang={setLang} />
      <CurrencySwitcher currency={currency} setCurrency={setCurrency} />
    </>
  );

  // Mobile panel: nav links stacked full-width, then a compact language/currency
  // row at the bottom instead of reusing the desktop (wider, dropdown-based) switchers.
  const mobileLinks = (
    <>
      {NAV_LINKS.map(id => (
        <button
          key={id}
          onClick={() => go(id)}
          style={{
            background: page === id ? C.accentDim : "transparent",
            border: page === id ? `1px solid rgba(108,99,255,.3)` : "1px solid transparent",
            borderRadius: 8, padding: "10px 14px",
            fontSize: 14, fontWeight: 500, textAlign: lang === "ar" ? "right" : "left",
            color: page === id ? "#fff" : C.muted,
            cursor: "pointer",
            fontFamily: "Inter, sans-serif",
            transition: "all .15s",
          }}
        >
          {t(lang, `nav.${id}`)}
        </button>
      ))}

      <button
        onClick={() => go("track")}
        style={{
          background: page === "track" ? C.accentLight : C.accent,
          border: "none", borderRadius: 9,
          padding: "10px 14px", fontSize: 14, fontWeight: 600,
          color: "#fff", cursor: "pointer",
          fontFamily: "Inter, sans-serif",
        }}
      >
        🔑 {t(lang, "nav.track")}
      </button>

      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 8, marginTop: 4, paddingTop: 12, borderTop: `1px solid ${C.border}`,
      }}>
        <LanguageSwitcher lang={lang} setLang={setLang} compact />
        <CurrencySwitcher currency={currency} setCurrency={setCurrency} style={{ marginRight: 0 }} />
      </div>
    </>
  );

  return (
    <nav
      dir={lang === "ar" ? "rtl" : "ltr"}
      className="navbar-shell"
      style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 999,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 28px", height: 70,
        background: "rgba(10,10,15,.88)",
        backdropFilter: "blur(20px)",
        borderBottom: `1px solid ${C.border}`,
      }}
    >
      {/* Logo */}
      <button
        onClick={() => go("home")}
        className="navbar-logo"
        style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 20, color: "#fff", background: "none", border: "none", cursor: "pointer" }}
      >
        <img src="/logo.png" alt="Solvix" style={{ width: 34, height: 34, borderRadius: 8, objectFit: "contain" }} />
        <span style={{ color: "#fff" }}>SOLVIX</span>
      </button>

      {/* Desktop links */}
      <div className="navbar-links" style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {links}
      </div>

      {/* Mobile hamburger */}
      <button
        className="navbar-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-label="Menu"
        style={{
          alignItems: "center", justifyContent: "center",
          width: 40, height: 40, borderRadius: 9,
          background: "rgba(255,255,255,.08)", border: `1px solid ${C.border}`,
          color: "#fff", fontSize: 18, cursor: "pointer",
        }}
      >
        {open ? "✕" : "☰"}
      </button>

      {/* Mobile dropdown panel */}
      {open && (
        <div
          className="navbar-mobile-panel"
          style={{
            position: "absolute", top: "100%", left: 0, right: 0,
            background: "rgba(10,10,15,.97)", borderBottom: `1px solid ${C.border}`,
            flexDirection: "column", alignItems: "stretch", gap: 6, padding: 14,
          }}
        >
          {mobileLinks}
        </div>
      )}
    </nav>
  );
}
