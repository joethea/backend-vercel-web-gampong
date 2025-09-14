import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import serverless from 'serverless-http';
import pendudukRoutes from '../routes/penduduk.js'; // SESUAIKAN kalau pindah ke /api

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Root endpoint biar nggak 404
app.get('/', (req, res) => {
  res.send('Backend API is running 🚀');
});

// Endpoint penduduk
app.use(
  '/penduduk',
  pendudukRoutes(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE
  )
);

// Export handler untuk Vercel
export const handler = serverless(app);
