const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/chat/completions',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer sk-1234'
  }
};

const testData = {
  model: 'qwen3-30b-a3b-instruct-2507',
  messages: [
    {
      role: 'user',
      content: '测试返回 [{"id":"_1","type":"heading1","data":{"content":"测试标题"}}]'
    }
  ],
  temperature: 0.3,
  max_tokens: 100
};

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', data.substring(0, 500));
  });
});

req.on('error', (e) => {
  console.error('Request error:', e);
});

req.write(JSON.stringify(testData));
req.end();
