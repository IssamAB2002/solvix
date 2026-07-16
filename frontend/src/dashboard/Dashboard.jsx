// ─── ADMIN DASHBOARD (/admin) ────────────────────────────────────────────────
// CEO & developers only. All tabs are wired to the backend API:
// orders (with UID + one-time private key), CRM, payments, revenue, kanban, leads.

import { useState, useEffect, useCallback } from "react";
import C from "../styles/colors";
import { Card, Badge, Btn } from "../components/UI";
import { t } from "../i18n";
import { api } from "../api";
import { ORDER_STAGES } from "../data";

const SIDEBAR_ITEMS = [
  { id: "overview", icon: "🏠" },
  { id: "projects", icon: "📊" },
  { id: "requests", icon: "📥" },
  { id: "clients",  icon: "👥" },
  { id: "invoices", icon: "🧾" },
  { id: "revenue",  icon: "💰" },
  { id: "kanban",   icon: "📋" },
  { id: "portfolio", icon: "🖼️" },
  { id: "testimonials", icon: "🌟" },
  { id: "messages", icon: "💬" },
];

const STAGE_COLORS = { analysis: "#22C55E", design: "#6C63FF", development: "#F59E0B", testing: "#38BDF8", deployment: "#22C55E", delivered: "#FBBF24" };
const PRIORITY_COLORS = { high: "#EF4444", mid: "#F59E0B", low: "#22C55E" };

function fmtMoney(value, lang) {
  const n = Number(value) || 0;
  return `${n.toLocaleString(lang === "ar" ? "ar-DZ" : "en-US")} ${t(lang, "dashboard.currency")}`;
}

function parseDate(value) {
  if (!value) return null;
  const d = new Date(typeof value === "string" ? value.replace(" ", "T") : value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function fmtDate(value) {
  const d = parseDate(value);
  return d ? d.toISOString().slice(0, 10) : "";
}

const remainingOf = (o) => Math.max(0, (Number(o.totalBudget) || 0) - (Number(o.amountPaid) || 0));

export default function Dashboard({ user, lang, setLang, onLogout }) {
  const [tab, setTab] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [orders, setOrders] = useState([]);
  const [requests, setRequests] = useState([]);
  const [payments, setPayments] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const reload = useCallback(async () => {
    try {
      const [o, r, p, k, pf, tm] = await Promise.all([
        api("/orders"), api("/requests"), api("/payments"), api("/tasks"), api("/portfolio"), api("/testimonials?all=1"),
      ]);
      setOrders(o.orders);
      setRequests(r.requests);
      setPayments(p.payments);
      setTasks(k.tasks);
      setPortfolio(pf.projects);
      setTestimonials(tm.testimonials);
      setLoadError("");
    } catch (err) {
      if (err.status === 401 || err.status === 403) return onLogout();
      setLoadError(err.status ? err.message : t(lang, "auth.connectionError"));
    } finally {
      setLoading(false);
    }
  }, [lang, onLogout]);

  useEffect(() => { reload(); }, [reload]);

  const shared = { lang, orders, requests, payments, tasks, portfolio, testimonials, reload };

  return (
    <div dir={lang === "ar" ? "rtl" : "ltr"} className="admin-shell" style={{ display: "grid", gridTemplateColumns: "220px 1fr", minHeight: "100vh" }}>

      <div className={`admin-sidebar-backdrop${sidebarOpen ? " open" : ""}`} onClick={() => setSidebarOpen(false)} />

      {/* ── SIDEBAR ─────────────────────────────────────────────────────── */}
      <aside className={`admin-sidebar${sidebarOpen ? " open" : ""}`} style={{ background: C.surface, borderLeft: `1px solid ${C.border}`, padding: "24px 0", position: "sticky", top: 0, height: "100vh", overflowY: "auto", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 18, color: "#fff", padding: "0 20px 28px" }}>
          <img src="/logo.png" alt="Solvix" style={{ width: 30, height: 30, borderRadius: 7, objectFit: "contain" }} />
          <span style={{ color: "#fff" }}>SOLVIX</span>
        </div>

        <div style={{ flex: 1 }}>
          {SIDEBAR_ITEMS.map((s) => {
            const disabled = s.id === "messages"; // معطّل حالياً — سيعود مع الذكاء الاصطناعي
            const pendingCount = requests.filter((r) => (r.status || "pending") === "pending").length;
            const pendingTestimonials = testimonials.filter((r) => (r.status || "pending") === "pending").length;
            return (
              <button key={s.id} onClick={() => { if (!disabled) { setTab(s.id); setSidebarOpen(false); } }} disabled={disabled}
                style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "11px 20px",
                         background: tab === s.id ? C.accentDim : "transparent",
                         border: "none", color: tab === s.id ? "#fff" : C.muted,
                         fontSize: 14, fontWeight: 500, cursor: disabled ? "not-allowed" : "pointer",
                         opacity: disabled ? 0.45 : 1,
                         fontFamily: "Inter, sans-serif", textAlign: lang === "ar" ? "right" : "left", transition: "all .15s" }}>
                <span style={{ fontSize: 16 }}>{s.icon}</span>
                {t(lang, `dashboard.${s.id}`)}
                {s.id === "requests" && pendingCount > 0 && (
                  <span style={{ background: C.accent, color: "#fff", borderRadius: 10, fontSize: 11, padding: "1px 8px", marginInlineStart: "auto" }}>{pendingCount}</span>
                )}
                {s.id === "testimonials" && pendingTestimonials > 0 && (
                  <span style={{ background: C.accent, color: "#fff", borderRadius: 10, fontSize: 11, padding: "1px 8px", marginInlineStart: "auto" }}>{pendingTestimonials}</span>
                )}
                {disabled && (
                  <span style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.dim, borderRadius: 10, fontSize: 10, padding: "1px 8px", marginInlineStart: "auto" }}>{t(lang, "dashboard.comingSoon")}</span>
                )}
              </button>
            );
          })}
        </div>

        <div style={{ padding: "16px 20px 0", borderTop: `1px solid ${C.border}`, display: "grid", gap: 10 }}>
          <div style={{ fontSize: 13, color: "#fff", fontWeight: 600 }}>{user?.name}</div>
          <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: 1 }}>{t(lang, `dashboard.roles.${user?.role}`)}</div>
          <div style={{ display: "flex", gap: 8 }}>
            {["ar", "en", "fr"].map((code) => (
              <button key={code} onClick={() => setLang(code)}
                style={{ background: lang === code ? C.accentDim : "transparent", border: `1px solid ${C.border}`, borderRadius: 7, padding: "4px 9px", fontSize: 12, color: lang === code ? "#fff" : C.muted, cursor: "pointer" }}>
                {code.toUpperCase()}
              </button>
            ))}
          </div>
          <a href="/" style={{ fontSize: 13, color: C.muted, textDecoration: "none", padding: "4px 0" }}>{t(lang, "dashboard.viewSite")}</a>
          <button onClick={onLogout}
            style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", color: C.muted, fontSize: 13, cursor: "pointer", fontFamily: "Inter, sans-serif", marginBottom: 8 }}>
            {t(lang, "nav.logout")}
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ────────────────────────────────────────────────── */}
      <main style={{ background: C.bg, padding: 36, overflowY: "auto" }}>
        <button className="admin-hamburger" onClick={() => setSidebarOpen((v) => !v)} aria-label="Menu">☰</button>
        {loading ? (
          <div style={{ color: C.muted, padding: 40 }}>{t(lang, "dashboard.loading")}</div>
        ) : loadError ? (
          <div style={{ color: "#F87171", padding: 40 }}>
            {loadError}
            <div style={{ marginTop: 16 }}><Btn onClick={reload}>↻</Btn></div>
          </div>
        ) : (
          <>
            {tab === "overview" && <OverviewTab {...shared} user={user} goTab={setTab} />}
            {tab === "projects" && <ProjectsTab {...shared} />}
            {tab === "requests" && <RequestsTab {...shared} />}
            {tab === "clients"  && <ClientsTab {...shared} />}
            {tab === "invoices" && <InvoicesTab {...shared} />}
            {tab === "revenue"  && <RevenueTab {...shared} />}
            {tab === "kanban"   && <KanbanTab {...shared} />}
            {tab === "portfolio" && <PortfolioTab {...shared} />}
            {tab === "testimonials" && <TestimonialsTab {...shared} />}
            {tab === "messages" && (
              <Card style={{ padding: 28, color: C.muted, fontSize: 14, lineHeight: 1.8 }}>
                💬 {t(lang, "dashboard.messagesDisabled")}
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  );
}

// ── SHARED SMALL PIECES ───────────────────────────────────────────────────────

function DashTitle({ children, action }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
      <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 24, color: "#fff" }}>{children}</div>
      {action}
    </div>
  );
}

