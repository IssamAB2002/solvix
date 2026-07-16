// ─── SHARED UI COMPONENTS ────────────────────────────────────────────────────
// مكونات صغيرة تُستخدم في كل الصفحات

import { useState, useRef, useEffect } from "react";
import C from "../styles/colors";
import { LANGUAGES } from "../i18n";

export function LanguageSwitcher({ lang, setLang, compact = false }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  if (compact) {
    return (
      <div style={{
        display: "inline-flex", alignItems: "center",
        background: "rgba(255,255,255,.08)", border: `1px solid ${C.border}`,
        borderRadius: 9, padding: 3, gap: 2,
      }}>
        {Object.keys(LANGUAGES).map((code) => (
          <button
            key={code}
            onClick={() => setLang(code)}
            style={{
              background: lang === code ? C.accent : "transparent",
              border: "none", borderRadius: 7,
              padding: "5px 9px", fontSize: 12, fontWeight: 600,
              color: lang === code ? "#fff" : C.muted,
              cursor: "pointer", fontFamily: "Inter, sans-serif",
              transition: "all .15s",
            }}
          >
            {code.toUpperCase()}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div ref={ref} style={{ position: "relative", marginRight: 8 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          background: "rgba(255,255,255,.08)",
          border: `1px solid ${C.border}`,
          borderRadius: 9,
          color: "#fff",
          padding: "8px 12px",
          fontSize: 13,
          cursor: "pointer",
          fontFamily: "Inter, sans-serif",
          minWidth: 120,
        }}
      >
        {LANGUAGES[lang]} ▼
      </button>
      {open && (
        <div style={{
          position: "absolute",
          top: "100%",
          ...(lang === "ar" ? { right: 0 } : { left: 0 }),
          marginTop: 4,
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 9,
          padding: 4,
          zIndex: 1000,
          minWidth: 120,
        }}>
          {Object.entries(LANGUAGES).map(([code, label]) => (
            <button
              key={code}
              onClick={() => { setLang(code); setOpen(false); }}
              style={{
                display: "block",
                width: "100%",
                background: code === lang ? C.accentDim : "transparent",
                border: "none",
                borderRadius: 6,
                padding: "6px 10px",
                fontSize: 13,
                color: "#fff",
                cursor: "pointer",
                fontFamily: "Inter, sans-serif",
                textAlign: lang === "ar" ? "right" : "left",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// مبدّل العملة: كل عملية الطلب والتقدير تتم بعملة واحدة (د.ج أو $)
export function CurrencySwitcher({ currency, setCurrency, style = {} }) {
  const OPTIONS = [
    { code: "dzd", label: "د.ج" },
    { code: "usd", label: "$" },
  ];
  return (
    <div style={{
      display: "inline-flex", alignItems: "center",
      background: "rgba(255,255,255,.08)", border: `1px solid ${C.border}`,
      borderRadius: 9, padding: 3, marginRight: 8,
      ...style,
    }}>
      {OPTIONS.map(({ code, label }) => (
        <button
          key={code}
          onClick={() => setCurrency(code)}
          style={{
            background: currency === code ? C.accent : "transparent",
            border: "none", borderRadius: 7,
            padding: "5px 11px", fontSize: 13, fontWeight: 600,
            color: currency === code ? "#fff" : C.muted,
            cursor: "pointer", fontFamily: "Inter, sans-serif",
            transition: "all .15s",
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// زر قابل للتخصيص: primary | outline | ghost
export const Btn = ({ children, onClick, style = {}, variant = "primary" }) => {
  const base = {
    border: "none",
    borderRadius: 10,
    padding: "11px 22px",
    fontSize: 14,
    fontWeight: 600,
    transition: "all .2s",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    cursor: "pointer",
    fontFamily: "Inter, sans-serif",
  };

  const variants = {
    primary: { background: C.accent,      color: "#fff" },
    outline: { background: "transparent", color: C.text,  border: `1px solid ${C.border}` },
    ghost:   { background: "transparent", color: C.muted },
  };

  return (
    <button onClick={onClick} style={{ ...base, ...variants[variant], ...style }}>
      {children}
    </button>
  );
};

// بطاقة بخلفية داكنة وحدود
export const Card = ({ children, style = {}, ...rest }) => (
  <div
    style={{
      background: C.surface,
      border: `1px solid ${C.border}`,
      borderRadius: 14,
      ...style,
    }}
    {...rest}
  >
    {children}
  </div>
);

// شارة ملونة للحالات (مدفوع، معلّق، نشط...)
export const Badge = ({ label, color }) => (
  <span style={{
    background: `${color}22`,
    color,
    borderRadius: 20,
    padding: "3px 12px",
    fontSize: 12,
    fontWeight: 600,
  }}>
    {label}
  </span>
);

// تسمية قسم + عنوان رئيسي
export const SectionHeader = ({ label, title, sub }) => (
  <div style={{ marginBottom: sub ? 20 : 48 }}>
    <div style={{ fontSize: 12, color: C.accent, letterSpacing: 3, textTransform: "uppercase", marginBottom: 12, fontWeight: 600 }}>
      {label}
    </div>
    <h2 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "clamp(26px,3vw,42px)", color: "#fff", marginBottom: sub ? 12 : 0 }}>
      {title}
    </h2>
    {sub && <p style={{ fontSize: 16, color: C.muted, lineHeight: 1.7 }}>{sub}</p>}
  </div>
);
