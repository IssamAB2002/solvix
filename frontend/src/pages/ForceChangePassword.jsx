// ─── FORCE CHANGE PASSWORD (/solvix-dir) ──────────────────────────────────────
// Shown instead of the dashboard right after sign-in when the staff account's
// password was just set (or reset) by the CEO and hasn't been changed yet.

import { useState } from "react";
import C from "../styles/colors";
import { t } from "../i18n";
import { api } from "../api";
import { LanguageSwitcher } from "../components/UI";

export default function ForceChangePassword({ user, onChanged, lang, setLang }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!currentPassword || !newPassword) {
      setError(t(lang, "auth.required"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t(lang, "auth.passwordMismatch"));
      return;
    }

    setLoading(true);
    setError("");
    try {
      const data = await api("/auth/me/password", { method: "PATCH", body: { currentPassword, newPassword } });
      onChanged(data.user, data.token);
    } catch (err) {
      setError(err.status ? err.message : t(lang, "auth.connectionError"));
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
            <div style={{ fontSize: 22, fontFamily: "Syne, sans-serif", fontWeight: 800, color: "#fff" }}>{t(lang, "auth.mustChangeTitle")}</div>
            <div style={{ color: C.muted, marginTop: 10, fontSize: 14 }}>{t(lang, "auth.mustChangeDesc").replace("{name}", user?.name || "")}</div>
          </div>
          <LanguageSwitcher lang={lang} setLang={setLang} />
        </div>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
          <label style={styles.label}>
            {t(lang, "auth.currentPassword")}
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} style={styles.input} />
          </label>
          <label style={styles.label}>
            {t(lang, "auth.newPassword")}
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={styles.input} />
          </label>
          <label style={styles.label}>
            {t(lang, "auth.confirmPassword")}
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} style={styles.input} />
          </label>
          {error && <div style={styles.error}>{error}</div>}

          <button type="submit" disabled={loading} style={{ ...styles.submitButton, opacity: loading ? 0.6 : 1 }}>
            {t(lang, "auth.changePassword")}
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
