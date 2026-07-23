// ─── PORTFOLIO (public "our work" showcase) ──────────────────────────────────
// Staff manage entries from the admin panel (title, stack, description,
// problem/solution, ordered images as base64 data-URIs). The public site reads
// them to render the Projects page and each project's details page.

import express from 'express';
import { requireAdmin } from './auth.js';
import {
  listPortfolioProjects, getPortfolioProjectById, getPortfolioProjectBySlug,
  createPortfolioProject, updatePortfolioProject, deletePortfolioProject,
} from '../db.js';

const router = express.Router();

const MAX_IMAGES = 10;

function sanitizeStack(stack) {
  if (!Array.isArray(stack)) return [];
  return stack.map((s) => String(s).trim()).filter(Boolean).slice(0, 20);
}

function sanitizeImages(images) {
  if (!Array.isArray(images)) return [];
  return images.filter((s) => typeof s === 'string' && s.startsWith('data:image/')).slice(0, MAX_IMAGES);
}

// Public: list (without full image payloads — cover image only) & single project.
router.get('/', async (_req, res) => {
  const projects = await listPortfolioProjects();
  res.json({
    projects: projects.map((p) => ({
      id: p.id, title: p.title, slug: p.slug, stack: p.stack,
      description: p.description, cover: p.images[0] || null, createdAt: p.createdAt,
    })),
  });
});

router.get('/:slug', async (req, res) => {
  const project = await getPortfolioProjectBySlug(req.params.slug);
  if (!project) return res.status(404).json({ error: 'المشروع غير موجود.' });
  res.json({ project });
});

// Staff: CRUD
router.post('/', requireAdmin, async (req, res) => {
  const { title, stack, description, problem, solution, images } = req.body || {};
  if (!title?.trim()) {
    return res.status(400).json({ error: 'عنوان المشروع مطلوب.' });
  }
  const project = await createPortfolioProject({
    title: title.trim(),
    stack: sanitizeStack(stack),
    description: description?.trim() || '',
    problem: problem?.trim() || '',
    solution: solution?.trim() || '',
    images: sanitizeImages(images),
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

  const project = await updatePortfolioProject(req.params.id, fields);
  res.json({ project });
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const existing = await getPortfolioProjectById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'المشروع غير موجود.' });
  await deletePortfolioProject(req.params.id);
  res.json({ message: 'تم حذف المشروع.' });
});

export default router;
