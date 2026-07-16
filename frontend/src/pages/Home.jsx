// ─── HOME PAGE ───────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import C from "../styles/colors";
import { Card, Btn, SectionHeader } from "../components/UI";
import { t } from "../i18n";
import { api } from "../api";

export default function Home({ go, lang }) {
  const [testimonials, setTestimonials] = useState([]);
  const [projects, setProjects] = useState([]);
  const [services, setServices] = useState([]);
  const [systems, setSystems] = useState([]);
  const [growthRate, setGrowthRate] = useState("3×");

  const loadTestimonials = () => {
    api("/testimonials", { auth: false })
      .then((data) => setTestimonials(data.testimonials || []))
      .catch(() => setTestimonials([]));
  };

  useEffect(() => {
    loadTestimonials();
    fetch("/data/projects.json")
      .then(r => (r.ok ? r.json() : []))
      .then(setProjects)
      .catch(() => setProjects([]));
    fetch("/data/services.json")
      .then(r => (r.ok ? r.json() : []))
      .then(setServices)
      .catch(() => setServices([]));
    fetch("/data/systems.json")
      .then(r => (r.ok ? r.json() : []))
      .then(setSystems)
      .catch(() => setSystems([]));
    fetch("/data/config.json")
      .then(r => r.json())
      .then(d => setGrowthRate(d.growthRate))
      .catch(() => {});
  }, []);

  // Calculate stats from real data
  const projectsDelivered = projects.length;
  const satisfactionRate = testimonials.length > 0
    ? Math.round(testimonials.reduce((sum, r) => sum + r.rating, 0) / testimonials.length / 5 * 100) + "%"
    : "0%";

  const statsLabels = t(lang, "home.stats");

  return (
    <div dir={lang === "ar" ? "rtl" : "ltr"}>

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section style={{
        minHeight: "100vh",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "120px 24px 80px",
        textAlign: "center",
        position: "relative",
      }}>
        {/* Glow */}
        <div style={{
          position: "absolute", width: 700, height: 700, borderRadius: "50%",
          background: "radial-gradient(circle,rgba(108,99,255,.13) 0%,transparent 70%)",
          top: "50%", left: "50%", transform: "translate(-50%,-50%)", pointerEvents: "none",
        }}/>

        {/* Badge */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: C.accentDim, border: `1px solid rgba(108,99,255,.3)`,
          borderRadius: 20, padding: "5px 16px", marginBottom: 32,
          fontSize: 13, color: C.accentLight,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.accent, animation: "pulse 2s infinite", display: "inline-block" }}/>
          {t(lang, "home.agencyBadge")}
        </div>

        {/* Headline */}
        <h1 style={{
          fontFamily: "Syne, sans-serif", fontWeight: 800,
          fontSize: "clamp(36px,5.5vw,72px)", lineHeight: 1.1,
          color: "#fff", marginBottom: 24, maxWidth: 860,
        }}>
          {t(lang, "home.heroTitle")}
        </h1>

        <p style={{ fontSize: 18, color: C.muted, maxWidth: 600, lineHeight: 1.8, marginBottom: 48 }}>
          {t(lang, "home.heroDesc")}
        </p>

        {/* CTAs */}
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center" }}>
          <button onClick={() => go("request")} style={styles.btnPrimary}>{t(lang, "home.ctaRequest")}</button>
          <button onClick={() => go("estimator")} style={styles.btnOutline}>{t(lang, "home.ctaEstimate")}</button>
          <button onClick={() => go("projects")} style={styles.btnGhost}>{t(lang, "home.ctaProjects")}</button>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: 48, marginTop: 72, flexWrap: "wrap", justifyContent: "center" }}>
          {statsLabels.map((label, i) => {
            const values = [`${projectsDelivered}+`, satisfactionRate, growthRate];
            return (
              <div key={label} style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 38, color: "#fff" }}>{values[i]}</div>
                <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>{label}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── SERVICES ──────────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 100px" }}>
        <SectionHeader label={t(lang, "home.servicesTitle")} title={t(lang, "home.servicesSubtitle")}/>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 18 }}>
          {services.map(s => (
            <Card key={s.key} style={{ padding: 28 }}>
              <div style={{ fontSize: 34, marginBottom: 16 }}>{s.icon}</div>
              <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 17, color: "#fff", marginBottom: 8 }}>{s.name[lang] || s.name.ar}</div>
              <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.7 }}>{s.desc[lang] || s.desc.ar}</div>
            </Card>
          ))}
        </div>
      </section>

      {/* ── SYSTEMS WE BUILD ──────────────────────────────────────────────── */}
      {systems.length > 0 && (
        <section style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 100px" }}>
          <SectionHeader
            label={t(lang, "home.systemsTitle")}
            title={t(lang, "home.systemsSubtitle")}
            sub={t(lang, "home.systemsDesc")}
          />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 18 }}>
            {systems.map(s => (
              <Card key={s.key} style={{ padding: 26, borderTop: `3px solid ${C.accent}` }}>
                <div style={{ fontSize: 30, marginBottom: 14 }}>{s.icon}</div>
                <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 16, color: "#fff", marginBottom: 8 }}>{s.name[lang] || s.name.ar}</div>
                <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.7 }}>{s.desc[lang] || s.desc.ar}</div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* ── TESTIMONIALS ─────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 100px" }}>
        <SectionHeader label={t(lang, "home.reviewsTitle")} title={t(lang, "home.reviewsSubtitle")}/>

        {testimonials.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 20, marginBottom: 32 }}>
            {testimonials.map(r => (
              <Card key={r.id} style={{ padding: 28 }}>
                <div style={{ color: C.accent, marginBottom: 10 }}>{"★★★★★".slice(0, r.rating)}</div>
                <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.8, marginBottom: 20, fontStyle: "italic" }}>
                  "{r.text}"
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: "50%", background: C.accentDim, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>💬</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{r.name}</div>
                    {r.project && <div style={{ fontSize: 12, color: C.muted }}>{r.project}</div>}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        <TestimonialForm lang={lang} onSubmitted={loadTestimonials} />
      </section>

    </div>
  );
}

