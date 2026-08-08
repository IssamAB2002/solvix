// ─── PROJECT DETAILS PAGE ────────────────────────────────────────────────────
// Public page for a single portfolio project: auto-rotating image carousel,
// tech stack, full description and the problem/solution story.

import { useState, useEffect, useRef } from "react";
import C from "../styles/colors";
import { Card, Btn, Spinner } from "../components/UI";
import MarkdownLite from "../components/Markdown";
import { t } from "../i18n";
import { api } from "../api";
import { API_BASE } from "../config";
import { pickText } from "../utils/projectText";

const AUTOPLAY_MS = 3500;

export default function ProjectDetails({ slug, go, lang }) {
  const [project, setProject] = useState(null);
  const [metaLoading, setMetaLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setMetaLoading(true);
    setNotFound(false);
    api(`/portfolio/${slug}`, { auth: false })
      .then((data) => setProject(data.project))
      .catch(() => setNotFound(true))
      .finally(() => setMetaLoading(false));
  }, [slug]);

  const text = pickText(project, lang);

  return (
    <div dir={lang === "ar" ? "rtl" : "ltr"} style={{ maxWidth: 900, margin: "0 auto", padding: "110px 24px 80px" }}>
      <button
        onClick={() => go("projects")}
        style={{ background: "none", border: "none", color: C.accent, fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 24, padding: 0, fontFamily: "Inter, sans-serif" }}
      >
        {t(lang, "projects.back")}
      </button>

      {metaLoading && (
        <Card style={{ padding: 40, display: "flex", justifyContent: "center" }}>
          <Spinner />
        </Card>
      )}

      {!metaLoading && (notFound || !project) && (
        <Card style={{ padding: 40, color: C.muted, textAlign: "center" }}>{t(lang, "projects.notFound")}</Card>
      )}

      {!metaLoading && project && (
        <>
          <Carousel slug={slug} imageCount={project.imageCount || 0} />

          <h1 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "clamp(26px,3vw,38px)", color: "#fff", marginTop: 28, marginBottom: 14 }}>
            {project.title}
          </h1>

          {project.stack?.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 24 }}>
              {project.stack.map((tag) => (
                <span key={tag} style={{ background: C.accentDim, color: C.accentLight, borderRadius: 6, padding: "4px 12px", fontSize: 12, fontWeight: 600 }}>
                  {tag}
                </span>
              ))}
            </div>
          )}

          {text.description && (
            <Card style={{ padding: 24, marginBottom: 20 }}>
              <div style={{ color: C.text, fontSize: 15 }}><MarkdownLite text={text.description} /></div>
            </Card>
          )}

          {(text.problem || text.solution) && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 16, marginBottom: 32 }}>
              {text.problem && (
                <Card style={{ padding: 22, borderColor: "rgba(239,68,68,.25)" }}>
                  <div style={{ fontSize: 12, color: "#EF4444", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>
                    🔴 {t(lang, "projects.problem")}
                  </div>
                  <div style={{ fontSize: 14, color: C.text, lineHeight: 1.8, whiteSpace: "pre-line" }}>{text.problem}</div>
                </Card>
              )}
              {text.solution && (
                <Card style={{ padding: 22, borderColor: "rgba(34,197,94,.25)" }}>
                  <div style={{ fontSize: 12, color: C.green, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>
                    🟢 {t(lang, "projects.solution")}
                  </div>
                  <div style={{ fontSize: 14, color: C.text, lineHeight: 1.8, whiteSpace: "pre-line" }}>{text.solution}</div>
                </Card>
              )}
            </div>
          )}

          <div style={{ textAlign: "center" }}>
            <Btn onClick={() => go("request")} style={{ padding: "14px 36px", fontSize: 15 }}>
              {t(lang, "projects.ctaStart")}
            </Btn>
          </div>
        </>
      )}
    </div>
  );
}

