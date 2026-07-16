// ─── PROJECT REQUESTS (public leads) ─────────────────────────────────────────
// The public "Request a project" form posts here; staff read them in the CRM.
// Staff can approve (→ creates an order + adds the client to the CRM) or cancel.

import express from 'express';
import crypto from 'crypto';
import { requireStaff } from './auth.js';
import { hashKey, generateUid } from './orders.js';
import { createRequest, listRequests, getRequestById, updateRequestStatus, deleteRequestById, createOrder } from '../db.js';

const router = express.Router();

const REQUEST_STATUSES = ['pending', 'approved', 'cancelled'];

const MAX_FILES = 3;
const MAX_FILE_BYTES = 4 * 1024 * 1024; // 4MB raw (base64 data-URI runs ~33% larger)

router.post('/', async (req, res) => {
  const { name, email, phone, projectType, goal, budget, currency, note, files } = req.body;
  if (!name?.trim() || !phone?.trim()) {
    return res.status(400).json({ error: 'الاسم ورقم الهاتف مطلوبان.' });
  }
  let safeFiles = [];
  if (files !== undefined) {
    if (!Array.isArray(files) || files.length > MAX_FILES) {
      return res.status(400).json({ error: `يمكن إرفاق ${MAX_FILES} ملفات كحد أقصى.` });
    }
    for (const f of files) {
      if (!f?.name || !f?.data || typeof f.data !== 'string' || !f.data.startsWith('data:')) {
        return res.status(400).json({ error: 'ملف مرفق غير صالح.' });
      }
      const approxBytes = (f.data.length * 3) / 4;
      if (approxBytes > MAX_FILE_BYTES) {
        return res.status(400).json({ error: `حجم الملف "${f.name}" يتجاوز الحد المسموح (4MB).` });
      }
    }
    safeFiles = files.map((f) => ({ name: String(f.name).slice(0, 200), type: f.type || '', data: f.data }));
  }
  const created = await createRequest({
    name: name.trim(),
    email: email?.trim() || '',
    phone: phone.trim(),
    projectType: projectType?.trim() || '',
    goal: goal?.trim() || '',
    budget: budget?.trim() || '',
    currency: currency === 'usd' ? 'usd' : 'dzd',
    note: note?.trim() || '',
    files: safeFiles,
  });
  res.json({ message: 'تم استلام طلبك.', id: created.id });
});

router.get('/', requireStaff, async (_req, res) => {
  res.json({ requests: await listRequests() });
});

// Staff: change a request's status (pending ↔ cancelled). Approval goes
// through /:id/approve because it also creates the project.
router.put('/:id', requireStaff, async (req, res) => {
  const existing = await getRequestById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'الطلب غير موجود.' });

  const { status } = req.body;
  if (!REQUEST_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'حالة غير صالحة.' });
  }
  const request = await updateRequestStatus(req.params.id, status);
  res.json({ request });
});

// Staff: approve a request → creates an order (project + CRM entry) from it
// and returns the one-time private key for the client.
router.post('/:id/approve', requireStaff, async (req, res) => {
  const request = await getRequestById(req.params.id);
  if (!request) return res.status(404).json({ error: 'الطلب غير موجود.' });
  if (request.status === 'approved') {
    return res.status(400).json({ error: 'هذا الطلب مقبول بالفعل.' });
  }

  const { projectType, description, totalBudget } = req.body || {};
  const fallbackDescription = [
    request.goal && `Goal: ${request.goal}`,
    request.budget && `Budget: ${request.budget}`,
    request.note,
  ].filter(Boolean).join('\n');

  const uid = await generateUid();
  const privateKey = crypto.randomBytes(16).toString('hex'); // 32 chars, shown once
  const order = await createOrder({
    uid,
    privateKeyHash: hashKey(privateKey),
    clientName: request.name,
    clientPhone: request.phone || '',
    clientEmail: request.email || '',
    projectType: projectType?.trim() || request.projectType || '—',
    description: description?.trim() || fallbackDescription,
    totalBudget: Number(totalBudget) || 0,
    features: [],
    createdBy: req.user.name,
  });
  await deleteRequestById(request.id);

  res.json({ order, privateKey });
});

// Staff: permanently delete a request (used for cancelled/declined leads).
router.delete('/:id', requireStaff, async (req, res) => {
  const existing = await getRequestById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'الطلب غير موجود.' });
  await deleteRequestById(req.params.id);
  res.json({ message: 'تم حذف الطلب.' });
});

export default router;
