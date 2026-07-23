// ─── DATABASE LAYER ──────────────────────────────────────────────────────────
// Supports SQLite (default), PostgreSQL and MongoDB via DB_TYPE.
// Entities: users (staff), orders (+features +payments), requests (leads), tasks (kanban).

import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { Pool } from 'pg';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const DB_TYPE = process.env.DB_TYPE?.trim().toLowerCase() || 'sqlite';
const POSTGRES_URL = (process.env.POSTGRES_URL || process.env.DATABASE_URL)?.trim();
const MONGODB_URI = (process.env.MONGODB_URI || process.env.MONGO_URL)?.trim();
const SQLITE_FILE = './data/solvix.db';

const IS_MONGO = DB_TYPE === 'mongodb';
const IS_PG = DB_TYPE === 'postgres';

let pgPool;
let sqliteDb;
let UserModel, OrderModel, RequestModel, TaskModel, PortfolioModel, TestimonialModel;

// ── Mongoose schemas ──────────────────────────────────────────────────────────
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, default: '' },
    password: { type: String, required: true },
    role: { type: String, default: null },
    mustChangePassword: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  { collection: 'users' }
);

const orderSchema = new mongoose.Schema(
  {
    uid: { type: String, required: true, unique: true },
    privateKeyHash: { type: String, required: true, index: true },
    clientName: { type: String, required: true },
    clientPhone: { type: String, default: '' },
    clientEmail: { type: String, default: '' },
    projectType: { type: String, default: '' },
    description: { type: String, default: '' },
    kind: { type: String, default: 'new' },
    status: { type: String, default: 'analysis' },
    progressPct: { type: Number, default: 0 },
    totalBudget: { type: Number, default: 0 },
    features: [{ name: String, price: Number, done: { type: Boolean, default: false } }],
    payments: [{ amount: Number, note: String, createdBy: { type: String, default: '' }, createdAt: { type: Date, default: Date.now } }],
    createdBy: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
  },
  { collection: 'orders' }
);

const requestSchema = new mongoose.Schema(
  {
    name: String,
    email: String,
    phone: String,
    projectType: String,
    goal: String,
    budget: String,
    currency: { type: String, default: 'dzd' },
    kind: { type: String, default: 'new' },
    note: String,
    files: [{ name: String, type: String, data: String }],
    status: { type: String, default: 'pending' },
    createdAt: { type: Date, default: Date.now },
  },
  { collection: 'requests' }
);

const taskSchema = new mongoose.Schema(
  {
    title: String,
    client: String,
    priority: { type: String, default: 'mid' },
    lane: { type: String, default: 'todo' },
    createdAt: { type: Date, default: Date.now },
  },
  { collection: 'tasks' }
);

// Public "our work" showcase — separate from `orders` (which the admin UI also
// labels "Projects"). Images are stored as base64 data-URIs, ordered.
const portfolioSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    stack: [{ type: String }],
    description: { type: String, default: '' },
    problem: { type: String, default: '' },
    solution: { type: String, default: '' },
    images: [{ type: String }],
    createdAt: { type: Date, default: Date.now },
  },
  { collection: 'portfolio_projects' }
);

// Public testimonials submitted by visitors, shown on the Home page once a
// staff member approves them from the admin panel.
const testimonialSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    project: { type: String, default: '' },
    rating: { type: Number, default: 5 },
    text: { type: String, required: true },
    status: { type: String, default: 'pending' },
    createdAt: { type: Date, default: Date.now },
  },
  { collection: 'testimonials' }
);

// ── SQL helpers (shared between SQLite & PostgreSQL) ─────────────────────────
// Queries are written with $1..$n placeholders (ascending order of appearance);
// they are converted to '?' for SQLite.
function toSqlite(text) {
  return text.replace(/\$\d+/g, '?');
}

async function all(text, params = []) {
  if (IS_PG) {
    const res = await pgPool.query(text, params);
    return res.rows;
  }
  return sqliteDb.all(toSqlite(text), params);
}

async function get(text, params = []) {
  const rows = await all(text, params);
  return rows[0] || null;
}

async function run(text, params = []) {
  if (IS_PG) {
    await pgPool.query(text, params);
    return {};
  }
  return sqliteDb.run(toSqlite(text), params);
}

// INSERT that returns the new row id on both drivers.
async function insert(text, params = []) {
  if (IS_PG) {
    const res = await pgPool.query(`${text} RETURNING id`, params);
    return res.rows[0].id;
  }
  const res = await sqliteDb.run(toSqlite(text), params);
  return res.lastID;
}

