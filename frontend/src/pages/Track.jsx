// ─── TRACK PAGE ──────────────────────────────────────────────────────────────
// Client portal: enter the private key handed over by Solvix → read-only view of
// the project (progress, feature prices, budget, paid & remaining).

import { useState } from "react";
import C from "../styles/colors";
import { Card, Badge, Btn } from "../components/UI";
import { t } from "../i18n";
import { api } from "../api";

const STAGES = ["analysis", "design", "development", "testing", "deployment"];
const STAGE_COLOR = { done: "#22C55E", current: "#6C63FF", next: "#4A4A6A" };
const DELIVERED_COLOR = "#FBBF24";

function fmtMoney(value, lang) {
  const n = Number(value) || 0;
  return `${n.toLocaleString(lang === "ar" ? "ar-DZ" : "en-US")} ${t(lang, "track.currency")}`;
}

export default function Track({ go, lang }) {
  const [key, setKey] = useState("");
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const lookup = async (event) => {
    event?.preventDefault();
    if (!key.trim()) return;
    setLoading(true);
    setError("");
    try {
      const data = await api("/track", { method: "POST", body: { privateKey: key.trim() }, auth: false });
      setOrder(data.order);
    } catch (err) {
      setError(err.status ? err.message : t(lang, "auth.connectionError"));
    } finally {
      setLoading(false);
    }
  };

  if (order) return <OrderDetails order={order} lang={lang} onBack={() => { setOrder(null); setKey(""); }} go={go} />;

  return (
    <div dir={lang === "ar" ? "rtl" : "ltr"} style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "110px 24px 80px" }}>
      <div style={{ width: "100%", maxWidth: 520 }}>
        <div style={{ fontSize: 12, color: C.accent, letterSpacing: 3, textTransform: "uppercase", marginBottom: 12, fontWeight: 600 }}>{t(lang, "track.badge")}</div>
        <h2 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 36, color: "#fff", marginBottom: 8 }}>{t(lang, "track.title")}</h2>
        <p style={{ fontSize: 15, color: C.muted, marginBottom: 40 }}>{t(lang, "track.subtitle")}</p>

        <Card style={{ padding: 32 }}>
          <form onSubmit={lookup} style={{ display: "grid", gap: 16 }}>
            <label style={{ display: "grid", gap: 8, color: "#fff", fontSize: 14 }}>
              {t(lang, "track.keyLabel")}
              <input
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder={t(lang, "track.keyPlaceholder")}
                style={{
                  width: "100%", borderRadius: 12, border: `1px solid ${C.border}`,
                  background: C.bg, color: "#fff", padding: "14px 16px", fontSize: 15,
                  outline: "none", letterSpacing: 1, fontFamily: "monospace", direction: "ltr", textAlign: "center",
                }}
              />
            </label>
            {error && <div style={{ color: "#F87171", fontSize: 14 }}>{error}</div>}
            <button type="submit" disabled={loading} style={{
              width: "100%", padding: "14px 16px", borderRadius: 12, border: "none",
              background: C.accent, color: "#fff", fontSize: 15, fontWeight: 700,
              cursor: "pointer", opacity: loading ? 0.6 : 1, fontFamily: "Inter, sans-serif",
            }}>
              {loading ? "..." : t(lang, "track.submit")}
            </button>
          </form>
        </Card>

        <div style={{ color: C.dim, fontSize: 13, marginTop: 18, lineHeight: 1.7 }}>{t(lang, "track.hint")}</div>
      </div>
    </div>
  );
}