// ── LEAVE A REVIEW ────────────────────────────────────────────────────────────
function TestimonialForm({ lang, onSubmitted }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [project, setProject] = useState("");
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!name.trim() || !text.trim()) {
      setError(t(lang, "auth.required"));
      return;
    }
    setSending(true);
    setError("");
    try {
      await api("/testimonials", { method: "POST", auth: false, body: { name, project, rating, text } });
      setDone(true);
      onSubmitted();
    } catch (err) {
      setError(err.status ? err.message : t(lang, "auth.connectionError"));
    } finally {
      setSending(false);
    }
  };

  if (!open) {
    return (
      <div style={{ textAlign: "center" }}>
        <Btn variant="outline" onClick={() => setOpen(true)}>{t(lang, "home.leaveReview")}</Btn>
      </div>
    );
  }

  return (
    <Card style={{ padding: 28, maxWidth: 520, margin: "0 auto" }}>
      {done ? (
        <div style={{ textAlign: "center", color: C.muted, fontSize: 14, lineHeight: 1.8 }}>{t(lang, "home.reviewThanks")}</div>
      ) : (
        <>
          <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 17, color: "#fff", marginBottom: 18 }}>{t(lang, "home.leaveReview")}</div>
          <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
            <input placeholder={t(lang, "request.contactName")} value={name} onChange={(e) => setName(e.target.value)} style={reviewInputStyle} />
            <input placeholder={t(lang, "home.reviewProject")} value={project} onChange={(e) => setProject(e.target.value)} style={reviewInputStyle} />
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setRating(n)} style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 24, color: n <= rating ? C.accent : C.border }}>★</button>
            ))}
          </div>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} placeholder={t(lang, "home.reviewTextPlaceholder")} style={{ ...reviewInputStyle, width: "100%", resize: "vertical", marginBottom: 14 }} />
          {error && <div style={{ color: "#F87171", fontSize: 13, marginBottom: 12 }}>{error}</div>}
          <div style={{ display: "flex", gap: 10 }}>
            <Btn onClick={submit} style={{ opacity: sending ? 0.6 : 1 }}>{sending ? "..." : t(lang, "request.send")}</Btn>
            <Btn variant="outline" onClick={() => setOpen(false)}>{t(lang, "dashboard.orderForm.cancel")}</Btn>
          </div>
        </>
      )}
    </Card>
  );
}

const reviewInputStyle = {
  flex: 1, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10,
  padding: "11px 14px", color: C.text, fontSize: 14, outline: "none", fontFamily: "Inter, sans-serif",
};

// ── inline styles لأزرار الـ Hero فقط ────────────────────────────────────────
const styles = {
  btnPrimary: {
    background: C.accent, color: "#fff", border: "none", borderRadius: 12,
    padding: "16px 32px", fontSize: 16, fontWeight: 700, cursor: "pointer",
    boxShadow: "0 0 40px rgba(108,99,255,.35)", fontFamily: "Inter, sans-serif",
  },
  btnOutline: {
    background: "transparent", color: C.text, border: `1px solid ${C.border}`,
    borderRadius: 12, padding: "16px 28px", fontSize: 15, fontWeight: 600,
    cursor: "pointer", fontFamily: "Inter, sans-serif",
  },
  btnGhost: {
    background: "transparent", color: C.muted, border: `1px solid ${C.border}`,
    borderRadius: 12, padding: "16px 28px", fontSize: 15, fontWeight: 500,
    cursor: "pointer", fontFamily: "Inter, sans-serif",
  },
};
