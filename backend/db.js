const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, '..', 'data');
const dbPath = path.join(dbDir, 'inventario.db');

fs.mkdirSync(dbDir, { recursive: true });

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error al abrir la base de datos:', err.message);
    throw err;
  }
  console.log('Conectado a SQLite:', dbPath);
});

function initDatabase() {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        referencia TEXT NOT NULL UNIQUE,
        descripcion TEXT NOT NULL,
        cantidad INTEGER NOT NULL DEFAULT 0,
        precioUnitario REAL NOT NULL DEFAULT 0
      )
    `);

    db.get('SELECT COUNT(*) as total FROM items', (err, row) => {
      if (err) {
        console.error('Error consultando items:', err.message);
        return;
      }

      if (row.total === 0) {
        const seedItems = [
          { referencia: 'CAMISA-1', descripcion: 'motor de honda', cantidad: 5, precioUnitario: 54000 },
          { referencia: 'CAMISA-2', descripcion: 'motor ford', cantidad: 6, precioUnitario: 25000 }
        ];

        const stmt = db.prepare(
          'INSERT INTO items (referencia, descripcion, cantidad, precioUnitario) VALUES (?, ?, ?, ?)'
        );

        seedItems.forEach((item) => {
          stmt.run(item.referencia, item.descripcion, item.cantidad, item.precioUnitario);
        });

        stmt.finalize();
        console.log('Datos iniciales insertados en la base de datos.');
      }
    });
  });
}

module.exports = { db, initDatabase };
