const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

app.use(express.json());
app.use(express.static(__dirname));

// ─── init tables ───
async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS costs (
      id TEXT PRIMARY KEY, seller TEXT, label TEXT, amount REAL
    );
    CREATE TABLE IF NOT EXISTS completed (
      id TEXT PRIMARY KEY, seller TEXT, buyer TEXT, items TEXT,
      price REAL, shared INTEGER DEFAULT 0, sharedwith TEXT
    );
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY, seller TEXT, buyer TEXT, items TEXT, price REAL
    );
    CREATE TABLE IF NOT EXISTS stock (
      id TEXT PRIMARY KEY, name TEXT, total INTEGER, sold TEXT, left_amt TEXT
    );
  `);

  // seed if empty
  const { rows } = await pool.query('SELECT 1 FROM costs LIMIT 1');
  if (!rows.length) {
    await pool.query(`
      INSERT INTO costs VALUES
        ('c1','ziga','Zaloga (nabava)',115),
        ('c2','ziga','Nasal spray (osebni)',15),
        ('c3','aljaz','Zaloga (nabava)',125),
        ('c4','aljaz','Claude Pro',null);
      INSERT INTO completed VALUES
        ('s1','ziga','Oskar','1× Semax 5mg · 1× nasal spray',20,0,null),
        ('s2','ziga','David','2× Semax 5mg · 1× Selank 5mg · 1× nasal spray',50,0,null),
        ('s3','ziga','Sandi','7× Retatrutide 10mg · 1× Selank 5mg',90,1,'aljaz'),
        ('s4','aljaz','Sandi','7× Retatrutide 10mg · 1× Selank 5mg',90,1,'ziga');
      INSERT INTO orders VALUES
        ('o1','ziga','Matija','1× Semax 5mg · 1× nasal spray',20),
        ('o2','ziga','Nikolaj','3× Semax 5mg · 3× Selank 5mg · 2× nasal spray',100);
      INSERT INTO stock VALUES
        ('st1','Selank 5mg',20,'2 (+3 Nikolaj)','~15'),
        ('st2','Semax 5mg',20,'4 (+4 Matija+Niko)','~12'),
        ('st3','Retatrutide 10mg',10,'7 (Sandi)','3'),
        ('st4','Pinealon 10mg',10,'0','10');
    `);
  }
}

// ─── COSTS ───
app.get('/api/costs', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM costs');
  res.json(rows);
});
app.post('/api/costs', async (req, res) => {
  const { id, seller, label, amount } = req.body;
  await pool.query('INSERT INTO costs VALUES ($1,$2,$3,$4)', [id, seller, label, amount ?? null]);
  res.json({ ok: true });
});
app.patch('/api/costs/:id', async (req, res) => {
  const { label, amount } = req.body;
  await pool.query('UPDATE costs SET label=$1, amount=$2 WHERE id=$3', [label, amount ?? null, req.params.id]);
  res.json({ ok: true });
});
app.delete('/api/costs/:id', async (req, res) => {
  await pool.query('DELETE FROM costs WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

// ─── COMPLETED ───
app.get('/api/completed', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM completed');
  res.json(rows.map(r => ({ ...r, shared: !!r.shared })));
});
app.post('/api/completed', async (req, res) => {
  const { id, seller, buyer, items, price, shared, sharedWith } = req.body;
  await pool.query('INSERT INTO completed VALUES ($1,$2,$3,$4,$5,$6,$7)',
    [id, seller, buyer, items, price, shared ? 1 : 0, sharedWith ?? null]);
  res.json({ ok: true });
});
app.patch('/api/completed/:id', async (req, res) => {
  const { buyer, items, price } = req.body;
  await pool.query('UPDATE completed SET buyer=$1, items=$2, price=$3 WHERE id=$4', [buyer, items, price, req.params.id]);
  res.json({ ok: true });
});
app.delete('/api/completed/:id', async (req, res) => {
  await pool.query('DELETE FROM completed WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

// ─── ORDERS ───
app.get('/api/orders', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM orders');
  res.json(rows);
});
app.post('/api/orders', async (req, res) => {
  const { id, seller, buyer, items, price } = req.body;
  await pool.query('INSERT INTO orders VALUES ($1,$2,$3,$4,$5)', [id, seller, buyer, items, price]);
  res.json({ ok: true });
});
app.patch('/api/orders/:id', async (req, res) => {
  const { buyer, items, price } = req.body;
  await pool.query('UPDATE orders SET buyer=$1, items=$2, price=$3 WHERE id=$4', [buyer, items, price, req.params.id]);
  res.json({ ok: true });
});
app.delete('/api/orders/:id', async (req, res) => {
  await pool.query('DELETE FROM orders WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

// ─── STOCK ───
app.get('/api/stock', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM stock');
  res.json(rows);
});
app.post('/api/stock', async (req, res) => {
  const { id, name, total, sold, left } = req.body;
  await pool.query('INSERT INTO stock VALUES ($1,$2,$3,$4,$5)', [id, name, total, sold, left]);
  res.json({ ok: true });
});
app.patch('/api/stock/:id', async (req, res) => {
  const { name, total, sold, left } = req.body;
  await pool.query('UPDATE stock SET name=$1, total=$2, sold=$3, left_amt=$4 WHERE id=$5', [name, total, sold, left, req.params.id]);
  res.json({ ok: true });
});
app.delete('/api/stock/:id', async (req, res) => {
  await pool.query('DELETE FROM stock WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

init().then(() => app.listen(PORT, () => console.log('running on', PORT)));
