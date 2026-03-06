import { fetchReports, fetchReport, createReport, updateReport, deleteReport, checkHealth } from './reportApi.js';

const STORAGE_KEY = 'reportBuilderReports';
const CURRENT_REPORT_KEY = 'reportBuilderCurrentReport';

// 检查API是否可用
let apiAvailable = false;

export async function initStorage() {
  apiAvailable = await checkHealth();
  if (apiAvailable) {
    console.log('API服务可用,启用云端同步');
    // 同步本地数据到云端
    await syncLocalToCloud();
  } else {
    console.log('API服务不可用,使用本地存储');
  }
}

// 同步本地数据到云端
async function syncLocalToCloud() {
  try {
    const localData = loadFromLocalStorage();
    const cloudReports = await fetchReports();
    const cloudIds = new Set(cloudReports.map(r => r.id));
    
    // 将本地独有的报告上传到云端
    for (const [id, report] of Object.entries(localData.reports || {})) {
      if (!cloudIds.has(id)) {
        try {
          await createReport({
            id,
            title: report.title,
            subtitle: report.subtitle,
            modules: report.modules,
            created_by: 'local_user'
          });
          console.log(`同步报告到云端: ${id}`);
        } catch (e) {
          console.error(`同步报告失败: ${id}`, e);
        }
      }
    }
  } catch (e) {
    console.error('同步到云端失败:', e);
  }
}

// 从localStorage读取
function loadFromLocalStorage() {
  try {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      const parsed = JSON.parse(savedData);
      if (parsed && parsed.reports) {
        return parsed;
      }
    }
  } catch (error) {
    console.error('读取本地存储失败:', error);
  }
  return { reports: {} };
}

// 保存到localStorage
function saveToLocalStorage(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('保存到本地存储失败:', error);
  }
}

// 加载所有报告
export async function loadAllReports() {
  if (apiAvailable) {
    try {
      const reports = await fetchReports();
      // 转换为本地格式
      const reportsMap = {};
      reports.forEach(report => {
        reportsMap[report.id] = report;
      });
      // 同时更新本地缓存
      saveToLocalStorage({ reports: reportsMap });
      return { reports: reportsMap };
    } catch (e) {
      console.error('从云端加载失败,使用本地数据:', e);
    }
  }
  return loadFromLocalStorage();
}

// 加载当前报告
export async function loadCurrentReport() {
  const currentId = localStorage.getItem(CURRENT_REPORT_KEY);
  if (currentId && apiAvailable) {
    try {
      const report = await fetchReport(currentId);
      return report;
    } catch (e) {
      console.error('从云端加载当前报告失败:', e);
    }
  }
  
  // 从本地加载
  const data = loadFromLocalStorage();
  if (currentId && data.reports[currentId]) {
    return data.reports[currentId];
  }
  
  // 返回第一个报告或新建
  const reportKeys = Object.keys(data.reports);
  if (reportKeys.length > 0) {
    const firstId = reportKeys[0];
    localStorage.setItem(CURRENT_REPORT_KEY, firstId);
    return data.reports[firstId];
  }
  
  return { title: '新报告', subtitle: '', modules: [] };
}

// 保存报告
export async function saveReport(report) {
  const id = report.id || `report_${Date.now()}`;
  const reportData = {
    ...report,
    id,
    modules: (report.modules || []).filter(m => m && m.id)
  };
  
  // 保存到本地
  const data = loadFromLocalStorage();
  data.reports[id] = reportData;
  saveToLocalStorage(data);
  localStorage.setItem(CURRENT_REPORT_KEY, id);
  
  // 同步到云端
  if (apiAvailable) {
    try {
      const existing = await fetchReport(id).catch(() => null);
      if (existing) {
        await updateReport(id, reportData);
      } else {
        await createReport({
          ...reportData,
          created_by: 'user'
        });
      }
      console.log('报告已同步到云端');
    } catch (e) {
      console.error('同步到云端失败:', e);
    }
  }
  
  return reportData;
}

// 删除报告
export async function removeReport(id) {
  // 从本地删除
  const data = loadFromLocalStorage();
  delete data.reports[id];
  saveToLocalStorage(data);
  
  // 从云端删除
  if (apiAvailable) {
    try {
      await deleteReport(id);
    } catch (e) {
      console.error('从云端删除失败:', e);
    }
  }
}

// 获取当前报告ID
export function getCurrentReportId() {
  return localStorage.getItem(CURRENT_REPORT_KEY);
}

// 设置当前报告ID
export function setCurrentReportId(id) {
  localStorage.setItem(CURRENT_REPORT_KEY, id);
}
