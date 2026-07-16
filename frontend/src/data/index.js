// ─── STATIC DATA ─────────────────────────────────────────────────────────────
// كل البيانات الثابتة في مكان واحد — سهل التعديل لاحقاً
// (بيانات لوحة التحكم أصبحت حقيقية من الـ API — انظر dashboard/Dashboard.jsx)

// ── خطوات المُقدِّر ───────────────────────────────────────────────────────────
export const EST_STEPS = [
  { key: "type", opts: [
      { i: "🌐", value: "web" },
      { i: "📱", value: "mobile" },
      { i: "🖥️", value: "desktop" },
      { i: "🤖", value: "ai" },
    ] },
  { key: "goal", opts: [
      { i: "📈", value: "sales" },
      { i: "⚡", value: "automation" },
      { i: "👥", value: "customers" },
      { i: "🚀", value: "startup" },
    ] },
  { key: "budget", opts: [
      { i: "💵", value: "low" },
      { i: "💰", value: "mid" },
      { i: "💎", value: "high" },
      { i: "🏆", value: "enterprise" },
    ] },
];

// أسعار البداية المعتمدة (بدون مطوّرين إضافيين) — لكل نوع مشروع وبالعملتين
// web: موقع بسيط (منتجات وصور وجلب عملاء) · mobile: تطبيق بسيط مرتبط بالموقع أو Firebase
// ai: أتمتة حسب التعقيد · desktop: محلي أو سحابي
export const PRICE_MAP = {
  web:     { dzd: { from: 60000 },            usd: { from: 400 } },
  mobile:  { dzd: { min: 40000, max: 50000 }, usd: { from: 300 } },
  desktop: { dzd: { from: 50000 },            usd: { from: 400 } },
  ai:      { dzd: { from: 70000 },            usd: { from: 500 } },
};

export const CURRENCIES = ["dzd", "usd"];

export const DURATION_MAP = {
  low:        "1–2 weeks",
  mid:        "2–4 weeks",
  high:       "4–8 weeks",
  enterprise: "8–16 weeks",
};

// ── خطوات نموذج الطلب ────────────────────────────────────────────────────────
export const REQ_STEPS = [
  { key: "type", opts: [
      { i: "🌐", value: "web", labelKey: "web", subtitleKey: "web" },
      { i: "📱", value: "mobile", labelKey: "mobile", subtitleKey: "mobile" },
      { i: "🖥️", value: "desktop", labelKey: "desktop", subtitleKey: "desktop" },
      { i: "🤖", value: "ai", labelKey: "ai", subtitleKey: "ai" },
      { i: "🧩", value: "combo", labelKey: "combo", subtitleKey: "combo" },
      { i: "⚙️", value: "system", labelKey: "system", subtitleKey: "system" },
    ] },
  { key: "goal", opts: [
      { i: "📈", value: "sales", labelKey: "sales", subtitleKey: "sales" },
      { i: "⚡", value: "automation", labelKey: "automation", subtitleKey: "automation" },
      { i: "👥", value: "customers", labelKey: "customers", subtitleKey: "customers" },
      { i: "🚀", value: "startup", labelKey: "startup", subtitleKey: "startup" },
    ] },
  { key: "budget", opts: [
      { i: "💵", value: "low", labelKey: "low", subtitleKey: "" },
      { i: "💰", value: "mid", labelKey: "mid", subtitleKey: "" },
      { i: "💎", value: "high", labelKey: "high", subtitleKey: "" },
      { i: "🏆", value: "enterprise", labelKey: "enterprise", subtitleKey: "enterprise" },
    ] },
];

// ── مراحل تنفيذ المشروع (تُستخدم في لوحة الإدارة وصفحة التتبع) ────────────────
export const ORDER_STAGES = ["analysis", "design", "development", "testing", "deployment"];
