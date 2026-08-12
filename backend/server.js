const express = require('express');
const cors = require('cors');
const { db, initDatabase } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

initDatabase();

app.get('/api/items', (_req, res) => {
  db.all('SELECT * FROM items ORDER BY id ASC', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

app.get('/api/items/:id', (req, res) => {
  const { id } = req.params;

  db.get('SELECT * FROM items WHERE id = ?', [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'Item no encontrado' });
    }
    res.json(row);
  });
});

app.post('/api/items', (req, res) => {
  const { referencia, descripcion, cantidad, precioUnitario } = req.body;

  if (!referencia || !descripcion) {
    return res.status(400).json({ error: 'referencia y descripcion son obligatorios' });
  }

  const qty = Number(cantidad) || 0;
  const price = Number(precioUnitario) || 0;

  db.run(
    'INSERT INTO items (referencia, descripcion, cantidad, precioUnitario) VALUES (?, ?, ?, ?)',
    [referencia.trim(), descripcion.trim(), qty, price],
    function (err) {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      res.status(201).json({
        id: this.lastID,
        referencia: referencia.trim(),
        descripcion: descripcion.trim(),
        cantidad: qty,
        precioUnitario: price
      });
    }
  );
});

app.put('/api/items/:id', (req, res) => {
  const { id } = req.params;
  const { referencia, descripcion, cantidad, precioUnitario } = req.body;

  if (!referencia || !descripcion) {
    return res.status(400).json({ error: 'referencia y descripcion son obligatorios' });
  }

  db.run(
    'UPDATE items SET referencia = ?, descripcion = ?, cantidad = ?, precioUnitario = ? WHERE id = ?',
    [referencia.trim(), descripcion.trim(), Number(cantidad) || 0, Number(precioUnitario) || 0, id],
    function (err) {
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Item no encontrado' });
      }
      res.json({ id: Number(id), referencia: referencia.trim(), descripcion: descripcion.trim(), cantidad: Number(cantidad) || 0, precioUnitario: Number(precioUnitario) || 0 });
    }
  );
});

app.delete('/api/items/:id', (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM items WHERE id = ?', [id], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Item no encontrado' });
    }
    res.json({ success: true, id: Number(id) });
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`API escuchando en http://0.0.0.0:${PORT}`);
});
