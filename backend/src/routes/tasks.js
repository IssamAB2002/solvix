// ─── KANBAN TASKS (staff) ────────────────────────────────────────────────────

import express from 'express';
import { requireStaff } from './auth.js';
import { listTasks, createTask, updateTask, deleteTask } from '../db.js';

const router = express.Router();

const LANES = ['todo', 'doing', 'done'];
const PRIORITIES = ['low', 'mid', 'high'];

router.get('/', requireStaff, async (_req, res) => {
  res.json({ tasks: await listTasks() });
});

router.post('/', requireStaff, async (req, res) => {
  const { title, client, priority = 'mid', lane = 'todo' } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'عنوان المهمة مطلوب.' });
  if (!LANES.includes(lane) || !PRIORITIES.includes(priority)) {
    return res.status(400).json({ error: 'قيمة غير صالحة.' });
  }
  const task = await createTask({ title: title.trim(), client: client?.trim() || '', priority, lane });
  res.json({ task });
});

router.put('/:id', requireStaff, async (req, res) => {
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

router.delete('/:id', requireStaff, async (req, res) => {
  await deleteTask(req.params.id);
  res.json({ message: 'تم حذف المهمة.' });
});

export default router;
