// ─── PORTFOLIO (public "our work" showcase) ──────────────────────────────────
// Staff manage entries from the admin panel (title, stack, description,
// problem/solution, ordered images as base64 data-URIs). The public site reads
// them to render the Projects page and each project's details page.

import express from 'express';
import { requireAdmin } from './auth.js';
import {
  listPortfolioProjects, getPortfolioProjectById,
  getPortfolioProjectMetaBySlug, getPortfolioProjectImagesBySlug,
  createPortfolioProject, updatePortfolioProject, deletePortfolioProject,
  setPortfolioProjectTranslations,
} from '../db.js';
import { translateProjectText } from '../translate.js';

const router = express.Router();

const MAX_IMAGES = 10;
const VALID_LANGS = ['ar', 'en', 'fr'];

function sanitizeStack(stack) {
  if (!Array.isArray(stack)) return [];
  return stack.map((s) => String(s).trim()).filter(Boolean).slice(0, 20);
}

function sanitizeImages(images) {
  if (!Array.isArray(images)) return [];
  return images.filter((s) => typeof s === 'string' && s.startsWith('data:image/')).slice(0, MAX_IMAGES);
}

// Decodes a stored `data:image/...;base64,...` string and writes it as a real
// binary image response (immutably cacheable) — shared by /cover and /images/:index
// below so individual images can be fetched one at a time instead of bundled.
function sendImage(res, dataUri) {
  if (!dataUri) return res.status(404).end();
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUri);
  if (!match) return res.status(404).end();

  const [, mime, base64] = match;
  res.set('Content-Type', mime);
  res.set('Cache-Control', 'public, max-age=31536000, immutable'); // URL is content-hash-versioned by the caller
  res.send(Buffer.from(base64, 'base64'));
}

// Public: list (without full image payloads — just whether a cover exists,
// fetched separately as a real cacheable URL via GET /:slug/cover) & single project.
router.get('/', async (_req, res) => {
  const projects = await listPortfolioProjects();
  res.json({
    projects: projects.map((p) => ({
      id: p.id, title: p.title, slug: p.slug, stack: p.stack,
      description: p.description, hasCover: p.images.length > 0, createdAt: p.createdAt,
      translations: p.translations, sourceLang: p.sourceLang,
    })),
  });
});

// Text-first detail: no images payload — see GET /:slug/images(/:index) below.
router.get('/:slug', async (req, res) => {
  const project = await getPortfolioProjectMetaBySlug(req.params.slug);
  if (!project) return res.status(404).json({ error: 'المشروع غير موجود.' });
  res.json({ project });
});

// Images fetched separately so the text-first response above isn't held up by them.
// Used by the admin edit form, which needs the full base64 array to preview/reorder
// and resubmit on save. The public site loads images one at a time — see below.
router.get('/:slug/images', async (req, res) => {
  const images = await getPortfolioProjectImagesBySlug(req.params.slug);
  if (images === null) return res.status(404).json({ error: 'المشروع غير موجود.' });
  res.json({ images });
});

// A single image as a real fetchable URL (not a data: URI) — lets the public
// site preload images one at a time (serial loading) instead of waiting on the
// whole project's image batch, and lets the browser actually cache each image.
router.get('/:slug/images/:index', async (req, res) => {
  const images = await getPortfolioProjectImagesBySlug(req.params.slug);
  if (images === null) return res.status(404).end();
  const index = Number(req.params.index);
  if (!Number.isInteger(index) || index < 0 || index >= images.length) return res.status(404).end();
  sendImage(res, images[index]);
});

// Cover image as a real fetchable URL (not a data: URI) — needed for og:image,
// since link-preview crawlers (Meta, WhatsApp, etc.) can't fetch data: URIs.
// Also used as the thumbnail source on the Projects list and admin grid.
router.get('/:slug/cover', async (req, res) => {
  const images = await getPortfolioProjectImagesBySlug(req.params.slug);
  sendImage(res, images?.[0]);
});