function StageBadge({ status, lang }) {
  const label = status === "delivered" ? `✅ ${t(lang, "dashboard.projectStages.delivered")}` : t(lang, `dashboard.projectStages.${status}`);
  return <Badge label={label} color={STAGE_COLORS[status] || C.accent} />;
}

function Th({ children, lang }) {
  return (
    <th style={{ textAlign: lang === "ar" ? "right" : "left", padding: "13px 16px", fontSize: 12, color: C.muted, textTransform: "uppercase", letterSpacing: 1, borderBottom: `1px solid ${C.border}`, fontWeight: 600, whiteSpace: "nowrap" }}>
      {children}
    </th>
  );
}

function Td({ children, style = {} }) {
  return <td style={{ padding: "14px 16px", fontSize: 14, color: C.text, borderBottom: `1px solid ${C.border}`, ...style }}>{children}</td>;
}

const inputStyle = {
  background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10,
  padding: "10px 13px", color: C.text, fontSize: 14, outline: "none",
  fontFamily: "Inter, sans-serif", width: "100%",
};

// ── OVERVIEW ──────────────────────────────────────────────────────────────────
function OverviewTab({ lang, orders, requests, user, goTab }) {
  const active = orders.filter((o) => o.status !== "delivered");
  const delivered = orders.filter((o) => o.status === "delivered");
  const openBalances = orders.filter((o) => remainingOf(o) > 0);
  const metricLabels = t(lang, "dashboard.metrics");
  const metrics = [
    ["🟢", metricLabels[0], active.length],
    ["✅", metricLabels[1], delivered.length],
    ["📥", metricLabels[2], requests.length],
    ["🧾", metricLabels[3], openBalances.length],
  ];
  const latest = active[0] || orders[0];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 36, flexWrap: "wrap", gap: 20 }}>
        <div>
          <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 26, color: "#fff" }}>{t(lang, "dashboard.welcome").replace("{name}", user?.name || "")}</div>
          <div style={{ color: C.muted, fontSize: 14, marginTop: 4 }}>{t(lang, "dashboard.overviewSubtitle").replace("{count}", active.length)}</div>
        </div>
        <Btn onClick={() => goTab("projects")}>{t(lang, "dashboard.newOrder")}</Btn>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 16, marginBottom: 28 }}>
        {metrics.map(([icon, label, value]) => (
          <Card key={label} style={{ padding: 22 }}>
            <div style={{ fontSize: 12, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>{icon} {label}</div>
            <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 30, color: "#fff" }}>{value}</div>
          </Card>
        ))}
      </div>

      {latest ? (
        <Card style={{ padding: 28 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 14 }}>
            <div>
              <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 17, color: "#fff" }}>{latest.projectType} — {latest.clientName}</div>
              <div style={{ fontSize: 13, color: C.muted, marginTop: 4, direction: "ltr", textAlign: lang === "ar" ? "right" : "left" }}>{latest.uid}</div>
            </div>
            <StageBadge status={latest.status} lang={lang} />
          </div>
          {ORDER_STAGES.map((stage, i) => {
            const currentIdx = latest.status === "delivered" ? ORDER_STAGES.length : ORDER_STAGES.indexOf(latest.status);
            const pct = i < currentIdx ? 100 : i === currentIdx ? latest.progressPct : 0;
            return (
              <div key={stage} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: pct > 0 ? STAGE_COLORS[stage] : C.border, flexShrink: 0 }} />
                <div style={{ fontSize: 13, color: C.muted, width: 130, flexShrink: 0 }}>{t(lang, `dashboard.projectStages.${stage}`)}</div>
                <div style={{ flex: 1, height: 8, background: C.border, borderRadius: 4 }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: STAGE_COLORS[stage], borderRadius: 4, transition: "width .6s" }} />
                </div>
                <div style={{ fontSize: 13, color: C.muted, width: 40, textAlign: lang === "ar" ? "left" : "right" }}>{pct}%</div>
              </div>
            );
          })}
        </Card>
      ) : (
        <Card style={{ padding: 28, color: C.muted, fontSize: 14 }}>{t(lang, "dashboard.noOrders")}</Card>
      )}
    </div>
  );
}

// ── PROJECTS (ORDERS) ─────────────────────────────────────────────────────────
function ProjectsTab({ lang, orders, reload }) {
  const [showForm, setShowForm] = useState(false);
  const [created, setCreated] = useState(null); // { order, privateKey }
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filtered = orders.filter((o) => {
    const q = search.trim().toLowerCase();
    if (q && !`${o.clientName} ${o.projectType} ${o.uid}`.toLowerCase().includes(q)) return false;
    if (statusFilter && o.status !== statusFilter) return false;
    const created = fmtDate(o.createdAt);
    if (dateFrom && created < dateFrom) return false;
    if (dateTo && created > dateTo) return false;
    return true;
  });

  return (
    <div>
      <DashTitle action={<Btn onClick={() => setShowForm((v) => !v)}>{showForm ? t(lang, "dashboard.orderForm.cancel") : t(lang, "dashboard.newOrder")}</Btn>}>
        {t(lang, "dashboard.projects")}
      </DashTitle>

      {showForm && (
        <OrderForm lang={lang} onCreated={(data) => { setShowForm(false); setCreated(data); reload(); }} />
      )}

      {created && <KeyModal lang={lang} data={created} onClose={() => setCreated(null)} />}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
        <input placeholder={t(lang, "dashboard.projectsFilter.search")} value={search} onChange={(e) => setSearch(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 200 }} />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ ...inputStyle, width: "auto" }}>
          <option value="">{t(lang, "dashboard.projectsFilter.statusAll")}</option>
          {ORDER_STAGES.map((s) => <option key={s} value={s}>{t(lang, `dashboard.projectStages.${s}`)}</option>)}
          <option value="delivered">{t(lang, "dashboard.projectStages.delivered")}</option>
        </select>
        {/* Date pickers are locked to English formatting regardless of site language */}
        <input type="date" lang="en-US" dir="ltr" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ ...inputStyle, width: "auto" }} />
        <input type="date" lang="en-US" dir="ltr" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ ...inputStyle, width: "auto" }} />
      </div>

      {orders.length === 0 && !showForm && (
        <Card style={{ padding: 28, color: C.muted, fontSize: 14 }}>{t(lang, "dashboard.noOrders")}</Card>
      )}

      {orders.length > 0 && filtered.length === 0 && (
        <Card style={{ padding: 28, color: C.muted, fontSize: 14 }}>{t(lang, "dashboard.projectsFilter.empty")}</Card>
      )}

      {filtered.map((order) => (
        <OrderCard key={order.id} order={order} lang={lang} reload={reload} />
      ))}
    </div>
  );
}

const PROJECT_TYPE_CHIPS = ["web", "mobile", "desktop", "ai"];

