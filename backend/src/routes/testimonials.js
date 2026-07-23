// ─── TESTIMONIALS (public reviews, admin-approved) ───────────────────────────
// Visitors submit a testimonial from the public site (name, project, rating,
// text) which starts as "pending". Staff approve/reject/delete from the admin
// panel; only approved testimonials are shown on the Home page.

import express from 'express';
import { requireStaff, requireAdmin } from './auth.js';
import {
  createTestimonial, listTestimonials, listApprovedTestimonials,
  getTestimonialById, updateTestimonialStatus, deleteTestimonialById,
} from '../db.js';

const router = express.Router();

const TESTIMONIAL_STATUSES = ['pending', 'approved', 'rejected'];

// Public: submit a testimonial.
router.post('/', async (req, res) => {
  const { name, project, rating, text } = req.body || {};
  if (!name?.trim() || !text?.trim()) {
    return res.status(400).json({ error: 'الاسم والنص مطلوبان.' });
  }
  const ratingNum = Math.min(5, Math.max(1, Math.round(Number(rating)) || 5));
  const testimonial = await createTestimonial({
    name: name.trim(),
    project: project?.trim() || '',
    rating: ratingNum,
    text: text.trim(),
  });
  res.json({ message: 'شكراً لك! سيتم مراجعة تقييمك قريباً.', testimonial });
});

// Public: approved testimonials only. Staff: everything (any status).
router.get('/', async (req, res) => {
  if (req.query.all === '1') {
    return requireStaff(req, res, async () => {
      res.json({ testimonials: await listTestimonials() });
    });
  }
  res.json({ testimonials: await listApprovedTestimonials() });
});

// Staff: approve/reject.
router.put('/:id', requireAdmin, async (req, res) => {
  const existing = await getTestimonialById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'التقييم غير موجود.' });

  const { status } = req.body || {};
  if (!TESTIMONIAL_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'حالة غير صالحة.' });
  }
  const testimonial = await updateTestimonialStatus(req.params.id, status);
  res.json({ testimonial });
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const existing = await getTestimonialById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'التقييم غير موجود.' });
  await deleteTestimonialById(req.params.id);
  res.json({ message: 'تم حذف التقييم.' });
});

export default router;
