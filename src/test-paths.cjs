const http = require('http');

function testPath(path) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer sk-1234'
      }
    };

    const testData = {
      model: 'qwen3-30b-a3b-instruct-2507',
      messages: [{ role: 'user', content: '测试' }],
      temperature: 0.3,
      max_tokens: 50
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({ path, status: res.statusCode, response: data.substring(0, 200) });
      });
    });

    req.on('error', (e) => {
      resolve({ path, status: 'ERROR', response: e.message });
    });

    req.write(JSON.stringify(testData));
    req.end();
  });
}

async function test() {
  console.log('Testing different API paths...\n');
  
  const paths = [
    '/api/chat/completions',
    '/api/v1/chat/completions',
    '/api/openai/v1/chat/completions',
    '/api/api/v1/chat/completions'
  ];
  
  for (const path of paths) {
    const result = await testPath(path);
    console.log(`Path: ${path}`);
    console.log(`Status: ${result.status}`);
    console.log(`Response: ${result.response}`);
    console.log('---');
  }
}

test();