function OrderForm({ lang, onCreated }) {
  const [form, setForm] = useState({ clientName: "", clientPhone: "", clientEmail: "", projectType: "", description: "", totalBudget: "" });
  const [features, setFeatures] = useState([{ name: "", price: "" }]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const setFeature = (i, key) => (e) => setFeatures((fs) => fs.map((f, j) => (j === i ? { ...f, [key]: e.target.value } : f)));

  const addChip = (key) => {
    const label = t(lang, `dashboard.typeChips.${key}`);
    setForm((f) => ({ ...f, projectType: f.projectType ? `${f.projectType} + ${label}` : label }));
  };

  const submit = async () => {
    if (!form.clientName.trim() || !form.projectType.trim()) {
      setError(t(lang, "dashboard.orderForm.requiredError"));
      return;
    }
    setSaving(true);
    setError("");
    try {
      const data = await api("/orders", {
        method: "POST",
        body: {
          ...form,
          totalBudget: Number(form.totalBudget) || 0,
          features: features.filter((f) => f.name.trim()).map((f) => ({ name: f.name.trim(), price: Number(f.price) || 0 })),
        },
      });
      onCreated(data);
    } catch (err) {
      setError(err.status ? err.message : t(lang, "auth.connectionError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card style={{ padding: 26, marginBottom: 20, border: `1px solid ${C.accent}55` }}>
      <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 17, color: "#fff", marginBottom: 20 }}>{t(lang, "dashboard.orderForm.title")}</div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14, marginBottom: 14 }}>
        {[
          ["clientName", t(lang, "dashboard.orderForm.clientName")],
          ["clientPhone", t(lang, "dashboard.orderForm.clientPhone")],
          ["clientEmail", t(lang, "dashboard.orderForm.clientEmail")],
          ["totalBudget", t(lang, "dashboard.orderForm.budget")],
        ].map(([key, label]) => (
          <div key={key}>
            <label style={{ fontSize: 13, color: C.muted, display: "block", marginBottom: 6 }}>{label}</label>
            <input type={key === "totalBudget" ? "number" : "text"} value={form[key]} onChange={set(key)} style={inputStyle} />
          </div>
        ))}
      </div>

      <label style={{ fontSize: 13, color: C.muted, display: "block", marginBottom: 6 }}>{t(lang, "dashboard.orderForm.projectType")}</label>
      <input value={form.projectType} onChange={set("projectType")} style={{ ...inputStyle, marginBottom: 8 }} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        {PROJECT_TYPE_CHIPS.map((key) => (
          <button key={key} onClick={() => addChip(key)}
            style={{ background: C.accentDim, border: `1px solid ${C.accent}44`, borderRadius: 16, padding: "4px 13px", fontSize: 12, color: C.accentLight, cursor: "pointer" }}>
            + {t(lang, `dashboard.typeChips.${key}`)}
          </button>
        ))}
      </div>

      <label style={{ fontSize: 13, color: C.muted, display: "block", marginBottom: 6 }}>{t(lang, "dashboard.orderForm.description")}</label>
      <textarea value={form.description} onChange={set("description")} rows={3} style={{ ...inputStyle, resize: "vertical", marginBottom: 18 }} />

      <div style={{ fontSize: 14, fontWeight: 600, color: "#fff", marginBottom: 10 }}>{t(lang, "dashboard.orderForm.features")}</div>
      {features.map((f, i) => (
        <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8 }}>
          <input placeholder={t(lang, "dashboard.orderForm.featureName")} value={f.name} onChange={setFeature(i, "name")} style={{ ...inputStyle, flex: 2 }} />
          <input placeholder={t(lang, "dashboard.orderForm.featurePrice")} type="number" value={f.price} onChange={setFeature(i, "price")} style={{ ...inputStyle, flex: 1 }} />
          <button onClick={() => setFeatures((fs) => fs.filter((_, j) => j !== i))} style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 8, color: C.muted, cursor: "pointer", padding: "0 12px" }}>✕</button>
        </div>
      ))}
      <button onClick={() => setFeatures((fs) => [...fs, { name: "", price: "" }])}
        style={{ background: "transparent", border: `1px dashed ${C.border}`, borderRadius: 8, color: C.muted, cursor: "pointer", padding: "8px 14px", fontSize: 13, marginBottom: 18 }}>
        + {t(lang, "dashboard.orderForm.addFeature")}
      </button>

      {error && <div style={{ color: "#F87171", fontSize: 14, marginBottom: 12 }}>{error}</div>}
      <Btn onClick={submit} style={{ opacity: saving ? 0.6 : 1 }}>{saving ? "..." : t(lang, "dashboard.orderForm.create")}</Btn>
    </Card>
  );
}

