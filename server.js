const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  // Translate URL path to local file path
  let filePath = '.' + req.url;
  if (filePath === './') {
    filePath = './index.html';
  }

  // Sanitize path to prevent directory traversal
  filePath = path.normalize(filePath);
  if (filePath.startsWith('..')) {
    res.writeHead(403);
    res.end('Access Denied');
    return;
  }

  // Remove query parameters or hash segments
  const qIndex = filePath.indexOf('?');
  if (qIndex !== -1) filePath = filePath.substring(0, qIndex);
  const hIndex = filePath.indexOf('#');
  if (hIndex !== -1) filePath = filePath.substring(0, hIndex);

  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = MIME_TYPES[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        // Fallback for subdirectories or 404
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<body style="background:#0f172a;color:#f8fafc;font-family:sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;"><h1>404 - Archivo No Encontrado</h1><p>Verifique la ruta del archivo solicitado.</p><a href="/" style="color:#06b6d4;text-decoration:none;font-weight:bold;">Volver al Inicio</a></body>', 'utf-8');
      } else {
        res.writeHead(500);
        res.end(`Internal Server Error: ${error.code}\n`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(` SaaS Admin Pro - Servidor Local`);
  console.log(` Corriendo en: http://localhost:${PORT}/`);
  console.log(`======================================================\n`);
});
