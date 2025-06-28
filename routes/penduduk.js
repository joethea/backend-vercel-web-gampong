import express from 'express';
import { createClient } from '@supabase/supabase-js';
import multer from 'multer';
import XLSX from 'xlsx'; // jangan lupa ini



export default function (SUPABASE_URL, SUPABASE_SERVICE_ROLE) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
    throw new Error("❌ SUPABASE_URL atau SUPABASE_SERVICE_ROLE belum di-set.");
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
  const router = express.Router();
  const upload = multer({ storage: multer.memoryStorage() });


// DELETE berdasarkan NIK
router.delete('/:nik', async (req, res) => {
  const { nik } = req.params;

  console.log(`🗑️ Permintaan hapus data dengan NIK: ${nik}`);

  if (!nik) {
    return res.status(400).json({ error: 'NIK tidak boleh kosong' });
  }

  try {
    const { data, error } = await supabase
      .from('penduduk')
      .delete()
      .eq('nik', nik)
      .select(); // untuk verifikasi apakah ada data yang dihapus

    if (error) {
      console.error('❌ Gagal menghapus:', error.message);
      return res.status(500).json({ error: error.message });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Data dengan NIK tersebut tidak ditemukan' });
    }

    console.log('✅ Data berhasil dihapus:', data[0]);
    res.json({ message: '✅ Data berhasil dihapus', data: data[0] });

  } catch (err) {
    console.error('❌ Error tak terduga:', err);
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
});



// CREATE / Tambah data penduduk
router.post('/', async (req, res) => {
  const data = req.body;

  console.log('📥 Permintaan tambah data baru:');
  console.log(data);

  if (!data || !data.nik || !data.nama) {
    return res.status(400).json({ error: '❌ Data wajib diisi minimal NIK dan Nama' });
  }

  try {
    const hasil = await supabase.from('penduduk').insert([data]);

    if (hasil.error) {
  console.error('❌ Gagal tambah:', hasil.error.message);

  if (hasil.error.message.includes('duplicate key value') && hasil.error.message.includes('penduduk_nik_key')) {
    return res.status(400).json({ error: '❌ NIK sudah ada di database' });
  }

  return res.status(500).json({ error: '❌ Gagal menyimpan data ke database' });
}


    res.json({ message: '✅ Data berhasil ditambahkan', data: hasil.data?.[0] || data });

  } catch (err) {
    console.error('❌ Error tak terduga saat insert:', err);
    res.status(500).json({ error: '❌ Gagal menambahkan data baru.' });
  }
});




// UPDATE berdasarkan NIK
router.put('/:nik', async (req, res) => {
  const { nik } = req.params;
  const data = req.body;

  console.log(`✏️ Permintaan update NIK: ${nik}`);
  console.log('📝 Data yang dikirim untuk update:', JSON.stringify(data, null, 2));

  if (!nik || Object.keys(data).length === 0) {
    return res.status(400).json({ error: 'NIK dan data tidak boleh kosong' });
  }

  try {
    const { data: result, error } = await supabase
      .from('penduduk')
      .update(data)
      .eq('nik', nik)
      .select();

    if (error) {
      console.error('❌ Gagal update:', error.message);
      return res.status(500).json({ error: error.message });
    }

    if (!result || result.length === 0) {
      return res.status(404).json({ error: 'Data dengan NIK tersebut tidak ditemukan' });
    }

    console.log('✅ Update berhasil:', result[0]);
    res.json({ message: '✅ Data berhasil diperbarui', data: result[0] });

  } catch (err) {
    console.error('❌ Error tak terduga:', err);
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
});



//-----------------------------
// IMPORT TANPA VALIDASI APAPUN - Mode Cepat
function normalisasiKelamin(input) {
  const val = (input || '').toString().trim().toUpperCase();
  if (['L', 'LAKI-LAKI', 'LK'].includes(val)) return 'L';
  if (['P', 'PEREMPUAN', 'PR'].includes(val)) return 'P';
  return '';
}

function normalisasiStatus(input) {
  const val = (input || '').toString().trim().toUpperCase();
  if (['S', 'SUDAH KAWIN'].includes(val)) return 'S';
  if (['B', 'BELUM KAWIN'].includes(val)) return 'B';
  if (['P', 'PERNAH KAWIN'].includes(val)) return 'P';
  return '';
}

function normalisasiTanggalExcel(input) {
  const str = (input || '').toString().trim();
  if (!str) return { iso: null, error: 'kosong' };
  const parts = str.split('/');
  if (parts.length !== 3) return { iso: null, error: `format tidak sesuai (dapat: "${str}")` };
  const [dd, mm, yyyy] = parts;
  const tgl = new Date(`${yyyy}-${mm}-${dd}`);
  if (isNaN(tgl.getTime())) return { iso: null, error: `format tidak valid (dapat: "${str}")` };
  const iso = `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  return { iso, error: null };
}


function normalisasiTanggal(input) {
  const str = (input || '').toString().trim();
  if (!str) return null;

  const tgl = new Date(str);
  if (isNaN(tgl.getTime())) return null;

  const yyyy = tgl.getFullYear();
  const mm = String(tgl.getMonth() + 1).padStart(2, '0');
  const dd = String(tgl.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function validasiBaris(row) {
  const kesalahan = [];

  const jkTampil = row._jenis_kelamin_asli?.toString().trim() || 'kosong';
  if (!['L', 'P'].includes(row.jenis_kelamin)) {
    kesalahan.push(`Jenis_kelamin harus L atau P (bukan: "${jkTampil}")`);
  }

  const stTampil = row._status_asli?.toString().trim() || 'kosong';
  if (!['S', 'B', 'P'].includes(row.status)) {
    kesalahan.push(`Status harus S, B, atau P (bukan: "${stTampil}")`);
  }

 if (row._tanggal_lahir_error) {
  const tampil = row._tanggal_lahir_asli?.toString().trim() || 'kosong';
  if (row._tanggal_lahir_error === 'kosong') {
    kesalahan.push('Tanggal_lahir kosong');
  } else {
    kesalahan.push(`Tanggal_lahir tidak valid: "${tampil}" → Ubah ke : dd/mm/yyyy`);
}
 }


  return kesalahan;
}

// 🔁 Route utama
router.post('/import/xlsx-fast', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: '❌ Tidak ada file diunggah.' });

    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const records = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      raw: false,
      defval: ''
    });

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: '❌ File kosong atau tidak valid.' });
    }

    const kolomValid = [
          'nik', 'kk', 'nama', 'tempat_lahir', 'tanggal_lahir',
          'jenis_kelamin', 'status', 'pekerjaan', 'alamat_dusun', 'desa', 'kode_desa',
          'pendidikan', 'yatim_piatu', 'miskin_sangat', 'kategori_usia',
          'hubungan_keluarga', 'status_rumah', 'kategori_mengaji', 'lokasi_mengaji'
        ];

    const cleaned = records.map(row => {
      const bersih = {};
      for (const key of kolomValid) {
        if (key in row) bersih[key] = row[key];
      }
      return bersih;
    });

    const nikMap = new Map();
    const duplikat = [];

    for (const row of cleaned) {
      const nik = String(row.nik || '').replace(/\D/g, '').trim();
      if (!nik) continue;

      // Simpan nilai asli
      row._jenis_kelamin_asli = row.jenis_kelamin;
      row._status_asli = row.status;
      row._tanggal_lahir_asli = row.tanggal_lahir;

      // Normalisasi
      row.nik = nik;
      row.jenis_kelamin = normalisasiKelamin(row.jenis_kelamin);
      row.status = normalisasiStatus(row.status);
      const hasilTgl = normalisasiTanggalExcel(row.tanggal_lahir);
      row._tanggal_lahir_asli = row.tanggal_lahir;
      row.tanggal_lahir = hasilTgl.iso;
      row._tanggal_lahir_error = hasilTgl.error;

      // 🆕 Normalisasi tambahan (tambahkan di sini)
      row.yatim_piatu = normalisasiStatusYatim(row.yatim_piatu);
      row.kategori_mengaji = normalisasiKategoriMengaji(row.kategori_mengaji);
      row.status_rumah = normalisasiStatusRumah(row.status_rumah);
      row.hubungan_keluarga = normalisasiUniversal(row.hubungan_keluarga);
      row.pendidikan = normalisasiUniversal(row.pendidikan);
      row.kategori_usia = normalisasiUniversal(row.kategori_usia);
      row.miskin_sangat = normalisasiUniversal(row.miskin_sangat);
      row.lokasi_mengaji = normalisasiUniversal(row.lokasi_mengaji);



      if (nikMap.has(nik)) {
        duplikat.push({ nik, nama: row.nama || '-' });
      } else {
        nikMap.set(nik, row);
      }
    }

    if (duplikat.length > 0) {
      return res.status(400).json({
        error: `❌ Gagal import cepat karena ditemukan ${duplikat.length} NIK ganda di file.`,
        duplikat
      });
    }

    const finalData = [];
    const gagalValidasi = [];

    for (const row of nikMap.values()) {
      const kesalahan = validasiBaris(row);
      if (kesalahan.length > 0) {
        gagalValidasi.push({
          nik: row.nik,
          nama: row.nama || '-',
          alasan: kesalahan
        });
      } else {
        finalData.push(row);
      }
    }

    // 🛑 Jangan lanjut jika ada data tidak valid
    if (gagalValidasi.length > 0) {
      return res.status(400).json({
        error: `❌ ${gagalValidasi.length} baris gagal karena data tidak valid.`,
        invalid: gagalValidasi
      });
    }

    // Bersihkan _field internal sebelum insert
    const finalDataBersih = finalData.map(({ 
  _jenis_kelamin_asli, 
  _status_asli, 
  _tanggal_lahir_asli, 
  _tanggal_lahir_error,
  ...valid 
}) => valid);


    const { error } = await supabase.from('penduduk').insert(finalDataBersih);

    if (error) {
      console.error('❌ Supabase insert error:', error.message);
      return res.status(400).json({ error: `❌ Gagal import cepat: ${error.message}` });
    }

    res.json({
      message: `✅ Import cepat berhasil. Total data dimasukkan: ${finalData.length}`
    });

  } catch (err) {
    console.error('❌ Error tak terduga saat import cepat:', err);
    res.status(500).json({ error: '❌ Gagal memproses file. Format mungkin tidak sesuai.' });
  }
});



//-----------------------------


// Export Excel
router.get('/export/xlsx', async (req, res) => {
  try {
    const { data, error, status } = await supabase
      .from('penduduk')
      .select(`
        kode_desa, nik, kk, nama, tempat_lahir, tanggal_lahir, 
        status, jenis_kelamin, pekerjaan, alamat_dusun, desa
      `);

    // Tangani error dari Supabase
    if (error) {
      console.error('❌ Supabase error:', error.message);
      return res.status(status || 500).json({ error: `Gagal mengambil data dari database: ${error.message}` });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Data kosong. Tidak ada yang bisa diekspor.' });
    }

    // Format dan normalisasi data
    const hasil = data.map(row => {
      let tanggal = '';
      try {
        const date = new Date(row.tanggal_lahir);
        const dd = String(date.getDate()).padStart(2, '0');
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const yyyy = date.getFullYear();
        tanggal = `${dd}/${mm}/${yyyy}`;
      } catch {
        tanggal = row.tanggal_lahir || ''; // fallback
      }

      return {
        ...row,
        tanggal_lahir: tanggal,
        tempat_lahir: normalisasiUniversal(row.tempat_lahir),
        desa: normalisasiUniversal(row.desa)
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(hasil);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Penduduk');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename="data_penduduk.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    console.error('❌ Gagal ekspor Excel:', err);
    res.status(500).json({ error: 'Terjadi kesalahan internal saat menyiapkan file ekspor.' });
  }
});



//DELETE TABASE
// 🔥 HAPUS SELURUH DATA PENDUDUK
router.delete('/hapus/semua', async (req, res) => {
  try {
    const { error } = await supabase
      .from('penduduk')
      .delete()
      .neq('nik', ''); // menghindari .delete() tanpa kondisi yang ditolak oleh Supabase

    if (error) {
      console.error('❌ Gagal hapus semua:', error.message);
      return res.status(500).json({ error: '❌ Gagal menghapus semua data penduduk.' });
    }

    res.json({ message: '✅ Seluruh data penduduk berhasil dihapus.' });

  } catch (err) {
    console.error('❌ Error server saat hapus semua:', err);
    res.status(500).json({ error: '❌ Terjadi kesalahan saat menghapus semua data.' });
  }
});




// GET dengan pagination, pencarian, dan filter
  router.get('/', async (req, res) => {
   const requestedLimit = parseInt(req.query.limit) || 20;
const page = parseInt(req.query.page) || 1;

const ambilSemua = requestedLimit > 10000;
const limit = ambilSemua ? 100000 : requestedLimit;

const from = ambilSemua ? 0 : (page - 1) * limit;
const to = ambilSemua ? limit - 1 : from + limit - 1;


    const { search, dusun, kk, jenis_kelamin, status, pekerjaan, umur_min, umur_max } = req.query;

    let query = supabase.from('penduduk').select('*', { count: 'exact' });

    if (search) query = query.ilike('nama', `%${search}%`);
    if (dusun) query = query.eq('alamat_dusun', dusun);
    if (kk) query = query.eq('kk', kk);
    if (jenis_kelamin) query = query.eq('jenis_kelamin', jenis_kelamin);
    if (status) query = query.eq('status', status);
    if (pekerjaan) query = query.eq('pekerjaan', pekerjaan);

    // Filter umur berdasarkan tanggal lahir
    const today = new Date();
    if (umur_min) {
      const maxLahir = new Date(today.getFullYear() - umur_min, today.getMonth(), today.getDate())
        .toISOString().split('T')[0];
      query = query.lte('tanggal_lahir', maxLahir);
    }
    if (umur_max) {
      const minLahir = new Date(today.getFullYear() - umur_max, today.getMonth(), today.getDate())
        .toISOString().split('T')[0];
      query = query.gte('tanggal_lahir', minLahir);
    }

    query = query.range(from, to);

    const { data, count, error } = await query;

    if (error) {
      console.error('❌ Gagal ambil data:', error.message);
      return res.status(500).json({ error: error.message });
    }

    res.json({ data, total: count, page, limit });
  });

//----
// Ambil semua lokasi mengaji dari tabel_lokasimengaji
router.get('/lokasi-mengaji', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tabel_lokasimengaji')
      .select('nama')
      .order('nama');

    if (error) {
      console.error('❌ Gagal ambil lokasi mengaji:', error.message);
      return res.status(500).json({ error: 'Gagal mengambil data lokasi mengaji' });
    }

    res.json({ data });
  } catch (err) {
    console.error('❌ Error tak terduga:', err);
    res.status(500).json({ error: 'Terjadi kesalahan saat mengambil lokasi mengaji' });
  }
});

//----


function normalisasiUniversal(str) {
  if (!str) return '';
  let hasil = str
    .toLowerCase()
    .trim()
    .replace(/\s*\/\s*/g, '/')
    .replace(/\s*-\s*/g, '-')
    .replace(/\s{2,}/g, ' ')
    .replace(/[^\w\s\/\-]/g, '')
    .replace(/\b\w/g, huruf => huruf.toUpperCase());

  const khususUppercase = {
    'Tni': 'TNI',
    'Pns': 'PNS',
    'Polri': 'POLRI',
    'P3k': 'P3K',
    'Pppk': 'PPPK'
  };

  return khususUppercase[hasil] || hasil;
}
//----
function normalisasiStatusYatim(input) {
  const val = (input || '').toString().trim().toUpperCase();
  if (val.includes('YATIM') && val.includes('PIATU')) return 'YATIM PIATU';
  if (val.includes('YATIM')) return 'YATIM';
  if (val.includes('PIATU')) return 'PIATU';
  if (val.includes('LENGKAP')) return 'LENGKAP';
  return '';
}

function normalisasiKategoriMengaji(input) {
  const val = (input || '').toString().trim().toUpperCase();
  if (val.includes('DALAM')) return 'ANAK_DALAM';
  if (val.includes('LUAR')) return 'ANAK_LUAR';
  if (val.includes('GURU')) return 'GURU_MENGAJI';
  return '';
}

function normalisasiStatusRumah(input) {
  const val = (input || '').toString().trim().toUpperCase();
  if (val.includes('NUMPANG')) return 'NUMPANG';
  if (val.includes('SENDIRI')) return 'RUMAH SENDIRI';
  return '';
}
//----




  
  return router;
}





