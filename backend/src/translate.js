// ─── DEEPL TRANSLATION ────────────────────────────────────────────────────
// Translates portfolio project text (description/problem/solution) once, at
// admin save time — never per page view — into the site's other languages so
// switching the language switcher is instant with no extra requests.

const SOURCE_LANG_CODES = { ar: 'AR', en: 'EN', fr: 'FR' };
const TARGET_LANG_CODES = { ar: 'AR', en: 'EN-US', fr: 'FR' };
const ALL_LANGS = ['ar', 'en', 'fr'];
const TIMEOUT_MS = 8000;

function apiConfig() {
  const key = process.env.DEEPL_API_KEY?.trim();
  if (!key) return null;
  const host = key.endsWith(':fx') ? 'api-free.deepl.com' : 'api.deepl.com';
  return { key, url: `https://${host}/v2/translate` };
}

// translateProjectText({description, problem, solution}, 'ar')
//   -> { en: {description, problem, solution}, fr: {...} }
// Empty fields are skipped. Any failure (missing key, network, timeout,
// non-2xx) is swallowed — that target language is simply omitted from the
// result. Must never throw: a translation failure must not block saving.
export async function translateProjectText(fields, sourceLang) {
  const result = {};
  const api = apiConfig();
  if (!api) {
    console.warn('[translate] DEEPL_API_KEY not set — skipping translation.');
    return result;
  }

  const entries = Object.entries(fields).filter(([, v]) => (v || '').toString().trim());
  if (!entries.length) return result;

  const targets = ALL_LANGS.filter((lang) => lang !== sourceLang);
  await Promise.all(targets.map((targetLang) => translateInto(api, entries, sourceLang, targetLang, result)));
  return result;
}

async function translateInto(api, entries, sourceLang, targetLang, result) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const body = new URLSearchParams();
    body.append('source_lang', SOURCE_LANG_CODES[sourceLang]);
    body.append('target_lang', TARGET_LANG_CODES[targetLang]);
    for (const [, text] of entries) body.append('text', text);

    const res = await fetch(api.url, {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${api.key}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`DeepL responded with ${res.status}`);

    const data = await res.json();
    const translations = data.translations || [];
    if (translations.length !== entries.length) throw new Error('translation count mismatch');

    const fields = {};
    entries.forEach(([field], i) => { fields[field] = translations[i].text; });
    result[targetLang] = fields;
  } catch (err) {
    console.warn(`[translate] ${sourceLang} -> ${targetLang} failed: ${err.message}`);
  } finally {
    clearTimeout(timer);
  }
}
