import express from "express";
import serverless from "serverless-http";
import { createClient } from "@supabase/supabase-js";

// Import router penduduk
import pendudukRoutes from "../routes/penduduk.js";

const app = express();
app.use(express.json());

// Buat Supabase client sekali saja
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

// Pasang router penduduk
app.use("/api/penduduk", pendudukRoutes(supabase));

// Route default
app.get("/", (req, res) => {
  res.send("✅ Backend Express jalan di Vercel!");
});

// Export ke Vercel
export default serverless(app);
