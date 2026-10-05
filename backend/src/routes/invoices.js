// ─── INVOICES (GENERAL LEDGER) ────────────────────────────────────────────────
// Records project payments, Partner/Developer salary (commission) payouts, and
// general company incomes/expenses. Admin/CEO manage everything; Partners &
// Developers get a read-only view scoped to their own salary payouts and the
// payments on orders attributed to them.

import express from 'express';
import { requireStaff, requireAdmin } from './auth.js';
import { createInvoice, listInvoices, deleteInvoiceById, getInvoiceById, getOrderById, deletePaymentById } from '../db.js';

const router = express.Router();

const CATEGORIES = ['salary', 'payment', 'income', 'expense'];

router.get('/', requireStaff, async (req, res) => {
  const invoices = await listInvoices();
  if (req.user.role === 'partner' || req.user.role === 'developer') {
    const uid = String(req.user.id);
    const scoped = [];
    for (const inv of invoices) {
      if (inv.category === 'salary' && String(inv.userId) === uid) {
        scoped.push(inv);
      } else if (inv.category === 'payment' && inv.orderId) {
        const order = await getOrderById(inv.orderId);
        if (order && (String(order.partnerId) === uid || String(order.developerId) === uid)) scoped.push(inv);
      }
    }
    return res.json({ invoices: scoped });
  }
  res.json({ invoices });
});

router.post('/', requireAdmin, async (req, res) => {
  const { category, orderId, userId, amount, currency, note } = req.body || {};
  if (!CATEGORIES.includes(category)) {
    return res.status(400).json({ error: 'فئة الفاتورة غير صالحة.' });
  }
  const amountNum = Number(amount);
  if (!amountNum || amountNum <= 0) {
    return res.status(400).json({ error: 'المبلغ يجب أن يكون أكبر من صفر.' });
  }
  if (category === 'payment' && !orderId) {
    return res.status(400).json({ error: 'يجب اختيار المشروع.' });
  }
  if (category === 'salary' && !userId) {
    return res.status(400).json({ error: 'يجب اختيار الشريك أو المطور.' });
  }

  const invoice = await createInvoice({
    category,
    orderId: category === 'payment' ? orderId : null,
    userId: category === 'salary' ? userId : null,
    amount: amountNum,
    currency: currency === 'usd' ? 'usd' : 'dzd',
    note: note?.trim() || '',
    createdBy: req.user.name,
  });
  res.json({ invoice });
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const existing = await getInvoiceById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'الفاتورة غير موجودة.' });
  // A "payment"-category invoice mirrors a row in `payments` — delete both so
  // the client's amountPaid/progress stays consistent with the ledger.
  if (existing.category === 'payment' && existing.paymentId) {
    await deletePaymentById(existing.paymentId);
  }
  await deleteInvoiceById(req.params.id);
  res.json({ message: 'تم حذف الفاتورة.' });
});

export default router;
