// ─── KANBAN TASKS (staff) ────────────────────────────────────────────────────

import express from 'express';
import { requireAdmin } from './auth.js';
import { listTasks, createTask, updateTask, deleteTask } from '../db.js';

const router = express.Router();

const LANES = ['todo', 'doing', 'done'];
const PRIORITIES = ['low', 'mid', 'high'];

// Admin/CEO only — Partners & Developers don't get a Kanban view in the
// Direction panel (partnership feature scoping).
router.get('/', requireAdmin, async (_req, res) => {
  res.json({ tasks: await listTasks() });
});

router.post('/', requireAdmin, async (req, res) => {
  const { title, client, priority = 'mid', lane = 'todo' } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'عنوان المهمة مطلوب.' });
  if (!LANES.includes(lane) || !PRIORITIES.includes(priority)) {
    return res.status(400).json({ error: 'قيمة غير صالحة.' });
  }
  const task = await createTask({ title: title.trim(), client: client?.trim() || '', priority, lane });
  res.json({ task });
});

router.put('/:id', requireAdmin, async (req, res) => {
  const { title, client, priority, lane } = req.body;
  if (lane !== undefined && !LANES.includes(lane)) {
    return res.status(400).json({ error: 'قيمة غير صالحة.' });
  }
  if (priority !== undefined && !PRIORITIES.includes(priority)) {
    return res.status(400).json({ error: 'قيمة غير صالحة.' });
  }
  const task = await updateTask(req.params.id, { title, client, priority, lane });
  if (!task) return res.status(404).json({ error: 'المهمة غير موجودة.' });
  res.json({ task });
});

router.delete('/:id', requireAdmin, async (req, res) => {
  await deleteTask(req.params.id);
  res.json({ message: 'تم حذف المهمة.' });
});

export default router;
