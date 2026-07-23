// ─── STAFF AUTH ──────────────────────────────────────────────────────────────
// Sign-in is for staff only (CEO, admins & developers). Public signup was removed —
// the CEO account is seeded from .env and can create admin/developer accounts here.

import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createUser, findUserByEmail, findUserById, updateUserPassword, deleteUserById, listStaff } from '../db.js';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in backend/.env');
}

const STAFF_ROLES = ['ceo', 'admin', 'developer'];

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

export function requireAdmin(req, res, next) {
  requireStaff(req, res, () => {
    if (!['ceo', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'هذه العملية مخصصة للمدراء فقط.' });
    }
    next();
  });
}

export function requireCeo(req, res, next) {
  requireStaff(req, res, () => {
    if (req.user.role !== 'ceo') {
      return res.status(403).json({ error: 'هذه العملية مخصصة للمدير التنفيذي فقط.' });
    }
    next();
  });
}

function signToken(user) {
  const payload = { id: user.id, name: user.name, email: user.email, role: user.role, mustChangePassword: !!user.mustChangePassword };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
  return { payload, token };
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

  const { payload, token } = signToken(user);
  res.json({ user: payload, token });
});

// Any signed-in staff member changes their own password.
router.patch('/me/password', requireStaff, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'الرجاء تعبئة جميع الحقول.' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل.' });
  }

  const user = await findUserById(req.user.id);
  if (!user) return res.status(404).json({ error: 'الحساب غير موجود.' });

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) {
    return res.status(401).json({ error: 'كلمة المرور الحالية غير صحيحة.' });
  }

  const hashed = await bcrypt.hash(newPassword, 10);
  await updateUserPassword(user.id, hashed, false);

  const { payload, token } = signToken({ ...user, mustChangePassword: false });
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
  if (role === 'ceo' || !STAFF_ROLES.includes(role)) {
    return res.status(400).json({ error: 'دور غير صالح.' });
  }
  const existing = await findUserByEmail(email);
  if (existing) {
    return res.status(409).json({ error: 'البريد الإلكتروني مستخدم بالفعل.' });
  }
  const hashed = await bcrypt.hash(password, 10);
  const user = await createUser({ name, email, password: hashed, role, mustChangePassword: true });
  res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, mustChangePassword: true } });
});

// CEO resets a staff member's password (forces them to change it on next login).
router.patch('/staff/:id/reset-password', requireCeo, async (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 8) {
    return res.status(400).json({ error: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل.' });
  }
  const target = await findUserById(req.params.id);
  if (!target || target.role === 'ceo') {
    return res.status(404).json({ error: 'الحساب غير موجود.' });
  }
  const hashed = await bcrypt.hash(password, 10);
  await updateUserPassword(target.id, hashed, true);
  res.json({ user: { id: target.id, name: target.name, email: target.email, role: target.role, mustChangePassword: true } });
});

router.delete('/staff/:id', requireCeo, async (req, res) => {
  if (String(req.user.id) === String(req.params.id)) {
    return res.status(400).json({ error: 'لا يمكنك حذف حسابك الخاص.' });
  }
  await deleteUserById(req.params.id);
  res.json({ message: 'تم حذف الحساب.' });
});

export default router;
