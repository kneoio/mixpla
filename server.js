const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();
const port = 38707;

// Serve static files from the current directory
app.use(express.static(__dirname));

app.use('/stream/:radioId', createProxyMiddleware({
  target: 'https://bratan.online',
  changeOrigin: true,
  pathRewrite: (path, req) => {
    const radioId = req.params.radioId;
    return `/${radioId}/radio/stream.m3u8`;
  },
  onProxyRes: (proxyRes, req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
}));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
