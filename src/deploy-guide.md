# 报告工具部署指南

## 快速部署到共享服务器

### 1. 准备服务器
需要一台团队共享的服务器:
- Windows Server 或 Linux
- Node.js 16+ 
- 内网可访问
- 端口 3000, 3001 可用

### 2. 部署步骤

**步骤1: 复制文件**
```
my-report/
├── dist/                    # 前端构建文件
├── src/server/              # 后端API
│   ├── api.cjs
│   ├── package.json
│   └── data/                # 数据目录
└── src/proxy-server.cjs     # 代理服务器
```

**步骤2: 安装依赖**
```bash
cd my-report
npm install
cd src/server && npm install
cd ../..
```

**步骤3: 启动服务**
```bash
# 方法1: 直接启动
node src/server/api.cjs &
node src/proxy-server.cjs &

# 方法2: 使用 PM2 (推荐)
npm install -g pm2
pm2 start src/server/api.cjs --name report-api
pm2 start src/proxy-server.cjs --name report-proxy
pm2 save
pm2 startup
```

**步骤4: 开放防火墙**
```bash
# Windows
netsh advfirewall firewall add rule name="Report Tool" dir=in action=allow protocol=tcp localport=3000-3001
```

### 3. 团队访问
```
http://服务器IP:3000
```

### 4. 数据备份
数据文件: `src/server/data/reports.json`

定期备份:
```bash
copy src\server\data\reports.json backup\reports-%date%.json
```

---

## 使用 Docker 部署

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000 3001
CMD ["sh", "-c", "node src/server/api.cjs & node src/proxy-server.cjs"]
```

构建和运行:
```bash
docker build -t report-tool .
docker run -d -p 3000:3000 -p 3001:3001 -v $(pwd)/src/server/data:/app/src/server/data --name report-tool report-tool
```
