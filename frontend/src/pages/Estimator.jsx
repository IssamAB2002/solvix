// ─── ESTIMATOR PAGE ──────────────────────────────────────────────────────────

import { useState } from "react";
import C from "../styles/colors";
import { Card, Btn } from "../components/UI";
import { EST_STEPS, PRICE_MAP, DURATION_MAP } from "../data";
import { t } from "../i18n";

export default function Estimator({ go, lang, currency = "dzd" }) {
  const [step, setStep]   = useState(0);
  const [ans,  setAns]    = useState([null, null, null]);
  const [details, setDetails] = useState(["", "", ""]);
  const [done, setDone]   = useState(false);

  const pick = (value) => {
    const updated = [...ans];
    updated[step] = value;
    setAns(updated);

    if (step < EST_STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      setDone(true);
    }
  };

  const setDetail = (value) => {
    setDetails((d) => d.map((v, i) => (i === step ? value : v)));
  };

  const reset = () => { setStep(0); setAns([null, null, null]); setDetails(["", "", ""]); setDone(false); };

  // كل التقدير يُعرض بعملة واحدة (المختارة من مبدّل العملة في الأعلى)
  const money = (n) => currency === "usd"
    ? `$${n.toLocaleString("en-US")}`
    : `${n.toLocaleString(lang === "ar" ? "ar-DZ" : "en-US")} ${t(lang, "track.currency")}`;

  const typeKey   = ans[0] || "";
  const budgetKey = ans[2] || "";
  const priceEntry = PRICE_MAP[typeKey]?.[currency];
  const price = !priceEntry
    ? t(lang, "estimator.resultHint")
    : priceEntry.from !== undefined
      ? `${t(lang, "estimator.from")} ${money(priceEntry.from)}`
      : `${money(priceEntry.min)}–${money(priceEntry.max)}`;
  const duration  = DURATION_MAP[budgetKey] || "—";

  // خيارات الميزانية تتبع العملة المختارة
  const optionLabel = (stepKey, value) =>
    stepKey === "budget" && currency === "dzd"
      ? t(lang, `estimator.budgetDzd.${value}`)
      : t(lang, `estimator.options.${value}`);

  return (
    <div dir={lang === "ar" ? "rtl" : "ltr"} style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "110px 24px 80px" }}>
      <div style={{ width: "100%", maxWidth: 640 }}>

        <div style={{ fontSize: 12, color: C.accent, letterSpacing: 3, textTransform: "uppercase", marginBottom: 12, fontWeight: 600 }}>{t(lang, "estimator.title")}</div>
        <h2 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 36, color: "#fff", marginBottom: 8 }}>{t(lang, "estimator.title")}</h2>
        <p style={{ fontSize: 15, color: C.muted, marginBottom: 40 }}>{t(lang, "estimator.subtitle")}</p>

        <Card style={{ padding: 36 }}>
          {!done ? (
            <>
              <div style={{ display: "flex", gap: 6, marginBottom: 32 }}>
                {EST_STEPS.map((_, i) => (
                  <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= step ? C.accent : C.border, transition: "background .3s" }}/>
                ))}
              </div>

              <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 20, color: "#fff", marginBottom: 24 }}>
                {t(lang, `estimator.question.${EST_STEPS[step].key}`)}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                {EST_STEPS[step].opts.map((o) => (
                  <button key={o.value} onClick={() => pick(o.value)}
                    style={{
                      background: ans[step] === o.value ? C.accentDim : C.bg,
                      border: `1.5px solid ${ans[step] === o.value ? C.accent : C.border}`,
                      borderRadius: 12, padding: "16px 18px", cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 12,
                      fontSize: 15, color: ans[step] === o.value ? "#fff" : C.muted,
                      transition: "all .2s", fontFamily: "Inter, sans-serif",
                    }}>
                    <span style={{ fontSize: 24 }}>{o.i}</span> {optionLabel(EST_STEPS[step].key, o.value)}
                  </button>
                ))}
              </div>

              <input
                value={details[step]}
                onChange={(e) => setDetail(e.target.value)}
                placeholder={t(lang, "estimator.detailsPlaceholder")}
                style={{
                  width: "100%", background: C.bg, border: `1px solid ${C.border}`,
                  borderRadius: 10, padding: "12px 14px", color: C.text, fontSize: 14,
                  outline: "none", fontFamily: "Inter, sans-serif", marginBottom: 20,
                }}
              />

              {EST_STEPS[step].key === "goal" && ans[step] === null && (
                <Btn
                  onClick={() => details[step].trim() && pick(details[step].trim())}
                  style={{ width: "100%", justifyContent: "center", marginBottom: 12, opacity: details[step].trim() ? 1 : 0.4, pointerEvents: details[step].trim() ? "auto" : "none" }}
                >
                  {t(lang, "request.next")}
                </Btn>
              )}

              {step > 0 && (
                <Btn variant="outline" onClick={() => setStep((s) => s - 1)} style={{ width: "100%" }}>
                  {t(lang, "request.back")}
                </Btn>
              )}
            </>
          ) : (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 20 }}>✅</div>
              <div style={{ fontFamily: "Syne, sans-serif", fontSize: 42, fontWeight: 800, color: "#fff", marginBottom: 8 }}>{price}</div>
              <div style={{ color: C.muted, fontSize: 13, marginBottom: 8 }}>{t(lang, "estimator.noDevs")}</div>
              <div style={{ color: C.muted, fontSize: 16, marginBottom: 6 }}>{t(lang, "estimator.resultDuration")}: {duration}</div>
              <div style={{ color: C.dim, fontSize: 12, marginBottom: 32 }}>{t(lang, "estimator.resultHint")}</div>
              <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                <Btn onClick={() => go("request")}>{t(lang, "request.send")}</Btn>
                <Btn variant="outline" onClick={reset}>{t(lang, "estimator.reestimate")}</Btn>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
