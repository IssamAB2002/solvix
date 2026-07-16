// ─── STAFF AUTH ──────────────────────────────────────────────────────────────
// Sign-in is for staff only (CEO & developers). Public signup was removed —
// the CEO account is seeded from .env and can create developer accounts here.

import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createUser, findUserByEmail, deleteUserById, listStaff } from '../db.js';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in backend/.env');
}

const STAFF_ROLES = ['ceo', 'developer'];

export function requireStaff(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'غير مصرح.' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (!STAFF_ROLES.includes(payload.role)) {
      return res.status(403).json({ error: 'هذه الصفحة مخصصة لفريق Solvix فقط.' });
    }
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'توكن غير صالح.' });
  }
}

export function requireCeo(req, res, next) {
  requireStaff(req, res, () => {
    if (req.user.role !== 'ceo') {
      return res.status(403).json({ error: 'هذه العملية مخصصة للمدير التنفيذي فقط.' });
    }
    next();
  });
}

router.post('/signin', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'الرجاء تعبئة البريد وكلمة المرور.' });
  }

  const user = await findUserByEmail(email);
  if (!user || !STAFF_ROLES.includes(user.role)) {
    return res.status(401).json({ error: 'بيانات الدخول غير صحيحة.' });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: 'بيانات الدخول غير صحيحة.' });
  }

  const payload = { id: user.id, name: user.name, email: user.email, role: user.role };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
  res.json({ user: payload, token });
});

// CEO manages staff accounts
router.get('/staff', requireCeo, async (_req, res) => {
  res.json({ staff: await listStaff() });
});

router.post('/staff', requireCeo, async (req, res) => {
  const { name, email, password, role = 'developer' } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'الرجاء تعبئة جميع الحقول.' });
  }
  if (!STAFF_ROLES.includes(role)) {
    return res.status(400).json({ error: 'دور غير صالح.' });
  }
  const existing = await findUserByEmail(email);
  if (existing) {
    return res.status(409).json({ error: 'البريد الإلكتروني مستخدم بالفعل.' });
  }
  const hashed = await bcrypt.hash(password, 10);
  const user = await createUser({ name, email, password: hashed, role });
  res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

router.delete('/staff/:id', requireCeo, async (req, res) => {
  if (String(req.user.id) === String(req.params.id)) {
    return res.status(400).json({ error: 'لا يمكنك حذف حسابك الخاص.' });
  }
  await deleteUserById(req.params.id);
  res.json({ message: 'تم حذف الحساب.' });
});

export default router;
