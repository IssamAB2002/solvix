// ─── REQUEST PAGE ────────────────────────────────────────────────────────────

import { useState, useRef } from "react";
import C from "../styles/colors";
import { Btn } from "../components/UI";
import { REQ_STEPS } from "../data";
import { t } from "../i18n";
import { api } from "../api";

export default function Request({ go, lang, currency = "dzd" }) {
  const [step,  setStep]  = useState(0);
  const [ans,   setAns]   = useState([null, null, null]);
  const [details, setDetails] = useState(["", "", ""]);
  const [name,  setName]  = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [note,  setNote]  = useState("");
  const [files, setFiles] = useState([]); // [{ name, type, data }]
  const [sent,  setSent]  = useState(false);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async () => {
    if (!name.trim() || !phone.trim()) {
      setError(t(lang, "auth.required"));
      return;
    }
    setSending(true);
    setError("");
    // ما كتبه العميل في كل خطوة يُرفق بالملاحظة مع سؤال الخطوة
    const stepNotes = REQ_STEPS
      .map((s, i) => details[i].trim() && `${t(lang, `request.steps.${s.key}.question`)} ${details[i].trim()}`)
      .filter(Boolean)
      .join("\n");
    try {
      await api("/requests", {
        method: "POST",
        auth: false,
        body: {
          name, email, phone,
          note: [stepNotes, note.trim()].filter(Boolean).join("\n"),
          projectType: ans[0] || "",
          goal: ans[1] || "",
          budget: ans[2] || "",
          currency,
          files,
        },
      });
      setSent(true);
    } catch (err) {
      setError(err.status ? err.message : t(lang, "auth.connectionError"));
    } finally {
      setSending(false);
    }
  };

  if (sent) return <SuccessScreen go={go} lang={lang}/>;

  const canProceed = step >= 3 || ans[step] !== null
    || (REQ_STEPS[step]?.key === "goal" && details[step].trim() !== "");

  return (
    <div dir={lang === "ar" ? "rtl" : "ltr"} style={{ maxWidth: 620, margin: "0 auto", padding: "110px 24px 80px" }}>

      <div style={{ fontSize: 12, color: C.accent, letterSpacing: 3, textTransform: "uppercase", marginBottom: 12, fontWeight: 600 }}>{t(lang, "request.title")}</div>
      <h2 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 36, color: "#fff", marginBottom: 8 }}>{t(lang, "request.title")}</h2>
      <p style={{ fontSize: 15, color: C.muted, marginBottom: 40 }}>{t(lang, "request.subtitle")}</p>

      <div style={{ height: 4, background: C.border, borderRadius: 2, marginBottom: 40 }}>
        <div style={{ height: "100%", width: `${((step + 1) / 5) * 100}%`, background: C.accent, borderRadius: 2, transition: "width .4s" }}/>
      </div>

      {step < 3 && (
        <OptionStep
          stepIndex={step}
          ans={ans}
          setAns={setAns}
          details={details}
          setDetails={setDetails}
          lang={lang}
          currency={currency}
        />
      )}

      {step === 3 && <FileStep lang={lang} files={files} setFiles={setFiles}/>}

      {step === 4 && (
        <ContactStep
          name={name}  setName={setName}
          email={email} setEmail={setEmail}
          phone={phone} setPhone={setPhone}
          note={note}   setNote={setNote}
          onSubmit={submit}
          error={error}
          sending={sending}
          lang={lang}
        />
      )}

      {step < 4 && (
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
          <Btn variant="outline" onClick={() => setStep((s) => s - 1)} style={{ visibility: step === 0 ? "hidden" : "visible" }}>{t(lang, "request.back")}</Btn>
          <Btn onClick={() => setStep((s) => s + 1)} style={{ opacity: canProceed ? 1 : 0.4, pointerEvents: canProceed ? "auto" : "none" }}>{t(lang, "request.next")}</Btn>
        </div>
      )}
    </div>
  );
}

function StepHeader({ number, title }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 32 }}>
      <div style={{ width: 42, height: 42, background: C.accent, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 18, color: "#fff", flexShrink: 0 }}>
        {number}
      </div>
      <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 20, color: "#fff" }}>{title}</div>
    </div>
  );
}

function OptionStep({ stepIndex, ans, setAns, details, setDetails, lang, currency }) {
  const step = REQ_STEPS[stepIndex];
  // خيارات الميزانية تُعرض بالعملة المختارة من مبدّل العملة
  const label = (value) =>
    step.key === "budget" && currency === "dzd"
      ? t(lang, `request.steps.budget.optionsDzd.${value}`)
      : t(lang, `request.steps.${step.key}.options.${value}.label`);

  return (
    <>
      <StepHeader number={stepIndex + 1} title={t(lang, `request.steps.${step.key}.question`)} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        {step.opts.map((o) => (
          <button key={o.value} onClick={() => { const n = [...ans]; n[stepIndex] = o.value; setAns(n); }}
            style={{
              background: ans[stepIndex] === o.value ? C.accentDim : C.surface,
              border: `1.5px solid ${ans[stepIndex] === o.value ? C.accent : C.border}`,
              borderRadius: 12, padding: "18px 16px", cursor: "pointer", textAlign: "right",
              fontFamily: "Inter, sans-serif", transition: "all .2s",
            }}>
            <div style={{ fontSize: 26, marginBottom: 8 }}>{o.i}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{label(o.value)}</div>
            {o.subtitleKey && <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>{t(lang, `request.steps.${step.key}.options.${o.value}.subtitle`)}</div>}
          </button>
        ))}
      </div>
      <input
        value={details[stepIndex]}
        onChange={(e) => setDetails((d) => d.map((v, i) => (i === stepIndex ? e.target.value : v)))}
        placeholder={t(lang, "request.stepDetails")}
        style={{
          width: "100%", background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: 10, padding: "12px 16px", color: C.text, fontSize: 14,
          outline: "none", fontFamily: "Inter, sans-serif", marginBottom: 32,
        }}
      />
    </>
  );
}

