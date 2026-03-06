const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3001;

// 中间件
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
// 增加 body-parser 限制以支持大文件（如附件 base64 数据）
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 请求日志
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url} - ${req.ip}`);
  next();
});

// 数据文件路径
const dataDir = path.join(__dirname, 'data');
const dataFile = path.join(dataDir, 'reports.json');

// 确保数据目录存在
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 初始化数据文件
function initData() {
  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, JSON.stringify({ reports: {}, folders: {} }, null, 2));
    console.log('数据文件初始化完成');
  } else {
    // 确保旧数据文件有 folders 字段
    try {
      const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
      if (!data.folders) {
        data.folders = {};
        fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
        console.log('数据文件已更新，添加 folders 字段');
      }
    } catch (err) {
      console.error('更新数据文件失败:', err);
    }
  }
}

// 读取数据
function readData() {
  try {
    const data = fs.readFileSync(dataFile, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('读取数据失败:', err);
    return { reports: {} };
  }
}

// 保存数据
function saveData(data) {
  try {
    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
    return true;
  } catch (err) {
    console.error('保存数据失败:', err);
    return false;
  }
}

// 初始化
initData();

// 获取所有报告和文件夹
app.get('/api/reports', (req, res) => {
  const data = readData();
  const reports = Object.values(data.reports).sort((a, b) => b.updated_at - a.updated_at);
  res.json({ 
    reports,
    folders: data.folders || {}
  });
});

// 获取单个报告
app.get('/api/reports/:id', (req, res) => {
  const { id } = req.params;
  const data = readData();
  const report = data.reports[id];
  
  if (!report) {
    res.status(404).json({ error: '报告不存在' });
  } else {
    res.json(report);
  }
});

// 创建报告
app.post('/api/reports', (req, res) => {
  const { id, title, subtitle, modules, created_by, folderId } = req.body;
  const now = Date.now();
  
  const data = readData();
  data.reports[id] = {
    id,
    title,
    subtitle: subtitle || '',
    modules: modules || [],
    folderId: folderId || null,
    created_at: now,
    updated_at: now,
    created_by: created_by || 'anonymous'
  };
  
  if (saveData(data)) {
    res.json(data.reports[id]);
  } else {
    res.status(500).json({ error: '创建报告失败' });
  }
});

// 更新报告
app.put('/api/reports/:id', (req, res) => {
  const { id } = req.params;
  const { title, subtitle, modules, folderId } = req.body;
  const now = Date.now();
  
  const data = readData();
  if (!data.reports[id]) {
    res.status(404).json({ error: '报告不存在' });
    return;
  }
  
  data.reports[id] = {
    ...data.reports[id],
    title,
    subtitle: subtitle || '',
    modules: modules || [],
    folderId: folderId !== undefined ? folderId : data.reports[id].folderId,
    updated_at: now
  };
  
  if (saveData(data)) {
    res.json(data.reports[id]);
  } else {
    res.status(500).json({ error: '更新报告失败' });
  }
});

// 删除报告
app.delete('/api/reports/:id', (req, res) => {
  const { id } = req.params;
  
  const data = readData();
  if (!data.reports[id]) {
    res.status(404).json({ error: '报告不存在' });
    return;
  }
  
  delete data.reports[id];
  
  if (saveData(data)) {
    res.json({ success: true, message: '报告已删除' });
  } else {
    res.status(500).json({ error: '删除报告失败' });
  }
});

// 获取所有文件夹
app.get('/api/folders', (req, res) => {
  const data = readData();
  res.json({ folders: data.folders || {} });
});

// 创建文件夹
app.post('/api/folders', (req, res) => {
  const { id, name, reports = [] } = req.body;
  const now = Date.now();
  
  const data = readData();
  data.folders[id] = {
    id,
    name,
    reports,
    created_at: now,
    updated_at: now
  };
  
  if (saveData(data)) {
    res.json(data.folders[id]);
  } else {
    res.status(500).json({ error: '创建文件夹失败' });
  }
});

// 更新文件夹
app.put('/api/folders/:id', (req, res) => {
  const { id } = req.params;
  const { name, reports } = req.body;
  const now = Date.now();
  
  const data = readData();
  if (!data.folders[id]) {
    res.status(404).json({ error: '文件夹不存在' });
    return;
  }
  
  data.folders[id] = {
    ...data.folders[id],
    name: name || data.folders[id].name,
    reports: reports !== undefined ? reports : data.folders[id].reports,
    updated_at: now
  };
  
  if (saveData(data)) {
    res.json(data.folders[id]);
  } else {
    res.status(500).json({ error: '更新文件夹失败' });
  }
});

// 删除文件夹
app.delete('/api/folders/:id', (req, res) => {
  const { id } = req.params;
  
  const data = readData();
  if (!data.folders[id]) {
    res.status(404).json({ error: '文件夹不存在' });
    return;
  }
  
  delete data.folders[id];
  
  if (saveData(data)) {
    res.json({ success: true, message: '文件夹已删除' });
  } else {
    res.status(500).json({ error: '删除文件夹失败' });
  }
});

// 健康检查
// 根路径
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Report API Server is running',
    endpoints: {
      health: '/api/health',
      reports: '/api/reports'
    },
    timestamp: new Date().toISOString() 
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 启动服务器
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n=== Report API Server Started ===`);
  console.log(`Local: http://localhost:${PORT}`);
  console.log(`Network: http://0.0.0.0:${PORT}`);
  console.log(`Data file: ${dataFile}`);
  console.log(`================================\n`);
});
