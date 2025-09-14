import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import serverless from 'serverless-http';
import pendudukRoutes from './penduduk.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/penduduk', pendudukRoutes(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE));

export default serverless(app);