const MAX_FILES = 3;
const MAX_FILE_BYTES = 4 * 1024 * 1024; // 4MB

function FileStep({ lang, files, setFiles }) {
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  const onPick = async (e) => {
    const picked = Array.from(e.target.files || []);
    e.target.value = ""; // allow re-picking the same file after removal
    if (!picked.length) return;
    setError("");

    if (files.length + picked.length > MAX_FILES) {
      setError(t(lang, "request.fileTooMany"));
      return;
    }
    const tooBig = picked.find((f) => f.size > MAX_FILE_BYTES);
    if (tooBig) {
      setError(t(lang, "request.fileTooLarge"));
      return;
    }

    const read = (file) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ name: file.name, type: file.type, data: reader.result });
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    try {
      const loaded = await Promise.all(picked.map(read));
      setFiles((f) => [...f, ...loaded]);
    } catch {
      setError(t(lang, "request.fileTooLarge"));
    }
  };

  const removeFile = (name) => setFiles((f) => f.filter((x) => x.name !== name));

  return (
    <>
      <StepHeader number={4} title={t(lang, "request.fileStep")} />
      <div onClick={() => inputRef.current?.click()} style={{ background: C.surface, border: `2px dashed ${C.border}`, borderRadius: 16, padding: "56px 24px", textAlign: "center", marginBottom: files.length ? 16 : 32, cursor: "pointer" }}>
        <div style={{ fontSize: 48, marginBottom: 14 }}>📎</div>
        <div style={{ color: C.muted, fontSize: 15, marginBottom: 6 }}>{t(lang, "request.fileDescription")}</div>
        <div style={{ color: C.dim, fontSize: 12, marginBottom: 20 }}>{t(lang, "request.fileHelper")}</div>
        <Btn variant="outline">{t(lang, "request.fileStep")}</Btn>
      </div>
      <input ref={inputRef} type="file" multiple accept=".pdf,.doc,.docx,image/*" onChange={onPick} style={{ display: "none" }} />

      {error && <div style={{ color: "#F87171", fontSize: 13, marginBottom: 16 }}>{error}</div>}

      {files.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 32 }}>
          {files.map((f) => (
            <div key={f.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px" }}>
              <span style={{ color: C.text, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>📄 {f.name}</span>
              <button onClick={() => removeFile(f.name)} style={{ background: "none", border: "none", color: C.dim, cursor: "pointer", fontSize: 14, padding: 4 }}>✕</button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function ContactStep({ name, setName, email, setEmail, phone, setPhone, note, setNote, onSubmit, error, sending, lang }) {
  const inputStyle = {
    width: "100%", background: C.surface,
    border: `1px solid ${C.border}`, borderRadius: 10,
    padding: "12px 16px", color: C.text, fontSize: 14, outline: "none",
  };

  return (
    <>
      <StepHeader number={5} title={t(lang, "request.contactStep")} />
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 32 }}>
        {[
          [t(lang, "request.contactName"),      name,  setName,  "text"],
          [t(lang, "request.contactEmail"),     email, setEmail, "email"],
          [t(lang, "request.contactPhone"),     phone, setPhone, "text"],
        ].map(([label, val, set, type]) => (
          <div key={label}>
            <label style={{ fontSize: 13, color: C.muted, display: "block", marginBottom: 6 }}>{label}</label>
            <input type={type} value={val} onChange={(e) => set(e.target.value)} placeholder={label.replace(" *", "")} style={inputStyle}/>
          </div>
        ))}
        <div>
          <label style={{ fontSize: 13, color: C.muted, display: "block", marginBottom: 6 }}>{t(lang, "request.contactNote")}</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} placeholder={t(lang, "request.contactNote")} style={{ ...inputStyle, resize: "vertical" }}/>
        </div>
      </div>
      {error && <div style={{ color: "#F87171", fontSize: 14, marginBottom: 14 }}>{error}</div>}
      <button onClick={onSubmit} disabled={sending}
        style={{ width: "100%", background: C.accent, border: "none", borderRadius: 12, padding: 16, fontSize: 16, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: "Inter, sans-serif", opacity: sending ? 0.6 : 1 }}>
        {sending ? "..." : t(lang, "request.send")}
      </button>
    </>
  );
}

function SuccessScreen({ go, lang }) {
  return (
    <div dir={lang === "ar" ? "rtl" : "ltr"} style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, padding: 24 }}>
      <div style={{ fontSize: 80 }}>🎉</div>
      <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 32, color: "#fff" }}>{t(lang, "request.successTitle")}</div>
      <div style={{ color: C.muted, fontSize: 16, textAlign: "center", maxWidth: 400 }}>{t(lang, "request.successDesc")}</div>
      <Btn onClick={() => go("home")} style={{ marginTop: 16 }}>{t(lang, "nav.backHome")}</Btn>
    </div>
  );
}
