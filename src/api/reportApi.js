// 自动检测 API 地址
const getApiBaseUrl = () => {
  // 如果当前页面是通过 IP 访问的，使用相同的 IP
  const hostname = window.location.hostname;
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    return `http://${hostname}:3001/api`;
  }
  return 'http://localhost:3001/api';
};

const API_BASE_URL = getApiBaseUrl();

// 带超时的 fetch
async function fetchWithTimeout(url, options = {}, timeout = 5000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('请求超时');
    }
    throw error;
  }
}

// 获取所有报告
export async function fetchReports() {
  const response = await fetchWithTimeout(`${API_BASE_URL}/reports`);
  if (!response.ok) {
    throw new Error('获取报告列表失败');
  }
  const data = await response.json();
  // 返回完整的响应对象，包含 reports 和 folders
  return {
    reports: data.reports || [],
    folders: data.folders || {}
  };
}

// 获取单个报告
export async function fetchReport(id) {
  const response = await fetchWithTimeout(`${API_BASE_URL}/reports/${id}`);
  if (!response.ok) {
    throw new Error('获取报告失败');
  }
  return response.json();
}

// 创建报告
export async function createReport(report) {
  const response = await fetchWithTimeout(`${API_BASE_URL}/reports`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(report)
  });
  if (!response.ok) {
    throw new Error('创建报告失败');
  }
  return response.json();
}

// 更新报告
export async function updateReport(id, report) {
  const response = await fetchWithTimeout(`${API_BASE_URL}/reports/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(report)
  });
  if (!response.ok) {
    throw new Error('更新报告失败');
  }
  return response.json();
}

// 删除报告
export async function deleteReport(id) {
  const response = await fetchWithTimeout(`${API_BASE_URL}/reports/${id}`, {
    method: 'DELETE'
  });
  if (!response.ok) {
    throw new Error('删除报告失败');
  }
  return response.json();
}

// 健康检查
export async function checkHealth() {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/health`, {}, 3000);
    return response.ok;
  } catch {
    return false;
  }
}

// 获取所有文件夹
export async function fetchFolders() {
  const response = await fetchWithTimeout(`${API_BASE_URL}/folders`);
  if (!response.ok) {
    throw new Error('获取文件夹列表失败');
  }
  const data = await response.json();
  return data.folders || {};
}

// 创建文件夹
export async function createFolder(folder) {
  const response = await fetchWithTimeout(`${API_BASE_URL}/folders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(folder)
  });
  if (!response.ok) {
    throw new Error('创建文件夹失败');
  }
  return response.json();
}

// 更新文件夹
export async function updateFolder(id, folder) {
  const response = await fetchWithTimeout(`${API_BASE_URL}/folders/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(folder)
  });
  if (!response.ok) {
    throw new Error('更新文件夹失败');
  }
  return response.json();
}

// 删除文件夹
export async function deleteFolder(id) {
  const response = await fetchWithTimeout(`${API_BASE_URL}/folders/${id}`, {
    method: 'DELETE'
  });
  if (!response.ok) {
    throw new Error('删除文件夹失败');
  }
  return response.json();
}
