// ─── ORDERS, PAYMENTS & CLIENT TRACKING ──────────────────────────────────────
// Staff create orders; each order gets a public UID + a private key (shown once,
// stored as a SHA-256 hash). Clients use the private key on the public /track
// endpoint to see their project progress, feature prices and budget.

import express from 'express';
import crypto from 'crypto';
import { requireStaff, requireAdmin } from './auth.js';
import {
  createOrder, listOrders, getOrderById, getOrderByUid, findOrderIdByKeyHash,
  updateOrder, updateOrderKeyHash, replaceOrderFeatures, deleteOrder, countOrders,
  addPayment, listPayments,
} from '../db.js';

const router = express.Router();

// Stage pipeline shown depends on the project's kind — a debugging job doesn't
// need a "design" stage, a bugfix doesn't need "analysis"/"design" from scratch.
const STAGE_SETS = {
  new: ['analysis', 'design', 'development', 'testing', 'deployment'],
  developing: ['analysis', 'development', 'testing', 'deployment'],
  debugging: ['diagnosis', 'fixing', 'testing', 'deployment'],
};
const ORDER_KINDS = Object.keys(STAGE_SETS);
const validStatuses = (kind) => [...(STAGE_SETS[kind] || STAGE_SETS.new), 'delivered'];

export function hashKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

function sanitizeFeatures(features) {
  if (!Array.isArray(features)) return [];
  return features
    .filter((f) => f && typeof f.name === 'string' && f.name.trim())
    .map((f) => ({ name: f.name.trim(), price: Number(f.price) || 0, done: !!f.done }));
}

