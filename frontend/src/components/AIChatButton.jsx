// ─── AI CHAT FLOATING BUTTON ─────────────────────────────────────────────────
// زر عائم في الزاوية السفلية للدردشة بالذكاء الاصطناعي — معطَّل حالياً (قريباً)

import { useState, useRef, useEffect } from "react";
import C from "../styles/colors";
import { t } from "../i18n";

export default function AIChatButton({ lang }) {
  const [show, setShow] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setShow(false); };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  return (
    <div
      ref={ref}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onClick={() => setShow(true)}
      style={{
        position: "fixed", bottom: 24, right: 24, zIndex: 998,
        display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8,
      }}
    >
      {show && (
        <div style={{
          background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20,
          padding: "6px 14px", fontSize: 12, color: C.muted,
          fontFamily: "Inter, sans-serif", whiteSpace: "nowrap",
        }}>
          ✨ {t(lang, "aiChat.comingSoon")}
        </div>
      )}
      <button
        disabled
        aria-label={t(lang, "aiChat.comingSoon")}
        style={{
          width: 56, height: 56, borderRadius: "50%",
          background: C.accent, border: "none", fontSize: 26,
          opacity: 0.55, cursor: "not-allowed",
          boxShadow: "0 8px 24px rgba(108,99,255,.35)",
          display: "flex", alignItems: "center", justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        🤖
      </button>
    </div>
  );
}