// Staff: CRUD
router.post('/', requireAdmin, async (req, res) => {
  const { title, stack, description, problem, solution, images, sourceLang: rawSourceLang } = req.body || {};
  if (!title?.trim()) {
    return res.status(400).json({ error: 'عنوان المشروع مطلوب.' });
  }
  const sourceLang = VALID_LANGS.includes(rawSourceLang) ? rawSourceLang : 'ar';
  const cleanText = {
    description: description?.trim() || '',
    problem: problem?.trim() || '',
    solution: solution?.trim() || '',
  };
  const otherTranslations = await translateProjectText(cleanText, sourceLang);

  const project = await createPortfolioProject({
    title: title.trim(),
    stack: sanitizeStack(stack),
    ...cleanText,
    images: sanitizeImages(images),
    translations: { [sourceLang]: cleanText, ...otherTranslations },
    sourceLang,
  });
  res.json({ project });
});

router.put('/:id', requireAdmin, async (req, res) => {
  const existing = await getPortfolioProjectById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'المشروع غير موجود.' });

  const { title, stack, description, problem, solution, images } = req.body || {};
  const fields = {};
  if (title !== undefined) {
    if (!title.trim()) return res.status(400).json({ error: 'عنوان المشروع مطلوب.' });
    fields.title = title.trim();
  }
  if (stack !== undefined) fields.stack = sanitizeStack(stack);
  if (description !== undefined) fields.description = description.trim();
  if (problem !== undefined) fields.problem = problem.trim();
  if (solution !== undefined) fields.solution = solution.trim();
  if (images !== undefined) fields.images = sanitizeImages(images);

  // Diff against the existing row — only re-translate fields that actually changed,
  // then merge into the existing translations rather than overwriting wholesale.
  const changedText = {};
  for (const field of ['description', 'problem', 'solution']) {
    if (fields[field] !== undefined && fields[field] !== existing[field]) changedText[field] = fields[field];
  }
  if (Object.keys(changedText).length) {
    const retranslated = await translateProjectText(changedText, existing.sourceLang);
    const translations = { ...(existing.translations || {}) };
    translations[existing.sourceLang] = { ...(translations[existing.sourceLang] || {}), ...changedText };
    for (const [lang, langFields] of Object.entries(retranslated)) {
      translations[lang] = { ...(translations[lang] || {}), ...langFields };
    }
    fields.translations = translations;
  }

  const project = await updatePortfolioProject(req.params.id, fields);
  res.json({ project });
});

// One-time backfill for legacy projects (created before auto-translation existed):
// full re-translate of description/problem/solution. sourceLang may only be
// corrected here while translations is still empty — once real translations
// exist, changing sourceLang would orphan them, so the stored value is reused.
router.post('/:id/translate', requireAdmin, async (req, res) => {
  const existing = await getPortfolioProjectById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'المشروع غير موجود.' });

  const hasTranslations = Object.keys(existing.translations || {}).length > 0;
  if (hasTranslations) {
    return res.status(400).json({ error: 'هذا المشروع مترجم بالفعل.' });
  }

  const { sourceLang: rawSourceLang } = req.body || {};
  const sourceLang = VALID_LANGS.includes(rawSourceLang) ? rawSourceLang : existing.sourceLang;

  const fields = {
    description: existing.description || '',
    problem: existing.problem || '',
    solution: existing.solution || '',
  };
  const retranslated = await translateProjectText(fields, sourceLang);
  const translations = { [sourceLang]: fields, ...retranslated };

  const project = await setPortfolioProjectTranslations(req.params.id, sourceLang, translations);
  res.json({ project });
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const existing = await getPortfolioProjectById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'المشروع غير موجود.' });
  await deletePortfolioProject(req.params.id);
  res.json({ message: 'تم حذف المشروع.' });
});

export default router;