// ── Row → API object mappers ──────────────────────────────────────────────────
function mapUser(row) {
  if (!row) return null;
  if (row._id) {
    return { id: row._id.toString(), name: row.name, email: row.email, phone: row.phone || '', password: row.password, role: row.role ?? null, mustChangePassword: !!row.mustChangePassword };
  }
  return { id: row.id, name: row.name, email: row.email, phone: row.phone || '', password: row.password, role: row.role ?? null, mustChangePassword: !!row.must_change_password };
}

function mapOrder(row) {
  if (!row) return null;
  return {
    id: row.id,
    uid: row.uid,
    clientName: row.client_name,
    clientPhone: row.client_phone,
    clientEmail: row.client_email,
    projectType: row.project_type,
    description: row.description,
    kind: row.kind || 'new',
    status: row.status,
    progressPct: row.progress_pct,
    totalBudget: row.total_budget,
    amountPaid: row.amount_paid ?? 0,
    createdBy: row.created_by || '',
    createdAt: row.created_at,
  };
}

function mapMongoOrder(doc) {
  if (!doc) return null;
  const amountPaid = (doc.payments || []).reduce((s, p) => s + (p.amount || 0), 0);
  return {
    id: doc._id.toString(),
    uid: doc.uid,
    clientName: doc.clientName,
    clientPhone: doc.clientPhone,
    clientEmail: doc.clientEmail,
    projectType: doc.projectType,
    description: doc.description,
    kind: doc.kind || 'new',
    status: doc.status,
    progressPct: doc.progressPct,
    totalBudget: doc.totalBudget,
    amountPaid,
    createdBy: doc.createdBy || '',
    createdAt: doc.createdAt,
  };
}

