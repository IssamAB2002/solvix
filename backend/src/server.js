import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import ordersRoutes from './routes/orders.js';
import requestsRoutes from './routes/requests.js';
import tasksRoutes from './routes/tasks.js';
import portfolioRoutes from './routes/portfolio.js';
import testimonialsRoutes from './routes/testimonials.js';
import { initDb } from './db.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' })); // portfolio images are base64 data-URIs

await initDb();
app.use('/api/auth', authRoutes);
app.use('/api', ordersRoutes); // /api/orders, /api/payments, /api/track
app.use('/api/requests', requestsRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/testimonials', testimonialsRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Solvix backend ready on http://localhost:${PORT}`);
});
