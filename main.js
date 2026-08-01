const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

function getDataPath() {
  return path.join(app.getPath('userData'), 'inventario.json');
}

// Datos originales vistos en las capturas, para que al abrir el programa
// por primera vez ya aparezca la información que Jonattan tenía antes.
function seedData() {
  return [
    { id: 1, referencia: 'CAMISA-1', descripcion: 'motor de honda', cantidad: 5, precioUnitario: 54000 },
    { id: 2, referencia: 'CAMISA-2', descripcion: 'motor ford', cantidad: 6, precioUnitario: 25000 }
  ];
}

function loadData() {
  try {
    const raw = fs.readFileSync(getDataPath(), 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    const seeded = seedData();
    saveData(seeded);
    return seeded;
  }
}

function saveData(items) {
  fs.mkdirSync(path.dirname(getDataPath()), { recursive: true });
  fs.writeFileSync(getDataPath(), JSON.stringify(items, null, 2), 'utf-8');
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 720,
    minWidth: 1040,
    minHeight: 620,
    backgroundColor: '#0a0e1a',
    title: 'Universal de Camisas para Motores',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('items:load', () => loadData());
ipcMain.handle('items:save', (_event, items) => {
  saveData(items);
  return true;
});
