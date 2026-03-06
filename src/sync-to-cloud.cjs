/**
 * 数据同步脚本
 * 将 localStorage 数据同步到云端 API
 * 
 * 使用方法:
 * 1. 在浏览器中导出 localStorage 数据
 * 2. 运行: node src/sync-to-cloud.cjs
 */

const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:3001/api';

// 读取 localStorage 数据文件
function loadLocalData() {
  const dataFile = path.join(__dirname, 'local-reports.json');
  if (!fs.existsSync(dataFile)) {
    console.log('请先将 localStorage 数据导出到 src/local-reports.json');
    console.log('导出方法: 在浏览器控制台运行:');
    console.log(`copy(JSON.stringify(localStorage.getItem('reportBuilderReports')))`);
    console.log('然后将复制的内容保存到 src/local-reports.json');
    return null;
  }
  
  try {
    const data = fs.readFileSync(dataFile, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    console.error('读取本地数据失败:', e);
    return null;
  }
}

// 同步到云端
async function syncToCloud() {
  const localData = loadLocalData();
  if (!localData || !localData.reports) {
    console.log('没有本地数据需要同步');
    return;
  }
  
  console.log(`找到 ${Object.keys(localData.reports).length} 个本地报告`);
  
  for (const [id, report] of Object.entries(localData.reports)) {
    try {
      // 检查云端是否已存在
      const checkRes = await fetch(`${API_URL}/reports/${id}`);
      
      if (checkRes.ok) {
        // 更新现有报告
        await fetch(`${API_URL}/reports/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: report.title,
            subtitle: report.subtitle,
            modules: report.modules
          })
        });
        console.log(`✓ 更新报告: ${report.title}`);
      } else {
        // 创建新报告
        await fetch(`${API_URL}/reports`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id,
            title: report.title,
            subtitle: report.subtitle,
            modules: report.modules,
            created_by: 'sync_script'
          })
        });
        console.log(`✓ 创建报告: ${report.title}`);
      }
    } catch (e) {
      console.error(`✗ 同步失败: ${report.title}`, e.message);
    }
  }
  
  console.log('\n同步完成!');
}

// 从云端下载数据
async function downloadFromCloud() {
  try {
    const res = await fetch(`${API_URL}/reports`);
    if (!res.ok) {
      console.error('获取云端数据失败');
      return;
    }
    
    const { reports } = await res.json();
    console.log(`云端有 ${reports.length} 个报告`);
    
    // 转换为本地格式
    const localFormat = { reports: {} };
    reports.forEach(report => {
      localFormat.reports[report.id] = report;
    });
    
    // 保存到文件
    const outputFile = path.join(__dirname, 'cloud-reports.json');
    fs.writeFileSync(outputFile, JSON.stringify(localFormat, null, 2));
    console.log(`数据已保存到: ${outputFile}`);
    console.log('你可以将此数据导入到 localStorage');
    
  } catch (e) {
    console.error('下载失败:', e);
  }
}

// 主函数
async function main() {
  const command = process.argv[2] || 'sync';
  
  if (command === 'sync') {
    await syncToCloud();
  } else if (command === 'download') {
    await downloadFromCloud();
  } else {
    console.log('用法:');
    console.log('  node src/sync-to-cloud.cjs sync     - 同步本地数据到云端');
    console.log('  node src/sync-to-cloud.cjs download - 从云端下载数据');
  }
}

main();
