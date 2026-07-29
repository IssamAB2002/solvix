// ─── PROJECT TEXT HELPER ─────────────────────────────────────────────────────
// يعيد نص المشروع باللغة المطلوبة، مع رجوع للنص الأصلي عند غياب الترجمة

export function pickText(project, lang) {
  const fallback = {
    description: project?.description || "",
    problem: project?.problem || "",
    solution: project?.solution || "",
  };
  const translated = project?.translations?.[lang];
  if (!translated) return fallback;
  return {
    description: translated.description || fallback.description,
    problem: translated.problem || fallback.problem,
    solution: translated.solution || fallback.solution,
  };
}