// Images are preloaded one at a time (serial loading) instead of all at once —
// AI-generated portfolio images are large, so this gets the first slide on
// screen fast instead of blocking on the whole set. Each URL is a real,
// immutably-cacheable request (GET /portfolio/:slug/images/:index), not a
// bundled base64 payload.
function Carousel({ slug, imageCount = 0 }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const [loadedCount, setLoadedCount] = useState(0);
  const timerRef = useRef(null);

  const images = Array.from({ length: imageCount }, (_, i) => `${API_BASE}/api/portfolio/${slug}/images/${i}`);

  useEffect(() => {
    setIndex(0);
    setLoadedCount(0);
  }, [slug, imageCount]);

  // Preload images[loadedCount] one at a time; each successful (or failed) load
  // advances loadedCount, which re-runs this effect for the next index.
  useEffect(() => {
    if (loadedCount >= imageCount) return undefined;
    let cancelled = false;
    const img = new Image();
    const advance = () => { if (!cancelled) setLoadedCount((n) => n + 1); };
    img.onload = advance;
    img.onerror = advance; // skip a broken image rather than stalling the whole sequence
    img.src = images[loadedCount];
    return () => { cancelled = true; };
  }, [slug, imageCount, loadedCount]);

  useEffect(() => {
    if (paused || loadedCount <= 1) return undefined;
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % loadedCount);
    }, AUTOPLAY_MS);
    return () => clearInterval(timerRef.current);
  }, [paused, loadedCount]);

  if (loadedCount === 0) {
    return (
      <div style={{
        height: 360, borderRadius: 18, background: `linear-gradient(135deg, ${C.accentDim}, ${C.surface})`,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 64,
      }}>
        {imageCount > 0 ? <Spinner /> : "🖼️"}
      </div>
    );
  }

  const loaded = images.slice(0, loadedCount);
  const go = (dir) => setIndex((i) => (i + dir + loaded.length) % loaded.length);

  return (
    <div
      style={{ position: "relative", borderRadius: 18, overflow: "hidden", background: C.surface, border: `1px solid ${C.border}` }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div style={{ height: "clamp(220px, 55vw, 420px)", position: "relative", cursor: "zoom-in" }} onClick={() => setLightbox(true)}>
        {loaded.map((src, i) => (
          <img
            key={i}
            src={src}
            alt=""
            style={{
              position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover",
              opacity: i === index ? 1 : 0, transition: "opacity .5s ease",
            }}
          />
        ))}
        {loadedCount < imageCount && (
          <div style={{ position: "absolute", bottom: 14, insetInlineStart: 14, background: "rgba(10,10,15,.6)", border: `1px solid ${C.border}`, borderRadius: 20, padding: "4px 10px", fontSize: 11, color: C.muted }}>
            {loadedCount + 1}/{imageCount}
          </div>
        )}
      </div>

      {loaded.length > 1 && (
        <>
          <button onClick={() => go(-1)} aria-label="Previous"
            style={{ position: "absolute", top: "50%", left: 14, transform: "translateY(-50%)", width: 38, height: 38, borderRadius: "50%", background: "rgba(10,10,15,.6)", border: `1px solid ${C.border}`, color: "#fff", fontSize: 16, cursor: "pointer" }}>
            ‹
          </button>
          <button onClick={() => go(1)} aria-label="Next"
            style={{ position: "absolute", top: "50%", right: 14, transform: "translateY(-50%)", width: 38, height: 38, borderRadius: "50%", background: "rgba(10,10,15,.6)", border: `1px solid ${C.border}`, color: "#fff", fontSize: 16, cursor: "pointer" }}>
            ›
          </button>

          <div style={{ position: "absolute", bottom: 14, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 8 }}>
            {loaded.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                aria-label={`Go to slide ${i + 1}`}
                style={{
                  width: i === index ? 20 : 8, height: 8, borderRadius: 4,
                  background: i === index ? C.accent : "rgba(255,255,255,.4)",
                  border: "none", cursor: "pointer", transition: "all .25s",
                }}
              />
            ))}
          </div>
        </>
      )}

      {lightbox && (
        <Lightbox images={loaded} index={index} onNav={go} onClose={() => setLightbox(false)} />
      )}
    </div>
  );
}

function Lightbox({ images, index, onNav, onClose }) {
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.9)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={onClose}
    >
      <button onClick={onClose} aria-label="Close"
        style={{ position: "absolute", top: 20, right: 20, width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,.1)", border: `1px solid ${C.border}`, color: "#fff", fontSize: 18, cursor: "pointer" }}>
        ✕
      </button>

      <img
        src={images[index]}
        alt=""
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "90vw", maxHeight: "90vh", objectFit: "contain", borderRadius: 8 }}
      />

      {images.length > 1 && (
        <>
          <button onClick={(e) => { e.stopPropagation(); onNav(-1); }} aria-label="Previous"
            style={{ position: "absolute", top: "50%", left: 20, transform: "translateY(-50%)", width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,.1)", border: `1px solid ${C.border}`, color: "#fff", fontSize: 20, cursor: "pointer" }}>
            ‹
          </button>
          <button onClick={(e) => { e.stopPropagation(); onNav(1); }} aria-label="Next"
            style={{ position: "absolute", top: "50%", right: 20, transform: "translateY(-50%)", width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,.1)", border: `1px solid ${C.border}`, color: "#fff", fontSize: 20, cursor: "pointer" }}>
            ›
          </button>
        </>
      )}
    </div>
  );
}
