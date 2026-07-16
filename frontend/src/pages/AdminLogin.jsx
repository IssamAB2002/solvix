// ─── ADMIN LOGIN (/admin) ────────────────────────────────────────────────────
// Staff sign-in only (CEO & developers). Visitors have no accounts.

import { useState } from "react";
import C from "../styles/colors";
import { t } from "../i18n";
import { API_BASE } from "../config";
import { LanguageSwitcher } from "../components/UI";

export default function AdminLogin({ onLogin, lang, setLang }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!email || !password) {
      setError(t(lang, "auth.required"));
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/auth/signin`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept-Language": lang },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || t(lang, "auth.loginError"));
        return;
      }

      localStorage.setItem("solvix_user", JSON.stringify(data.user));
      localStorage.setItem("solvix_token", data.token);
      onLogin(data.user);
    } catch {
      setError(t(lang, "auth.connectionError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir={lang === "ar" ? "rtl" : "ltr"} style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 420, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 24, padding: 36 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <img src="/logo.png" alt="Solvix" style={{ width: 46, height: 46, borderRadius: 10, objectFit: "contain" }} />
          <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 22, color: "#fff" }}>
            SOLVIX
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 26, fontFamily: "Syne, sans-serif", fontWeight: 800, color: "#fff" }}>{t(lang, "auth.adminTitle")}</div>
            <div style={{ color: C.muted, marginTop: 10, fontSize: 14 }}>{t(lang, "auth.adminDesc")}</div>
          </div>
          <LanguageSwitcher lang={lang} setLang={setLang} />
        </div>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
          <label style={styles.label}>
            {t(lang, "auth.email")}
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={styles.input} />
          </label>
          <label style={styles.label}>
            {t(lang, "auth.password")}
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={styles.input} />
          </label>
          {error && <div style={styles.error}>{error}</div>}

          <button type="submit" disabled={loading} style={{ ...styles.submitButton, opacity: loading ? 0.6 : 1 }}>
            {t(lang, "auth.submitLogin")}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  label: {
    display: "grid",
    gap: 8,
    color: "#fff",
    fontSize: 14,
    lineHeight: 1.5,
  },
  input: {
    width: "100%",
    borderRadius: 14,
    border: `1px solid ${C.border}`,
    background: C.bg,
    color: "#fff",
    padding: "14px 16px",
    fontSize: 14,
    outline: "none",
  },
  submitButton: {
    width: "100%",
    marginTop: 4,
    padding: "14px 16px",
    borderRadius: 14,
    border: "none",
    background: C.accent,
    color: "#fff",
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
  },
  error: {
    color: "#F87171",
    fontSize: 14,
    marginTop: 4,
  },
};
