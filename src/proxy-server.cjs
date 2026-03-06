const http = require('http');
const httpProxy = require('http-proxy');
const fs = require('fs');
const path = require('path');

const proxy = httpProxy.createProxyServer({});
const PORT = 3000;

// Ollama 本地服务配置
const OLLAMA_TARGET = 'http://localhost:11434';

// 监听代理响应
proxy.on('proxyRes', (proxyRes, req, res) => {
  console.log(`Proxy response status: ${proxyRes.statusCode}`);
  if (proxyRes.statusCode !== 200) {
    let body = '';
    proxyRes.on('data', (chunk) => {
      body += chunk;
    });
    proxyRes.on('end', () => {
      console.log(`Proxy response body: ${body.substring(0, 300)}`);
    });
  }
});

proxy.on('error', (err, req, res) => {
  console.error('Proxy error:', err);
  if (!res.headersSent) {
    res.writeHead(502);
    res.end('Proxy error: ' + err.message);
  }
});

// 处理 Ollama 请求
const handleOllamaRequest = async (req, res) => {
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    try {
      const openAIRequest = JSON.parse(body);
      console.log('OpenAI request:', JSON.stringify(openAIRequest, null, 2));
      
      // 转换为 Ollama 格式
      const ollamaRequest = {
        model: openAIRequest.model,
        messages: openAIRequest.messages,
        stream: false,
        options: {
          temperature: openAIRequest.temperature || 0.3,
          num_predict: openAIRequest.max_tokens || 8192
        }
      };
      
      console.log('Ollama request:', JSON.stringify(ollamaRequest, null, 2));
      
      // 发送到 Ollama
      const response = await fetch(`${OLLAMA_TARGET}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(ollamaRequest)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Ollama error:', errorText);
        res.writeHead(response.status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: errorText }));
        return;
      }
      
      const ollamaResponse = await response.json();
      console.log('Ollama response:', JSON.stringify(ollamaResponse, null, 2).substring(0, 500));
      
      // 转换为 OpenAI 格式
      const openAIResponse = {
        id: 'chatcmpl-' + Date.now(),
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: openAIRequest.model,
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: ollamaResponse.message?.content || ''
          },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0
        }
      };
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(openAIResponse));
    } catch (error) {
      console.error('Error handling Ollama request:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
  });
};

const server = http.createServer((req, res) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // 调试端点
  if (req.url === '/api/debug') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      message: 'Proxy server is running',
      target: OLLAMA_TARGET,
      timestamp: new Date().toISOString()
    }));
    return;
  }

  // 处理 Ollama 聊天请求
  if (req.url === '/api/chat/completions' && req.method === 'POST') {
    handleOllamaRequest(req, res);
    return;
  }

  // 静态文件服务
  let filePath = path.join(__dirname, '../dist', req.url === '/' ? 'index.html' : req.url);
  
  const ext = path.extname(filePath);
  const contentTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
  };

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        fs.readFile(path.join(__dirname, '../dist/index.html'), (err, content) => {
          if (err) {
            res.writeHead(404);
            res.end('Not found');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(content);
          }
        });
      } else {
        res.writeHead(500);
        res.end('Server error');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'application/octet-stream' });
      res.end(content);
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n=== Proxy Server Started ===`);
  console.log(`Local: http://localhost:${PORT}`);
  console.log(`Network: http://0.0.0.0:${PORT}`);
  console.log(`Ollama Proxy: /api/chat/completions -> ${OLLAMA_TARGET}/api/chat`);
  console.log(`Debug endpoint: http://localhost:${PORT}/api/debug`);
  console.log(`========================\n`);
});
