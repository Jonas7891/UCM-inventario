# Universal de Camisas para Motores

Sistema de inventario y gestión de precios, reconstruido a partir de las
capturas de pantalla del programa original. Es una app de escritorio hecha con
**Electron** (HTML/CSS/JS) y funciona tanto en Windows como en Linux/Ubuntu.

La app ya viene con dos referencias precargadas al abrirla por primera vez:
`CAMISA-1` (motor de Honda) y `CAMISA-2` (motor de Ford).

---

## 1. Requisitos previos

Necesitas **Node.js** (incluye `npm`).

### Windows
1. Descarga Node.js LTS desde https://nodejs.org
2. Instálalo con las opciones por defecto.
3. Abre PowerShell o CMD y verifica:

```bash
node -v
npm -v
```

### Ubuntu/Linux
En Ubuntu puedes instalarlo con:

```bash
sudo apt update
sudo apt install nodejs npm -y
```

Verifica con:

```bash
node -v
npm -v
```

---

## 2. Instalar dependencias

1. Abre la terminal dentro de la carpeta del proyecto.
2. Ejecuta:

```bash
npm install
```

Esto descarga Electron y las herramientas de compilación.

---

## 3. Ejecutar la app

```bash
npm start
```

La app se abrirá en pantalla y guardará los datos automáticamente.

---

## 4. Generar paquete para Linux/Ubuntu

Para crear un instalador portable y uno para Ubuntu, ejecuta:

```bash
npm run dist:linux
```

Esto generará los archivos en la carpeta `dist/`:

- `*.AppImage`: ejecutable portable para Linux
- `*.deb`: paquete instalable en Ubuntu/Debian

Si lo prefieres, también puedes usar:

```bash
npm run dist
```

para generar paquetes del sistema actual.

---

## 5. Dónde se guardan los datos

En Windows se guarda en `%APPDATA%\universal-camisas-motores\inventario.json`.

En Linux/Ubuntu, normalmente se guarda en:

```bash
~/.config/universal-camisas-motores/inventario.json
```

Puedes copiar ese archivo como respaldo o pasarlo a otro equipo para recuperar el inventario.

---

## 6. Estructura del proyecto

```text
universal-camisas-motores/
├── main.js
├── preload.js
├── package.json
├── src/
│   ├── index.html
│   ├── styles.css
│   └── renderer.js
└── README.md
```

---

## 7. Problemas comunes

- `npm` no se reconoce: Node.js no quedó instalado correctamente.
- La app se abre en blanco: borra la carpeta `node_modules` y vuelve a ejecutar `npm install`.
- Quieres borrar el inventario: elimina el archivo JSON indicado en el punto 5 y vuelve a abrir la app.
