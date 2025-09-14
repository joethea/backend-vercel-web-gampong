import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import serverless from 'serverless-http';
import pendudukRoutes from '../routes/penduduk.js'; // pastikan path sesuai

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// root route
app.get('/', (req, res) => {
  res.send('Backend API is running 🚀');
});

// route penduduk
app.use('/penduduk', pendudukRoutes(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE));

export const handler = serverless(app);
