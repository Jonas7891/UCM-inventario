const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'inventario',
  user: process.env.DB_USER || 'inventario_user',
  password: process.env.DB_PASSWORD || 'inventario_pass'
});

async function initDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS items (
        id SERIAL PRIMARY KEY,
        referencia TEXT NOT NULL UNIQUE,
        descripcion TEXT NOT NULL,
        cantidad INTEGER NOT NULL DEFAULT 0,
        "precioUnitario" REAL NOT NULL DEFAULT 0
      )
    `);

    const result = await pool.query(
      'SELECT COUNT(*) AS total FROM items'
    );

    if (Number(result.rows[0].total) === 0) {
      await pool.query(
        `INSERT INTO items
        (referencia, descripcion, cantidad, "precioUnitario")
        VALUES
        ($1, $2, $3, $4),
        ($5, $6, $7, $8)`,
        [
          'CAMISA-1',
          'motor de honda',
          5,
          54000,
          'CAMISA-2',
          'motor ford',
          6,
          25000
        ]
      );

      console.log('Datos iniciales insertados');
    }

    console.log('Conectado a PostgreSQL');
  } catch (error) {
    console.error(
      'Error inicializando PostgreSQL:',
      error.message
    );

    throw error;
  }
}

module.exports = {
  pool,
  initDatabase
};
