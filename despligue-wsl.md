# Despliegue en WSL con Docker, SSH y API del inventario

Este documento explica cómo desplegar el proyecto en WSL, levantar el backend con Docker y acceder a la API desde otro equipo por SSH o por red.

## 1. Requisitos

Necesitas tener instalado lo siguiente:

- Windows 11 con WSL habilitado
- Ubuntu/Debian dentro de WSL
- Docker Engine y Docker Compose
- Acceso SSH a la máquina donde se va a desplegar
- Git (opcional, si vas a clonar el proyecto)

---

## 2. Instalar WSL

Abre PowerShell como administrador y ejecuta:

```bash
wsl --install
```

Luego reinicia tu equipo.

Abre la terminal de Ubuntu/WSL y verifica:

```bash
wsl --version
```

---

## 3. Instalar Docker en WSL

Ejecuta estos comandos dentro de tu distribución de WSL:

```bash
sudo apt update
sudo apt install docker.io docker-compose-plugin -y
sudo usermod -aG docker $USER
```

Cierra la terminal de WSL y vuelve a abrirla.

Verifica:

```bash
docker --version
docker compose version
```

Si aparece la versión de Docker, la instalación quedó bien.

---

## 4. Clonar o copiar el proyecto

En tu carpeta de trabajo dentro de WSL:

```bash
cd ~
mkdir -p proyectos
cd proyectos
```

Si el proyecto está en GitHub o en tu servidor, clónalo:

```bash
git clone <URL_DEL_REPOSITORIO>
cd <NOMBRE_DEL_PROYECTO>
```

Si ya lo tienes en tu máquina, puedes copiarlo con SCP o rsync desde la máquina local.

---

## 5. Instalar dependencias del proyecto

Dentro de la carpeta del proyecto:

```bash
npm install
```

Esto instala las dependencias del backend y de la app Node.

---

## 6. Probar el backend sin Docker

Antes de levantar el contenedor, prueba que la API responde correctamente:

```bash
npm run start:api
```

En otra terminal:

```bash
curl http://localhost:3000/api/items
```

Si funciona, la API está bien.

---

## 7. Levantar el proyecto con Docker

Desde la raíz del proyecto:

```bash
docker compose up --build -d
```

Esto crea y levanta el contenedor del backend.

Verifica que el contenedor esté corriendo:

```bash
docker ps
```

Revisa los logs:

```bash
docker logs -f ucm-inventario-api
```

---

## 8. Probar la API desde el contenedor

En el mismo WSL:

```bash
curl http://localhost:3000/api/items
```

Si responde con JSON, el despliegue fue exitoso.

---

## 9. Usar SSH para acceder al servidor remoto

Desde tu equipo local:

```bash
ssh usuario@IP_DEL_SERVIDOR
```

Cuando entres al servidor, ve al proyecto:

```bash
cd /ruta/del/proyecto
```

Y levanta el contenedor:

```bash
docker compose up --build -d
```

Para ver logs:

```bash
docker logs -f ucm-inventario-api
```

---

## 10. Probar la API desde otro equipo

Desde otra máquina o desde tu PC local:

```bash
curl http://IP_DEL_SERVIDOR:3000/api/items
```

Si la API responde, ya puedes consumir la base de datos desde red.

---

## 11. Acceso por firewall/puerto

Si tu servidor usa ufw, habilita el puerto 3000:

```bash
sudo ufw allow 3000/tcp
```

También puedes abrir el puerto en el proveedor cloud o en la máquina virtual donde esté desplegado.

---

## 12. Ver la base de datos

La base de datos SQLite se guarda en el volumen del proyecto:

```bash
./data/inventario.db
```

Esto permite que la información persista aunque el contenedor se reinicie.

---

## 13. Detener el contenedor

```bash
docker compose down
```

Para reiniciarlo:

```bash
docker compose up -d
```

---

## 14. Estructura relevante del proyecto

```text
.
├── backend/
│   ├── db.js
│   ├── server.js
│   └── api-test.test.js
├── data/
│   └── inventario.db
├── Dockerfile
├── docker-compose.yml
├── package.json
├── .env.example
├── .dockerignore
└── src/
```

---

## 15. Endpoints disponibles

### Obtener todos los items

```bash
GET /api/items
```

### Obtener un item por ID

```bash
GET /api/items/:id
```

### Crear un item

```bash
POST /api/items
```

Body ejemplo:

```json
{
  "referencia": "CAMISA-3",
  "descripcion": "motor de toyota",
  "cantidad": 10,
  "precioUnitario": 60000
}
```

### Actualizar un item

```bash
PUT /api/items/:id
```

### Eliminar un item

```bash
DELETE /api/items/:id
```

---

## 16. Recomendación final

Este proyecto ya está preparado para funcionar como backend con base de datos centralizada y despliegue por Docker. Para que varios dispositivos puedan usar la interfaz visual del inventario en navegador, el siguiente paso recomendado es convertir la aplicación a una versión web o integrar un frontend que consuma la API.

---

## 17. Comandos resumidos

```bash
npm install
npm run start:api

docker compose up --build -d
docker ps
docker logs -f ucm-inventario-api
curl http://localhost:3000/api/items

docker compose down
```

---

## 18. Problemas comunes

### El contenedor no inicia
Verifica:

```bash
docker logs -f ucm-inventario-api
```

### El puerto 3000 no responde
Revisa firewall y si el contenedor está activo:

```bash
docker ps
sudo ufw status
```

### La base de datos no persiste
Asegúrate de que la carpeta data exista y esté montada en docker-compose.yml.

---

## 19. Conclusión

Con este flujo, puedes desplegar el inventario en WSL, lanzarlo con Docker, acceder por SSH y consumir la API desde otros equipos por red. Esto deja la base lista para seguir con un frontend web o con un despliegue más robusto en producción.