export async function generateUid() {
  const year = new Date().getFullYear();
  let n = (await countOrders()) + 1;
  for (let attempt = 0; attempt < 50; attempt++, n++) {
    const uid = `SLVX-${year}-${String(n).padStart(4, '0')}`;
    if (!(await getOrderByUid(uid))) return uid;
  }
  return `SLVX-${year}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

// ── Staff: orders CRUD ────────────────────────────────────────────────────────
router.get('/orders', requireStaff, async (_req, res) => {
  res.json({ orders: await listOrders() });
});

router.get('/orders/:id', requireStaff, async (req, res) => {
  const order = await getOrderById(req.params.id);
  if (!order) return res.status(404).json({ error: 'الطلب غير موجود.' });
  res.json({ order });
});

router.post('/orders', requireAdmin, async (req, res) => {
  const { clientName, clientPhone, clientEmail, projectType, description, kind, totalBudget, features } = req.body;
  if (!clientName?.trim() || !projectType?.trim()) {
    return res.status(400).json({ error: 'اسم العميل ونوع المشروع مطلوبان.' });
  }
  if (kind !== undefined && !ORDER_KINDS.includes(kind)) {
    return res.status(400).json({ error: 'نوع مشروع غير صالح.' });
  }

  const uid = await generateUid();
  const privateKey = crypto.randomBytes(16).toString('hex'); // 32 chars, shown once
  const order = await createOrder({
    uid,
    privateKeyHash: hashKey(privateKey),
    clientName: clientName.trim(),
    clientPhone: clientPhone?.trim() || '',
    clientEmail: clientEmail?.trim() || '',
    projectType: projectType.trim(),
    description: description?.trim() || '',
    kind: ORDER_KINDS.includes(kind) ? kind : 'new',
    totalBudget: Number(totalBudget) || 0,
    features: sanitizeFeatures(features),
    createdBy: req.user.name,
  });

  res.json({ order, privateKey });
});

router.put('/orders/:id', requireStaff, async (req, res) => {
  const existing = await getOrderById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'الطلب غير موجود.' });

  // Developers only move the build through its stages — everything else
  // (client info, budget, features…) requires admin/ceo.
  if (req.user.role === 'developer') {
    const allowedKeys = ['status', 'progressPct'];
    const extraKeys = Object.keys(req.body).filter((k) => !allowedKeys.includes(k));
    if (extraKeys.length) {
      return res.status(403).json({ error: 'يمكنك فقط تحديث حالة ونسبة تقدم المشروع.' });
    }
  }

  const { status, progressPct, features, ...rest } = req.body;
  const fields = { ...rest };

  if (status !== undefined) {
    if (!validStatuses(existing.kind).includes(status)) {
      return res.status(400).json({ error: 'حالة غير صالحة.' });
    }
    fields.status = status;
  }
  if (progressPct !== undefined) {
    const pct = Number(progressPct);
    if (Number.isNaN(pct) || pct < 0 || pct > 100) {
      return res.status(400).json({ error: 'نسبة التقدم يجب أن تكون بين 0 و 100.' });
    }
    fields.progressPct = Math.round(pct);
  }
  if (fields.totalBudget !== undefined) fields.totalBudget = Number(fields.totalBudget) || 0;

  if (features !== undefined) {
    await replaceOrderFeatures(req.params.id, sanitizeFeatures(features));
  }
  const order = await updateOrder(req.params.id, fields);
  res.json({ order });
});

router.delete('/orders/:id', requireAdmin, async (req, res) => {
  const existing = await getOrderById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'الطلب غير موجود.' });
  await deleteOrder(req.params.id);
  res.json({ message: 'تم حذف الطلب.' });
});

// Staff: invalidate the client's current tracking key and issue a new one
// (e.g. if it was shared with the wrong person). Shown once, like on creation.
router.post('/orders/:id/regenerate-key', requireAdmin, async (req, res) => {
  const existing = await getOrderById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'الطلب غير موجود.' });
  const privateKey = crypto.randomBytes(16).toString('hex');
  const order = await updateOrderKeyHash(req.params.id, hashKey(privateKey));
  res.json({ order, privateKey });
});

// ── Staff: payments ───────────────────────────────────────────────────────────
router.get('/payments', requireStaff, async (_req, res) => {
  res.json({ payments: await listPayments() });
});

router.post('/orders/:id/payments', requireAdmin, async (req, res) => {
  const existing = await getOrderById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'الطلب غير موجود.' });

  const amount = Number(req.body.amount);
  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'المبلغ يجب أن يكون أكبر من صفر.' });
  }
  const order = await addPayment(req.params.id, { amount, note: req.body.note?.trim() || '', createdBy: req.user.name });
  res.json({ order });
});

// ── Public: client tracking (rate-limited) ────────────────────────────────────
const trackAttempts = new Map(); // ip → { count, resetAt }
const TRACK_LIMIT = 30;
const TRACK_WINDOW_MS = 15 * 60 * 1000;

function trackRateLimit(req, res, next) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const entry = trackAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    trackAttempts.set(ip, { count: 1, resetAt: now + TRACK_WINDOW_MS });
    return next();
  }
  entry.count += 1;
  if (entry.count > TRACK_LIMIT) {
    return res.status(429).json({ error: 'محاولات كثيرة. حاول مجدداً بعد قليل.' });
  }
  next();
}

router.post('/track', trackRateLimit, async (req, res) => {
  const privateKey = req.body.privateKey?.trim();
  if (!privateKey) {
    return res.status(400).json({ error: 'الرجاء إدخال المفتاح الخاص.' });
  }

  const orderId = await findOrderIdByKeyHash(hashKey(privateKey));
  if (!orderId) {
    return res.status(404).json({ error: 'المفتاح غير صحيح. تأكد منه وحاول مجدداً.' });
  }

  const order = await getOrderById(orderId);
  const remaining = Math.max(0, (order.totalBudget || 0) - (order.amountPaid || 0));
  res.json({
    order: {
      uid: order.uid,
      clientName: order.clientName,
      projectType: order.projectType,
      description: order.description,
      kind: order.kind || 'new',
      status: order.status,
      progressPct: order.progressPct,
      totalBudget: order.totalBudget,
      amountPaid: order.amountPaid,
      remaining,
      features: (order.features || []).map(({ name, price, done }) => ({ name, price, done })),
      payments: (order.payments || []).map(({ amount, note, createdAt }) => ({ amount, note, createdAt })),
      createdAt: order.createdAt,
    },
  });
});

export default router;
