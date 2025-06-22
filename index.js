import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pendudukRoutes from './routes/penduduk.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// ⬇️ Kirim env ke router lewat parameter
app.use('/api/penduduk', pendudukRoutes(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server jalan di http://localhost:${PORT}`);
});
