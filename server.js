const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const db = new Database(path.join(__dirname, 'data.db'));

app.use(express.json());
app.use(express.static(__dirname));

// ─── init tables ───
db.exec(`
  CREATE TABLE IF NOT EXISTS costs (
    id TEXT PRIMARY KEY,
    seller TEXT,
    label TEXT,
    amount REAL
  );
  CREATE TABLE IF NOT EXISTS completed (
    id TEXT PRIMARY KEY,
    seller TEXT,
    buyer TEXT,
    items TEXT,
    price REAL,
    shared INTEGER DEFAULT 0,
    sharedWith TEXT
  );
  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    seller TEXT,
    buyer TEXT,
    items TEXT,
    price REAL
  );
  CREATE TABLE IF NOT EXISTS stock (
    id TEXT PRIMARY KEY,
    name TEXT,
    total INTEGER,
    sold TEXT,
    left_amt TEXT
  );
`);

// seed default data if empty
const seedIfEmpty = () => {
  if (!db.prepare('SELECT 1 FROM costs LIMIT 1').get()) {
    const ic = db.prepare('INSERT INTO costs VALUES (?,?,?,?)');
    ic.run('c1','ziga','Zaloga (nabava)',115);
    ic.run('c2','ziga','Nasal spray (osebni)',15);
    ic.run('c3','aljaz','Zaloga (nabava)',125);
    ic.run('c4','aljaz','Claude Pro',null);
  }
  if (!db.prepare('SELECT 1 FROM completed LIMIT 1').get()) {
    const ic = db.prepare('INSERT INTO completed VALUES (?,?,?,?,?,?,?)');
    ic.run('s1','ziga','Oskar','1× Semax 5mg · 1× nasal spray',20,0,null);
    ic.run('s2','ziga','David','2× Semax 5mg · 1× Selank 5mg · 1× nasal spray',50,0,null);
    ic.run('s3','ziga','Sandi','7× Retatrutide 10mg · 1× Selank 5mg',90,1,'aljaz');
    ic.run('s4','aljaz','Sandi','7× Retatrutide 10mg · 1× Selank 5mg',90,1,'ziga');
  }
  if (!db.prepare('SELECT 1 FROM orders LIMIT 1').get()) {
    const io = db.prepare('INSERT INTO orders VALUES (?,?,?,?,?)');
    io.run('o1','ziga','Matija','1× Semax 5mg · 1× nasal spray',20);
    io.run('o2','ziga','Nikolaj','3× Semax 5mg · 3× Selank 5mg · 2× nasal spray',100);
  }
  if (!db.prepare('SELECT 1 FROM stock LIMIT 1').get()) {
    const is = db.prepare('INSERT INTO stock VALUES (?,?,?,?,?)');
    is.run('st1','Selank 5mg',20,'2 (+3 Nikolaj)','~15');
    is.run('st2','Semax 5mg',20,'4 (+4 Matija+Niko)','~12');
    is.run('st3','Retatrutide 10mg',10,'7 (Sandi)','3');
    is.run('st4','Pinealon 10mg',10,'0','10');
  }
};
seedIfEmpty();

// ─── COSTS ───
app.get('/api/costs', (req, res) => res.json(db.prepare('SELECT * FROM costs').all()));
app.post('/api/costs', (req, res) => {
  const {id, seller, label, amount} = req.body;
  db.prepare('INSERT INTO costs VALUES (?,?,?,?)').run(id, seller, label, amount ?? null);
  res.json({ok:true});
});
app.patch('/api/costs/:id', (req, res) => {
  const {label, amount} = req.body;
  db.prepare('UPDATE costs SET label=?, amount=? WHERE id=?').run(label, amount ?? null, req.params.id);
  res.json({ok:true});
});
app.delete('/api/costs/:id', (req, res) => {
  db.prepare('DELETE FROM costs WHERE id=?').run(req.params.id);
  res.json({ok:true});
});

// ─── COMPLETED ───
app.get('/api/completed', (req, res) => {
  const rows = db.prepare('SELECT * FROM completed').all();
  res.json(rows.map(r => ({...r, shared: !!r.shared})));
});
app.post('/api/completed', (req, res) => {
  const {id, seller, buyer, items, price, shared, sharedWith} = req.body;
  db.prepare('INSERT INTO completed VALUES (?,?,?,?,?,?,?)').run(id, seller, buyer, items, price, shared?1:0, sharedWith ?? null);
  res.json({ok:true});
});
app.patch('/api/completed/:id', (req, res) => {
  const {buyer, items, price} = req.body;
  db.prepare('UPDATE completed SET buyer=?, items=?, price=? WHERE id=?').run(buyer, items, price, req.params.id);
  res.json({ok:true});
});
app.delete('/api/completed/:id', (req, res) => {
  db.prepare('DELETE FROM completed WHERE id=?').run(req.params.id);
  res.json({ok:true});
});

// ─── ORDERS ───
app.get('/api/orders', (req, res) => res.json(db.prepare('SELECT * FROM orders').all()));
app.post('/api/orders', (req, res) => {
  const {id, seller, buyer, items, price} = req.body;
  db.prepare('INSERT INTO orders VALUES (?,?,?,?,?)').run(id, seller, buyer, items, price);
  res.json({ok:true});
});
app.patch('/api/orders/:id', (req, res) => {
  const {buyer, items, price} = req.body;
  db.prepare('UPDATE orders SET buyer=?, items=?, price=? WHERE id=?').run(buyer, items, price, req.params.id);
  res.json({ok:true});
});
app.delete('/api/orders/:id', (req, res) => {
  db.prepare('DELETE FROM orders WHERE id=?').run(req.params.id);
  res.json({ok:true});
});

// ─── STOCK ───
app.get('/api/stock', (req, res) => res.json(db.prepare('SELECT * FROM stock').all()));
app.post('/api/stock', (req, res) => {
  const {id, name, total, sold, left} = req.body;
  db.prepare('INSERT INTO stock VALUES (?,?,?,?,?)').run(id, name, total, sold, left);
  res.json({ok:true});
});
app.patch('/api/stock/:id', (req, res) => {
  const {name, total, sold, left} = req.body;
  db.prepare('UPDATE stock SET name=?, total=?, sold=?, left_amt=? WHERE id=?').run(name, total, sold, left, req.params.id);
  res.json({ok:true});
});
app.delete('/api/stock/:id', (req, res) => {
  db.prepare('DELETE FROM stock WHERE id=?').run(req.params.id);
  res.json({ok:true});
});

app.listen(PORT, () => console.log('running on', PORT));
