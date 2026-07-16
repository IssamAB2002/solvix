// ─── SITE FOOTER (contact info, public site only) ────────────────────────────

import C from "../styles/colors";
import { t } from "../i18n";

const LINKS = [
  { icon: "📞", href: "tel:+213781612093", label: "+213 781 612 093" },
  { icon: "💬", href: "https://wa.me/213781612093", label: "WhatsApp — +213 781 612 093" },
  { icon: "💬", href: "https://wa.me/213552111855", label: "WhatsApp — +213 552 111 855" },
  { icon: "✉️", href: "mailto:abbasissam98@gmail.com", label: "abbasissam98@gmail.com" },
  { icon: "📘", href: "https://www.facebook.com/issam.ab.79393", label: "Facebook" },
  { icon: "📸", href: "https://instagram.com/abbasissam98", label: "Instagram" },
];

export default function Footer({ lang }) {
  return (
    <footer
      dir={lang === "ar" ? "rtl" : "ltr"}
      style={{
        borderTop: `1px solid ${C.border}`,
        padding: "40px 24px",
        textAlign: "center",
      }}
    >
      <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 16, color: "#fff", marginBottom: 18 }}>
        {t(lang, "footer.title")}
      </div>
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", justifyContent: "center", marginBottom: 18 }}>
        {LINKS.map((l) => (
          <a
            key={l.label}
            href={l.href}
            target={l.href.startsWith("http") ? "_blank" : undefined}
            rel={l.href.startsWith("http") ? "noopener noreferrer" : undefined}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              color: C.muted, fontSize: 13, textDecoration: "none",
              direction: "ltr",
            }}
          >
            <span style={{ fontSize: 16 }}>{l.icon}</span> {l.label}
          </a>
        ))}
      </div>
      <div style={{ fontSize: 12, color: C.dim }}>
        © {new Date().getFullYear()} Solvix. {t(lang, "footer.rights")}
      </div>
    </footer>
  );
}
