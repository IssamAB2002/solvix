// ─── PROJECTS PAGE (public "our work" showcase, managed from the admin panel) ─

import { useState, useEffect } from "react";
import C from "../styles/colors";
import { Card, Btn, SectionHeader } from "../components/UI";
import { t } from "../i18n";
import { api } from "../api";

export default function Projects({ go, lang, onSelectProject }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("/portfolio", { auth: false })
      .then((data) => setProjects(data.projects || []))
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div dir={lang === "ar" ? "rtl" : "ltr"} style={{ maxWidth: 1100, margin: "0 auto", padding: "110px 24px 80px" }}>

      <SectionHeader
        label={t(lang, "projects.title")}
        title={t(lang, "projects.subtitle")}
        sub={t(lang, "projects.subtitle")}
      />

      {!loading && projects.length === 0 && (
        <Card style={{ padding: 32, color: C.muted, fontSize: 14, textAlign: "center" }}>{t(lang, "projects.empty")}</Card>
      )}

      <div className="projects-grid">
        {projects.map((project) => (
          <Card
            key={project.slug}
            style={{ overflow: "hidden", cursor: "pointer" }}
            onClick={() => onSelectProject(project.slug)}
          >
            <div style={{
              height: 180,
              background: project.cover ? `url(${project.cover}) center/cover` : `linear-gradient(135deg, ${C.accentDim}, ${C.surface})`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 56,
            }}>
              {!project.cover && "🖼️"}
            </div>

            <div style={{ padding: 24 }}>
              <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 18, color: "#fff", marginBottom: 8 }}>{project.title}</div>
              {project.description && (
                <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.7, marginBottom: 16, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {project.description}
                </div>
              )}

              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 18 }}>
                {(project.stack || []).slice(0, 5).map((tag) => (
                  <span key={tag} style={{ background: C.accentDim, color: C.accentLight, borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 600 }}>
                    {tag}
                  </span>
                ))}
              </div>

              <Btn variant="outline" onClick={(e) => { e.stopPropagation(); onSelectProject(project.slug); }} style={{ width: "100%", justifyContent: "center" }}>
                {t(lang, "projects.viewDetails")}
              </Btn>
            </div>
          </Card>
        ))}
      </div>

      <div style={{ textAlign: "center", marginTop: 48 }}>
        <Btn onClick={() => go("request")} style={{ padding: "14px 36px", fontSize: 15 }}>
          {t(lang, "projects.ctaStart")}
        </Btn>
      </div>
    </div>
  );
}