// ── Init & seed ───────────────────────────────────────────────────────────────
export async function initDb() {
  if (IS_PG) {
    if (!POSTGRES_URL) throw new Error('POSTGRES_URL is required for PostgreSQL.');
    pgPool = new Pool({ connectionString: POSTGRES_URL });
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        phone TEXT DEFAULT '',
        password TEXT NOT NULL,
        role TEXT,
        must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        uid TEXT NOT NULL UNIQUE,
        private_key_hash TEXT NOT NULL,
        client_name TEXT NOT NULL,
        client_phone TEXT DEFAULT '',
        client_email TEXT DEFAULT '',
        project_type TEXT DEFAULT '',
        description TEXT DEFAULT '',
        kind TEXT NOT NULL DEFAULT 'new',
        status TEXT NOT NULL DEFAULT 'analysis',
        progress_pct INTEGER NOT NULL DEFAULT 0,
        total_budget REAL NOT NULL DEFAULT 0,
        created_by TEXT DEFAULT '',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_orders_key ON orders (private_key_hash);
      CREATE TABLE IF NOT EXISTS order_features (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        price REAL NOT NULL DEFAULT 0,
        done INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        amount REAL NOT NULL,
        note TEXT DEFAULT '',
        created_by TEXT DEFAULT '',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS requests (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT DEFAULT '',
        phone TEXT DEFAULT '',
        project_type TEXT DEFAULT '',
        goal TEXT DEFAULT '',
        budget TEXT DEFAULT '',
        currency TEXT NOT NULL DEFAULT 'dzd',
        kind TEXT NOT NULL DEFAULT 'new',
        note TEXT DEFAULT '',
        files TEXT DEFAULT '[]',
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        client TEXT DEFAULT '',
        priority TEXT NOT NULL DEFAULT 'mid',
        lane TEXT NOT NULL DEFAULT 'todo',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS portfolio_projects (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        stack TEXT DEFAULT '[]',
        description TEXT DEFAULT '',
        problem TEXT DEFAULT '',
        solution TEXT DEFAULT '',
        images TEXT DEFAULT '[]',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS testimonials (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        project TEXT DEFAULT '',
        rating INTEGER NOT NULL DEFAULT 5,
        text TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);
  } else if (IS_MONGO) {
    if (!MONGODB_URI) throw new Error('MONGODB_URI is required for MongoDB.');
    await mongoose.connect(MONGODB_URI);
    UserModel = mongoose.models.User || mongoose.model('User', userSchema);
    OrderModel = mongoose.models.Order || mongoose.model('Order', orderSchema);
    RequestModel = mongoose.models.Request || mongoose.model('Request', requestSchema);
    TaskModel = mongoose.models.Task || mongoose.model('Task', taskSchema);
    PortfolioModel = mongoose.models.PortfolioProject || mongoose.model('PortfolioProject', portfolioSchema);
    TestimonialModel = mongoose.models.Testimonial || mongoose.model('Testimonial', testimonialSchema);
  } else {
    sqliteDb = await open({ filename: SQLITE_FILE, driver: sqlite3.Database });
    await sqliteDb.exec('PRAGMA foreign_keys = ON;');
    await sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        phone TEXT DEFAULT '',
        password TEXT NOT NULL,
        role TEXT,
        must_change_password INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uid TEXT NOT NULL UNIQUE,
        private_key_hash TEXT NOT NULL,
        client_name TEXT NOT NULL,
        client_phone TEXT DEFAULT '',
        client_email TEXT DEFAULT '',
        project_type TEXT DEFAULT '',
        description TEXT DEFAULT '',
        kind TEXT NOT NULL DEFAULT 'new',
        status TEXT NOT NULL DEFAULT 'analysis',
        progress_pct INTEGER NOT NULL DEFAULT 0,
        total_budget REAL NOT NULL DEFAULT 0,
        created_by TEXT DEFAULT '',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_orders_key ON orders (private_key_hash);
      CREATE TABLE IF NOT EXISTS order_features (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        price REAL NOT NULL DEFAULT 0,
        done INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        amount REAL NOT NULL,
        note TEXT DEFAULT '',
        created_by TEXT DEFAULT '',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT DEFAULT '',
        phone TEXT DEFAULT '',
        project_type TEXT DEFAULT '',
        goal TEXT DEFAULT '',
        budget TEXT DEFAULT '',
        currency TEXT NOT NULL DEFAULT 'dzd',
        kind TEXT NOT NULL DEFAULT 'new',
        note TEXT DEFAULT '',
        files TEXT DEFAULT '[]',
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        client TEXT DEFAULT '',
        priority TEXT NOT NULL DEFAULT 'mid',
        lane TEXT NOT NULL DEFAULT 'todo',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS portfolio_projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        stack TEXT DEFAULT '[]',
        description TEXT DEFAULT '',
        problem TEXT DEFAULT '',
        solution TEXT DEFAULT '',
        images TEXT DEFAULT '[]',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS testimonials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        project TEXT DEFAULT '',
        rating INTEGER NOT NULL DEFAULT 5,
        text TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  await migrate();
  await seedAdmin();
}

// One-shot migrations for databases created before these columns/values existed.
async function migrate() {
  if (IS_MONGO) {
    await OrderModel.updateMany({ status: 'delivery' }, { $set: { status: 'deployment' } });
    await RequestModel.updateMany({ status: { $exists: false } }, { $set: { status: 'pending' } });
    await RequestModel.updateMany({ currency: { $exists: false } }, { $set: { currency: 'dzd' } });
    await RequestModel.updateMany({ kind: { $exists: false } }, { $set: { kind: 'new' } });
    await OrderModel.updateMany({ kind: { $exists: false } }, { $set: { kind: 'new' } });
    await UserModel.updateMany({ mustChangePassword: { $exists: false } }, { $set: { mustChangePassword: false } });
    return;
  }
  if (IS_PG) {
    await pgPool.query(`ALTER TABLE requests ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'`);
    await pgPool.query(`ALTER TABLE requests ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'dzd'`);
    await pgPool.query(`ALTER TABLE requests ADD COLUMN IF NOT EXISTS files TEXT DEFAULT '[]'`);
    await pgPool.query(`ALTER TABLE requests ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'new'`);
    await pgPool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS created_by TEXT DEFAULT ''`);
    await pgPool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'new'`);
    await pgPool.query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS created_by TEXT DEFAULT ''`);
    await pgPool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE`);
    await pgPool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT ''`);
  } else {
    try {
      await sqliteDb.exec(`ALTER TABLE requests ADD COLUMN status TEXT NOT NULL DEFAULT 'pending'`);
    } catch { /* column already exists */ }
    try {
      await sqliteDb.exec(`ALTER TABLE requests ADD COLUMN currency TEXT NOT NULL DEFAULT 'dzd'`);
    } catch { /* column already exists */ }
    try {
      await sqliteDb.exec(`ALTER TABLE requests ADD COLUMN files TEXT DEFAULT '[]'`);
    } catch { /* column already exists */ }
    try {
      await sqliteDb.exec(`ALTER TABLE requests ADD COLUMN kind TEXT NOT NULL DEFAULT 'new'`);
    } catch { /* column already exists */ }
    try {
      await sqliteDb.exec(`ALTER TABLE orders ADD COLUMN created_by TEXT DEFAULT ''`);
    } catch { /* column already exists */ }
    try {
      await sqliteDb.exec(`ALTER TABLE orders ADD COLUMN kind TEXT NOT NULL DEFAULT 'new'`);
    } catch { /* column already exists */ }
    try {
      await sqliteDb.exec(`ALTER TABLE payments ADD COLUMN created_by TEXT DEFAULT ''`);
    } catch { /* column already exists */ }
    try {
      await sqliteDb.exec(`ALTER TABLE users ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0`);
    } catch { /* column already exists */ }
    try {
      await sqliteDb.exec(`ALTER TABLE users ADD COLUMN phone TEXT DEFAULT ''`);
    } catch { /* column already exists */ }
  }
  await run(`UPDATE orders SET status = 'deployment' WHERE status = 'delivery'`);
}

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || 'Solvix CEO';
  if (!email || !password) {
    console.warn('[solvix] ADMIN_EMAIL / ADMIN_PASSWORD not set — no CEO account seeded.');
    return;
  }
  const existing = await findUserByEmail(email);
  if (existing) {
    if (existing.role !== 'ceo') await setUserRole(existing.id, 'ceo');
    return;
  }
  const hashed = await bcrypt.hash(password, 10);
  await createUser({ name, email, password: hashed, role: 'ceo', mustChangePassword: false });
  console.log(`[solvix] CEO account seeded: ${email}`);
}

// ── Users (staff) ─────────────────────────────────────────────────────────────
export async function findUserByEmail(email) {
  if (IS_MONGO) return mapUser(await UserModel.findOne({ email }).lean());
  return mapUser(await get('SELECT id, name, email, phone, password, role, must_change_password FROM users WHERE email = $1', [email]));
}

export async function findUserById(id) {
  if (IS_MONGO) return mapUser(await UserModel.findById(id).lean());
  return mapUser(await get('SELECT id, name, email, phone, password, role, must_change_password FROM users WHERE id = $1', [id]));
}

export async function createUser({ name, email, phone = '', password, role = null, mustChangePassword = false }) {
  if (IS_MONGO) {
    const saved = await new UserModel({ name, email, phone, password, role, mustChangePassword }).save();
    return mapUser(saved.toObject());
  }
  const id = await insert(
    'INSERT INTO users (name, email, phone, password, role, must_change_password) VALUES ($1, $2, $3, $4, $5, $6)',
    [name, email, phone, password, role, mustChangePassword]
  );
  return { id, name, email, phone, role, mustChangePassword };
}

export async function setUserRole(id, role) {
  if (IS_MONGO) return void (await UserModel.updateOne({ _id: id }, { role }));
  await run('UPDATE users SET role = $1 WHERE id = $2', [role, id]);
}

export async function updateUserPassword(id, hashedPassword, mustChangePassword) {
  if (IS_MONGO) return void (await UserModel.updateOne({ _id: id }, { password: hashedPassword, mustChangePassword }));
  await run('UPDATE users SET password = $1, must_change_password = $2 WHERE id = $3', [hashedPassword, mustChangePassword, id]);
}

export async function listStaff() {
  if (IS_MONGO) {
    const docs = await UserModel.find({ role: { $in: ['ceo', 'admin', 'developer'] } }).lean();
    return docs.map((d) => ({ id: d._id.toString(), name: d.name, email: d.email, phone: d.phone || '', role: d.role, mustChangePassword: !!d.mustChangePassword }));
  }
  const rows = await all("SELECT id, name, email, phone, role, must_change_password FROM users WHERE role IN ('ceo','admin','developer') ORDER BY id", []);
  return rows.map((r) => ({ id: r.id, name: r.name, email: r.email, phone: r.phone || '', role: r.role, mustChangePassword: !!r.must_change_password }));
}

export async function deleteUserById(id) {
  if (IS_MONGO) return void (await UserModel.deleteOne({ _id: id }));
  await run('DELETE FROM users WHERE id = $1', [id]);
}

// ── Orders ────────────────────────────────────────────────────────────────────
const ORDER_PAID_SELECT = `
  SELECT o.*,
    COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.order_id = o.id), 0) AS amount_paid
  FROM orders o`;

export async function createOrder(data) {
  const { uid, privateKeyHash, clientName, clientPhone = '', clientEmail = '', projectType = '', description = '', kind = 'new', totalBudget = 0, features = [], createdBy = '' } = data;

  if (IS_MONGO) {
    const saved = await new OrderModel({
      uid, privateKeyHash, clientName, clientPhone, clientEmail, projectType, description, kind,
      totalBudget, features: features.map((f) => ({ name: f.name, price: Number(f.price) || 0 })), createdBy,
    }).save();
    return mapMongoOrder(saved.toObject());
  }

  const id = await insert(
    `INSERT INTO orders (uid, private_key_hash, client_name, client_phone, client_email, project_type, description, kind, total_budget, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [uid, privateKeyHash, clientName, clientPhone, clientEmail, projectType, description, kind, totalBudget, createdBy]
  );
  for (const f of features) {
    await run('INSERT INTO order_features (order_id, name, price) VALUES ($1, $2, $3)', [id, f.name, Number(f.price) || 0]);
  }
  return getOrderById(id);
}

export async function listOrders() {
  if (IS_MONGO) {
    const docs = await OrderModel.find().sort({ createdAt: -1 }).lean();
    return docs.map(mapMongoOrder);
  }
  const rows = await all(`${ORDER_PAID_SELECT} ORDER BY o.created_at DESC, o.id DESC`, []);
  return rows.map(mapOrder);
}

export async function getOrderById(id) {
  if (IS_MONGO) {
    const doc = await OrderModel.findById(id).lean();
    if (!doc) return null;
    return {
      ...mapMongoOrder(doc),
      features: (doc.features || []).map((f) => ({ name: f.name, price: f.price, done: !!f.done })),
      payments: (doc.payments || []).map((p) => ({ amount: p.amount, note: p.note, createdBy: p.createdBy || '', createdAt: p.createdAt })),
    };
  }
  const row = await get(`${ORDER_PAID_SELECT} WHERE o.id = $1`, [id]);
  if (!row) return null;
  const features = await all('SELECT id, name, price, done FROM order_features WHERE order_id = $1 ORDER BY id', [id]);
  const payments = await all('SELECT id, amount, note, created_by, created_at FROM payments WHERE order_id = $1 ORDER BY id', [id]);
  return {
    ...mapOrder(row),
    features: features.map((f) => ({ id: f.id, name: f.name, price: f.price, done: !!f.done })),
    payments: payments.map((p) => ({ id: p.id, amount: p.amount, note: p.note, createdBy: p.created_by || '', createdAt: p.created_at })),
  };
}

export async function getOrderByUid(uid) {
  if (IS_MONGO) return mapMongoOrder(await OrderModel.findOne({ uid }).lean());
  return mapOrder(await get(`${ORDER_PAID_SELECT} WHERE o.uid = $1`, [uid]));
}

export async function findOrderIdByKeyHash(hash) {
  if (IS_MONGO) {
    const doc = await OrderModel.findOne({ privateKeyHash: hash }).lean();
    return doc ? doc._id.toString() : null;
  }
  const row = await get('SELECT id FROM orders WHERE private_key_hash = $1', [hash]);
  return row ? row.id : null;
}

const ORDER_UPDATABLE = {
  clientName: 'client_name',
  clientPhone: 'client_phone',
  clientEmail: 'client_email',
  projectType: 'project_type',
  description: 'description',
  status: 'status',
  progressPct: 'progress_pct',
  totalBudget: 'total_budget',
};

export async function updateOrder(id, fields) {
  const entries = Object.entries(fields).filter(([k, v]) => k in ORDER_UPDATABLE && v !== undefined);
  if (IS_MONGO) {
    const $set = Object.fromEntries(entries);
    if (entries.length) await OrderModel.updateOne({ _id: id }, { $set });
    return getOrderById(id);
  }
  if (entries.length) {
    const sets = entries.map(([k], i) => `${ORDER_UPDATABLE[k]} = $${i + 1}`).join(', ');
    const params = entries.map(([, v]) => v);
    await run(`UPDATE orders SET ${sets} WHERE id = $${entries.length + 1}`, [...params, id]);
  }
  return getOrderById(id);
}

export async function updateOrderKeyHash(id, privateKeyHash) {
  if (IS_MONGO) {
    await OrderModel.updateOne({ _id: id }, { $set: { privateKeyHash } });
    return getOrderById(id);
  }
  await run('UPDATE orders SET private_key_hash = $1 WHERE id = $2', [privateKeyHash, id]);
  return getOrderById(id);
}

export async function replaceOrderFeatures(id, features) {
  if (IS_MONGO) {
    await OrderModel.updateOne(
      { _id: id },
      { $set: { features: features.map((f) => ({ name: f.name, price: Number(f.price) || 0, done: !!f.done })) } }
    );
    return;
  }
  await run('DELETE FROM order_features WHERE order_id = $1', [id]);
  for (const f of features) {
    await run('INSERT INTO order_features (order_id, name, price, done) VALUES ($1, $2, $3, $4)', [
      id, f.name, Number(f.price) || 0, f.done ? 1 : 0,
    ]);
  }
}

export async function deleteOrder(id) {
  if (IS_MONGO) return void (await OrderModel.deleteOne({ _id: id }));
  await run('DELETE FROM order_features WHERE order_id = $1', [id]);
  await run('DELETE FROM payments WHERE order_id = $1', [id]);
  await run('DELETE FROM orders WHERE id = $1', [id]);
}

export async function countOrders() {
  if (IS_MONGO) return OrderModel.countDocuments();
  const row = await get('SELECT COUNT(*) AS n FROM orders', []);
  return Number(row.n);
}

// ── Payments ──────────────────────────────────────────────────────────────────
export async function addPayment(orderId, { amount, note = '', createdBy = '' }) {
  if (IS_MONGO) {
    await OrderModel.updateOne({ _id: orderId }, { $push: { payments: { amount, note, createdBy } } });
    return getOrderById(orderId);
  }
  await run('INSERT INTO payments (order_id, amount, note, created_by) VALUES ($1, $2, $3, $4)', [orderId, amount, note, createdBy]);
  return getOrderById(orderId);
}

export async function listPayments() {
  if (IS_MONGO) {
    const docs = await OrderModel.find().lean();
    return docs.flatMap((o) =>
      (o.payments || []).map((p) => ({
        orderId: o._id.toString(), orderUid: o.uid, clientName: o.clientName, projectType: o.projectType,
        amount: p.amount, note: p.note, createdBy: p.createdBy || '', createdAt: p.createdAt,
      }))
    ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
  const rows = await all(
    `SELECT p.id, p.order_id, p.amount, p.note, p.created_by, p.created_at, o.uid, o.client_name, o.project_type
     FROM payments p JOIN orders o ON o.id = p.order_id
     ORDER BY p.created_at DESC, p.id DESC`, []);
  return rows.map((r) => ({
    id: r.id, orderId: r.order_id, orderUid: r.uid, clientName: r.client_name,
    projectType: r.project_type, amount: r.amount, note: r.note, createdBy: r.created_by || '', createdAt: r.created_at,
  }));
}

// ── Requests (leads from the public form) ─────────────────────────────────────
export async function createRequest({ name, email = '', phone = '', projectType = '', goal = '', budget = '', currency = 'dzd', kind = 'new', note = '', files = [] }) {
  if (IS_MONGO) {
    const saved = await new RequestModel({ name, email, phone, projectType, goal, budget, currency, kind, note, files }).save();
    return { id: saved._id.toString() };
  }
  const id = await insert(
    'INSERT INTO requests (name, email, phone, project_type, goal, budget, currency, kind, note, files) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
    [name, email, phone, projectType, goal, budget, currency, kind, note, JSON.stringify(files)]
  );
  return { id };
}

function mapRequest(r) {
  if (!r) return null;
  if (r._id) {
    return {
      id: r._id.toString(), name: r.name, email: r.email, phone: r.phone,
      projectType: r.projectType, goal: r.goal, budget: r.budget, currency: r.currency || 'dzd', kind: r.kind || 'new', note: r.note,
      files: r.files || [],
      status: r.status || 'pending', createdAt: r.createdAt,
    };
  }
  return {
    id: r.id, name: r.name, email: r.email, phone: r.phone,
    projectType: r.project_type, goal: r.goal, budget: r.budget, currency: r.currency || 'dzd', kind: r.kind || 'new', note: r.note,
    files: JSON.parse(r.files || '[]'),
    status: r.status || 'pending', createdAt: r.created_at,
  };
}

export async function listRequests() {
  if (IS_MONGO) {
    const docs = await RequestModel.find().sort({ createdAt: -1 }).lean();
    return docs.map(mapRequest);
  }
  const rows = await all('SELECT * FROM requests ORDER BY created_at DESC, id DESC', []);
  return rows.map(mapRequest);
}

export async function getRequestById(id) {
  if (IS_MONGO) return mapRequest(await RequestModel.findById(id).lean());
  return mapRequest(await get('SELECT * FROM requests WHERE id = $1', [id]));
}

export async function updateRequestStatus(id, status) {
  if (IS_MONGO) {
    await RequestModel.updateOne({ _id: id }, { $set: { status } });
    return getRequestById(id);
  }
  await run('UPDATE requests SET status = $1 WHERE id = $2', [status, id]);
  return getRequestById(id);
}

export async function deleteRequestById(id) {
  if (IS_MONGO) return void (await RequestModel.deleteOne({ _id: id }));
  await run('DELETE FROM requests WHERE id = $1', [id]);
}

// ── Portfolio (public "our work" showcase, managed from the admin panel) ──────
function slugify(text) {
  const base = (text || '')
    .toString().trim().toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || `project-${Date.now().toString(36)}`;
}

async function generateSlug(title) {
  const base = slugify(title);
  let slug = base;
  let n = 2;
  while (await getPortfolioProjectBySlug(slug)) {
    slug = `${base}-${n++}`;
  }
  return slug;
}

function mapPortfolioProject(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    stack: JSON.parse(row.stack || '[]'),
    description: row.description,
    problem: row.problem,
    solution: row.solution,
    images: JSON.parse(row.images || '[]'),
    createdAt: row.created_at,
  };
}

function mapMongoPortfolio(doc) {
  if (!doc) return null;
  return {
    id: doc._id.toString(),
    title: doc.title,
    slug: doc.slug,
    stack: doc.stack || [],
    description: doc.description,
    problem: doc.problem,
    solution: doc.solution,
    images: doc.images || [],
    createdAt: doc.createdAt,
  };
}

export async function listPortfolioProjects() {
  if (IS_MONGO) {
    const docs = await PortfolioModel.find().sort({ createdAt: -1 }).lean();
    return docs.map(mapMongoPortfolio);
  }
  const rows = await all('SELECT * FROM portfolio_projects ORDER BY created_at DESC, id DESC', []);
  return rows.map(mapPortfolioProject);
}

export async function getPortfolioProjectById(id) {
  if (IS_MONGO) return mapMongoPortfolio(await PortfolioModel.findById(id).lean());
  return mapPortfolioProject(await get('SELECT * FROM portfolio_projects WHERE id = $1', [id]));
}

export async function getPortfolioProjectBySlug(slug) {
  if (IS_MONGO) return mapMongoPortfolio(await PortfolioModel.findOne({ slug }).lean());
  return mapPortfolioProject(await get('SELECT * FROM portfolio_projects WHERE slug = $1', [slug]));
}

export async function createPortfolioProject({ title, stack = [], description = '', problem = '', solution = '', images = [] }) {
  const slug = await generateSlug(title);
  if (IS_MONGO) {
    const saved = await new PortfolioModel({ title, slug, stack, description, problem, solution, images }).save();
    return mapMongoPortfolio(saved.toObject());
  }
  const id = await insert(
    `INSERT INTO portfolio_projects (title, slug, stack, description, problem, solution, images)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [title, slug, JSON.stringify(stack), description, problem, solution, JSON.stringify(images)]
  );
  return getPortfolioProjectById(id);
}

const PORTFOLIO_UPDATABLE = {
  title: 'title', stack: 'stack', description: 'description',
  problem: 'problem', solution: 'solution', images: 'images',
};

export async function updatePortfolioProject(id, fields) {
  const entries = Object.entries(fields).filter(([k, v]) => k in PORTFOLIO_UPDATABLE && v !== undefined);
  if (IS_MONGO) {
    const $set = Object.fromEntries(entries);
    if (entries.length) await PortfolioModel.updateOne({ _id: id }, { $set });
    return getPortfolioProjectById(id);
  }
  if (entries.length) {
    const sets = entries.map(([k], i) => `${PORTFOLIO_UPDATABLE[k]} = $${i + 1}`).join(', ');
    const params = entries.map(([k, v]) => (k === 'stack' || k === 'images') ? JSON.stringify(v) : v);
    await run(`UPDATE portfolio_projects SET ${sets} WHERE id = $${entries.length + 1}`, [...params, id]);
  }
  return getPortfolioProjectById(id);
}

export async function deletePortfolioProject(id) {
  if (IS_MONGO) return void (await PortfolioModel.deleteOne({ _id: id }));
  await run('DELETE FROM portfolio_projects WHERE id = $1', [id]);
}

// ── Testimonials (public reviews, admin-approved) ─────────────────────────────
function mapTestimonial(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    project: row.project,
    rating: row.rating,
    text: row.text,
    status: row.status,
    createdAt: row.created_at,
  };
}

function mapMongoTestimonial(doc) {
  if (!doc) return null;
  return {
    id: doc._id.toString(),
    name: doc.name,
    project: doc.project,
    rating: doc.rating,
    text: doc.text,
    status: doc.status,
    createdAt: doc.createdAt,
  };
}

export async function createTestimonial({ name, project = '', rating = 5, text }) {
  if (IS_MONGO) {
    const saved = await new TestimonialModel({ name, project, rating, text }).save();
    return mapMongoTestimonial(saved.toObject());
  }
  const id = await insert(
    'INSERT INTO testimonials (name, project, rating, text) VALUES ($1, $2, $3, $4)',
    [name, project, rating, text]
  );
  return mapTestimonial(await get('SELECT * FROM testimonials WHERE id = $1', [id]));
}

export async function listTestimonials() {
  if (IS_MONGO) {
    const docs = await TestimonialModel.find().sort({ createdAt: -1 }).lean();
    return docs.map(mapMongoTestimonial);
  }
  const rows = await all('SELECT * FROM testimonials ORDER BY created_at DESC, id DESC', []);
  return rows.map(mapTestimonial);
}

export async function listApprovedTestimonials() {
  if (IS_MONGO) {
    const docs = await TestimonialModel.find({ status: 'approved' }).sort({ createdAt: -1 }).lean();
    return docs.map(mapMongoTestimonial);
  }
  const rows = await all("SELECT * FROM testimonials WHERE status = 'approved' ORDER BY created_at DESC, id DESC", []);
  return rows.map(mapTestimonial);
}

export async function getTestimonialById(id) {
  if (IS_MONGO) return mapMongoTestimonial(await TestimonialModel.findById(id).lean());
  return mapTestimonial(await get('SELECT * FROM testimonials WHERE id = $1', [id]));
}

export async function updateTestimonialStatus(id, status) {
  if (IS_MONGO) {
    await TestimonialModel.updateOne({ _id: id }, { $set: { status } });
    return getTestimonialById(id);
  }
  await run('UPDATE testimonials SET status = $1 WHERE id = $2', [status, id]);
  return getTestimonialById(id);
}

export async function deleteTestimonialById(id) {
  if (IS_MONGO) return void (await TestimonialModel.deleteOne({ _id: id }));
  await run('DELETE FROM testimonials WHERE id = $1', [id]);
}

// ── Tasks (kanban) ────────────────────────────────────────────────────────────
export async function listTasks() {
  if (IS_MONGO) {
    const docs = await TaskModel.find().sort({ createdAt: 1 }).lean();
    return docs.map((d) => ({ id: d._id.toString(), title: d.title, client: d.client, priority: d.priority, lane: d.lane }));
  }
  const rows = await all('SELECT id, title, client, priority, lane FROM tasks ORDER BY id', []);
  return rows;
}

export async function createTask({ title, client = '', priority = 'mid', lane = 'todo' }) {
  if (IS_MONGO) {
    const saved = await new TaskModel({ title, client, priority, lane }).save();
    return { id: saved._id.toString(), title, client, priority, lane };
  }
  const id = await insert('INSERT INTO tasks (title, client, priority, lane) VALUES ($1, $2, $3, $4)', [title, client, priority, lane]);
  return { id, title, client, priority, lane };
}

export async function updateTask(id, { title, client, priority, lane }) {
  if (IS_MONGO) {
    const $set = {};
    if (title !== undefined) $set.title = title;
    if (client !== undefined) $set.client = client;
    if (priority !== undefined) $set.priority = priority;
    if (lane !== undefined) $set.lane = lane;
    await TaskModel.updateOne({ _id: id }, { $set });
    const doc = await TaskModel.findById(id).lean();
    return doc ? { id: doc._id.toString(), title: doc.title, client: doc.client, priority: doc.priority, lane: doc.lane } : null;
  }
  const fields = { title, client, priority, lane };
  const entries = Object.entries(fields).filter(([, v]) => v !== undefined);
  if (entries.length) {
    const sets = entries.map(([k], i) => `${k} = $${i + 1}`).join(', ');
    await run(`UPDATE tasks SET ${sets} WHERE id = $${entries.length + 1}`, [...entries.map(([, v]) => v), id]);
  }
  return get('SELECT id, title, client, priority, lane FROM tasks WHERE id = $1', [id]);
}

export async function deleteTask(id) {
  if (IS_MONGO) return void (await TaskModel.deleteOne({ _id: id }));
  await run('DELETE FROM tasks WHERE id = $1', [id]);
}
