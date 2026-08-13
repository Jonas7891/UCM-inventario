const express = require('express');
const cors = require('cors');
const { pool, initDatabase } = require('./db');

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());

// ==========================================
// GET - Obtener todos los items
// ==========================================
app.get('/api/items', async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        id,
        referencia,
        descripcion,
        cantidad,
        "precioUnitario"
       FROM items
       ORDER BY id ASC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo items:', error);
    res.status(500).json({
      error: error.message
    });
  }
});

// ==========================================
// GET - Obtener item por ID
// ==========================================
app.get('/api/items/:id', async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    return res.status(400).json({
      error: 'ID inválido'
    });
  }

  try {
    const result = await pool.query(
      `SELECT
        id,
        referencia,
        descripcion,
        cantidad,
        "precioUnitario"
       FROM items
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Item no encontrado'
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error obteniendo item:', error);
    res.status(500).json({
      error: error.message
    });
  }
});

// ==========================================
// POST - Crear item
// ==========================================
app.post('/api/items', async (req, res) => {
  const {
    referencia,
    descripcion,
    cantidad,
    precioUnitario
  } = req.body;

  if (
    typeof referencia !== 'string' ||
    !referencia.trim()
  ) {
    return res.status(400).json({
      error: 'La referencia es obligatoria'
    });
  }

  if (
    typeof descripcion !== 'string' ||
    !descripcion.trim()
  ) {
    return res.status(400).json({
      error: 'La descripción es obligatoria'
    });
  }

  const qty = Number(cantidad);
  const price = Number(precioUnitario);

  if (!Number.isFinite(qty) || qty < 0) {
    return res.status(400).json({
      error: 'La cantidad debe ser un número válido'
    });
  }

  if (!Number.isFinite(price) || price < 0) {
    return res.status(400).json({
      error: 'El precio unitario debe ser un número válido'
    });
  }

  try {
    const result = await pool.query(
      `INSERT INTO items
        (referencia, descripcion, cantidad, "precioUnitario")
       VALUES ($1, $2, $3, $4)
       RETURNING
        id,
        referencia,
        descripcion,
        cantidad,
        "precioUnitario"`,
      [
        referencia.trim(),
        descripcion.trim(),
        Math.round(qty),
        price
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creando item:', error);

    // Referencia duplicada
    if (error.code === '23505') {
      return res.status(409).json({
        error: 'Ya existe una referencia con ese nombre'
      });
    }

    res.status(500).json({
      error: error.message
    });
  }
});

// ==========================================
// PUT - Actualizar item
// ==========================================
app.put('/api/items/:id', async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    return res.status(400).json({
      error: 'ID inválido'
    });
  }

  const {
    referencia,
    descripcion,
    cantidad,
    precioUnitario
  } = req.body;

  if (
    typeof referencia !== 'string' ||
    !referencia.trim()
  ) {
    return res.status(400).json({
      error: 'La referencia es obligatoria'
    });
  }

  if (
    typeof descripcion !== 'string' ||
    !descripcion.trim()
  ) {
    return res.status(400).json({
      error: 'La descripción es obligatoria'
    });
  }

  const qty = Number(cantidad);
  const price = Number(precioUnitario);

  if (!Number.isFinite(qty) || qty < 0) {
    return res.status(400).json({
      error: 'La cantidad debe ser un número válido'
    });
  }

  if (!Number.isFinite(price) || price < 0) {
    return res.status(400).json({
      error: 'El precio unitario debe ser un número válido'
    });
  }

  try {
    const result = await pool.query(
      `UPDATE items
       SET
        referencia = $1,
        descripcion = $2,
        cantidad = $3,
        "precioUnitario" = $4
       WHERE id = $5
       RETURNING
        id,
        referencia,
        descripcion,
        cantidad,
        "precioUnitario"`,
      [
        referencia.trim(),
        descripcion.trim(),
        Math.round(qty),
        price,
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Item no encontrado'
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error actualizando item:', error);

    if (error.code === '23505') {
      return res.status(409).json({
        error: 'Ya existe una referencia con ese nombre'
      });
    }

    res.status(500).json({
      error: error.message
    });
  }
});

// ==========================================
// DELETE - Eliminar item
// ==========================================
app.delete('/api/items/:id', async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    return res.status(400).json({
      error: 'ID inválido'
    });
  }

  try {
    const result = await pool.query(
      `DELETE FROM items
       WHERE id = $1
       RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Item no encontrado'
      });
    }

    res.json({
      success: true,
      id: result.rows[0].id
    });
  } catch (error) {
    console.error('Error eliminando item:', error);

    res.status(500).json({
      error: error.message
    });
  }
});

// ==========================================
// Health check
// ==========================================
app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');

    res.json({
      status: 'ok',
      database: 'connected'
    });
  } catch (error) {
    console.error('Error en health check:', error);

    res.status(503).json({
      status: 'error',
      database: 'disconnected',
      error: error.message
    });
  }
});

// ==========================================
// Iniciar servidor
// ==========================================
async function startServer() {
  try {
    await initDatabase();

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`API escuchando en http://0.0.0.0:${PORT}`);
    });
  } catch (error) {
    console.error('No se pudo iniciar el servidor:', error);
    process.exit(1);
  }
}

startServer();