function KeyModal({ lang, data, onClose }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${t(lang, "dashboard.keyModal.uid")}: ${data.order.uid}\n${t(lang, "dashboard.keyModal.key")}: ${data.privateKey}`);
      setCopied(true);
    } catch { /* clipboard unavailable */ }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <Card style={{ padding: 32, maxWidth: 520, width: "100%", border: `1px solid ${C.accent}` }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🔑</div>
        <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 22, color: "#fff", marginBottom: 6 }}>{t(lang, "dashboard.keyModal.title")}</div>
        <div style={{ color: C.muted, fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>{t(lang, "dashboard.keyModal.subtitle")}</div>

        {[[t(lang, "dashboard.keyModal.uid"), data.order.uid], [t(lang, "dashboard.keyModal.key"), data.privateKey]].map(([label, value]) => (
          <div key={label} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{label}</div>
            <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px", fontFamily: "monospace", fontSize: 15, color: C.accentLight, direction: "ltr", textAlign: "center", letterSpacing: 1 }}>{value}</div>
          </div>
        ))}

        <div style={{ background: "rgba(245,158,11,.1)", border: "1px solid rgba(245,158,11,.35)", borderRadius: 10, padding: "12px 14px", fontSize: 13, color: C.yellow, lineHeight: 1.7, marginBottom: 20 }}>
          ⚠️ {t(lang, "dashboard.keyModal.warning")}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <Btn onClick={copy}>{copied ? t(lang, "dashboard.keyModal.copied") : t(lang, "dashboard.keyModal.copy")}</Btn>
          <Btn variant="outline" onClick={onClose}>{t(lang, "dashboard.keyModal.done")}</Btn>
        </div>
      </Card>
    </div>
  );
}

function OrderCard({ order, lang, reload }) {
  const [status, setStatus] = useState(order.status);
  const [pct, setPct] = useState(order.progressPct);
  const [expanded, setExpanded] = useState(false);
  const [details, setDetails] = useState(null);
  const [payAmount, setPayAmount] = useState("");
  const [payNote, setPayNote] = useState("");
  const [features, setFeatures] = useState([]);
  const [budgetInput, setBudgetInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const dirty = status !== order.status || Number(pct) !== order.progressPct;

  const act = async (fn) => {
    setBusy(true);
    setError("");
    try { await fn(); } catch (err) { setError(err.status ? err.message : t(lang, "auth.connectionError")); }
    setBusy(false);
  };

  const save = () => act(async () => {
    if (status === "delivered" && order.status !== "delivered" && !window.confirm(t(lang, "dashboard.deliveredConfirm"))) return;
    await api(`/orders/${order.id}`, { method: "PUT", body: { status, progressPct: Number(pct) } });
    await reload();
  });

  const toggleDetails = () => act(async () => {
    if (!expanded) {
      const data = await api(`/orders/${order.id}`);
      setDetails(data.order);
      setFeatures(data.order.features.map((f) => ({ name: f.name, price: f.price, done: !!f.done })));
      setBudgetInput(String(data.order.totalBudget ?? ""));
    }
    setExpanded((v) => !v);
  });

  const featuresTotal = features.reduce((s, f) => s + (Number(f.price) || 0), 0);
  const featuresDirty = expanded && details && (
    JSON.stringify(features) !== JSON.stringify(details.features.map((f) => ({ name: f.name, price: f.price, done: !!f.done })))
    || Number(budgetInput) !== details.totalBudget
  );

  const setFeatureField = (i, key) => (e) => setFeatures((fs) => fs.map((f, j) => (j === i ? { ...f, [key]: e.target.value } : f)));
  const toggleFeatureDone = (i) => setFeatures((fs) => fs.map((f, j) => (j === i ? { ...f, done: !f.done } : f)));
  const removeFeatureRow = (i) => setFeatures((fs) => fs.filter((_, j) => j !== i));
  const addFeatureRow = () => setFeatures((fs) => [...fs, { name: "", price: "", done: false }]);

  const saveFeatures = () => act(async () => {
    const cleaned = features.filter((f) => f.name.trim()).map((f) => ({ name: f.name.trim(), price: Number(f.price) || 0, done: !!f.done }));
    await api(`/orders/${order.id}`, { method: "PUT", body: { features: cleaned, totalBudget: Number(budgetInput) || 0 } });
    const data = await api(`/orders/${order.id}`);
    setDetails(data.order);
    setFeatures(data.order.features.map((f) => ({ name: f.name, price: f.price, done: !!f.done })));
    setBudgetInput(String(data.order.totalBudget ?? ""));
    await reload();
  });

  const addPayment = () => act(async () => {
    await api(`/orders/${order.id}/payments`, { method: "POST", body: { amount: Number(payAmount), note: payNote } });
    setPayAmount(""); setPayNote("");
    const data = await api(`/orders/${order.id}`);
    setDetails(data.order);
    await reload();
  });

  const remove = () => {
    if (!window.confirm(t(lang, "dashboard.deleteOrderConfirm"))) return;
    act(async () => { await api(`/orders/${order.id}`, { method: "DELETE" }); await reload(); });
  };

  return (
    <Card style={{ padding: 24, marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 16, color: "#fff" }}>{order.projectType} — {order.clientName}</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4, direction: "ltr", textAlign: lang === "ar" ? "right" : "left" }}>
            {order.uid} · {fmtDate(order.createdAt)}{order.createdBy && <> · 👤 {order.createdBy}</>}
          </div>
        </div>
        <StageBadge status={order.status} lang={lang} />
      </div>

      <div style={{ height: 8, background: C.border, borderRadius: 4, marginBottom: 8 }}>
        <div style={{ height: "100%", width: `${order.progressPct}%`, background: STAGE_COLORS[order.status] || C.accent, borderRadius: 4 }} />
      </div>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>
        {order.progressPct}% — {fmtMoney(order.amountPaid, lang)} / {fmtMoney(order.totalBudget, lang)}
        {remainingOf(order) > 0 && <span style={{ color: C.yellow }}> · {t(lang, "dashboard.crm.remaining")}: {fmtMoney(remainingOf(order), lang)}</span>}
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ ...inputStyle, width: "auto" }}>
          {ORDER_STAGES.map((s) => <option key={s} value={s}>{t(lang, `dashboard.projectStages.${s}`)}</option>)}
          <option value="delivered">✅ {t(lang, "dashboard.projectStages.delivered")}</option>
        </select>
        <input type="number" min="0" max="100" value={pct} onChange={(e) => setPct(e.target.value)} style={{ ...inputStyle, width: 80 }} />
        <span style={{ color: C.muted, fontSize: 13 }}>%</span>
        {dirty && <Btn onClick={save} style={{ opacity: busy ? 0.6 : 1 }}>{t(lang, "dashboard.save")}</Btn>}
        <Btn variant="outline" onClick={toggleDetails}>{expanded ? t(lang, "dashboard.hideDetails") : t(lang, "dashboard.details")}</Btn>
        <button onClick={remove} style={{ background: "transparent", border: "1px solid rgba(239,68,68,.4)", borderRadius: 10, padding: "10px 16px", color: "#EF4444", fontSize: 13, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
          {t(lang, "dashboard.deleteOrder")}
        </button>
      </div>

      {error && <div style={{ color: "#F87171", fontSize: 13, marginTop: 10 }}>{error}</div>}

      {expanded && details && (
        <div style={{ marginTop: 20, borderTop: `1px solid ${C.border}`, paddingTop: 18 }}>
          {(details.clientPhone || details.clientEmail) && (
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 14 }}>
              👤 {details.clientName} {details.clientPhone && <>· 📞 <span style={{ direction: "ltr", unicodeBidi: "embed" }}>{details.clientPhone}</span></>} {details.clientEmail && <>· ✉️ {details.clientEmail}</>}
            </div>
          )}
          {details.description && <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.7, marginBottom: 16 }}>{details.description}</div>}

          <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 8 }}>{t(lang, "dashboard.featuresTitle")}</div>
          {features.map((f, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
              <button onClick={() => toggleFeatureDone(i)} style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 15 }}>{f.done ? "✅" : "◻️"}</button>
              <input placeholder={t(lang, "dashboard.orderForm.featureName")} value={f.name} onChange={setFeatureField(i, "name")} style={{ ...inputStyle, flex: 2 }} />
              <input placeholder={t(lang, "dashboard.orderForm.featurePrice")} type="number" value={f.price} onChange={setFeatureField(i, "price")} style={{ ...inputStyle, flex: 1 }} />
              <button onClick={() => removeFeatureRow(i)} style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 8, color: C.muted, cursor: "pointer", padding: "0 12px", height: 38 }}>✕</button>
            </div>
          ))}
          <button onClick={addFeatureRow}
            style={{ background: "transparent", border: `1px dashed ${C.border}`, borderRadius: 8, color: C.muted, cursor: "pointer", padding: "8px 14px", fontSize: 13, marginBottom: 12 }}>
            + {t(lang, "dashboard.orderForm.addFeature")}
          </button>

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 14 }}>
            <span style={{ fontSize: 13, color: C.muted }}>{t(lang, "dashboard.orderForm.budget")}:</span>
            <input type="number" value={budgetInput} onChange={(e) => setBudgetInput(e.target.value)} style={{ ...inputStyle, width: 140 }} />
            <MiniBtn onClick={() => setBudgetInput(String(featuresTotal))}>{t(lang, "dashboard.syncBudgetToFeatures")} ({fmtMoney(featuresTotal, lang)})</MiniBtn>
            {featuresDirty && <Btn onClick={saveFeatures} style={{ opacity: busy ? 0.6 : 1 }}>{t(lang, "dashboard.save")}</Btn>}
          </div>

          <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", margin: "16px 0 8px" }}>{t(lang, "dashboard.paymentsTitle")}</div>
          {details.payments.length === 0 && <div style={{ fontSize: 13, color: C.dim }}>—</div>}
          {details.payments.map((p, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "7px 0", borderBottom: `1px solid ${C.border}` }}>
              <span style={{ color: C.muted }}>{fmtDate(p.createdAt)}{p.note ? ` — ${p.note}` : ""}</span>
              <span style={{ color: C.green, fontWeight: 600 }}>{fmtMoney(p.amount, lang)}</span>
            </div>
          ))}

          <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
            <input type="number" placeholder={t(lang, "dashboard.payments.amount")} value={payAmount} onChange={(e) => setPayAmount(e.target.value)} style={{ ...inputStyle, width: 140 }} />
            <input placeholder={t(lang, "dashboard.payments.note")} value={payNote} onChange={(e) => setPayNote(e.target.value)} style={{ ...inputStyle, width: 200 }} />
            <Btn onClick={addPayment} style={{ opacity: busy || !payAmount ? 0.6 : 1 }}>{t(lang, "dashboard.payments.record")}</Btn>
          </div>
        </div>
      )}
    </Card>
  );
}

// ── REQUESTS (LEADS) ──────────────────────────────────────────────────────────
const REQUEST_STATUS_COLORS = { pending: "#F59E0B", approved: "#22C55E", cancelled: "#EF4444" };

function RequestsTab({ lang, requests, reload }) {
  const [approving, setApproving] = useState(null); // request shown in the approve modal
  const [created, setCreated] = useState(null);     // { order, privateKey } after approval
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  const optLabel = (group, value, currency) => {
    if (!value) return "—";
    if (group === "budget" && currency === "dzd") {
      const dzdKey = `request.steps.budget.optionsDzd.${value}`;
      const dzdLabel = t(lang, dzdKey);
      if (dzdLabel !== dzdKey) return dzdLabel;
    }
    const key = `request.steps.${group}.options.${value}.label`;
    const label = t(lang, key);
    return label === key ? value : label;
  };

  const setStatus = async (r, status) => {
    setBusyId(r.id);
    setError("");
    try {
      await api(`/requests/${r.id}`, { method: "PUT", body: { status } });
      await reload();
    } catch (err) {
      setError(err.status ? err.message : t(lang, "auth.connectionError"));
    }
    setBusyId(null);
  };

  const deleteRequest = async (r) => {
    if (!window.confirm(t(lang, "dashboard.deleteRequestConfirm"))) return;
    setBusyId(r.id);
    setError("");
    try {
      await api(`/requests/${r.id}`, { method: "DELETE" });
      await reload();
    } catch (err) {
      setError(err.status ? err.message : t(lang, "auth.connectionError"));
    }
    setBusyId(null);
  };

  return (
    <div>
      <DashTitle>{t(lang, "dashboard.requests")}</DashTitle>

      {approving && (
        <ApproveRequestModal
          lang={lang}
          request={approving}
          optLabel={(group, value) => optLabel(group, value, approving.currency)}
          onClose={() => setApproving(null)}
          onApproved={async (data) => { setApproving(null); setCreated(data); await reload(); }}
        />
      )}
      {created && <KeyModal lang={lang} data={created} onClose={() => setCreated(null)} />}

      {error && <div style={{ color: "#F87171", fontSize: 13, marginBottom: 12 }}>{error}</div>}

      {requests.length === 0 ? (
        <Card style={{ padding: 28, color: C.muted, fontSize: 14 }}>{t(lang, "dashboard.noRequests")}</Card>
      ) : (
        <Card style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["name", "phone", "type", "goal", "budget", "note", "date", "status", "actions"].map((f) => (
                  <Th key={f} lang={lang}>{t(lang, `dashboard.requestsTable.${f}`)}</Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => {
                const status = r.status || "pending";
                const busy = busyId === r.id;
                return (
                  <tr key={r.id} style={{ opacity: busy ? 0.5 : 1 }}>
                    <Td style={{ color: "#fff", fontWeight: 600 }}>
                      {r.name}
                      {r.email && <div style={{ fontSize: 12, color: C.muted, fontWeight: 400 }}>{r.email}</div>}
                    </Td>
                    <Td style={{ direction: "ltr" }}>{r.phone}</Td>
                    <Td>{optLabel("type", r.projectType)}</Td>
                    <Td>{optLabel("goal", r.goal)}</Td>
                    <Td>{optLabel("budget", r.budget, r.currency)}</Td>
                    <Td style={{ maxWidth: 220, fontSize: 13, color: C.muted, whiteSpace: "pre-line" }}>
                      {r.note || "—"}
                      {r.files?.length > 0 && <div style={{ marginTop: 4, fontSize: 12, color: C.accent }}>📎 {r.files.length}</div>}
                    </Td>
                    <Td style={{ whiteSpace: "nowrap", fontSize: 13, color: C.muted }}>{fmtDate(r.createdAt)}</Td>
                    <Td><Badge label={t(lang, `dashboard.requestStatus.${status}`)} color={REQUEST_STATUS_COLORS[status] || C.accent} /></Td>
                    <Td style={{ whiteSpace: "nowrap" }}>
                      {status === "pending" && (
                        <div style={{ display: "flex", gap: 6 }}>
                          <MiniBtn onClick={() => !busy && setApproving(r)} success>{t(lang, "dashboard.requestActions.approve")}</MiniBtn>
                          <MiniBtn onClick={() => !busy && setStatus(r, "cancelled")} danger>{t(lang, "dashboard.requestActions.cancel")}</MiniBtn>
                        </div>
                      )}
                      {status === "cancelled" && (
                        <div style={{ display: "flex", gap: 6 }}>
                          <MiniBtn onClick={() => !busy && setStatus(r, "pending")}>{t(lang, "dashboard.requestActions.restore")}</MiniBtn>
                          <MiniBtn onClick={() => !busy && deleteRequest(r)} danger>{t(lang, "dashboard.requestActions.delete")}</MiniBtn>
                        </div>
                      )}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

// نافذة قبول الطلب: تعرض كل التفاصيل قابلة للتعديل، ثم تُنشئ المشروع
// وتضيف العميل إلى CRM (المشاريع هي مصدر بيانات CRM) وتُظهر مفتاح التتبع.
function ApproveRequestModal({ lang, request, optLabel, onClose, onApproved }) {
  const [projectType, setProjectType] = useState(request.projectType ? optLabel("type", request.projectType) : "");
  const [description, setDescription] = useState([
    request.goal && `${t(lang, "dashboard.requestsTable.goal")}: ${optLabel("goal", request.goal)}`,
    request.budget && `${t(lang, "dashboard.requestsTable.budget")}: ${optLabel("budget", request.budget)}`,
    request.note,
  ].filter(Boolean).join("\n"));
  const [budget, setBudget] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const approve = async () => {
    setBusy(true);
    setError("");
    try {
      const data = await api(`/requests/${request.id}/approve`, {
        method: "POST",
        body: { projectType, description, totalBudget: Number(budget) || 0 },
      });
      onApproved(data);
    } catch (err) {
      setError(err.status ? err.message : t(lang, "auth.connectionError"));
      setBusy(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <Card style={{ padding: 32, maxWidth: 560, width: "100%", border: `1px solid ${C.accent}`, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 20, color: "#fff", marginBottom: 6 }}>
          ✓ {t(lang, "dashboard.requestActions.approveTitle")}
        </div>
        <div style={{ color: C.muted, fontSize: 13, lineHeight: 1.7, marginBottom: 20 }}>{t(lang, "dashboard.requestActions.approveHint")}</div>

        <div style={{ fontSize: 13, color: C.muted, marginBottom: 16, lineHeight: 1.9 }}>
          👤 <span style={{ color: "#fff", fontWeight: 600 }}>{request.name}</span>
          {request.phone && <> · 📞 <span style={{ direction: "ltr", unicodeBidi: "embed" }}>{request.phone}</span></>}
          {request.email && <> · ✉️ {request.email}</>}
        </div>

        {request.files?.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 6 }}>{t(lang, "dashboard.requestActions.attachments")}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {request.files.map((f) => (
                <a key={f.name} href={f.data} download={f.name} style={{ fontSize: 13, color: C.accent, textDecoration: "none" }}>
                  📎 {f.name}
                </a>
              ))}
            </div>
          </div>
        )}

        <label style={{ fontSize: 13, color: C.muted, display: "block", marginBottom: 6 }}>{t(lang, "dashboard.orderForm.projectType")}</label>
        <input value={projectType} onChange={(e) => setProjectType(e.target.value)} style={{ ...inputStyle, marginBottom: 14 }} />

        <label style={{ fontSize: 13, color: C.muted, display: "block", marginBottom: 6 }}>{t(lang, "dashboard.orderForm.description")}</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} style={{ ...inputStyle, resize: "vertical", marginBottom: 14 }} />

        <label style={{ fontSize: 13, color: C.muted, display: "block", marginBottom: 6 }}>{t(lang, "dashboard.orderForm.budget")}</label>
        <input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} style={{ ...inputStyle, marginBottom: 18 }} />

        {error && <div style={{ color: "#F87171", fontSize: 13, marginBottom: 12 }}>{error}</div>}

        <div style={{ display: "flex", gap: 10 }}>
          <Btn onClick={approve} style={{ opacity: busy ? 0.6 : 1 }}>{busy ? "..." : t(lang, "dashboard.requestActions.confirm")}</Btn>
          <Btn variant="outline" onClick={onClose}>{t(lang, "dashboard.orderForm.cancel")}</Btn>
        </div>
      </Card>
    </div>
  );
}

// ── CLIENTS (CRM) ─────────────────────────────────────────────────────────────
function ClientsTab({ lang, orders }) {
  return (
    <div>
      <DashTitle>{t(lang, "dashboard.clients")}</DashTitle>
      {orders.length === 0 ? (
        <Card style={{ padding: 28, color: C.muted, fontSize: 14 }}>{t(lang, "dashboard.noOrders")}</Card>
      ) : (
        <Card style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["client", "phone", "project", "budget", "paid", "remaining", "progress", "status", "createdBy"].map((f) => (
                  <Th key={f} lang={lang}>{t(lang, `dashboard.crm.${f}`)}</Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <Td style={{ color: "#fff", fontWeight: 600 }}>{o.clientName}</Td>
                  <Td style={{ direction: "ltr" }}>{o.clientPhone || "—"}</Td>
                  <Td>{o.projectType}</Td>
                  <Td>{fmtMoney(o.totalBudget, lang)}</Td>
                  <Td style={{ color: C.green }}>{fmtMoney(o.amountPaid, lang)}</Td>
                  <Td style={{ color: remainingOf(o) > 0 ? C.yellow : C.green, fontWeight: 600 }}>{fmtMoney(remainingOf(o), lang)}</Td>
                  <Td>{o.progressPct}%</Td>
                  <Td><StageBadge status={o.status} lang={lang} /></Td>
                  <Td style={{ fontSize: 13, color: C.muted }}>{o.createdBy || "—"}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

// ── INVOICES (PAYMENTS) ───────────────────────────────────────────────────────
function InvoicesTab({ lang, orders, payments, reload }) {
  const [orderId, setOrderId] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const record = async () => {
    if (!orderId || !amount) return;
    setBusy(true);
    setError("");
    try {
      await api(`/orders/${orderId}/payments`, { method: "POST", body: { amount: Number(amount), note } });
      setAmount(""); setNote("");
      await reload();
    } catch (err) {
      setError(err.status ? err.message : t(lang, "auth.connectionError"));
    }
    setBusy(false);
  };

  return (
    <div>
      <DashTitle>{t(lang, "dashboard.invoices")}</DashTitle>

      <Card style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 12 }}>{t(lang, "dashboard.payments.recordPayment")}</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <select value={orderId} onChange={(e) => setOrderId(e.target.value)} style={{ ...inputStyle, width: "auto", minWidth: 220 }}>
            <option value="">{t(lang, "dashboard.payments.selectOrder")}</option>
            {orders.map((o) => <option key={o.id} value={o.id}>{o.uid} — {o.clientName}</option>)}
          </select>
          <input type="number" placeholder={t(lang, "dashboard.payments.amount")} value={amount} onChange={(e) => setAmount(e.target.value)} style={{ ...inputStyle, width: 140 }} />
          <input placeholder={t(lang, "dashboard.payments.note")} value={note} onChange={(e) => setNote(e.target.value)} style={{ ...inputStyle, width: 200 }} />
          <Btn onClick={record} style={{ opacity: busy || !orderId || !amount ? 0.6 : 1 }}>{t(lang, "dashboard.payments.record")}</Btn>
        </div>
        {error && <div style={{ color: "#F87171", fontSize: 13, marginTop: 10 }}>{error}</div>}
      </Card>

      {payments.length === 0 ? (
        <Card style={{ padding: 28, color: C.muted, fontSize: 14 }}>{t(lang, "dashboard.noPayments")}</Card>
      ) : (
        <Card style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["id", "project", "client", "amount", "note", "date", "enteredBy"].map((f) => (
                  <Th key={f} lang={lang}>{t(lang, `dashboard.paymentsTable.${f}`)}</Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payments.map((p, i) => (
                <tr key={p.id ?? i}>
                  <Td style={{ color: C.accent, fontWeight: 600, direction: "ltr" }}>{p.orderUid}</Td>
                  <Td>{p.projectType}</Td>
                  <Td style={{ color: "#fff", fontWeight: 600 }}>{p.clientName}</Td>
                  <Td style={{ color: C.green, fontWeight: 700 }}>{fmtMoney(p.amount, lang)}</Td>
                  <Td style={{ fontSize: 13, color: C.muted }}>{p.note || "—"}</Td>
                  <Td style={{ whiteSpace: "nowrap", fontSize: 13, color: C.muted }}>{fmtDate(p.createdAt)}</Td>
                  <Td style={{ fontSize: 13, color: C.muted }}>{p.createdBy || "—"}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

// ── REVENUE ───────────────────────────────────────────────────────────────────
function RevenueTab({ lang, orders, payments }) {
  const now = new Date();
  const sum = (list) => list.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const inMonth = (p, y, m) => {
    const d = parseDate(p.createdAt);
    return d && d.getFullYear() === y && d.getMonth() === m;
  };

  const thisMonth = sum(payments.filter((p) => inMonth(p, now.getFullYear(), now.getMonth())));
  const thisYear = sum(payments.filter((p) => parseDate(p.createdAt)?.getFullYear() === now.getFullYear()));
  const total = sum(payments);
  const outstanding = orders.reduce((s, o) => s + remainingOf(o), 0);

  // Last 6 months chart
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      label: d.toLocaleDateString(lang === "ar" ? "ar" : lang === "fr" ? "fr" : "en", { month: "short" }),
      value: sum(payments.filter((p) => inMonth(p, d.getFullYear(), d.getMonth()))),
    });
  }
  const maxValue = Math.max(...months.map((m) => m.value), 1);

  const summary = [
    [t(lang, "dashboard.revenueLabels.thisMonth"), thisMonth],
    [t(lang, "dashboard.revenueLabels.thisYear"), thisYear],
    [t(lang, "dashboard.revenueLabels.outstanding"), outstanding],
    [t(lang, "dashboard.revenueLabels.total"), total],
  ];

  return (
    <div>
      <DashTitle>{t(lang, "dashboard.revenue")}</DashTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 16, marginBottom: 28 }}>
        {summary.map(([label, value]) => (
          <Card key={label} style={{ padding: 22 }}>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
            <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 24, color: "#fff" }}>{fmtMoney(value, lang)}</div>
          </Card>
        ))}
      </div>

      <Card style={{ padding: 28 }}>
        <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 17, color: "#fff", marginBottom: 28 }}>{t(lang, "dashboard.revenueChartTitle")}</div>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end", height: 200 }}>
          {months.map((m, i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, height: "100%", justifyContent: "flex-end" }}>
              <div style={{ fontSize: 11, color: C.muted }}>{m.value > 0 ? fmtMoney(m.value, lang) : ""}</div>
              <div style={{ width: "100%", height: `${(m.value / maxValue) * 140}px`, minHeight: m.value > 0 ? 4 : 0, background: i === 5 ? C.accent : `${C.accent}55`, borderRadius: "6px 6px 0 0", transition: "height .5s" }} />
              <div style={{ fontSize: 11, color: C.muted }}>{m.label}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ── KANBAN ────────────────────────────────────────────────────────────────────
function KanbanTab({ lang, tasks, reload }) {
  const [title, setTitle] = useState("");
  const [client, setClient] = useState("");
  const [priority, setPriority] = useState("mid");
  const [busy, setBusy] = useState(false);

  const LANES = ["todo", "doing", "done"];

  const add = async () => {
    if (!title.trim()) return;
    setBusy(true);
    try {
      await api("/tasks", { method: "POST", body: { title, client, priority } });
      setTitle(""); setClient("");
      await reload();
    } catch { /* keep silent, form stays filled */ }
    setBusy(false);
  };

  const move = async (task, dir) => {
    const idx = LANES.indexOf(task.lane) + dir;
    if (idx < 0 || idx >= LANES.length) return;
    await api(`/tasks/${task.id}`, { method: "PUT", body: { lane: LANES[idx] } });
    await reload();
  };

  const remove = async (task) => {
    await api(`/tasks/${task.id}`, { method: "DELETE" });
    await reload();
  };

  return (
    <div>
      <DashTitle>{t(lang, "dashboard.kanban")}</DashTitle>

      <Card style={{ padding: 18, marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input placeholder={t(lang, "dashboard.kanbanForm.title")} value={title} onChange={(e) => setTitle(e.target.value)} style={{ ...inputStyle, flex: 2, minWidth: 180 }} />
          <input placeholder={t(lang, "dashboard.kanbanForm.client")} value={client} onChange={(e) => setClient(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 140 }} />
          <select value={priority} onChange={(e) => setPriority(e.target.value)} style={{ ...inputStyle, width: "auto" }}>
            {["high", "mid", "low"].map((p) => <option key={p} value={p}>{t(lang, `dashboard.priorities.${p}`)}</option>)}
          </select>
          <Btn onClick={add} style={{ opacity: busy || !title.trim() ? 0.6 : 1 }}>{t(lang, "dashboard.kanbanForm.add")}</Btn>
        </div>
      </Card>

      <div style={{ display: "flex", gap: 18, overflowX: "auto", paddingBottom: 4 }}>
        {LANES.map((lane) => {
          const laneTasks = tasks.filter((task) => task.lane === lane);
          return (
            <Card key={lane} style={{ flex: "1 1 260px", minWidth: 260 }}>
              <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 14, color: "#fff" }}>{t(lang, `dashboard.kanbanColumns.${lane}`)}</div>
                <div style={{ background: C.bg, borderRadius: 8, padding: "2px 10px", fontSize: 12, color: C.muted }}>{laneTasks.length}</div>
              </div>
              <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10, minHeight: 240 }}>
                {laneTasks.map((task) => (
                  <div key={task.id} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14, borderRight: `3px solid ${PRIORITY_COLORS[task.priority] || C.yellow}` }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#fff", marginBottom: 6 }}>{task.title}</div>
                    {task.client && <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>👤 {task.client}</div>}
                    <div style={{ display: "flex", gap: 6 }}>
                      {lane !== "todo" && <MiniBtn onClick={() => move(task, -1)}>◀</MiniBtn>}
                      {lane !== "done" && <MiniBtn onClick={() => move(task, 1)}>▶</MiniBtn>}
                      <MiniBtn onClick={() => remove(task)} danger>✕</MiniBtn>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ── PORTFOLIO (public "our work" showcase — separate from client orders) ──────
function PortfolioTab({ lang, portfolio, reload }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null); // full project being edited, or null for "new"

  const openNew = () => { setEditing(null); setShowForm(true); };
  const openEdit = async (summary) => {
    const data = await api(`/portfolio/${summary.slug}`);
    setEditing(data.project);
    setShowForm(true);
  };
  const close = () => { setShowForm(false); setEditing(null); };

  const remove = async (p) => {
    if (!window.confirm(t(lang, "dashboard.portfolioForm.deleteConfirm"))) return;
    await api(`/portfolio/${p.id}`, { method: "DELETE" });
    await reload();
  };

  return (
    <div>
      <DashTitle action={<Btn onClick={() => (showForm ? close() : openNew())}>{showForm ? t(lang, "dashboard.portfolioForm.cancel") : t(lang, "dashboard.portfolioForm.newProject")}</Btn>}>
        {t(lang, "dashboard.portfolio")}
      </DashTitle>

      {showForm && (
        <PortfolioForm lang={lang} project={editing} onSaved={() => { close(); reload(); }} onCancel={close} />
      )}

      {portfolio.length === 0 && !showForm && (
        <Card style={{ padding: 28, color: C.muted, fontSize: 14 }}>{t(lang, "dashboard.portfolioForm.empty")}</Card>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 18 }}>
        {portfolio.map((p) => (
          <Card key={p.id} style={{ overflow: "hidden" }}>
            <div style={{ height: 130, background: p.cover ? `url(${p.cover}) center/cover` : C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>
              {!p.cover && "🖼️"}
            </div>
            <div style={{ padding: 16 }}>
              <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 15, color: "#fff", marginBottom: 6 }}>{p.title}</div>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 12, minHeight: 20 }}>
                {p.stack.slice(0, 4).map((s) => (
                  <span key={s} style={{ background: C.accentDim, color: C.accentLight, borderRadius: 6, padding: "2px 8px", fontSize: 10, fontWeight: 600 }}>{s}</span>
                ))}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <MiniBtn onClick={() => openEdit(p)}>✏️</MiniBtn>
                <MiniBtn onClick={() => remove(p)} danger>🗑️</MiniBtn>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function PortfolioForm({ lang, project, onSaved, onCancel }) {
  const f = t(lang, "dashboard.portfolioForm");
  const [title, setTitle] = useState(project?.title || "");
  const [stackText, setStackText] = useState((project?.stack || []).join(", "));
  const [description, setDescription] = useState(project?.description || "");
  const [problem, setProblem] = useState(project?.problem || "");
  const [solution, setSolution] = useState(project?.solution || "");
  const [images, setImages] = useState(project?.images || []);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const addFiles = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => setImages((imgs) => [...imgs, reader.result]);
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const removeImage = (i) => setImages((imgs) => imgs.filter((_, j) => j !== i));
  const moveImage = (i, dir) => setImages((imgs) => {
    const j = i + dir;
    if (j < 0 || j >= imgs.length) return imgs;
    const next = [...imgs];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });

  const save = async () => {
    if (!title.trim()) { setError(f.requiredError); return; }
    setSaving(true);
    setError("");
    const stack = stackText.split(",").map((s) => s.trim()).filter(Boolean);
    const body = { title: title.trim(), stack, description, problem, solution, images };
    try {
      if (project) await api(`/portfolio/${project.id}`, { method: "PUT", body });
      else await api("/portfolio", { method: "POST", body });
      onSaved();
    } catch (err) {
      setError(err.status ? err.message : t(lang, "auth.connectionError"));
      setSaving(false);
    }
  };

  return (
    <Card style={{ padding: 24, marginBottom: 20 }}>
      <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 16, color: "#fff", marginBottom: 16 }}>
        {project ? f.editProject : f.newProject}
      </div>

      <label style={{ fontSize: 13, color: C.muted, display: "block", marginBottom: 6 }}>{f.title}</label>
      <input value={title} onChange={(e) => setTitle(e.target.value)} style={{ ...inputStyle, marginBottom: 14 }} />

      <label style={{ fontSize: 13, color: C.muted, display: "block", marginBottom: 6 }}>{f.stack}</label>
      <input value={stackText} onChange={(e) => setStackText(e.target.value)} placeholder={f.stackPlaceholder} style={{ ...inputStyle, marginBottom: 14 }} />

      <label style={{ fontSize: 13, color: C.muted, display: "block", marginBottom: 6 }}>{f.description}</label>
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical", marginBottom: 14 }} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <div>
          <label style={{ fontSize: 13, color: "#EF4444", display: "block", marginBottom: 6 }}>🔴 {f.problem}</label>
          <textarea value={problem} onChange={(e) => setProblem(e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
        </div>
        <div>
          <label style={{ fontSize: 13, color: C.green, display: "block", marginBottom: 6 }}>🟢 {f.solution}</label>
          <textarea value={solution} onChange={(e) => setSolution(e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
        </div>
      </div>

      <label style={{ fontSize: 13, color: C.muted, display: "block", marginBottom: 6 }}>{f.images}</label>
      {images.length === 0 && <div style={{ fontSize: 13, color: C.dim, marginBottom: 10 }}>{f.noImages}</div>}
      {images.length > 0 && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
          {images.map((src, i) => (
            <div key={i} style={{ position: "relative", width: 88, height: 88, borderRadius: 10, overflow: "hidden", border: `1px solid ${C.border}` }}>
              <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <div
                style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.6)", opacity: 0, transition: "opacity .15s", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = 1; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = 0; }}
              >
                {i > 0 && <MiniBtn onClick={() => moveImage(i, -1)}>◀</MiniBtn>}
                <MiniBtn onClick={() => removeImage(i)} danger>✕</MiniBtn>
                {i < images.length - 1 && <MiniBtn onClick={() => moveImage(i, 1)}>▶</MiniBtn>}
              </div>
            </div>
          ))}
        </div>
      )}
      <input type="file" accept="image/*" multiple onChange={addFiles} style={{ display: "none" }} id="portfolio-image-input" />
      <label htmlFor="portfolio-image-input" style={{ display: "inline-block", cursor: "pointer", marginBottom: 18 }}>
        <span style={{ background: "transparent", border: `1px dashed ${C.border}`, borderRadius: 10, padding: "10px 16px", color: C.muted, fontSize: 13, display: "inline-block" }}>{f.addImages}</span>
      </label>

      {error && <div style={{ color: "#F87171", fontSize: 13, marginBottom: 12 }}>{error}</div>}

      <div style={{ display: "flex", gap: 10 }}>
        <Btn onClick={save} style={{ opacity: saving ? 0.6 : 1 }}>{saving ? "..." : f.save}</Btn>
        <Btn variant="outline" onClick={onCancel}>{f.cancel}</Btn>
      </div>
    </Card>
  );
}

// ── TESTIMONIALS (public reviews, admin-approved) ─────────────────────────────
const TESTIMONIAL_STATUS_COLORS = { pending: "#F59E0B", approved: "#22C55E", rejected: "#EF4444" };

function TestimonialsTab({ lang, testimonials, reload }) {
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  const setStatus = async (item, status) => {
    setBusyId(item.id);
    setError("");
    try {
      await api(`/testimonials/${item.id}`, { method: "PUT", body: { status } });
      await reload();
    } catch (err) {
      setError(err.status ? err.message : t(lang, "auth.connectionError"));
    }
    setBusyId(null);
  };

  const remove = async (item) => {
    if (!window.confirm(t(lang, "dashboard.testimonialsTable.deleteConfirm"))) return;
    setBusyId(item.id);
    setError("");
    try {
      await api(`/testimonials/${item.id}`, { method: "DELETE" });
      await reload();
    } catch (err) {
      setError(err.status ? err.message : t(lang, "auth.connectionError"));
    }
    setBusyId(null);
  };

  return (
    <div>
      <DashTitle>{t(lang, "dashboard.testimonials")}</DashTitle>

      {error && <div style={{ color: "#F87171", fontSize: 13, marginBottom: 12 }}>{error}</div>}

      {testimonials.length === 0 ? (
        <Card style={{ padding: 28, color: C.muted, fontSize: 14 }}>{t(lang, "dashboard.testimonialsTable.empty")}</Card>
      ) : (
        <Card style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["name", "project", "rating", "text", "date", "status", "actions"].map((f) => (
                  <Th key={f} lang={lang}>{t(lang, `dashboard.testimonialsTable.${f}`)}</Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {testimonials.map((item) => {
                const status = item.status || "pending";
                const busy = busyId === item.id;
                return (
                  <tr key={item.id} style={{ opacity: busy ? 0.5 : 1 }}>
                    <Td style={{ color: "#fff", fontWeight: 600 }}>{item.name}</Td>
                    <Td>{item.project || "—"}</Td>
                    <Td style={{ color: C.accent }}>{"★".repeat(item.rating)}</Td>
                    <Td style={{ maxWidth: 260, fontSize: 13, color: C.muted, whiteSpace: "pre-line" }}>{item.text}</Td>
                    <Td style={{ whiteSpace: "nowrap", fontSize: 13, color: C.muted }}>{fmtDate(item.createdAt)}</Td>
                    <Td><Badge label={t(lang, `dashboard.testimonialsTable.statusLabels.${status}`)} color={TESTIMONIAL_STATUS_COLORS[status] || C.accent} /></Td>
                    <Td style={{ whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        {status !== "approved" && <MiniBtn onClick={() => !busy && setStatus(item, "approved")} success>{t(lang, "dashboard.requestActions.approve")}</MiniBtn>}
                        {status !== "rejected" && <MiniBtn onClick={() => !busy && setStatus(item, "rejected")} danger>{t(lang, "dashboard.requestActions.cancel")}</MiniBtn>}
                        <MiniBtn onClick={() => !busy && remove(item)} danger>{t(lang, "dashboard.requestActions.delete")}</MiniBtn>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function MiniBtn({ children, onClick, danger, success }) {
  const color = danger ? "#EF4444" : success ? "#22C55E" : C.muted;
  return (
    <button onClick={onClick}
      style={{ background: "transparent", border: `1px solid ${danger ? "rgba(239,68,68,.4)" : success ? "rgba(34,197,94,.4)" : C.border}`, borderRadius: 7, padding: "3px 9px", fontSize: 11, color, cursor: "pointer" }}>
      {children}
    </button>
  );
}

// ── MESSAGES (disabled for now — kept for the upcoming AI proformas/offers) ───
// eslint-disable-next-line no-unused-vars
function MessagesTab({ lang }) {
  const [msgs, setMsgs] = useState([
    { id: 1, mine: false, text: t(lang, "dashboard.messagesList.0.text"), time: "10:34" },
    { id: 2, mine: true,  text: t(lang, "dashboard.messagesList.1.text"), time: "10:35" },
    { id: 3, mine: false, text: t(lang, "dashboard.messagesList.2.text"), time: "10:36" },
  ]);
  const [input, setInput] = useState("");

  const contacts = [
    { name: "Solvix Team", last: "2 min" },
    { name: "Support", last: "5 min" },
    { name: "Finance", last: "10 min" },
  ];

  const send = () => {
    if (!input.trim()) return;
    const time = new Date().toLocaleTimeString(lang === "ar" ? "ar" : "en-US", { hour: "2-digit", minute: "2-digit" });
    setMsgs((m) => [...m, { id: Date.now(), mine: true, text: input, time }]);
    setInput("");
  };

  return (
    <div>
      <DashTitle>{t(lang, "dashboard.messages")}</DashTitle>
      <Card style={{ display: "grid", gridTemplateColumns: "240px 1fr", height: "calc(100vh - 200px)", overflow: "hidden" }}>
        <div style={{ borderLeft: `1px solid ${C.border}`, overflowY: "auto" }}>
          {contacts.map((contact, index) => (
            <div key={contact.name} style={{ padding: "16px 18px", borderBottom: `1px solid ${C.border}`, cursor: "pointer", background: index === 0 ? C.accentDim : "transparent" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{contact.name}</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>{contact.last}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ flex: 1, padding: 20, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
            {msgs.map((message) => (
              <div key={message.id} style={{ alignSelf: message.mine ? "flex-start" : "flex-end", maxWidth: "70%" }}>
                <div style={{ background: message.mine ? C.accent : C.bg, color: "#fff", padding: "11px 15px", borderRadius: message.mine ? "16px 16px 16px 4px" : "16px 16px 4px 16px", fontSize: 14, lineHeight: 1.6 }}>
                  {message.text}
                </div>
                <div style={{ fontSize: 11, color: C.dim, marginTop: 4, textAlign: message.mine ? "left" : "right" }}>{message.time}</div>
              </div>
            ))}
          </div>
          <div style={{ padding: "14px 18px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 10 }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder={t(lang, "dashboard.messagesPlaceholder")}
              style={{ flex: 1, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "11px 14px", color: C.text, fontSize: 14, outline: "none", fontFamily: "Inter, sans-serif" }}
            />
            <button onClick={send} style={{ background: C.accent, border: "none", borderRadius: 10, padding: "11px 18px", color: "#fff", fontWeight: 600, fontSize: 14, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
              {t(lang, "dashboard.send")}
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