function OrderDetails({ order, lang, onBack }) {
  const isDelivered = order.status === "delivered";
  const currentIdx = STAGES.indexOf(order.status);
  const stageState = (i) => (i < currentIdx ? "done" : i === currentIdx ? "current" : "next");
  const featuresTotal = (order.features || []).reduce((s, f) => s + (Number(f.price) || 0), 0);

  return (
    <div dir={lang === "ar" ? "rtl" : "ltr"} style={{ maxWidth: 820, margin: "0 auto", padding: "110px 24px 80px" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: 28 }}>
        <div>
          <div style={{ fontSize: 12, color: C.accent, letterSpacing: 2, fontWeight: 600, marginBottom: 8, direction: "ltr", textAlign: lang === "ar" ? "right" : "left" }}>{order.uid}</div>
          <h2 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 30, color: "#fff", marginBottom: 6 }}>{order.projectType}</h2>
          <div style={{ color: C.muted, fontSize: 14 }}>{t(lang, "track.welcomeClient").replace("{name}", order.clientName)}</div>
        </div>
        <Badge
          label={isDelivered ? `✅ ${t(lang, "track.deliveredBadge")}` : t(lang, `dashboard.projectStages.${order.status}`)}
          color={isDelivered ? DELIVERED_COLOR : order.status === "deployment" ? C.green : C.accent}
        />
      </div>

      {order.description && (
        <Card style={{ padding: 20, marginBottom: 20 }}>
          <div style={{ color: C.muted, fontSize: 14, lineHeight: 1.8 }}>{order.description}</div>
        </Card>
      )}

      {isDelivered ? (
        /* Delivered: live progress tracking has ended, show a closure notice instead of the stepper */
        <Card style={{ padding: 28, marginBottom: 20, border: `1px solid ${DELIVERED_COLOR}55` }}>
          <div style={{ fontSize: 34, marginBottom: 12 }}>✅</div>
          <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 18, color: "#fff", marginBottom: 8 }}>{t(lang, "track.deliveredTitle")}</div>
          <div style={{ color: C.muted, fontSize: 14, lineHeight: 1.8 }}>{t(lang, "track.deliveredMessage")}</div>
        </Card>
      ) : (
        /* Progress */
        <Card style={{ padding: 28, marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
            <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 17, color: "#fff" }}>{t(lang, "track.progressTitle")}</div>
            <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 24, color: C.accent }}>{order.progressPct}%</div>
          </div>
          <div style={{ height: 10, background: C.border, borderRadius: 5, marginBottom: 26 }}>
            <div style={{ height: "100%", width: `${order.progressPct}%`, background: C.accent, borderRadius: 5, transition: "width .6s" }} />
          </div>
          {STAGES.map((stage, i) => {
            const state = stageState(i);
            return (
              <div key={stage} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                  background: state === "next" ? "transparent" : STAGE_COLOR[state],
                  border: `2px solid ${STAGE_COLOR[state]}`,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#fff",
                }}>
                  {state === "done" ? "✓" : state === "current" ? "•" : ""}
                </div>
                <div style={{ fontSize: 14, color: state === "next" ? C.dim : "#fff", fontWeight: state === "current" ? 700 : 400 }}>
                  {t(lang, `dashboard.projectStages.${stage}`)}
                </div>
              </div>
            );
          })}
        </Card>
      )}

      {/* Budget */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 14, marginBottom: 20 }}>
        {[
          [t(lang, "track.totalBudget"), fmtMoney(order.totalBudget, lang), "#fff"],
          [t(lang, "track.paid"), fmtMoney(order.amountPaid, lang), C.green],
          [t(lang, "track.remaining"), fmtMoney(order.remaining, lang), C.yellow],
        ].map(([label, value, color]) => (
          <Card key={label} style={{ padding: 20 }}>
            <div style={{ fontSize: 12, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>{label}</div>
            <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 22, color }}>{value}</div>
          </Card>
        ))}
      </div>

      {/* Features & prices */}
      {order.features?.length > 0 && (
        <Card style={{ overflow: "hidden", marginBottom: 20 }}>
          <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 15, color: "#fff" }}>
            {t(lang, "track.featuresTitle")}
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {order.features.map((f, i) => (
                <tr key={i}>
                  <td style={{ padding: "13px 20px", fontSize: 14, color: C.text, borderBottom: `1px solid ${C.border}` }}>
                    {f.done ? "✅ " : "◻️ "}{f.name}
                  </td>
                  <td style={{ padding: "13px 20px", fontSize: 14, color: "#fff", fontWeight: 600, borderBottom: `1px solid ${C.border}`, textAlign: lang === "ar" ? "left" : "right" }}>
                    {fmtMoney(f.price, lang)}
                  </td>
                </tr>
              ))}
              <tr>
                <td style={{ padding: "13px 20px", fontSize: 14, color: C.muted, fontWeight: 700 }}>{t(lang, "track.featuresTotal")}</td>
                <td style={{ padding: "13px 20px", fontSize: 14, color: C.accent, fontWeight: 800, textAlign: lang === "ar" ? "left" : "right" }}>{fmtMoney(featuresTotal, lang)}</td>
              </tr>
            </tbody>
          </table>
        </Card>
      )}

      {/* Payments history */}
      {order.payments?.length > 0 && (
        <Card style={{ overflow: "hidden", marginBottom: 28 }}>
          <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 15, color: "#fff" }}>
            {t(lang, "track.paymentsTitle")}
          </div>
          {order.payments.map((p, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "13px 20px", borderBottom: `1px solid ${C.border}`, fontSize: 14 }}>
              <span style={{ color: C.muted }}>{(p.createdAt || "").toString().slice(0, 10)}{p.note ? ` — ${p.note}` : ""}</span>
              <span style={{ color: C.green, fontWeight: 700 }}>{fmtMoney(p.amount, lang)}</span>
            </div>
          ))}
        </Card>
      )}

      <Btn variant="outline" onClick={onBack}>{t(lang, "track.back")}</Btn>
    </div>
  );
}
