import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { marked } from 'marked';
import * as XLSX from 'xlsx';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, ScatterChart, Scatter, ZAxis, ComposedChart, Line,
  ReferenceLine, ReferenceArea, LabelList
} from 'recharts';
import {
  Download, Plus, Trash2, ChevronUp, ChevronDown, X, Pencil,
  FileText, BarChart3, Target, TrendingUp, LayoutGrid,
  ArrowLeftRight, List, Filter, Activity, Circle, Gauge, Upload, Sparkles,
  PieChart, ListOrdered, Gauge as ProgressIcon, GripVertical, Folder, FolderPlus,
  RefreshCw, Cloud, CloudOff, Save, Columns, Copy, Image, FileSpreadsheet, Paperclip,
  CheckSquare, Check, Map as MapIcon
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { fetchReports, fetchReport, createReport, updateReport, deleteReport, checkHealth, fetchFolders, createFolder, updateFolder, deleteFolder } from './api/reportApi.js';

let uidCounter = 0;
const uid = () => `_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${(++uidCounter).toString(36)}_${performance.now().toString(36).substr(2, 5)}`;
const P = ['#1d4ed8','#047857','#b45309','#b91c1c','#6d28d9','#0e7490','#c2410c','#be185d'];

const FileItem = ({ id, report, setReportsData, flash, isRoot, currentReportId, setTitle, setSubtitle, setModules, setSel, setShowReportList, modules, apiAvailable }) => {
  const isCurrent = currentReportId === id;
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (e) => {
    e.dataTransfer.setData('reportId', id);
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleOpenReport = async () => {
    if (window.confirm('确定要打开这个报告吗？当前报告的更改会被保存。')) {
      // 保存当前报告到 localStorage
      const currentTitle = document.querySelector('input[placeholder="报告标题"]')?.value || '新报告';
      const currentSubtitle = document.querySelector('input[placeholder="添加副标题..."]')?.value || '';
      saveCurrentReportToStorage({ title: currentTitle, subtitle: currentSubtitle, modules });
      
      // 更新当前报告ID
      currentReportId = id;
      localStorage.setItem('reportBuilderCurrentReport', id);
      
      // 加载新报告
      setTitle(report.title);
      setSubtitle(report.subtitle);
      setModules(report.modules || []);
      setSel(null);
      setShowReportList(false);
      flash('已打开报告');
    }
  };

  const handleDeleteReport = async (e) => {
    e.stopPropagation();
    if (window.confirm('确定要删除这个报告吗？')) {
      if (apiAvailable) {
        try {
          await deleteReport(id);
        } catch (error) {
          console.error('删除报告失败:', error);
        }
      }
      
      // 同时从 localStorage 删除
      const data = loadAllReportsFromStorage();
      delete data.reports[id];
      saveAllReportsToStorage(data);
      setReportsData(data);
      
      if (currentReportId === id) {
        const remainingReports = Object.entries(data.reports);
        if (remainingReports.length > 0) {
          const [firstId, firstReport] = remainingReports[0];
          currentReportId = firstId;
          localStorage.setItem('reportBuilderCurrentReport', firstId);
          setTitle(firstReport.title);
          setSubtitle(firstReport.subtitle);
          setModules(firstReport.modules || []);
          setSel(null);
        } else {
          const newTitle = '新报告';
          const newSubtitle = '';
          const newModules = [];
          const newReportId = `report_${Date.now()}`;
          currentReportId = newReportId;
          data.reports[newReportId] = { title: newTitle, subtitle: newSubtitle, modules: newModules, createdAt: Date.now() };
          saveAllReportsToStorage(data);
          localStorage.setItem('reportBuilderCurrentReport', newReportId);
          setTitle(newTitle);
          setSubtitle(newSubtitle);
          setModules(newModules);
          setSel(null);
        }
      }
      flash('已删除报告');
    }
  };

  const handleDuplicateReport = async (e) => {
    e.stopPropagation();
    
    // 生成新的报告ID
    const newReportId = `report_${Date.now()}`;
    
    // 深拷贝报告数据，并更新所有模块的ID
    const duplicatedModules = (report.modules || []).map(m => ({
      ...JSON.parse(JSON.stringify(m)),
      id: uid() // 为每个模块生成新的唯一ID
    }));
    
    const newReport = {
      ...JSON.parse(JSON.stringify(report)),
      title: `${report.title} (复制)`,
      modules: duplicatedModules,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    // 保存到 localStorage - 使用深拷贝避免引用问题
    const data = JSON.parse(JSON.stringify(loadAllReportsFromStorage()));
    data.reports[newReportId] = newReport;
    saveAllReportsToStorage(data);
    
    // 更新当前报告ID为新报告（可选：复制后直接打开新报告）
    // 如果希望复制后保持当前报告不变，请注释掉下面4行
    // currentReportId = newReportId;
    // localStorage.setItem('reportBuilderCurrentReport', newReportId);
    // setTitle(newReport.title);
    // setSubtitle(newReport.subtitle);
    // setModules(newReport.modules);
    
    // 如果 API 可用，也保存到服务器
    if (apiAvailable) {
      try {
        await createReport({
          id: newReportId,
          ...newReport
        });
      } catch (error) {
        console.error('复制报告到服务器失败:', error);
      }
    }
    
    // 更新报告列表 - 重新加载所有报告以确保显示完整列表
    const allReports = await loadAllReports();
    setReportsData(allReports);
    flash('已复制报告');
  };

  return (
    <div 
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`p-2 border-b border-zinc-100 hover:bg-zinc-50 cursor-pointer flex items-center gap-2 ${isCurrent ? 'bg-blue-50' : ''} ${isDragging ? 'opacity-50' : ''}`}
    >
      <FileText size={14} className="text-zinc-400 flex-shrink-0" />
      <div className="flex-1 min-w-0" onClick={handleOpenReport}>
        <div className="font-medium text-sm text-zinc-800 truncate">{report.title}</div>
        <div className="text-xs text-zinc-400 truncate">{report.subtitle || '无副标题'}</div>
      </div>
      <button 
        onClick={handleDuplicateReport}
        className="p-1 text-zinc-400 hover:text-blue-500 rounded"
        title="复制"
      >
        <Copy size={14} />
      </button>
      <button 
        onClick={handleDeleteReport}
        className="p-1 text-zinc-400 hover:text-red-500 rounded"
        title="删除"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
};

// 组件分类
const COMPONENT_CATEGORIES = {
  text: { label: '文本类', order: 1 },
  chart: { label: '图表类', order: 2 },
  diagram: { label: '图示类', order: 3 },
  list: { label: '列表类', order: 4 },
  media: { label: '媒体类', order: 5 },
};

// Excel导入格式样例
const EXCEL_FORMAT_EXAMPLES = {
  chart: {
    title: '柱状图',
    description: '第一列为类别，后面各列为系列数据',
    headers: ['类别', '系列A', '系列B', '系列C'],
    rows: [
      ['1月', '120', '80', '60'],
      ['2月', '150', '90', '70'],
      ['3月', '180', '100', '80'],
      ['4月', '200', '120', '90'],
    ]
  },
  hbar: {
    title: '横向柱状图',
    description: '第一列为类别，后面各列为系列数据（与柱状图格式相同）',
    headers: ['类别', '系列A', '系列B', '系列C'],
    rows: [
      ['产品A', '120', '80', '60'],
      ['产品B', '150', '90', '70'],
      ['产品C', '180', '100', '80'],
      ['产品D', '200', '120', '90'],
    ]
  },
  line: {
    title: '双轴折线图',
    description: '第一列为X轴（如时间），后面各列为系列数据。奇数系列使用左轴，偶数系列使用右轴',
    headers: ['日期', '订单量', '转化率(%)', '用户数', '满意度(%)'],
    rows: [
      ['2024-01', '320', '35', '1200', '85'],
      ['2024-02', '480', '38', '1500', '87'],
      ['2024-03', '650', '42', '1800', '90'],
      ['2024-04', '720', '45', '2100', '92'],
    ]
  },
  line3: {
    title: '三折线图',
    description: '第一列为X轴（如时间），后面三列为系列数据',
    headers: ['月份', '系列A', '系列B', '系列C'],
    rows: [
      ['1月', '100', '80', '60'],
      ['2月', '120', '90', '70'],
      ['3月', '150', '100', '80'],
      ['4月', '180', '110', '90'],
    ]
  },
  bar2line: {
    title: '双折线+柱状图',
    description: '第一列为标签，第二列为柱状图数据，第三、四列为两条折线数据',
    headers: ['月份', '销售额', '增长率A(%)', '增长率B(%)'],
    rows: [
      ['1月', '100', '5', '10'],
      ['2月', '120', '8', '15'],
      ['3月', '150', '12', '20'],
      ['4月', '180', '15', '25'],
    ]
  },
  stackbarline: {
    title: '堆叠柱状图+折线',
    description: '第一列为标签，第二、三列为堆叠柱状图的两个系列，第四列为折线数据（百分比）',
    headers: ['月份', '系列A', '系列B', '增长率(%)'],
    rows: [
      ['1月', '50', '30', '-15'],
      ['2月', '60', '35', '-3'],
      ['3月', '70', '40', '-1'],
      ['4月', '80', '45', '4'],
      ['5月', '90', '50', '-11'],
      ['6月', '100', '55', '-13'],
    ]
  },
  barline: {
    title: '组合图（柱状+折线）',
    description: '第一列为标签，中间列为柱状图数据（支持多列），最后1-2列为折线图数据。例如：标签,柱状1,柱状2,折线1',
    headers: ['月份', '销售额A', '销售额B', '增长率(%)'],
    rows: [
      ['1月', '100', '80', '5'],
      ['2月', '120', '90', '20'],
      ['3月', '150', '110', '25'],
      ['4月', '180', '130', '20'],
    ]
  },
  pie: {
    title: '饼图',
    description: '第一列为类别标签，第二列为数值',
    headers: ['类别', '数值'],
    rows: [
      ['产品A', '35'],
      ['产品B', '28'],
      ['产品C', '20'],
      ['产品D', '17'],
    ]
  },
  table: {
    title: '表格',
    description: '第一行为表头，后面为数据行',
    headers: ['姓名', '部门', '销售额', '完成率'],
    rows: [
      ['张三', '销售部', '150000', '95%'],
      ['李四', '市场部', '180000', '108%'],
      ['王五', '技术部', '120000', '90%'],
    ]
  },
  kpi: {
    title: 'KPI指标卡',
    description: '第一列为指标名，第二列为数值，第三列为变化(可选，支持 +/- 或 上升/下降)',
    headers: ['指标', '数值', '变化'],
    rows: [
      ['总销售额', '¥1.25M', '+15%'],
      ['订单量', '3,240', '+8.5%'],
      ['客户满意度', '92%', '+3.2%'],
      ['退货率', '2.1%', '-0.5%'],
    ]
  },
  funnel: {
    title: '漏斗图',
    description: '第一列为阶段名，第二列为当前值，第三列为上一期值(可选)',
    headers: ['阶段', '本期', '上期'],
    rows: [
      ['访问', '10000', '9200'],
      ['注册', '6500', '5800'],
      ['下单', '3200', '2800'],
      ['支付', '2800', '2400'],
    ]
  },
  progress: {
    title: '进度条',
    description: '第一列为进度项名称，第二列为当前值，第三列为目标值，第四列为单位(可选)',
    headers: ['项目', '当前', '目标', '单位'],
    rows: [
      ['销售目标', '750', '1000', '万'],
      ['新客户', '320', '500', '人'],
      ['任务完成', '85', '100', '%'],
    ]
  },
  waterfall: {
    title: '瀑布图',
    description: '第一列为标签，第二列为数值（正数为增加，负数为减少），第三列为类型(可选：positive/negative/total)',
    headers: ['项目', '数值', '类型'],
    rows: [
      ['起始', '100', 'total'],
      ['收入增加', '50', 'positive'],
      ['成本减少', '-30', 'negative'],
      ['最终', '140', 'total'],
    ]
  },
  scatter: {
    title: '散点图',
    description: '第一列为系列名，第二列为X值，第三列为Y值',
    headers: ['系列', 'X轴', 'Y轴'],
    rows: [
      ['A组', '10', '20'],
      ['A组', '30', '40'],
      ['A组', '50', '60'],
      ['B组', '15', '25'],
      ['B组', '35', '45'],
    ]
  },
  bubble: {
    title: '气泡图',
    description: '第一列为系列名，第二列为X值，第三列为Y值，第四列为气泡大小(Z值)，第五列为标签(可选)',
    headers: ['系列', 'X轴', 'Y轴', '大小', '标签'],
    rows: [
      ['A组', '10', '20', '50', '点1'],
      ['A组', '30', '40', '80', '点2'],
      ['B组', '15', '25', '60', '点3'],
    ]
  },
  radar: {
    title: '雷达图',
    description: '第一列为维度名，后面各列为系列数据',
    headers: ['维度', '系列A', '系列B'],
    rows: [
      ['性能', '80', '70'],
      ['稳定性', '90', '85'],
      ['易用性', '75', '90'],
      ['安全性', '85', '80'],
      ['扩展性', '70', '75'],
    ]
  },
  comparison: {
    title: '对比分析',
    description: '第一列为指标名，第二列为措施，第三列为优化前，第四列为优化后',
    headers: ['指标', '措施', '优化前', '优化后'],
    rows: [
      ['响应时间', '缓存优化', '500ms', '200ms'],
      ['错误率', '代码重构', '5%', '1%'],
      ['吞吐量', '架构升级', '1000', '2500'],
    ]
  },
  heatmap: {
    title: '热力图',
    description: '第一列为行标签，后面各列为对应数值',
    headers: ['时间', '周一', '周二', '周三', '周四', '周五'],
    rows: [
      ['09:00', '10', '20', '30', '25', '15'],
      ['12:00', '30', '40', '50', '45', '35'],
      ['18:00', '50', '60', '70', '65', '55'],
    ]
  },
  chinamap: {
    title: '中国地图',
    description: '第一列为地区名称（省市），第二列为数值',
    headers: ['地区', '数值'],
    rows: [
      ['北京', '100'],
      ['上海', '85'],
      ['广东', '75'],
      ['浙江', '65'],
      ['江苏', '60'],
      ['山东', '55'],
      ['河南', '50'],
      ['四川', '45'],
      ['湖北', '40'],
      ['湖南', '35'],
    ]
  },
  sankey: {
    title: '桑基图',
    description: '第一列为源节点，第二列为目标节点，第三列为流量值',
    headers: ['源节点', '目标节点', '流量'],
    rows: [
      ['首页', '产品页', '300'],
      ['首页', '关于我们', '100'],
      ['产品页', '购物车', '200'],
      ['产品页', '收藏', '100'],
    ]
  },
  gantt: {
    title: '甘特图',
    description: '第一列为任务名，第二列为开始日期，第三列为结束日期，第四列为进度(0-100)',
    headers: ['任务', '开始日期', '结束日期', '进度'],
    rows: [
      ['需求分析', '2024-01-01', '2024-01-10', '100'],
      ['设计', '2024-01-11', '2024-01-25', '80'],
      ['开发', '2024-01-26', '2024-02-28', '60'],
      ['测试', '2024-03-01', '2024-03-15', '30'],
    ]
  },
};

const TYPES = [
  // 文本类
  { type:'heading1', label:'一级标题', icon:FileText, category:'text' },
  { type:'heading2', label:'二级标题', icon:FileText, category:'text' },
  { type:'heading3', label:'三级标题', icon:FileText, category:'text' },
  { type:'text', label:'文本', icon:FileText, category:'text' },
  { type:'note', label:'备注', icon:FileText, category:'text' },
  { type:'kpi', label:'指标卡', icon:TrendingUp, category:'text' },
  { type:'table', label:'表格', icon:LayoutGrid, category:'text' },
  // 图表类
  { type:'chart', label:'柱状图', icon:BarChart3, category:'chart' },
  { type:'hbar', label:'横向柱状图', icon:BarChart3, category:'chart' },
  { type:'line', label:'折线图', icon:Activity, category:'chart' },
  { type:'bar2line', label:'双折线+柱状', icon:BarChart3, category:'chart' },
  { type:'stackbarline', label:'堆叠柱+折线', icon:BarChart3, category:'chart' },
  { type:'pie', label:'饼图', icon:PieChart, category:'chart' },
  { type:'barline', label:'组合图', icon:BarChart3, category:'chart' },
  { type:'radar', label:'雷达图', icon:Target, category:'chart' },
  { type:'bubble', label:'气泡图', icon:Circle, category:'chart' },
  { type:'scatter', label:'散点图', icon:Circle, category:'chart' },
  { type:'waterfall', label:'瀑布图', icon:BarChart3, category:'chart' },
  { type:'heatmap', label:'热力图', icon:LayoutGrid, category:'chart' },
  { type:'chinamap', label:'中国地图', icon:MapIcon, category:'chart' },
  // 图示类
  { type:'funnel', label:'漏斗图', icon:Filter, category:'diagram' },
  { type:'comparison', label:'对比分析', icon:ArrowLeftRight, category:'diagram' },
  { type:'quadrant', label:'四象限', icon:Gauge, category:'diagram' },
  { type:'sankey', label:'桑基图', icon:ArrowLeftRight, category:'diagram' },
  { type:'gantt', label:'甘特图', icon:LayoutGrid, category:'diagram' },
  { type:'wordcloud', label:'词云图', icon:FileText, category:'diagram' },
  // 列表类
  { type:'list', label:'要点列表', icon:List, category:'list' },
  { type:'ordered', label:'有序列表', icon:ListOrdered, category:'list' },
  { type:'unordered', label:'无序列表', icon:List, category:'list' },
  { type:'progress', label:'进度条', icon:ProgressIcon, category:'list' },
  // 媒体类
  { type:'image', label:'图片', icon:Image, category:'media' },
  { type:'attachment', label:'附件', icon:Paperclip, category:'media' },
];

function DraggableModule({ mod, isSelected, onSelect, onMoveUp, onMoveDown, onDelete, onReorder, viewR, index, totalCount, dragStartIndex, dragOverIndex, dragOverPosition, onDragStart, onDragOver, onDragEnd, onToggleLayout, isLeftHalf, isRightHalf, onUpdate, onChangeType, onInsertBelow, onImportExcel, onShowExcelFormat, editContent, up, TYPES, I, ISmall, F, AddBtn, DelBtn, EditableInput, setSel, COMPONENT_CATEGORIES, isBatchMode, isModuleSelected, onToggleModuleSelection, onSetBatchMoveTarget }) {
  // 跟踪文本类组件是否处于编辑模式
  const [isEditingContent, setIsEditingContent] = useState(false);
  // 跟踪是否显示插入组件面板
  const [showInsertPanel, setShowInsertPanel] = useState(false);
  // 插入面板引用
  const insertPanelRef = useRef(null);
  
  // 监听点击外部关闭插入面板
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (insertPanelRef.current && !insertPanelRef.current.contains(event.target)) {
        setShowInsertPanel(false);
      }
    };
    
    if (showInsertPanel) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showInsertPanel]);
  
  const handleDragStart = (e) => {
    // 如果处于编辑模式，禁止拖拽
    if (isEditingContent) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
    e.dataTransfer.setData('moduleId', mod.id);
    onDragStart(index);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    
    // 检查是否是左右布局
    const isHorizontalLayout = mod.layout === 'left' || mod.layout === 'right';
    
    let position;
    if (isHorizontalLayout) {
      // 左右布局：根据水平位置判断
      const midpointX = rect.left + rect.width / 2;
      position = e.clientX < midpointX ? 'before' : 'after';
    } else {
      // 全宽布局：根据垂直位置判断
      const midpointY = rect.top + rect.height / 2;
      position = e.clientY < midpointY ? 'before' : 'after';
    }
    onDragOver(index, position);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    // 阻止默认行为，让 onDragEnd 来处理实际的拖拽完成逻辑
  };

  const handleDragEnd = (e) => {
    // 只有在真正拖拽过的情况下才调用 onDragEnd
    // 检查 dragStartIndex 是否匹配当前组件的索引
    if (dragStartIndex === index) {
      onDragEnd();
    }
  };

  const isBeingDragged = dragStartIndex === index;
  const isDropTarget = dragOverIndex === index && dragStartIndex !== null && dragStartIndex !== index;
  const showLineBefore = isDropTarget && dragOverPosition === 'before';
  const showLineAfter = isDropTarget && dragOverPosition === 'after';

  const layoutClass = mod.layout === 'left' ? 'w-[calc(50%-8px)] mr-2' : mod.layout === 'right' ? 'w-[calc(50%-8px)] ml-2' : 'w-full';

  return (
    <div
      draggable={!isEditingContent && !isBatchMode}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragEnd={handleDragEnd}
      data-module-id={mod.id}
      onClick={(e) => {
        if (isBatchMode) {
          e.stopPropagation();
          onToggleModuleSelection(mod.id);
        }
      }}
      className={`group relative mb-6 rounded transition-all ${isBatchMode ? 'cursor-pointer' : 'cursor-move'} ${layoutClass} ${isSelected ? 'ring-2 ring-blue-400 ring-offset-4' : ''} ${isBeingDragged ? 'opacity-30' : ''} ${isLeftHalf || isRightHalf ? 'inline-block align-top' : ''} ${isModuleSelected ? 'ring-2 ring-green-400 ring-offset-4' : ''}`}
    >
      {/* 批量选择模式下的复选框 */}
      {isBatchMode && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-30">
          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${isModuleSelected ? 'bg-green-500 border-green-500' : 'bg-white border-zinc-300'}`}>
            {isModuleSelected && <Check size={12} className="text-white" />}
          </div>
        </div>
      )}
      
      {/* 批量移动目标位置标记 */}
      {isBatchMode && onSetBatchMoveTarget && (
        <div 
          className="absolute -top-2 left-0 right-0 h-4 z-20 cursor-pointer hover:bg-blue-100 hover:opacity-50"
          onClick={(e) => {
            e.stopPropagation();
            onSetBatchMoveTarget(index);
          }}
          title="移动选中的组件到此处"
        />
      )}
      
      {showLineBefore && (
        <div className="absolute -top-3 left-0 right-0 h-0.5 bg-blue-400 rounded-full" />
      )}
      {showLineAfter && (
        <div className="absolute -bottom-3 left-0 right-0 h-0.5 bg-blue-400 rounded-full" />
      )}
      
      {/* Drag handle indicator */}
      {!isBatchMode && (
        <div className={`absolute left-1/2 -top-3 transform -translate-x-1/2 bg-white border border-zinc-200 rounded shadow-sm px-2 py-0.5 transition-opacity z-20 ${isSelected || isBeingDragged ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          <GripVertical size={14} className="text-zinc-400" />
        </div>
      )}

      {/* Toolbar */}
      <div className={`absolute -top-3 right-0 flex items-center gap-0.5 bg-white border border-zinc-200 rounded shadow-sm px-1 py-0.5 transition-opacity z-10 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
        {/* 文本类组件显示格式切换按钮 */}
        {['text', 'heading1', 'heading2', 'heading3', 'ordered', 'unordered'].includes(mod.type) && onChangeType && (
          <div className="flex items-center gap-0.5 border-r border-zinc-200 pr-1 mr-1">
            <button onClick={(e) => { e.stopPropagation(); onChangeType('heading1'); }} onMouseDown={(e) => e.stopPropagation()} className={`p-1 rounded text-xs font-bold ${mod.type === 'heading1' ? 'text-blue-600 bg-blue-50' : 'text-zinc-400 hover:text-zinc-700'}`} title="一级标题">H1</button>
            <button onClick={(e) => { e.stopPropagation(); onChangeType('heading2'); }} onMouseDown={(e) => e.stopPropagation()} className={`p-1 rounded text-xs font-bold ${mod.type === 'heading2' ? 'text-blue-600 bg-blue-50' : 'text-zinc-400 hover:text-zinc-700'}`} title="二级标题">H2</button>
            <button onClick={(e) => { e.stopPropagation(); onChangeType('heading3'); }} onMouseDown={(e) => e.stopPropagation()} className={`p-1 rounded text-xs font-bold ${mod.type === 'heading3' ? 'text-blue-600 bg-blue-50' : 'text-zinc-400 hover:text-zinc-700'}`} title="三级标题">H3</button>
            <button onClick={(e) => { e.stopPropagation(); onChangeType('text'); }} onMouseDown={(e) => e.stopPropagation()} className={`p-1 rounded text-xs ${mod.type === 'text' ? 'text-blue-600 bg-blue-50' : 'text-zinc-400 hover:text-zinc-700'}`} title="文本">T</button>
            <button onClick={(e) => { e.stopPropagation(); onChangeType('note'); }} onMouseDown={(e) => e.stopPropagation()} className={`p-1 rounded text-xs ${mod.type === 'note' ? 'text-blue-600 bg-blue-50' : 'text-zinc-400 hover:text-zinc-700'}`} title="备注">N</button>
            <button onClick={(e) => { e.stopPropagation(); onChangeType('ordered'); }} onMouseDown={(e) => e.stopPropagation()} className={`p-1 rounded text-xs ${mod.type === 'ordered' ? 'text-blue-600 bg-blue-50' : 'text-zinc-400 hover:text-zinc-700'}`} title="有序列表">1.</button>
            <button onClick={(e) => { e.stopPropagation(); onChangeType('unordered'); }} onMouseDown={(e) => e.stopPropagation()} className={`p-1 rounded text-xs ${mod.type === 'unordered' ? 'text-blue-600 bg-blue-50' : 'text-zinc-400 hover:text-zinc-700'}`} title="无序列表">•</button>
          </div>
        )}
        {/* Excel导入按钮 - 仅对支持数据导入的组件类型显示 */}
        {['chart', 'hbar', 'line', 'line3', 'bar2line', 'stackbarline', 'barline', 'pie', 'table', 'kpi', 'funnel', 'progress', 'waterfall', 'scatter', 'bubble', 'radar', 'comparison', 'heatmap', 'sankey', 'gantt'].includes(mod.type) && onImportExcel && (
          <>
            <input 
              type="file" 
              accept=".xlsx,.xls,.csv"
              className="hidden"
              id={`excel-import-${mod.id}`}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file && onImportExcel) {
                  onImportExcel(mod, file);
                }
                e.target.value = '';
              }}
            />
            <button 
              onClick={(e) => { e.stopPropagation(); onShowExcelFormat(mod.type, mod.id); }}
              onMouseDown={(e) => e.stopPropagation()}
              className="p-1 text-zinc-400 hover:text-green-600 rounded"
              title="查看Excel格式要求"
            >
              <FileSpreadsheet size={14}/>
            </button>
          </>
        )}
        <button onClick={(e) => { e.stopPropagation(); onToggleLayout(); }} onMouseDown={(e) => e.stopPropagation()} className={`p-1 rounded ${mod.layout !== 'full' ? 'text-blue-600 bg-blue-50' : 'text-zinc-400 hover:text-zinc-700'}`} title={mod.layout === 'full' ? '左右布局' : '全宽布局'}><Columns size={13}/></button>
        <button onClick={(e) => { e.stopPropagation(); onMoveUp(); }} onMouseDown={(e) => e.stopPropagation()} className="p-1 text-zinc-400 hover:text-zinc-700 rounded" title="上移"><ChevronUp size={14}/></button>
        <button onClick={(e) => { e.stopPropagation(); onMoveDown(); }} onMouseDown={(e) => e.stopPropagation()} className="p-1 text-zinc-400 hover:text-zinc-700 rounded" title="下移"><ChevronDown size={14}/></button>
        <button onClick={(e) => { e.stopPropagation(); onSelect(); }} onMouseDown={(e) => e.stopPropagation()} className={`p-1 rounded ${isSelected ? 'text-blue-600 bg-blue-50' : 'text-zinc-400 hover:text-zinc-700'}`} title="编辑"><Pencil size={13}/></button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} onMouseDown={(e) => e.stopPropagation()} className="p-1 text-zinc-400 hover:text-red-500 rounded" title="删除"><Trash2 size={13}/></button>
      </div>

      {/* 下方插入按钮 - hover时显示 */}
      {onInsertBelow && (
        <div ref={insertPanelRef} className={`absolute -bottom-4 left-1/2 transform -translate-x-1/2 transition-opacity z-30 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          <button 
            onClick={(e) => { e.stopPropagation(); setShowInsertPanel(true); }} 
            onMouseDown={(e) => e.stopPropagation()}
            className="flex items-center gap-1 px-2 py-1 bg-blue-50 border border-blue-200 rounded-full text-xs text-blue-600 hover:bg-blue-100 hover:text-blue-700 shadow-sm"
            title="在下方插入组件"
          >
            <Plus size={12} />
            <span>插入</span>
          </button>
          
          {/* 组件选择面板 */}
          {showInsertPanel && (
            <div className="absolute top-full mt-1 left-1/2 transform -translate-x-1/2 bg-white border border-zinc-200 rounded shadow-lg z-40 py-2 w-64 max-h-80 overflow-y-auto">
              <div className="flex items-center justify-between px-3 py-1 border-b border-zinc-100">
                <span className="text-xs font-medium text-zinc-600">选择组件类型</span>
                <button 
                  onClick={(e) => { e.stopPropagation(); setShowInsertPanel(false); }}
                  className="text-zinc-400 hover:text-zinc-600 p-1 hover:bg-zinc-100 rounded"
                >
                  <X size={12} />
                </button>
              </div>
              {Object.entries(COMPONENT_CATEGORIES).sort((a,b) => a[1].order - b[1].order).map(([catKey, catInfo]) => {
                const catTypes = TYPES.filter(t => t.category === catKey);
                if (catTypes.length === 0) return null;
                return (
                  <div key={catKey} className="mb-1">
                    <div className="px-3 py-1 text-xs font-semibold text-zinc-400 uppercase tracking-wider bg-zinc-50">{catInfo.label}</div>
                    <div className="grid grid-cols-2">
                      {catTypes.map(t => {
                        const Icon = t.icon;
                        return (
                          <button 
                            key={t.type} 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              onInsertBelow(t.type);
                              setShowInsertPanel(false);
                            }}
                            className="px-3 py-1.5 text-left flex items-center gap-2 hover:bg-zinc-50 transition-colors"
                          >
                            <Icon size={12} className="text-zinc-400"/>
                            <span className="text-xs text-zinc-700">{t.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Content */}
      {(() => {
        // 支持直接编辑的组件类型
        const editableTypes = ['text', 'heading1', 'heading2', 'heading3', 'ordered', 'unordered', 'note'];
        const isDirectEditable = editableTypes.includes(mod.type);
        
        return (
          <div onClick={(e) => { 
            // 如果点击的是可编辑文本区域，不触发选择
            if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT' || e.target.isContentEditable) {
              return;
            }
            e.stopPropagation(); 
            // 直接可编辑的组件不触发选中（不调起编辑面板），而是让组件自己处理点击编辑
            if (!isDirectEditable) {
              onSelect(); 
            }
          }} className={isDirectEditable ? '' : 'cursor-pointer'}>
            {(() => {
              try {
                const Renderer = viewR[mod.type];
                if (!Renderer) return <div className="text-zinc-400 text-sm">Unknown type: {mod.type}</div>;
                // 支持直接编辑的组件传递 onUpdate 回调和 setIsEditingContent 回调
                const element = isDirectEditable ? Renderer(mod, onUpdate, setIsEditingContent) : Renderer(mod);
                if (element === null || element === undefined) return <div className="text-zinc-400 text-sm">No content</div>;
                if (typeof element === 'function') return <div className="text-zinc-400 text-sm">Invalid content (function)</div>;
                return element;
              } catch (err) {
                console.error('Render error:', err);
                return <div className="text-zinc-400 text-sm">Render error: {err.message}</div>;
              }
            })()}
          </div>
        );
      })()}
      
      {/* 内联编辑面板 - 选中时显示在组件下方 */}
      {isSelected && editContent && (
        <div className="mt-4 p-4 bg-zinc-50 border border-zinc-200 rounded-lg">
          {/* Panel header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-xs text-zinc-400 uppercase tracking-wider font-semibold">
              {(() => { const T = TYPES.find(t=>t.type===mod.type); return T ? <T.icon size={13}/> : null; })()}
              <span>{TYPES.find(t=>t.type===mod.type)?.label}</span>
            </div>
            <button onClick={() => setSel(null)} className="p-1 text-zinc-300 hover:text-zinc-600 rounded"><X size={15}/></button>
          </div>

          {/* Title / subtitle */}
          <div className="mb-3">
            <label className="block text-xs font-medium text-zinc-400 mb-1">标题</label>
            <input className={I} value={mod.title} onChange={e => up(mod.id, o => { o.title = e.target.value; return o; })} />
          </div>
          <div className="mb-4">
            <label className="block text-xs font-medium text-zinc-400 mb-1">副标题</label>
            <input className={I} value={mod.subtitle} placeholder="可选" onChange={e => up(mod.id, o => { o.subtitle = e.target.value; return o; })} />
          </div>

          <div className="border-t border-zinc-200 pt-4">
            {editContent(mod)}
          </div>
        </div>
      )}
    </div>
  );
}

// 动态获取API基础URL（支持内网访问）
const getBaseURL = () => {
  // 如果是本地开发，使用localhost
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:3000/api';
  }
  // 如果是内网IP访问，使用相同的主机名
  return `http://${window.location.hostname}:3000/api`;
};

const API_CONFIG = {
  baseURL: 'http://localhost:3000/api',
  model: 'ollama.rnd.huawei.com/library/qwen3:1.7b',
  getApiKey: () => 'ollama'
};

const setApiKey = (key) => {
  localStorage.setItem('deepseek_api_key', key);
};

// 验证并修复AI返回的数据
const validateAndFixData = (modules) => {
  if (!Array.isArray(modules)) {
    console.warn('validateAndFixData: input is not an array');
    return [];
  }
  
  return modules.map((m, index) => {
    // 确保基本字段存在
    if (!m.id) m.id = uid();
    if (!m.type) m.type = 'text';
    if (!m.data) m.data = {};
    
    // 根据类型修复数据
    switch (m.type) {
      case 'chart':
        if (!m.data.series || !Array.isArray(m.data.series) || m.data.series.length === 0) {
          m.data.series = [{ name: '系列1', color: '#3b82f6' }];
        }
        if (!m.data.items || !Array.isArray(m.data.items) || m.data.items.length === 0) {
          m.data.items = [{ id: uid(), label: '数据1', values: [100] }];
        }
        // 确保每个item有values数组
        m.data.items.forEach(item => {
          if (!item.values || !Array.isArray(item.values)) {
            item.values = m.data.series.map(() => 0);
          }
        });
        break;
        
      case 'line':
        if (!m.data.series || !Array.isArray(m.data.series) || m.data.series.length === 0) {
          m.data.series = [{ name: '系列1', color: '#3b82f6', axis: 'left' }];
        }
        if (!m.data.points || !Array.isArray(m.data.points) || m.data.points.length === 0) {
          m.data.points = [{ id: uid(), x: '1月', values: [100] }];
        }
        m.data.points.forEach(point => {
          if (!point.values || !Array.isArray(point.values)) {
            point.values = m.data.series.map(() => 0);
          }
        });
        break;
        
      case 'pie':
        if (!m.data.items || !Array.isArray(m.data.items) || m.data.items.length === 0) {
          m.data.items = [
            { id: uid(), label: '类别A', value: 60, color: 'P[0]' },
            { id: uid(), label: '类别B', value: 40, color: 'P[1]' }
          ];
        }
        break;
        
      case 'table':
        if (!m.data.headers || !Array.isArray(m.data.headers) || m.data.headers.length === 0) {
          m.data.headers = ['列1', '列2', '列3'];
        }
        if (!m.data.rows || !Array.isArray(m.data.rows) || m.data.rows.length === 0) {
          m.data.rows = [{ id: uid(), cells: m.data.headers.map(() => '数据') }];
        }
        // 确保每行的cells数组与headers长度一致
        m.data.rows.forEach(row => {
          if (!row.cells || !Array.isArray(row.cells)) {
            row.cells = m.data.headers.map(() => '');
          } else if (row.cells.length !== m.data.headers.length) {
            while (row.cells.length < m.data.headers.length) row.cells.push('');
            if (row.cells.length > m.data.headers.length) row.cells = row.cells.slice(0, m.data.headers.length);
          }
        });
        break;
        
      case 'kpi':
        if (!m.data.items || !Array.isArray(m.data.items) || m.data.items.length === 0) {
          m.data.items = [{ id: uid(), label: '指标', value: '0', change: 0, unit: '%' }];
        }
        break;
        
      case 'ordered':
      case 'unordered':
        if (!m.data.items || !Array.isArray(m.data.items) || m.data.items.length === 0) {
          m.data.items = [{ id: uid(), text: '暂无数据' }];
        }
        break;
        
      case 'list':
        if (!m.data.items || !Array.isArray(m.data.items) || m.data.items.length === 0) {
          m.data.items = [{ id: uid(), bold: '提示', text: '暂无详细数据' }];
        }
        break;
        
      case 'funnel':
        if (!m.data.items || !Array.isArray(m.data.items) || m.data.items.length === 0) {
          m.data.items = [{ id: uid(), stage: '阶段1', cur: 100, prev: 120 }];
        }
        break;
        
      case 'radar':
        if (!m.data.dims || !Array.isArray(m.data.dims) || m.data.dims.length === 0) {
          m.data.dims = ['维度1', '维度2', '维度3'];
        }
        if (!m.data.series || !Array.isArray(m.data.series) || m.data.series.length === 0) {
          m.data.series = [{ name: '系列1', color: '#3b82f6', values: m.data.dims.map(() => 50) }];
        }
        break;
        
      case 'bubble':
        if (!m.data.groups || !Array.isArray(m.data.groups) || m.data.groups.length === 0) {
          m.data.groups = [{ id: uid(), name: '组1', color: '#3b82f6', pts: [{ id: uid(), x: 50, y: 50, z: 100, label: '点1' }] }];
        }
        break;
        
      case 'comparison':
        if (!m.data.items || !Array.isArray(m.data.items) || m.data.items.length === 0) {
          m.data.items = [{ id: uid(), name: '指标', action: '措施', before: 80, after: 95 }];
        }
        break;
        
      case 'quadrant':
        if (!m.data.points || !Array.isArray(m.data.points) || m.data.points.length === 0) {
          m.data.points = [{ id: uid(), name: '点1', x: 50, y: 50, color: '#3b82f6' }];
        }
        break;
        
      case 'barline':
        if (!m.data.items || !Array.isArray(m.data.items) || m.data.items.length === 0) {
          m.data.items = [{ id: uid(), label: '标签1', barValues: [100], lineValues: [80] }];
        }
        if (!m.data.barSeries) m.data.barSeries = ['柱状图'];
        if (!m.data.lineSeries) m.data.lineSeries = ['折线图'];
        break;
        
      case 'progress':
        if (!m.data.items || !Array.isArray(m.data.items) || m.data.items.length === 0) {
          m.data.items = [{ id: uid(), label: '进度', current: 75, total: 100, unit: '%' }];
        }
        break;
        
      case 'scatter':
        if (!m.data.config) m.data.config = { x: 'X轴', y: 'Y轴' };
        if (!m.data.groups || !Array.isArray(m.data.groups) || m.data.groups.length === 0) {
          m.data.groups = [{ id: uid(), name: '系列1', color: '#3b82f6', pts: [{ id: uid(), x: 10, y: 20 }] }];
        }
        break;
        
      case 'waterfall':
        if (!m.data.config) m.data.config = { y: '数值' };
        if (!m.data.items || !Array.isArray(m.data.items) || m.data.items.length === 0) {
          m.data.items = [
            { id: uid(), label: '起始', value: 100, type: 'total' },
            { id: uid(), label: '增加', value: 50, type: 'positive' },
            { id: uid(), label: '结束', value: 150, type: 'total' }
          ];
        }
        break;
        
      case 'heatmap':
        if (!m.data.config) m.data.config = { x: 'X轴', y: 'Y轴' };
        if (!m.data.rows || !Array.isArray(m.data.rows) || m.data.rows.length === 0) {
          m.data.rows = [{ label: '行1', values: [10, 20, 30] }, { label: '行2', values: [20, 30, 40] }];
        }
        if (!m.data.cols || !Array.isArray(m.data.cols) || m.data.cols.length === 0) {
          m.data.cols = ['列1', '列2', '列3'];
        }
        break;

      case 'chinamap':
        if (!m.data.config) m.data.config = { colorMin: '#e0f2fe', colorMax: '#0369a1' };
        if (!m.data.items || !Array.isArray(m.data.items) || m.data.items.length === 0) {
          m.data.items = [
            { id: uid(), name: '北京', value: 100 },
            { id: uid(), name: '上海', value: 85 },
            { id: uid(), name: '广东', value: 75 }
          ];
        }
        break;

      case 'sankey':
        if (!m.data.nodes || !Array.isArray(m.data.nodes) || m.data.nodes.length === 0) {
          m.data.nodes = [{ id: 'a', name: '来源A' }, { id: 'b', name: '来源B' }, { id: 'c', name: '目标' }];
        }
        if (!m.data.links || !Array.isArray(m.data.links) || m.data.links.length === 0) {
          m.data.links = [{ source: 'a', target: 'c', value: 50 }, { source: 'b', target: 'c', value: 30 }];
        }
        break;
        
      case 'gantt':
        if (!m.data.tasks || !Array.isArray(m.data.tasks) || m.data.tasks.length === 0) {
          m.data.tasks = [
            { id: uid(), name: '任务1', start: '2024-01-01', end: '2024-01-10', progress: 80, color: '#3b82f6' },
            { id: uid(), name: '任务2', start: '2024-01-05', end: '2024-01-15', progress: 60, color: '#10b981' }
          ];
        }
        break;
        
      case 'wordcloud':
        if (!m.data.words || !Array.isArray(m.data.words) || m.data.words.length === 0) {
          m.data.words = [
            { text: '数据', value: 100 },
            { text: '分析', value: 80 },
            { text: '报告', value: 60 }
          ];
        }
        break;
        
      case 'image':
        if (!m.data.src) m.data.src = '';
        if (!m.data.alt) m.data.alt = '';
        if (!m.data.caption) m.data.caption = '';
        break;
        
      case 'text':
        if (!m.data.content) m.data.content = '';
        break;

      case 'note':
        if (!m.data.content) m.data.content = '';
        break;

      case 'heading1':
      case 'heading2':
      case 'heading3':
        if (!m.data.content) m.data.content = '标题';
        break;
    }
    
    return m;
  });
};

async function callDeepSeekAPI(contentPrompt) {
  const prompt = `你是一个专业的数据可视化专家。请分析用户提供的数据，生成最适合的可视化报告。

## 可用组件类型及数据格式

你必须使用以下组件类型之一，并严格按照指定的数据格式返回：

### 1. heading1 / heading2 / heading3 - 标题
用途：报告的主标题和章节标题
格式：
{"id":"唯一ID","type":"heading1","title":"","data":{"content":"标题文本"}}

### 2. text - 文本段落
用途：解释说明文字
格式：
{"id":"唯一ID","type":"text","title":"","data":{"content":"文本内容"}}

### 3. chart - 柱状图
用途：对比不同类别的数值
格式：
{
  "id":"唯一ID","type":"chart","title":"图表标题",
  "data":{
    "series":[{"name":"系列名","color":"#3b82f6"}],
    "items":[
      {"id":"_a1","label":"类别1","values":[100]},
      {"id":"_a2","label":"类别2","values":[120]}
    ]
  }
}

### 4. line - 折线图
用途：展示趋势变化
格式：
{
  "id":"唯一ID","type":"line","title":"图表标题",
  "data":{
    "series":[{"name":"系列名","color":"#3b82f6","axis":"left"}],
    "points":[
      {"id":"_p1","x":"1月","values":[100]},
      {"id":"_p2","x":"2月","values":[120]}
    ]
  }
}

### 5. pie - 饼图
用途：展示占比分布
格式：
{
  "id":"唯一ID","type":"pie","title":"图表标题",
  "data":{
    "items":[
      {"id":"_i1","label":"类别A","value":60,"color":"P[0]"},
      {"id":"_i2","label":"类别B","value":40,"color":"P[1]"}
    ]
  }
}
注意：color 使用 P[0] 到 P[7] 的预设颜色

### 6. barline - 组合图（柱状+折线）
用途：同时展示数量和趋势
格式：
{
  "id":"唯一ID","type":"barline","title":"图表标题",
  "data":{
    "series":[
      {"name":"柱状系列","type":"bar","color":"#3b82f6","axis":"left"},
      {"name":"折线系列","type":"line","color":"#ef4444","axis":"right"}
    ],
    "items":[
      {"id":"_b1","label":"1月","values":[100,20]},
      {"id":"_b2","label":"2月","values":[120,25]}
    ]
  }
}

### 7. radar - 雷达图
用途：多维度对比
格式：
{
  "id":"唯一ID","type":"radar","title":"图表标题",
  "data":{
    "dims":[{"name":"维度1","max":100},{"name":"维度2","max":100}],
    "series":[
      {"name":"系列A","color":"#3b82f6","values":[80,90]},
      {"name":"系列B","color":"#ef4444","values":[70,85]}
    ]
  }
}

### 8. bubble - 气泡图
用途：展示三维数据（x, y, 大小）
格式：
{
  "id":"唯一ID","type":"bubble","title":"图表标题",
  "data":{
    "groups":[
      {
        "id":"_g1","name":"组1","color":"#3b82f6",
        "pts":[
          {"id":"_p1","x":50,"y":50,"z":100,"label":"点1"}
        ]
      }
    ]
  }
}

### 9. scatter - 散点图
用途：展示相关性
格式：
{
  "id":"唯一ID","type":"scatter","title":"图表标题",
  "data":{
    "config":{"x":"X轴名称","y":"Y轴名称"},
    "groups":[
      {
        "id":"_s1","name":"系列1","color":"#3b82f6",
        "pts":[{"id":"_p1","x":10,"y":20}]
      }
    ]
  }
}

### 10. waterfall - 瀑布图
用途：展示累积变化过程
格式：
{
  "id":"唯一ID","type":"waterfall","title":"图表标题",
  "data":{
    "items":[
      {"id":"_w1","label":"期初","value":100,"type":"total"},
      {"id":"_w2","label":"增加","value":50,"type":"positive"},
      {"id":"_w3","label":"减少","value":-30,"type":"negative"},
      {"id":"_w4","label":"期末","value":120,"type":"total"}
    ]
  }
}
注意：type 可以是 "total"（总计）、"positive"（增加）、"negative"（减少）

### 11. heatmap - 热力图
用途：展示矩阵数据密度
格式：
{
  "id":"唯一ID","type":"heatmap","title":"图表标题",
  "data":{
    "rows":[
      {"label":"行1","values":[10,20,30]},
      {"label":"行2","values":[20,30,40]}
    ],
    "cols":["列1","列2","列3"]
  }
}

### 12. funnel - 漏斗图
用途：展示转化流程
格式：
{
  "id":"唯一ID","type":"funnel","title":"图表标题",
  "data":{
    "items":[
      {"id":"_f1","stage":"访问","cur":1000,"prev":1200},
      {"id":"_f2","stage":"注册","cur":800,"prev":1000},
      {"id":"_f3","stage":"付费","cur":200,"prev":800}
    ]
  }
}
注意：cur 是当前值，prev 是上一阶段值

### 13. comparison - 对比分析
用途：前后对比
格式：
{
  "id":"唯一ID","type":"comparison","title":"图表标题",
  "data":{
    "items":[
      {"id":"_c1","name":"指标1","action":"优化措施","before":80,"after":95}
    ]
  }
}

### 14. quadrant - 四象限图
用途：战略分析（如波士顿矩阵）
格式：
{
  "id":"唯一ID","type":"quadrant","title":"图表标题",
  "data":{
    "points":[
      {"id":"_q1","name":"产品A","x":70,"y":80,"color":"#3b82f6"}
    ]
  }
}

### 15. sankey - 桑基图
用途：展示流量流向
格式：
{
  "id":"唯一ID","type":"sankey","title":"图表标题",
  "data":{
    "nodes":[
      {"id":"source1","name":"来源1"},
      {"id":"source2","name":"来源2"},
      {"id":"target","name":"目标"}
    ],
    "links":[
      {"source":"source1","target":"target","value":50},
      {"source":"source2","target":"target","value":30}
    ]
  }
}

### 16. gantt - 甘特图
用途：项目进度管理
格式：
{
  "id":"唯一ID","type":"gantt","title":"图表标题",
  "data":{
    "tasks":[
      {"id":"_g1","name":"任务1","start":"2024-01-01","end":"2024-01-10","progress":80,"color":"#3b82f6"}
    ]
  }
}

### 17. wordcloud - 词云图
用途：关键词展示
格式：
{
  "id":"唯一ID","type":"wordcloud","title":"图表标题",
  "data":{
    "words":[
      {"text":"关键词1","value":100},
      {"text":"关键词2","value":80}
    ]
  }
}

### 18. kpi - 指标卡
用途：展示关键指标
格式：
{
  "id":"唯一ID","type":"kpi","title":"图表标题",
  "data":{
    "items":[
      {"id":"_k1","label":"用户数","value":"10,000","change":15,"unit":"%"}
    ]
  }
}
注意：change 是变化百分比，unit 是单位（如 %、元、人等）

### 19. progress - 进度条
用途：展示完成进度
格式：
{
  "id":"唯一ID","type":"progress","title":"图表标题",
  "data":{
    "items":[
      {"id":"_pr1","label":"项目进度","current":75,"target":100,"unit":"%"}
    ]
  }
}

### 20. table - 表格
用途：详细数据展示
格式：
{
  "id":"唯一ID","type":"table","title":"表格标题",
  "data":{
    "headers":["列1","列2","列3"],
    "rows":[
      {"id":"_r1","cells":["数据1","数据2","数据3"]},
      {"id":"_r2","cells":["数据4","数据5","数据6"]}
    ]
  }
}

### 21. ordered - 有序列表
用途：步骤说明
格式：
{
  "id":"唯一ID","type":"ordered","title":"",
  "data":{
    "items":[
      {"id":"_o1","text":"第一步"},
      {"id":"_o2","text":"第二步"}
    ]
  }
}

### 22. unordered - 无序列表
用途：要点罗列
格式：
{
  "id":"唯一ID","type":"unordered","title":"",
  "data":{
    "items":[
      {"id":"_u1","text":"要点1"},
      {"id":"_u2","text":"要点2"}
    ]
  }
}

### 23. list - 键值对列表
用途：属性展示
格式：
{
  "id":"唯一ID","type":"list","title":"",
  "data":{
    "items":[
      {"id":"_l1","bold":"属性名","text":"属性值"}
    ]
  }
}

## 图表选择指南

根据数据特点选择最合适的图表：

- **对比不同类别数值** → chart（柱状图）
- **展示时间趋势** → line（折线图）
- **展示占比** → pie（饼图）
- **同时展示数量和趋势** → barline（组合图）
- **多维度对比** → radar（雷达图）
- **展示三维数据** → bubble（气泡图）
- **展示相关性** → scatter（散点图）
- **展示累积变化** → waterfall（瀑布图）
- **展示矩阵密度** → heatmap（热力图）
- **展示转化流程** → funnel（漏斗图）
- **前后对比** → comparison（对比分析）
- **战略分析** → quadrant（四象限）
- **展示流量流向** → sankey（桑基图）
- **项目进度** → gantt（甘特图）
- **关键词展示** → wordcloud（词云图）
- **关键指标** → kpi（指标卡）
- **完成进度** → progress（进度条）
- **详细数据** → table（表格）

## 输出要求

1. 必须返回一个有效的 JSON 数组
2. 每个组件必须包含：id、type、title、data
3. id 必须唯一，格式为 "_" + 时间戳 + 随机数
4. 颜色可以使用：#3b82f6（蓝）、#ef4444（红）、#10b981（绿）、#f59e0b（黄）、#8b5cf6（紫）、#ec4899（粉）、#06b6d4（青）、#f97316（橙）
5. 或者使用预设颜色 P[0] 到 P[7]
6. 不要添加任何 markdown 格式或解释文字
7. 只返回 JSON 数组
8. **严格按照用户要求生成组件，用户要求什么组件就生成什么组件，不要擅自更改或添加其他组件**
9. **如果用户明确要求生成特定类型的组件（如"生成柱状图"），必须生成该类型的组件，不要生成其他类型**
10. **不要过度解读用户需求，保持简单直接的数据转换**

## 用户输入数据

${contentPrompt}

## 任务

直接将用户提供的数据转换为可视化组件，不要分析数据含义或添加额外解读：
1. 识别用户数据中的标题、文本、数值
2. **严格按照用户要求的组件类型生成，不要擅自更改**
3. 将数据原样填入组件格式中
4. 返回 JSON 组件数组

请生成 JSON 组件数组：`

  try {
    const apiKey = API_CONFIG.getApiKey();
    if (!apiKey) {
      throw new Error('请先配置 API Key');
    }
    
    const response = await fetch(`${API_CONFIG.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: API_CONFIG.model,
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 8192
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMsg = `API 请求失败: ${response.status}`;
      if (response.status === 404) {
        errorMsg += ` - 请检查 API 地址是否正确，或是否连接到华为内网`;
      } else if (response.status === 502) {
        errorMsg += ` - 无法连接到 API 服务器，请检查网络连接或 VPN`;
      }
      errorMsg += ` - ${errorText}`;
      throw new Error(errorMsg);
    }

    const data = await response.json();
    let text = data.choices?.[0]?.message?.content || '';
    
    console.log('AI 原始响应长度:', text.length);
    console.log('AI 原始响应前200字符:', text.substring(0, 200));
    console.log('AI 原始响应后200字符:', text.substring(text.length - 200));
    
    text = text.trim();
    
    text = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '');
    
    text = text.trim();
    
    console.log('清理后响应前200字符:', text.substring(0, 200));

    const tryParseIncompleteJSON = (str) => {
      try {
        return JSON.parse(str);
      } catch (e) {
        console.log('尝试修复不完整的JSON...');
      }
      
      let jsonStr = str;
      
      // 找到最后一个完整的对象
      // 从后往前查找，找到可以安全截断的位置
      let lastValidEnd = -1;
      let depth = 0;
      let inString = false;
      let escapeNext = false;
      
      for (let i = 0; i < jsonStr.length; i++) {
        const char = jsonStr[i];
        
        if (escapeNext) {
          escapeNext = false;
          continue;
        }
        if (char === '\\') {
          escapeNext = true;
          continue;
        }
        if (char === '"' && !escapeNext) {
          inString = !inString;
          continue;
        }
        if (inString) continue;
        
        if (char === '{') depth++;
        if (char === '}') {
          depth--;
          if (depth === 1) {
            // 这是一个完整的数组元素
            lastValidEnd = i;
          }
        }
        if (char === '[') depth++;
        if (char === ']') depth--;
      }
      
      // 如果找到了完整的对象，截断到那里
      if (lastValidEnd > 0) {
        jsonStr = jsonStr.substring(0, lastValidEnd + 1) + ']';
        console.log('截断到最后一个完整对象');
      }
      
      // 处理未完成的键值对（如 "name": 后面没有值）
      jsonStr = jsonStr.replace(/,\s*"[^"]*":\s*$/g, '');
      jsonStr = jsonStr.replace(/"[^"]*":\s*$/g, '');
      
      // 处理未完成的字符串值
      const lastColon = jsonStr.lastIndexOf(':');
      if (lastColon > 0) {
        const afterColon = jsonStr.substring(lastColon + 1).trim();
        if (afterColon === '"' || afterColon.startsWith('"') && !afterColon.endsWith('"') && !afterColon.includes(',')) {
          jsonStr = jsonStr.substring(0, lastColon);
          let i = jsonStr.length - 1;
          while (i >= 0 && jsonStr[i] !== ',' && jsonStr[i] !== '{') {
            i--;
          }
          if (i >= 0 && jsonStr[i] === ',') {
            jsonStr = jsonStr.substring(0, i);
          }
        }
      }
      
      // 计算并补全括号
      let openBraces = 0;
      let openBrackets = 0;
      let inString2 = false;
      let escapeNext2 = false;
      
      for (let i = jsonStr.length - 1; i >= 0; i--) {
        const char = jsonStr[i];
        if (escapeNext2) {
          escapeNext2 = false;
          continue;
        }
        if (char === '\\') {
          escapeNext2 = true;
          continue;
        }
        if (char === '"') {
          inString2 = !inString2;
        }
      }
      
      if (inString2) {
        jsonStr += '"';
      }
      
      for (const char of jsonStr) {
        if (char === '{') openBraces++;
        if (char === '}') openBraces--;
        if (char === '[') openBrackets++;
        if (char === ']') openBrackets--;
      }
      
      while (openBraces > 0) {
        jsonStr += '}';
        openBraces--;
      }
      while (openBrackets > 0) {
        jsonStr += ']';
        openBrackets--;
      }
      
      try {
        return JSON.parse(jsonStr);
      } catch (e) {
        console.log('JSON修复失败:', e.message);
        return null;
      }
    };
    
    let jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = tryParseIncompleteJSON(jsonMatch[0]);
      if (parsed && Array.isArray(parsed)) {
        console.log('成功解析数组，包含', parsed.length, '个模块');
        return validateAndFixData(parsed);
      }
      
      const validItems = [];
      let depth = 0;
      let currentItem = '';
      let inString = false;
      
      for (let i = 0; i < jsonMatch[0].length; i++) {
        const char = jsonMatch[0][i];
        currentItem += char;
        
        if (char === '"' && (i === 0 || jsonMatch[0][i-1] !== '\\')) {
          inString = !inString;
        }
        
        if (!inString) {
          if (char === '{') depth++;
          if (char === '}') {
            depth--;
            if (depth === 1 && currentItem.trim().startsWith('{')) {
              try {
                const item = JSON.parse(currentItem.trim());
                if (item && item.id && item.type) {
                  validItems.push(item);
                }
              } catch (e) {
                // 跳过无效项
              }
              currentItem = '';
            }
          }
        }
      }
      
      if (validItems.length > 0) {
        console.log('从截断的JSON中提取了', validItems.length, '个有效模块');
        return validateAndFixData(validItems);
      }
    }
    
    jsonMatch = text.match(/\{[\s\S]*"type"[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = tryParseIncompleteJSON(jsonMatch[0]);
      if (parsed) {
        if (parsed.modules && Array.isArray(parsed.modules)) {
          return validateAndFixData(parsed.modules);
        }
        if (parsed.type) {
          return validateAndFixData([parsed]);
        }
      }
    }
    
    // 尝试直接解析整个文本为JSON
    try {
      const directParsed = JSON.parse(text);
      if (Array.isArray(directParsed)) {
        return validateAndFixData(directParsed);
      }
      if (directParsed && directParsed.type) {
        return validateAndFixData([directParsed]);
      }
    } catch (e) {
      // 忽略直接解析错误
    }
    
    // 尝试提取多个JSON对象
    const objectMatches = text.match(/\{[^{}]*"type"[^{}]*\}/g);
    if (objectMatches) {
      const items = [];
      for (const match of objectMatches) {
        try {
          const item = JSON.parse(match);
          if (item && item.type) {
            items.push(item);
          }
        } catch (e) {
          // 忽略单个对象解析错误
        }
      }
      if (items.length > 0) {
        console.log('从文本中提取了', items.length, '个对象');
        return validateAndFixData(items);
      }
    }
    
    console.error('AI 响应解析失败，原始文本:', text.substring(0, 500));
    throw new Error('无法解析 AI 响应，请检查返回格式。AI可能返回了不完整的JSON，请重试。');
  } catch (error) {
    console.error('AI API 调用失败:', error);
    throw error;
  }
}

function cMod(type) {
  const b = { id:uid(), type, title:TYPES.find(t=>t.type===type)?.label||'', subtitle:'', layout:'full' };
  switch(type) {
    case 'heading1': return {...b,data:{content:'一级标题'}};
    case 'heading2': return {...b,data:{content:'二级标题'}};
    case 'heading3': return {...b,data:{content:'三级标题'}};
    case 'text': return {...b,data:{content:'在此输入文本内容...'}};
    case 'note': return {...b,data:{content:'在此输入备注内容...'}};
    case 'kpi': return {...b,config:{cols:3},data:{items:[{id:uid(),label:'指标名',value:'0',change:0,unit:''}]}};
    case 'table': return {...b,data:{headers:['列1','列2','列3'],rows:[{id:uid(),cells:['','','']}]}};
    case 'chart': return {...b,config:{showLabels:true},data:{series:[{name:'系列1',color:P[0]}],items:[{id:uid(),label:'类别1',values:[100]}]}};
    case 'hbar': return {...b,config:{showLabels:true},data:{series:[{name:'系列1',color:P[0]}],items:[{id:uid(),label:'类别1',values:[100]},{id:uid(),label:'类别2',values:[80]},{id:uid(),label:'类别3',values:[60]},{id:uid(),label:'类别4',values:[40]}]}};
    case 'funnel': return {...b,data:{items:[{id:uid(),stage:'阶段1',cur:1000,prev:900},{id:uid(),stage:'阶段2',cur:600,prev:500}]}};
    case 'line': return {...b,config:{y:'数值',showLabels:true},data:{series:[{name:'系列A',color:P[0]},{name:'系列B',color:P[1]},{name:'系列C',color:P[2]}],points:[{id:uid(),x:'1月',values:[100,80,60]},{id:uid(),x:'2月',values:[120,90,70]},{id:uid(),x:'3月',values:[150,100,80]},{id:uid(),x:'4月',values:[180,110,90]}]}};
    case 'bar2line': return {...b,config:{bar:'柱状指标',line:'折线指标',showLabels:true},data:{barSeries:['柱状数据'],lineSeries:['折线A','折线B'],items:[{id:uid(),label:'1月',barValues:[100],lineValues:[5,10]},{id:uid(),label:'2月',barValues:[120],lineValues:[8,15]},{id:uid(),label:'3月',barValues:[150],lineValues:[12,20]},{id:uid(),label:'4月',barValues:[180],lineValues:[15,25]}]}};
    case 'stackbarline': return {...b,config:{stack:'堆叠数据',line:'增长率(%)',showLabels:true},data:{stackSeries:['系列A','系列B'],lineSeries:['增长率'],items:[{id:uid(),label:'1月',stackValues:[50,30],lineValues:[-15]},{id:uid(),label:'2月',stackValues:[60,35],lineValues:[-3]},{id:uid(),label:'3月',stackValues:[70,40],lineValues:[-1]},{id:uid(),label:'4月',stackValues:[80,45],lineValues:[4]},{id:uid(),label:'5月',stackValues:[90,50],lineValues:[-11]},{id:uid(),label:'6月',stackValues:[100,55],lineValues:[-13]}]}};
    case 'radar': return {...b,data:{dims:['维度1','维度2','维度3','维度4','维度5'],series:[{name:'系列1',color:P[0],values:[80,70,60,90,75]}]}};
    case 'bubble': return {...b,config:{x:'X轴',y:'Y轴',z:'气泡'},data:{groups:[{id:uid(),name:'组1',color:P[0],pts:[{id:uid(),x:50,y:60,z:80,label:'A'}]}]}};
    case 'comparison': return {...b,data:{items:[{id:uid(),name:'指标',action:'措施',before:0,after:0}]}};
    case 'quadrant': return {...b,config:{x:'X轴',y:'Y轴'},data:{points:[{id:uid(),x:30,y:70,name:'A',color:P[0]},{id:uid(),x:80,y:20,name:'B',color:P[1]},{id:uid(),x:20,y:30,name:'C',color:P[2]},{id:uid(),x:70,y:80,name:'D',color:P[3]}]}};
    case 'list': return {...b,data:{items:[{id:uid(),bold:'',text:'要点内容'}]}};
    case 'pie': return {...b,data:{items:[{id:uid(),label:'类别A',value:35,color:P[0]},{id:uid(),label:'类别B',value:28,color:P[1]},{id:uid(),label:'类别C',value:20,color:P[2]},{id:uid(),label:'其他',value:17,color:P[3]}]}};
    case 'ordered': return {...b,data:{items:[{id:uid(),text:'第一步：收集数据'},{id:uid(),text:'第二步：分析趋势'},{id:uid(),text:'第三步：生成报告'}]}};
    case 'unordered': return {...b,data:{items:[{id:uid(),text:'确保数据准确性'},{id:uid(),text:'及时更新最新数据'},{id:uid(),text:'定期检查系统运行'}]}};
    case 'barline': return {...b,config:{bar:'销售额',line:'增长率',showLabels:true},data:{barSeries:['销售额'],lineSeries:['增长率'],items:[{id:uid(),label:'1月',barValues:[100],lineValues:[5]},{id:uid(),label:'2月',barValues:[120],lineValues:[20]},{id:uid(),label:'3月',barValues:[150],lineValues:[25]}]}};
    case 'progress': return {...b,data:{items:[{id:uid(),label:'销售目标',current:75,total:100,unit:'%'},{id:uid(),label:'新客开发',current:320,total:500,unit:'人'}]}};
    // 新增图表组件
    case 'waterfall': return {...b,config:{y:'数值'},data:{items:[{id:uid(),label:'起始',value:100,type:'total'},{id:uid(),label:'增加A',value:50,type:'positive'},{id:uid(),label:'减少B',value:-30,type:'negative'},{id:uid(),label:'增加C',value:20,type:'positive'},{id:uid(),label:'结束',value:140,type:'total'}]}};
    case 'scatter': return {...b,config:{x:'X轴',y:'Y轴'},data:{groups:[{id:uid(),name:'系列1',color:P[0],pts:[{id:uid(),x:10,y:20},{id:uid(),x:30,y:40},{id:uid(),x:50,y:60}]}]}};
    case 'heatmap': return {...b,config:{x:'时间',y:'类别'},data:{rows:[{label:'周一',values:[10,20,30,40,50,60,70]},{label:'周二',values:[20,30,40,50,60,70,80]},{label:'周三',values:[30,40,50,60,70,80,90]}],cols:['00:00','04:00','08:00','12:00','16:00','20:00','24:00']}};
    case 'chinamap': return {...b,config:{colorMin:'#e0f2fe',colorMax:'#0369a1'},data:{items:[{id:uid(),name:'北京',value:100},{id:uid(),name:'上海',value:85},{id:uid(),name:'广东',value:75},{id:uid(),name:'浙江',value:65},{id:uid(),name:'江苏',value:60},{id:uid(),name:'山东',value:55},{id:uid(),name:'河南',value:50},{id:uid(),name:'四川',value:45},{id:uid(),name:'湖北',value:40},{id:uid(),name:'湖南',value:35}]}};
    case 'sankey': return {...b,data:{nodes:[{id:'a',name:'来源A'},{id:'b',name:'来源B'},{id:'c',name:'转化C'},{id:'d',name:'转化D'},{id:'e',name:'结果E'}],links:[{source:'a',target:'c',value:30},{source:'a',target:'d',value:20},{source:'b',target:'c',value:25},{source:'b',target:'d',value:15},{source:'c',target:'e',value:55},{source:'d',target:'e',value:35}]}};
    case 'gantt': return {...b,data:{tasks:[{id:uid(),name:'任务A',start:'2024-01-01',end:'2024-01-10',progress:80,color:P[0]},{id:uid(),name:'任务B',start:'2024-01-05',end:'2024-01-15',progress:60,color:P[1]},{id:uid(),name:'任务C',start:'2024-01-12',end:'2024-01-20',progress:30,color:P[2]}]}};
    case 'wordcloud': return {...b,data:{words:[{text:'数据分析',value:100},{text:'可视化',value:80},{text:'报告',value:70},{text:'趋势',value:60},{text:'指标',value:55},{text:'增长',value:50},{text:'用户',value:45},{text:'转化',value:40}]}};
    case 'image': return {...b,data:{src:'',alt:'',caption:''}};
    case 'attachment': return {...b,data:{files:[]}};
    default: return b;
  }
}

function initMods() {
  return [
    {id:uid(),type:'text',title:'执行摘要',subtitle:'',data:{content:'本月通过壳牌/愉秒充的高质资源接入与长假补能保障专项，成功实现从"价格导向"向"体验驱动"的转型。在无大规模调价背景下，通过解决启动成功率等核心痛点，用户满意度创历史新高，活跃用户留存率环比提升 5.2 个百分点。'}},
    {id:uid(),type:'kpi',title:'核心指标',subtitle:'',config:{cols:4},data:{items:[
      {id:uid(),label:'总补能电量',value:'1.25 MWh',change:45,unit:''},
      {id:uid(),label:'启动成功率',value:'98.8%',change:2.4,unit:''},
      {id:uid(),label:'用户留存率',value:'42.5%',change:5.2,unit:''},
      {id:uid(),label:'找桩耗时',value:'3.2 min',change:-18,unit:''},
    ]}},
    {id:uid(),type:'funnel',title:'用户转化漏斗',subtitle:'本月 vs 上月',data:{items:[
      {id:uid(),stage:'首页曝光',cur:10000,prev:9200},
      {id:uid(),stage:'搜索点击',cur:7800,prev:6600},
      {id:uid(),stage:'查看详情',cur:5200,prev:4100},
      {id:uid(),stage:'扫码启动',cur:4800,prev:3500},
      {id:uid(),stage:'支付完成',cur:4420,prev:3010},
    ]}},
    {id:uid(),type:'line',title:'日度流量与运营商占比',subtitle:'',config:{left:'订单量',right:'占比(%)'},data:{
      series:[{name:'日订单',color:'#1d4ed8',axis:'left'},{name:'壳牌',color:'#047857',axis:'right'},{name:'愉秒充',color:'#b45309',axis:'right'},{name:'其他',color:'#71717a',axis:'right'}],
      points:[
        {id:uid(),x:'2/1',values:[320,35,28,37]},{id:uid(),x:'2/5',values:[480,38,30,32]},
        {id:uid(),x:'2/10',values:[720,42,25,33]},{id:uid(),x:'2/15',values:[650,40,27,33]},
        {id:uid(),x:'2/20',values:[550,36,32,32]},{id:uid(),x:'2/25',values:[410,34,35,31]},
        {id:uid(),x:'2/28',values:[380,33,36,31]},
      ]
    }},
    {id:uid(),type:'radar',title:'品牌心智评分',subtitle:'',data:{
      dims:['高端感','便利度','响应度','稳定性','覆盖面'],
      series:[
        {name:'我方品牌',color:'#1d4ed8',values:[88,82,76,92,65]},
        {name:'竞品 A',color:'#b91c1c',values:[35,68,55,58,88]},
      ]
    }},
    {id:uid(),type:'bubble',title:'运营商竞争力图谱',subtitle:'覆盖广度 × 充电时长 × 口碑',config:{x:'覆盖广度(站)',y:'充电时长(min)',z:'口碑分'},data:{groups:[
      {id:uid(),name:'壳牌',color:'#1d4ed8',pts:[{id:uid(),x:120,y:42,z:92,label:'一线'},{id:uid(),x:65,y:48,z:85,label:'新一线'}]},
      {id:uid(),name:'愉秒充',color:'#047857',pts:[{id:uid(),x:200,y:55,z:72,label:'三线'},{id:uid(),x:150,y:50,z:68,label:'县城'}]},
      {id:uid(),name:'竞品 A',color:'#b91c1c',pts:[{id:uid(),x:300,y:62,z:45,label:'全国'},{id:uid(),x:180,y:58,z:40,label:'重点城市'}]},
    ]}},
    {id:uid(),type:'comparison',title:'体验优化成果',subtitle:'',data:{items:[
      {id:uid(),name:'插枪启动失败率',action:'50+ 桩型协议联调',before:7.2,after:1.2},
      {id:uid(),name:'站点信息不准确率',action:'虚假桩自动屏蔽算法',before:16.5,after:3.5},
      {id:uid(),name:'排队焦虑指数',action:'排队预估 + 周边引导',before:68,after:25},
    ]}},
    {id:uid(),type:'list',title:'下月行动计划',subtitle:'',data:{items:[
      {id:uid(),bold:'产品端 — ',text:'推进"插枪即充"在壳牌全量站点自动化适配'},
      {id:uid(),bold:'运营端 — ',text:'启动"智行绿能日"高忠诚度车主免费洗车活动'},
      {id:uid(),bold:'技术端 — ',text:'攻坚地下停车场寻桩导航精准度问题'},
    ]}},
  ];
}

function parseMarkdown(md) {
  const lines = md.split('\n');
  const modules = [];
  let currentModule = null;
  let title = '导入的报告';
  let subtitle = '';
  
  const getTypeFromHeading = (heading) => {
    const h = heading.toLowerCase().replace(/^#+\s*/, '').trim();
    if (h.includes('摘要') || h.includes('概述') || h.includes('总结')) return 'text';
    if (h.includes('指标') || h.includes('kpi') || h.includes('核心')) return 'kpi';
    if (h.includes('表') || h.includes('表格')) return 'table';
    if (h.includes('柱') || h.includes('条形')) return 'chart';
    if (h.includes('漏斗') || h.includes('转化')) return 'funnel';
    if (h.includes('折线') || h.includes('趋势') || h.includes('line')) return 'line';
    if (h.includes('雷达') || h.includes('能力')) return 'radar';
    if (h.includes('气泡') || h.includes('bubble')) return 'bubble';
    if (h.includes('对比') || h.includes('比较') || h.includes('优化')) return 'comparison';
    if (h.includes('四象限') || h.includes('象限') || h.includes('quadrant')) return 'quadrant';
    if (h.includes('列表') || h.includes('要点') || h.includes('行动') || h.includes('计划')) return 'list';
    return 'text';
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    if (line.startsWith('# ') && !line.startsWith('##')) {
      title = line.replace(/^#\s*/, '').trim();
      continue;
    }
    
    if (line.startsWith('## ') && !currentModule) {
      subtitle = line.replace(/^##\s*/, '').trim();
      continue;
    }
    
    if (line.startsWith('### ')) {
      if (currentModule) modules.push(currentModule);
      const heading = line.replace(/^###\s*/, '').trim();
      let type = getTypeFromHeading(heading);
      
      if (type === 'text' && i + 2 < lines.length) {
        const nextLine1 = lines[i + 1].trim();
        const nextLine2 = lines[i + 2].trim();
        if (nextLine1.includes('|') && nextLine2.includes('|') && nextLine2.includes('-')) {
          type = 'table';
        }
      }
      
      currentModule = cMod(type);
      currentModule.title = heading;
      continue;
    }
    
    if (line.startsWith('> ') && currentModule) {
      currentModule.subtitle = line.replace(/^>\s*/, '').trim();
      continue;
    }
    
    if (currentModule && line.startsWith('- ')) {
      const content = line.replace(/^-\s*/, '').trim();
      
      if (currentModule.type === 'kpi') {
        const match = content.match(/^(.+?)\s*[：:]\s*(\S+)(?:\s*\(([+-]?\d+\.?\d*)%\))?/);
        if (match) {
          currentModule.data.items.push({
            id: uid(),
            label: match[1].trim(),
            value: match[2].trim(),
            change: match[3] ? parseFloat(match[3]) : 0,
            unit: ''
          });
        }
        continue;
      }
      
      if (currentModule.type === 'list') {
        const boldMatch = content.match(/^(\S+[—:])\s*(.+)/);
        if (boldMatch) {
          currentModule.data.items.push({
            id: uid(),
            bold: boldMatch[1].trim(),
            text: boldMatch[2].trim()
          });
        } else {
          currentModule.data.items.push({
            id: uid(),
            bold: '',
            text: content
          });
        }
        continue;
      }
      
      if (currentModule.type === 'funnel') {
        const match = content.match(/^(.+?)\s*(\d+(?:,\d+)*)\s*(?:\((\d+(?:,\d+)*)\))?/);
        if (match) {
          currentModule.data.items.push({
            id: uid(),
            stage: match[1].trim(),
            cur: parseInt(match[2].replace(/,/g, '')),
            prev: match[3] ? parseInt(match[3].replace(/,/g, '')) : 0
          });
        }
        continue;
      }
      
      if (currentModule.type === 'comparison') {
        const match = content.match(/^(.+?)\s*\|\s*(.+?)\s*\|\s*(\d+\.?\d*)\s*→\s*(\d+\.?\d*)/);
        if (match) {
          currentModule.data.items.push({
            id: uid(),
            name: match[1].trim(),
            action: match[2].trim(),
            before: parseFloat(match[3]),
            after: parseFloat(match[4])
          });
        }
        continue;
      }
    }
    
    if (currentModule && line.includes('|') && line.includes('-')) {
      continue;
    }
    
    if (currentModule && line.includes('|')) {
      const cells = line.split('|').filter(c => c.trim()).map(c => c.trim());
      
      if (currentModule.type === 'table') {
        if (!currentModule.data.headers.length) {
          currentModule.data.headers = cells;
        } else {
          currentModule.data.rows.push({
            id: uid(),
            cells: cells
          });
        }
        continue;
      }
      
      if (currentModule.type === 'line' || currentModule.type === 'chart') {
        if (!currentModule.data.series.length) {
          currentModule.data.series = cells.slice(1).map((name, idx) => ({
            name: name,
            color: P[idx % P.length],
            axis: currentModule.type === 'line' ? (idx % 2 === 0 ? 'left' : 'right') : undefined
          }));
        } else {
          const x = cells[0];
          const values = cells.slice(1).map(v => parseFloat(v) || 0);
          if (currentModule.type === 'line') {
            currentModule.data.points.push({ id: uid(), x, values });
          } else {
            currentModule.data.items.push({ id: uid(), label: x, values });
          }
        }
        continue;
      }
      
      if (currentModule.type === 'radar') {
        if (!currentModule.data.dims.length) {
          currentModule.data.dims = cells;
        } else {
          currentModule.data.series.push({
            name: cells[0],
            color: P[currentModule.data.series.length % P.length],
            values: cells.slice(1).map(v => parseFloat(v) || 0)
          });
        }
        continue;
      }
      
      if (currentModule.type === 'bubble') {
        if (cells.length >= 4) {
          if (!currentModule.data.groups.length) {
            currentModule.data.groups.push({
              id: uid(),
              name: '默认组',
              color: P[0],
              pts: []
            });
          }
          const lastGroup = currentModule.data.groups[currentModule.data.groups.length - 1];
          lastGroup.pts.push({
            id: uid(),
            x: parseFloat(cells[1]) || 0,
            y: parseFloat(cells[2]) || 0,
            z: parseFloat(cells[3]) || 0,
            label: cells[0]
          });
        }
        continue;
      }
      
      if (currentModule.type === 'quadrant') {
        if (cells.length >= 3) {
          currentModule.data.points.push({
            id: uid(),
            name: cells[0],
            x: parseFloat(cells[1]) || 0,
            y: parseFloat(cells[2]) || 0,
            color: P[currentModule.data.points.length % P.length]
          });
        }
        continue;
      }
    }
    
    if (currentModule && currentModule.type === 'text' && line.includes('|') && i + 1 < lines.length) {
      const nextLine = lines[i + 1].trim();
      if (nextLine.includes('|') && nextLine.includes('-')) {
        const tableModule = cMod('table');
        tableModule.title = currentModule.title;
        tableModule.subtitle = currentModule.subtitle;
        
        const headers = line.split('|').filter(c => c.trim()).map(c => c.trim());
        tableModule.data.headers = headers;
        
        i += 2;
        while (i < lines.length) {
          const tableLine = lines[i].trim();
          if (!tableLine || !tableLine.includes('|')) break;
          const tableCells = tableLine.split('|').filter(c => c.trim()).map(c => c.trim());
          if (tableCells.length === headers.length) {
            tableModule.data.rows.push({
              id: uid(),
              cells: tableCells
            });
          }
          i++;
        }
        
        if (tableModule.data.rows.length > 0) {
          modules.push(tableModule);
          currentModule = null;
          continue;
        }
      }
    }
    
    if (currentModule && currentModule.type === 'text' && !currentModule.data.content) {
      currentModule.data.content = line;
      continue;
    }
    
    if (currentModule && currentModule.type === 'text') {
      currentModule.data.content += '\n' + line;
    }
  }
  
  if (currentModule) modules.push(currentModule);
  
  if (modules.length === 0) {
    return {
      title,
      subtitle,
      modules: [{ id: uid(), type: 'text', title: '导入内容', subtitle: '', data: { content: md } }]
    };
  }
  
  return { title, subtitle, modules };
}

// ─── HTML Export ───
// ─── HTML Export ───
function genHTML(title, subtitle, modules, chartImages = {}) {   // ← 加 chartImages
  const esc = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const modHTML = (m, i) => {
    let c = '';
    switch(m.type) {
      case 'text': /* 不变 */ c=`<p style="font-size:15px;line-height:1.9;color:#3f3f46;">${esc(m.data.content)}</p>`; break;
      case 'note': c=`<p style="font-size:12px;line-height:1.6;color:#9ca3af;font-style:italic;margin-top:8px;">${esc(m.data.content)}</p>`; break;
      case 'kpi': /* 不变 */ {
        const cols = m.config?.cols||3;
        c=`<div style="display:grid;grid-template-columns:repeat(${Math.min(cols,4)},1fr);gap:24px;">`;
        m.data.items.forEach(it=>{
          const color = it.change>=0?'#047857':'#b91c1c';
          const arrow = it.change>=0?'↑':'↓';
          c+=`<div style="padding:20px 0;border-top:2px solid #e4e4e7;"><div style="font-size:11px;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">${esc(it.label)}</div><div style="font-size:28px;font-weight:700;color:#18181b;margin-bottom:6px;">${esc(it.value)}</div><div style="font-size:13px;color:${color};">${arrow} ${Math.abs(it.change)}%</div></div>`;
        });
        c+=`</div>`; break;
      }
      case 'table': /* 不变 */ {
        c=`<table><thead><tr>`;
        m.data.headers.forEach(h=>{c+=`<th>${esc(h)}</th>`;});
        c+=`</tr></thead><tbody>`;
        m.data.rows.forEach(r=>{c+=`<tr>`;r.cells.forEach(cell=>{c+=`<td>${esc(cell)}</td>`;});c+=`</tr>`;});
        c+=`</tbody></table>`; break;
      }
      case 'chart':
      case 'hbar':
      case 'line':
      case 'radar':
      case 'bubble':
      case 'comparison':
      case 'quadrant': {
        // 如果有截图，优先用图片
        if (chartImages[m.id]) {
          c += `<img src="${chartImages[m.id]}" style="max-width:100%;height:auto;margin-bottom:16px;" />`;
        } else {
          // 没有截图时，生成 HTML 版本
          if(m.type==='chart'||m.type==='hbar'){
            const mx = Math.max(...m.data.items.flatMap(it=>it.values),1);
            c+=`<div style="margin-bottom:12px;display:flex;gap:16px;">`; m.data.series.forEach(s=>{c+=`<span style="font-size:12px;color:${s.color};display:flex;align-items:center;gap:4px;"><span style="width:10px;height:10px;background:${s.color};border-radius:2px;display:inline-block;"></span>${esc(s.name)}</span>`;}); c+=`</div>`;
            m.data.items.forEach(it=>{
              c+=`<div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;"><span style="width:80px;font-size:13px;color:#71717a;text-align:right;flex-shrink:0;">${esc(it.label)}</span><div style="flex:1;display:flex;gap:3px;">`;
              it.values.forEach((v,vi)=>{
                const color = m.data.series[vi]?.color||P[vi%P.length];
                c+=`<div style="height:28px;width:${Math.max((v/mx)*100,3)}%;background:${color};border-radius:2px;" title="${v}"></div>`;
              });
              c+=`</div></div>`;
            });
          } else if(m.type==='line'){
            c+=`<table><thead><tr><th>日期</th>`;m.data.series.forEach(s=>{c+=`<th>${esc(s.name)}</th>`;});c+=`</tr></thead><tbody>`;m.data.points.forEach(pt=>{c+=`<tr><td>${esc(pt.x)}</td>`;pt.values.forEach(v=>{c+=`<td>${v}</td>`;});c+=`</tr>`;});c+=`</tbody></table>`;
          } else if(m.type==='radar'){
            c+=`<table><thead><tr><th>维度</th>`;m.data.series.forEach(s=>{c+=`<th>${esc(s.name)}</th>`;});c+=`</tr></thead><tbody>`;m.data.dims.forEach((d,di)=>{c+=`<tr><td>${esc(d)}</td>`;m.data.series.forEach(s=>{c+=`<td>${s.values[di]}</td>`;});c+=`</tr>`;});c+=`</tbody></table>`;
          } else if(m.type==='bubble'){
            c+=`<table><thead><tr><th>组</th><th>标签</th><th>${esc(m.config?.x)}</th><th>${esc(m.config?.y)}</th><th>${esc(m.config?.z)}</th></tr></thead><tbody>`;m.data.groups.forEach(g=>{g.pts.forEach(p=>{c+=`<tr><td>${esc(g.name)}</td><td>${esc(p.label)}</td><td>${p.x}</td><td>${p.y}</td><td>${p.z}</td></tr>`;});});c+=`</tbody></table>`;
          } else if(m.type==='comparison'){
            c+=`<table><thead><tr><th>指标</th><th>干预措施</th><th>优化前</th><th>优化后</th><th>改善</th></tr></thead><tbody>`;
            m.data.items.forEach(it=>{
              const imp = it.before?((it.before-it.after)/it.before*100).toFixed(1):'—';
              c+=`<tr><td style="font-weight:600;">${esc(it.name)}</td><td>${esc(it.action)}</td><td style="color:#b91c1c;">${it.before}</td><td style="color:#047857;font-weight:600;">${it.after}</td><td style="color:#047857;">↓ ${imp}%</td></tr>`;
            });
            c+=`</tbody></table>`;
          } else if(m.type==='quadrant'){
            c+=`<div style="position:relative;width:100%;height:320px;background:linear-gradient(to right,#f4f4f5 50%,#f4f4f5 50%,#f0fdf4 50%,#f0fdf4 50%);border:1px solid #e4e4e7;border-radius:4px;margin-top:8px;">`;
            c+=`<div style="position:absolute;top:8px;left:8px;font-size:11px;color:#047857;font-weight:600;">高价值</div>`;
            c+=`<div style="position:absolute;top:8px;right:8px;font-size:11px;color:#047857;font-weight:600;">高价值</div>`;
            c+=`<div style="position:absolute;bottom:8px;left:8px;font-size:11px;color:#b91c1c;font-weight:600;">低价值</div>`;
            c+=`<div style="position:absolute;bottom:8px;right:8px;font-size:11px;color:#b91c1c;font-weight:600;">低价值</div>`;
            c+=`<div style="position:absolute;top:50%;left:50%;width:1px;height:100%;background:#d4d4d8;transform:translate(-50%,-50%);"></div>`;
            c+=`<div style="position:absolute;top:0;left:50%;height:100%;width:1px;background:#d4d4d8;transform:translateX(-50%);"></div>`;
            (m.data.points || []).forEach(pt=>{
              const color = pt.color?.startsWith('P[') ? P[parseInt(pt.color.slice(2))] || P[0] : pt.color || P[0];
              c+=`<div style="position:absolute;left:${pt.x}%;top:${100-pt.y}%;transform:translate(-50%,-50%);width:48px;height:48px;background:${color};border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:600;box-shadow:0 2px8px rgba(0,0,0,0.15);border:3px solid #fff;">${esc(pt.name)}</div>`;
            });
            c+=`</div>`;
            c+=`<div style="display:flex;justify-content:center;gap:16px;margin-top:12px;font-size:12px;color:#71717a;">`;
            (m.data.points || []).forEach(pt=>{
              const color = pt.color?.startsWith('P[') ? P[parseInt(pt.color.slice(2))] || P[0] : pt.color || P[0];
              c+=`<span style="display:flex;align-items:center;gap:4px;"><span style="width:10px;height:10px;background:${color};border-radius:50%;"></span>${esc(pt.name)} (${pt.x}, ${pt.y})</span>`;
            });
            c+=`</div>`;
          }
        }
        break;
      }
      case 'funnel': /* 不变 */ {
        const mx = Math.max(...m.data.items.flatMap(it=>[it.cur,it.prev]),1);
        c+=`<div style="text-align:right;margin-bottom:16px;font-size:11px;color:#a1a1aa;"><span style="display:inline-flex;align-items:center;gap:4px;margin-right:16px;"><span style="width:10px;height:8px;background:#1d4ed8;border-radius:2px;display:inline-block;"></span>本月</span><span style="display:inline-flex;align-items:center;gap:4px;"><span style="width:10px;height:8px;background:#d4d4d8;border-radius:2px;display:inline-block;"></span>上月</span></div>`;
        m.data.items.forEach((it,idx)=>{
          if(idx>0){
            const lc = ((m.data.items[idx-1].cur-it.cur)/m.data.items[idx-1].cur*100).toFixed(1);
            c+=`<div style="text-align:center;font-size:10px;color:#d4d4d8;margin:6px 0;">▾ 流失 ${lc}%</div>`;
          }
          const cw = Math.max((it.cur/mx)*100,15);
          const pw = Math.max((it.prev/mx)*100,15);
          c+=`<div style="display:flex;align-items:center;gap:12px;margin-bottom:4px;"><span style="width:70px;text-align:right;font-size:12px;color:#71717a;flex-shrink:0;">${esc(it.stage)}</span><div style="flex:1;"><div style="width:${cw}%;height:28px;background:#1d4ed8;border-radius:2px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:600;margin-bottom:3px;">${it.cur.toLocaleString()}</div><div style="width:${pw}%;height:20px;background:#e4e4e7;border-radius:2px;display:flex;align-items:center;justify-content:center;color:#71717a;font-size:10px;">${it.prev.toLocaleString()}</div></div></div>`;
        });
        break;
      }
      case 'list': /* 不变 */ {
        m.data.items.forEach(it=>{
          c+=`<div style="display:flex;align-items:baseline;gap:12px;margin-bottom:12px;font-size:15px;line-height:1.7;color:#3f3f46;"><span style="width:5px;height:5px;border-radius:50%;background:#18181b;flex-shrink:0;margin-top:9px;"></span><span>${it.bold?`<strong style="color:#18181b;">${esc(it.bold)}</strong>`:''}${esc(it.text)}</span></div>`;
        });
        break;
      }
      case 'pie': {
        const total = m.data.items.reduce((sum, it) => sum + (it.value || 0), 0);
        let accumulatedAngle = 0;
        c+=`<div style="display:flex;flex-wrap:wrap;gap:24px;align-items:center;">`;
        c+=`<div style="position:relative;width:180px;height:180px;border-radius:50%;background:conic-gradient(${m.data.items.map((it, idx) => {
          const color = it.color?.startsWith('P[') ? P[parseInt(it.color.slice(2))] || P[idx % P.length] : it.color || P[idx % P.length];
          const angle = (it.value / total) * 360;
          const startAngle = accumulatedAngle;
          accumulatedAngle += angle;
          return `${color} ${startAngle}deg ${accumulatedAngle}deg`;
        }).join(', ')});"></div>`;
        c+=`<div style="flex:1;min-width:200px;">`;
        m.data.items.forEach((it, idx) => {
          const color = it.color?.startsWith('P[') ? P[parseInt(it.color.slice(2))] || P[idx % P.length] : it.color || P[idx % P.length];
          const pct = total > 0 ? (it.value / total * 100).toFixed(1) : 0;
          c+=`<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;"><span style="width:12px;height:12px;border-radius:2px;background:${color};flex-shrink:0;"></span><span style="font-size:13px;color:#3f3f46;flex:1;">${esc(it.label)}</span><span style="font-size:13px;font-weight:600;color:#18181b;">${pct}%</span></div>`;
        });
        c+=`</div></div>`;
        break;
      }
      case 'ordered': {
        c+=`<ol style="padding-left:24px;margin:8px 0;">`;
        m.data.items.forEach(it=>{
          c+=`<li style="font-size:15px;line-height:1.9;color:#3f3f46;margin-bottom:12px;padding-left:8px;">${esc(it.text)}</li>`;
        });
        c+=`</ol>`;
        break;
      }
      case 'unordered': {
        c+=`<ul style="padding-left:24px;margin:8px 0;list-style-type:disc;">`;
        m.data.items.forEach(it=>{
          c+=`<li style="font-size:15px;line-height:1.9;color:#3f3f46;margin-bottom:12px;padding-left:4px;">${esc(it.text)}</li>`;
        });
        c+=`</ul>`;
        break;
      }
      case 'barline': {
        const maxBar = Math.max(...m.data.items.flatMap(it => it.barValues || []), 1);
        const maxLine = Math.max(...m.data.items.flatMap(it => it.lineValues || []), 100);
        c+=`<div style="margin-bottom:12px;display:flex;gap:16px;">`;
        m.data.barSeries?.forEach((s, idx) => { c+=`<span style="font-size:12px;display:flex;align-items:center;gap:4px;"><span style="width:10px;height:10px;background:${P[idx % P.length]};border-radius:2px;"></span>${esc(s)}</span>`; });
        m.data.lineSeries?.forEach((s, idx) => { c+=`<span style="font-size:12px;display:flex;align-items:center;gap:4px;"><span style="width:10px;height:2px;background:${P[(idx + (m.data.barSeries?.length || 0)) % P.length]};"></span>${esc(s)}</span>`; });
        c+=`</div>`;
        m.data.items.forEach(it=>{
          c+=`<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;"><span style="width:50px;font-size:13px;color:#71717a;text-align:right;flex-shrink:0;">${esc(it.label)}</span><div style="flex:1;display:flex;flex-direction:column;gap:4px;">`;
          (it.barValues || []).forEach((v, idx) => {
            const width = (v / maxBar) * 60;
            c+=`<div style="display:flex;align-items:center;gap:8px;"><div style="height:20px;width:${width}%;background:${P[idx % P.length]};border-radius:2px;min-width:20px;"></div><span style="font-size:12px;color:#71717a;">${v}</span></div>`;
          });
          (it.lineValues || []).forEach((v, idx) => {
            const left = (v / maxLine) * 60 + 60;
            const color = P[(idx + (m.data.barSeries?.length || 0)) % P.length];
            c+=`<div style="position:relative;height:20px;display:flex;align-items:center;"><div style="position:absolute;left:${left}%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;"><div style="width:8px;height:8px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.2);"></div><span style="font-size:11px;color:${color};white-space:nowrap;">${v}%</span></div></div>`;
          });
          c+=`</div></div>`;
        });
        break;
      }
      case 'progress': {
        m.data.items.forEach(it=>{
          const pct = it.total > 0 ? (it.current / it.total * 100).toFixed(1) : 0;
          const barColor = pct >= 80 ? P[1] : pct >= 50 ? P[2] : P[3];
          c+=`<div style="margin-bottom:16px;">`;
          c+=`<div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span style="font-size:13px;color:#3f3f46;">${esc(it.label)}</span><span style="font-size:13px;color:#71717a;">${it.current?.toLocaleString()}${esc(it.unit || '')} / ${it.total?.toLocaleString()}${esc(it.unit || '')}</span></div>`;
          c+=`<div style="height:10px;background:#e4e4e7;border-radius:5px;overflow:hidden;"><div style="height:100%;width:${pct}%;background:${barColor};border-radius:5px;transition:width 0.3s;"></div></div>`;
          c+=`<div style="text-align:right;font-size:12px;color:${barColor};font-weight:600;margin-top:4px;">${pct}%</div>`;
          c+=`</div>`;
        });
        break;
      }
      case 'image': {
        if (m.data?.src) {
          c+=`<div style="text-align:center;">`;
          c+=`<img src="${m.data.src}" alt="${esc(m.data.alt || '')}" style="max-width:100%;height:auto;max-height:400px;border-radius:8px;" />`;
          if (m.data.caption) {
            c+=`<p style="font-size:13px;color:#71717a;margin-top:12px;text-align:center;">${esc(m.data.caption)}</p>`;
          }
          c+=`</div>`;
        }
        break;
      }
      // ========== 这里是关键改动 ==========
      default: {
        // 其他类型的模块处理
      }
      // ====================================
    }
    const hasTitle = m.title && m.title.trim() !== '';
    const titleSection = hasTitle ? `<div style="margin-bottom:18px;"><h2 style="font-size:17px;font-weight:600;color:#18181b;margin:0;">${esc(m.title)}</h2>${m.subtitle ? `<p style="font-size:13px;color:#a1a1aa;margin:4px 0 0;">${esc(m.subtitle)}</p>` : ''}</div>` : '';
    return `<section style="margin-bottom:48px;page-break-inside:avoid;">${titleSection}${c}</section>`;
  };
  return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,'Helvetica Neue','PingFang SC',sans-serif;color:#27272a;background:#fff;max-width:820px;margin:0 auto;padding:48px 40px}@media print{body{padding:20px}section{page-break-inside:avoid}}table{border-collapse:collapse;width:100%;margin-top:8px;font-size:13px}th,td{padding:10px 14px;text-align:left;border-bottom:1px solid #e4e4e7}th{font-weight:600;color:#52525b;font-size:11px;text-transform:uppercase;letter-spacing:0.3px;border-bottom:2px solid #d4d4d8}img{max-width:100%;height:auto}@media(max-width:600px){body{padding:20px 16px}}</style></head><body><header style="margin-bottom:48px;padding-bottom:28px;border-bottom:1px solid #e4e4e7;"><h1 style="font-size:24px;font-weight:700;color:#18181b;letter-spacing:-0.5px;">${esc(title)}</h1>${subtitle?`<p style="font-size:14px;color:#a1a1aa;margin-top:8px;">${esc(subtitle)}</p>`:''}<p style="font-size:11px;color:#d4d4d8;margin-top:14px;font-family:monospace;">${new Date().toLocaleDateString('zh-CN',{year:'numeric',month:'long',day:'numeric'})}</p></header>${modules.map((m,i)=>modHTML(m,i)).join('')}<footer style="margin-top:40px;padding-top:20px;border-top:1px solid #e4e4e7;text-align:center;font-size:11px;color:#d4d4d8;">Generated ${new Date().toLocaleString('zh-CN')}</footer></body></html>`;
}

const I = "w-full px-3 py-2 text-sm border border-zinc-200 rounded focus:outline-none focus:border-zinc-400 bg-white";
const ISmall = "px-2 py-1.5 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400 bg-white";

function parseCSV(csv) {
  const lines = csv.split('\n').map(l => l.trim()).filter(l => l);
  if (lines.length < 2) return null;
  
  const parseRow = (line) => {
    const cells = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        cells.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    cells.push(current.trim());
    return cells;
  };
  
  const headers = parseRow(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseRow(lines[i]);
    if (cells.length === headers.length) {
      rows.push({ id: uid(), cells });
    }
  }
  
  const firstCol = headers[0]?.toLowerCase() || '';
  
  if (firstCol.includes('指标') || firstCol.includes('kpi') || firstCol.includes('名') || firstCol.includes('项')) {
    const items = rows.map(r => {
      const label = r.cells[0] || '';
      const value = r.cells[1] || '0';
      const changeMatch = (r.cells[2] || '').match(/([+-]?\d+\.?\d*)/);
      return {
        id: uid(),
        label,
        value,
        change: changeMatch ? parseFloat(changeMatch[1]) : 0,
        unit: ''
      };
    });
    return {
      title: '导入的指标',
      subtitle: '',
      modules: [{ id: uid(), type: 'kpi', title: '核心指标', subtitle: '', config: { cols: Math.min(items.length, 4) }, data: { items } }]
    };
  }
  
  if (firstCol.includes('日') || firstCol.includes('月') || firstCol.includes('时间') || firstCol.includes('date')) {
    const series = headers.slice(1).map((name, idx) => ({
      name: name,
      color: P[idx % P.length],
      axis: idx % 2 === 0 ? 'left' : 'right'
    }));
    const points = rows.map(r => ({
      id: uid(),
      x: r.cells[0] || '',
      values: r.cells.slice(1).map(v => parseFloat(v) || 0)
    }));
    return {
      title: '导入的数据',
      subtitle: '',
      modules: [{ id: uid(), type: 'line', title: '数据趋势', subtitle: '', config: { left: '左轴', right: '右轴(%)' }, data: { series, points } }]
    };
  }
  
  return {
    title: '导入的表格',
    subtitle: '',
    modules: [{ id: uid(), type: 'table', title: '数据表格', subtitle: '', data: { headers, rows } }]
  };
}

// 解析Excel文件
async function parseExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
        resolve(jsonData);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// 将Excel数据转换为组件数据
function convertExcelToModuleData(modType, excelData) {
  if (!excelData || excelData.length < 2) return null;
  
  const headers = excelData[0].map(h => String(h || ''));
  const rows = excelData.slice(1).filter(row => row.some(cell => cell !== undefined && cell !== ''));
  
  switch (modType) {
    case 'chart':
    case 'hbar': {
      // 柱状图/横向柱状图: 第一列是类别，后面是系列
      const series = headers.slice(1).map((name, idx) => ({
        name: name || `系列${idx + 1}`,
        color: P[idx % P.length]
      }));
      const items = rows.map(row => ({
        id: uid(),
        label: String(row[0] || ''),
        values: row.slice(1).map(v => parseFloat(v) || 0)
      }));
      return { series, items };
    }

    case 'line': {
      // 折线图: 第一列是X轴，后面是系列
      const series = headers.slice(1).map((name, idx) => ({
        name: name || `系列${idx + 1}`,
        color: P[idx % P.length],
        axis: idx % 2 === 0 ? 'left' : 'right'
      }));
      const points = rows.map(row => ({
        id: uid(),
        x: String(row[0] || ''),
        values: row.slice(1).map(v => parseFloat(v) || 0)
      }));
      return { series, points };
    }

    case 'line3': {
      // 三折线图: 第一列是X轴，后面是系列(最多3个)
      const series = headers.slice(1, 4).map((name, idx) => ({
        name: name || `系列${idx + 1}`,
        color: P[idx % P.length]
      }));
      const points = rows.map(row => ({
        id: uid(),
        x: String(row[0] || ''),
        values: row.slice(1, 4).map(v => parseFloat(v) || 0)
      }));
      return { series, points };
    }

    case 'bar2line': {
      // 双折线+柱状图: 第一列是标签，第二列是柱状图，第三、四列是折线图
      const barSeries = headers[1] ? [headers[1]] : ['柱状'];
      const lineSeries = headers.slice(2, 4).map((name, idx) => name || `折线${idx + 1}`);
      const items = rows.map(row => ({
        id: uid(),
        label: String(row[0] || ''),
        barValues: [parseFloat(row[1]) || 0],
        lineValues: row.slice(2, 4).map(v => parseFloat(v) || 0)
      }));
      return { barSeries, lineSeries, items };
    }

    case 'stackbarline': {
      // 堆叠柱状图+折线: 第一列是标签，第二、三列是堆叠系列，第四列是折线
      const stackSeries = headers.slice(1, 3).map((name, idx) => name || `堆叠${idx + 1}`);
      const lineSeries = headers[3] ? [headers[3]] : ['折线'];
      const items = rows.map(row => ({
        id: uid(),
        label: String(row[0] || ''),
        stackValues: row.slice(1, 3).map(v => parseFloat(v) || 0),
        lineValues: [parseFloat(row[3]) || 0]
      }));
      return { stackSeries, lineSeries, items };
    }

    case 'barline': {
      // 组合图: 第一列是标签，中间列是柱状图，最后列是折线图
      // 支持多柱状+多折线，例如：标签,柱状1,柱状2,折线1,折线2
      const barCount = Math.max(1, headers.length - 2); // 默认至少1个柱状
      const lineCount = 1; // 默认1个折线
      
      // 智能分配：如果有多列，前面的是柱状，最后1-2列是折线
      const actualBarCount = headers.length > 3 ? headers.length - 2 : 1;
      const actualLineCount = headers.length > 3 ? 1 : 1;
      
      const barSeries = headers.slice(1, 1 + actualBarCount).map((h, i) => h || `柱状${i+1}`);
      const lineSeries = headers.slice(1 + actualBarCount).map((h, i) => h || `折线${i+1}`);
      
      const items = rows.map(row => ({
        id: uid(),
        label: String(row[0] || ''),
        barValues: Array.from({length: actualBarCount}, (_, i) => parseFloat(row[1 + i]) || 0),
        lineValues: Array.from({length: Math.max(1, headers.length - 1 - actualBarCount)}, (_, i) => parseFloat(row[1 + actualBarCount + i]) || 0)
      }));
      return { barSeries, lineSeries, items };
    }
    
    case 'pie': {
      // 饼图: 第一列是标签，第二列是数值
      const items = rows.map((row, idx) => ({
        id: uid(),
        label: String(row[0] || ''),
        value: parseFloat(row[1]) || 0,
        color: P[idx % P.length]
      }));
      return { items };
    }
    
    case 'table': {
      // 表格
      const tableRows = rows.map(row => ({
        id: uid(),
        cells: row.map(cell => String(cell || ''))
      }));
      return { headers, rows: tableRows };
    }
    
    case 'kpi': {
      // KPI指标卡: 第一列是标签，第二列是数值，第三列是变化(可选)
      const items = rows.map(row => {
        const changeMatch = String(row[2] || '').match(/([+-]?\d+\.?\d*)/);
        return {
          id: uid(),
          label: String(row[0] || ''),
          value: String(row[1] || '0'),
          change: changeMatch ? parseFloat(changeMatch[1]) : 0,
          unit: ''
        };
      });
      return { items };
    }
    
    case 'funnel': {
      // 漏斗图: 第一列是阶段，第二列是当前值，第三列是上一期值(可选)
      const items = rows.map(row => ({
        id: uid(),
        stage: String(row[0] || ''),
        cur: parseFloat(row[1]) || 0,
        prev: parseFloat(row[2]) || 0
      }));
      return { items };
    }
    
    case 'progress': {
      // 进度条: 第一列是标签，第二列是当前值，第三列是目标值
      const items = rows.map(row => ({
        id: uid(),
        label: String(row[0] || ''),
        current: parseFloat(row[1]) || 0,
        total: parseFloat(row[2]) || 100,
        unit: String(row[3] || '%')
      }));
      return { items };
    }
    
    case 'waterfall': {
      // 瀑布图: 第一列是标签，第二列是数值，第三列是类型(可选)
      const items = rows.map(row => {
        const value = parseFloat(row[1]) || 0;
        let type = 'positive';
        if (row[2]) {
          const typeStr = String(row[2]).toLowerCase();
          if (typeStr.includes('total') || typeStr.includes('合计')) type = 'total';
          else if (typeStr.includes('negative') || typeStr.includes('减少') || value < 0) type = 'negative';
        }
        return {
          id: uid(),
          label: String(row[0] || ''),
          value: Math.abs(value),
          type
        };
      });
      return { items };
    }
    
    case 'scatter':
    case 'bubble': {
      // 散点图/气泡图: 第一列是系列名，第二列是X，第三列是Y，第四列是Z(气泡图)
      const groupsMap = new Map();
      rows.forEach(row => {
        const groupName = String(row[0] || '系列1');
        if (!groupsMap.has(groupName)) {
          groupsMap.set(groupName, {
            id: uid(),
            name: groupName,
            color: P[groupsMap.size % P.length],
            pts: []
          });
        }
        const group = groupsMap.get(groupName);
        const pt = {
          id: uid(),
          x: parseFloat(row[1]) || 0,
          y: parseFloat(row[2]) || 0
        };
        if (modType === 'bubble') {
          pt.z = parseFloat(row[3]) || 0;
          pt.label = String(row[4] || '');
        }
        group.pts.push(pt);
      });
      return { groups: Array.from(groupsMap.values()) };
    }
    
    case 'radar': {
      // 雷达图: 第一列是维度名，后面是系列
      const dims = rows.map(row => String(row[0] || ''));
      const series = headers.slice(1).map((name, idx) => ({
        name: name || `系列${idx + 1}`,
        color: P[idx % P.length],
        values: rows.map(row => parseFloat(row[idx + 1]) || 0)
      }));
      return { dims, series };
    }
    
    case 'comparison': {
      // 对比分析: 第一列是指标名，第二列是措施，第三列是优化前，第四列是优化后
      const items = rows.map(row => ({
        id: uid(),
        name: String(row[0] || ''),
        action: String(row[1] || ''),
        before: parseFloat(row[2]) || 0,
        after: parseFloat(row[3]) || 0
      }));
      return { items };
    }
    
    case 'heatmap': {
      // 热力图: 第一列是行标签，后面是数值
      const cols = headers.slice(1);
      const heatmapRows = rows.map(row => ({
        label: String(row[0] || ''),
        values: row.slice(1).map(v => parseFloat(v) || 0)
      }));
      return { rows: heatmapRows, cols };
    }

    case 'chinamap': {
      // 中国地图: 第一列是地区名称，第二列是数值
      const items = rows.map(row => ({
        id: uid(),
        name: String(row[0] || ''),
        value: parseFloat(row[1]) || 0
      })).filter(item => item.name);
      return { items };
    }

    case 'sankey': {
      // 桑基图: 第一列是源节点，第二列是目标节点，第三列是值
      const nodesMap = new Map();
      const links = [];
      rows.forEach(row => {
        const source = String(row[0] || '');
        const target = String(row[1] || '');
        const value = parseFloat(row[2]) || 0;
        
        if (!nodesMap.has(source)) nodesMap.set(source, { id: source, name: source });
        if (!nodesMap.has(target)) nodesMap.set(target, { id: target, name: target });
        
        links.push({ source, target, value });
      });
      return { nodes: Array.from(nodesMap.values()), links };
    }
    
    case 'gantt': {
      // 甘特图: 第一列是任务名，第二列是开始日期，第三列是结束日期，第四列是进度
      const tasks = rows.map((row, idx) => ({
        id: uid(),
        name: String(row[0] || ''),
        start: String(row[1] || ''),
        end: String(row[2] || ''),
        progress: parseFloat(row[3]) || 0,
        color: P[idx % P.length]
      }));
      return { tasks };
    }
    
    default:
      return null;
  }
}

const BubbleTip = ({active,payload}) => {
  if(!active||!payload?.length) return null;
  const d = payload[0]?.payload;
  return d ? <div className="bg-white p-2 rounded shadow border border-zinc-100 text-xs"><div className="font-semibold">{d.label}</div><div className="text-zinc-400">X:{d.x} Y:{d.y} Z:{d.z}</div></div> : null;
};

// API 状态
let apiAvailable = false;
let currentReportId = localStorage.getItem('reportBuilderCurrentReport') || `report_${Date.now()}`;

// 设置 API 可用性（供组件调用）
const setApiAvailable = (value) => {
  apiAvailable = value;
};

// 检查 API 可用性
const checkApiAvailability = async () => {
  try {
    apiAvailable = await checkHealth();
    console.log('API 状态:', apiAvailable ? '可用' : '不可用');
    return apiAvailable;
  } catch (e) {
    apiAvailable = false;
    console.log('API 不可用，将使用 localStorage');
    return false;
  }
};

// 从 API 加载所有报告和文件夹
const loadAllReportsFromAPI = async () => {
  try {
    const response = await fetchReports();
    const reports = response.reports || [];
    const folders = response.folders || {};
    
    const reportsMap = {};
    reports.forEach(r => {
      reportsMap[r.id] = r;
    });
    console.log('从 API 加载了', Object.keys(reportsMap).length, '个报告和', Object.keys(folders).length, '个文件夹');
    return { folders, reports: reportsMap };
  } catch (error) {
    console.error('Failed to load reports from API:', error);
    return { folders: {}, reports: {} };
  }
};

// 从 localStorage 加载所有报告
const loadAllReportsFromStorage = () => {
  try {
    const savedData = localStorage.getItem('reportBuilderReports');
    if (savedData) {
      const parsed = JSON.parse(savedData);
      if (parsed && parsed.folders && parsed.reports) {
        return parsed;
      }
      const legacyData = parsed || {};
      return { folders: {}, reports: legacyData };
    }
  } catch (error) {
    console.error('Failed to load reports from localStorage:', error);
    localStorage.removeItem('reportBuilderReports');
  }
  return { folders: {}, reports: {} };
};

// 统一加载所有报告（优先 API，但保留本地文件夹）
const loadAllReports = async () => {
  // 先从localStorage加载本地数据（作为后备）
  const localData = loadAllReportsFromStorage();
  
  if (apiAvailable) {
    const apiData = await loadAllReportsFromAPI();
    
    // 合并报告数据：优先使用 API 数据，但保留本地的 folderId
    const mergedReports = { ...apiData.reports };
    Object.keys(mergedReports).forEach(reportId => {
      const localReport = localData.reports[reportId];
      if (localReport && localReport.folderId) {
        mergedReports[reportId].folderId = localReport.folderId;
      }
    });
    
    // 合并文件夹数据：优先使用本地的文件夹（因为 API 可能没有保存成功）
    // 只有当 API 返回的文件夹不为空时才使用 API 的数据
    const apiFolders = apiData.folders || {};
    const localFolders = localData.folders || {};
    const mergedFolders = Object.keys(apiFolders).length > 0 
      ? { ...localFolders, ...apiFolders }  // API 有数据，合并
      : localFolders;  // API 没有数据，使用本地数据
    
    console.log('合并后的数据:', Object.keys(mergedReports).length, '个报告', Object.keys(mergedFolders).length, '个文件夹');
    return { 
      folders: mergedFolders, 
      reports: mergedReports 
    };
  }
  return localData;
};

// 保存所有报告到 localStorage（作为备份）
const saveAllReportsToStorage = (data) => {
  try {
    localStorage.setItem('reportBuilderReports', JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save reports to localStorage:', error);
  }
};

// 保存文件夹到 API
const saveFolderToAPI = async (folder) => {
  if (!apiAvailable) return false;
  try {
    console.log('正在保存文件夹到 API:', folder.id, folder.name);
    const existing = await fetchFolders();
    if (existing[folder.id]) {
      console.log('更新现有文件夹:', folder.id);
      await updateFolder(folder.id, folder);
    } else {
      console.log('创建新文件夹:', folder.id);
      await createFolder(folder);
    }
    console.log('文件夹保存成功:', folder.id);
    return true;
  } catch (error) {
    console.error('Failed to save folder to API:', error);
    return false;
  }
};

// 删除文件夹从 API
const deleteFolderFromAPI = async (folderId) => {
  if (!apiAvailable) return false;
  try {
    await deleteFolder(folderId);
    return true;
  } catch (error) {
    console.error('Failed to delete folder from API:', error);
    return false;
  }
};



// 从 API 加载当前报告
const loadCurrentReportFromAPI = async () => {
  try {
    if (currentReportId) {
      try {
        const report = await fetchReport(currentReportId);
        if (report) {
          return report;
        }
      } catch (fetchError) {
        // 获取失败时，尝试从localStorage加载
        console.log('从API获取报告失败，尝试从localStorage加载:', currentReportId, fetchError.message);
        const data = loadAllReportsFromStorage();
        if (data.reports && data.reports[currentReportId]) {
          console.log('从localStorage找到报告:', currentReportId);
          return data.reports[currentReportId];
        }
        // localStorage也没有，继续尝试获取其他报告
        console.log('localStorage中也没有该报告，尝试获取其他报告');
      }
    }
    // 如果没有当前报告ID或报告不存在，获取第一个报告
    const reports = await fetchReports();
    if (reports.length > 0) {
      currentReportId = reports[0].id;
      localStorage.setItem('reportBuilderCurrentReport', currentReportId);
      return reports[0];
    }
  } catch (error) {
    console.error('Failed to load current report from API:', error);
  }
  return null;
};

// 从 localStorage 加载当前报告
const loadCurrentReportFromStorage = () => {
  try {
    const data = loadAllReportsFromStorage();
    const reports = data.reports || {};
    if (currentReportId && reports[currentReportId]) {
      return reports[currentReportId];
    }
    const reportKeys = Object.keys(reports);
    if (reportKeys.length > 0) {
      currentReportId = reportKeys[0];
      localStorage.setItem('reportBuilderCurrentReport', currentReportId);
      return reports[currentReportId];
    }
  } catch (error) {
    console.error('Failed to load current report from localStorage:', error);
  }
  return { title: '新报告', subtitle: '', modules: [] };
};

// 统一加载当前报告（优先 API）
const loadCurrentReport = async () => {
  if (apiAvailable) {
    const report = await loadCurrentReportFromAPI();
    if (report) return report;
  }
  return loadCurrentReportFromStorage();
};

// 保存当前报告到 API
const saveCurrentReportToAPI = async (report) => {
  try {
    // 从 localStorage 获取现有报告数据（包含 folderId）
    const data = loadAllReportsFromStorage();
    const existingReport = data.reports[currentReportId] || {};
    
    const cleanReport = {
      id: currentReportId,
      title: report.title,
      subtitle: report.subtitle,
      modules: (report.modules || []).filter(m => m && m.id),
      folderId: existingReport.folderId || null,
      created_by: 'user'
    };
    
    // 检查报告是否已存在
    try {
      const existing = await fetchReport(currentReportId);
      if (existing) {
        // 更新现有报告
        await updateReport(currentReportId, cleanReport);
        console.log('报告已更新到 API:', currentReportId, 'folderId:', cleanReport.folderId);
      }
    } catch (e) {
      // 报告不存在，创建新报告
      await createReport(cleanReport);
      console.log('报告已创建到 API:', currentReportId, 'folderId:', cleanReport.folderId);
    }
    return true;
  } catch (error) {
    console.error('Failed to save report to API:', error);
    return false;
  }
};

// 保存当前报告到 localStorage
const saveCurrentReportToStorage = (report) => {
  try {
    const data = loadAllReportsFromStorage();
    const existingReport = data.reports[currentReportId] || {};
    const cleanReport = {
      id: currentReportId,
      title: report.title,
      subtitle: report.subtitle,
      modules: (report.modules || []).filter(m => m && m.id),
      folderId: existingReport.folderId || null,
      createdAt: existingReport.createdAt || Date.now(),
      updatedAt: Date.now()
    };
    data.reports[currentReportId] = cleanReport;
    saveAllReportsToStorage(data);
    console.log('报告已保存到 localStorage:', currentReportId, 'folderId:', cleanReport.folderId);
  } catch (error) {
    console.error('Failed to save current report to localStorage:', error);
  }
};

export default function ReportBuilder() {
  const [title, setTitle] = useState('新报告');
  const [subtitle, setSubtitle] = useState('');
  const [modules, setModules] = useState([]);
  const [reportsData, setReportsData] = useState({ folders: {}, reports: {} });
  const [isLoading, setIsLoading] = useState(true);
  const [apiStatus, setApiStatus] = useState('checking'); // 'checking', 'online', 'offline'
  const [showReportList, setShowReportList] = useState(false);
  const [sel, setSel] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [folderDragOver, setFolderDragOver] = useState(null);
  const [editingFolderId, setEditingFolderId] = useState(null);
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [aiStyleInput, setAiStyleInput] = useState('');
  const [aiAnalysisInput, setAiAnalysisInput] = useState('');
  const [apiKey, setApiKeyState] = useState(() => localStorage.getItem('deepseek_api_key') || 'sk-1234');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [dragStartIndex, setDragStartIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [dragOverPosition, setDragOverPosition] = useState(null);
  const [showExcelFormatModal, setShowExcelFormatModal] = useState(false);
  const [excelFormatModalType, setExcelFormatModalType] = useState(null);
  const [excelFormatModalModuleId, setExcelFormatModalModuleId] = useState(null);
  const fileInputRef = useRef(null);
  
  // 批量选择相关状态
  const [selectedModules, setSelectedModules] = useState(new Set());
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [batchMoveTargetIndex, setBatchMoveTargetIndex] = useState(null);

  // 测试日志
  useEffect(() => {
    console.log('=== ReportBuilder 组件已加载 ===');
    console.log('apiStatus:', apiStatus);
  }, []);

  // 初始化 - 检查 API 并加载数据
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      
      try {
        // 检查 API 可用性
        const isApiAvailable = await checkApiAvailability();
        setApiStatus(isApiAvailable ? 'online' : 'offline');
        setApiAvailable(isApiAvailable); // 同步到模块级变量
        
        // 加载当前报告
        const report = await loadCurrentReport();
        if (report) {
          setTitle(report.title || '新报告');
          setSubtitle(report.subtitle || '');
          setModules((report.modules || []).filter(m => m && m.id));
        }
        
        // 加载所有报告列表
        const allReports = await loadAllReports();
        setReportsData(allReports);
      } catch (error) {
        console.error('初始化失败:', error);
        setApiStatus('offline');
        setApiAvailable(false); // 同步到模块级变量
        // 使用本地存储作为后备
        const report = loadCurrentReportFromStorage();
        if (report) {
          setTitle(report.title || '新报告');
          setSubtitle(report.subtitle || '');
          setModules((report.modules || []).filter(m => m && m.id));
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    init();
  }, []);

  const handleDragStartIndex = (index) => {
    setDragStartIndex(index);
  };

  const handleDragOverIndex = (index, position) => {
    if (dragStartIndex !== null) {
      setDragOverIndex(index);
      setDragOverPosition(position);
    }
  };

  const handleDragEndIndex = () => {
    if (dragStartIndex !== null && dragOverIndex !== null && dragOverPosition !== null) {
      let newIndex = dragOverIndex;
      if (dragOverPosition === 'after') {
        newIndex = dragOverIndex + 1;
      }

      // 调整索引，因为删除元素后索引会变化
      if (dragStartIndex < dragOverIndex) {
        newIndex = newIndex - 1;
      }

      // 确保新索引在有效范围内
      newIndex = Math.max(0, Math.min(newIndex, modules.length - 1));

      if (newIndex !== dragStartIndex) {
        const newModules = [...modules];
        const [removed] = newModules.splice(dragStartIndex, 1);
        newModules.splice(newIndex, 0, removed);
        updateAndSave(title, subtitle, newModules);
      }
    }
    setDragStartIndex(null);
    setDragOverIndex(null);
    setDragOverPosition(null);
  };

  // 统一保存文件夹（API + localStorage）- 使用组件内的 apiStatus
  const saveFolder = async (folder) => {
    const isApiAvailable = apiStatus === 'online';
    console.log('保存文件夹:', folder.id, folder.name, 'API可用:', isApiAvailable, 'apiStatus:', apiStatus);
    
    // 先保存到 localStorage
    const data = loadAllReportsFromStorage();
    data.folders[folder.id] = folder;
    saveAllReportsToStorage(data);
    
    // 再保存到 API
    if (isApiAvailable) {
      try {
        console.log('正在保存文件夹到 API:', folder.id);
        const existing = await fetchFolders();
        if (existing[folder.id]) {
          await updateFolder(folder.id, folder);
          console.log('文件夹已更新到 API:', folder.id);
        } else {
          await createFolder(folder);
          console.log('文件夹已创建到 API:', folder.id);
        }
      } catch (error) {
        console.error('保存文件夹到 API 失败:', error);
      }
    }
    
    return data;
  };

  // 统一删除文件夹（API + localStorage）
  const removeFolder = async (folderId) => {
    const isApiAvailable = apiStatus === 'online';
    
    // 先从 localStorage 删除
    const data = loadAllReportsFromStorage();
    delete data.folders[folderId];
    saveAllReportsToStorage(data);
    
    // 再从 API 删除
    if (isApiAvailable) {
      try {
        await deleteFolder(folderId);
        console.log('文件夹已从 API 删除:', folderId);
      } catch (error) {
        console.error('从 API 删除文件夹失败:', error);
      }
    }
    
    return data;
  };

  // 移动报告到文件夹
  const moveReportToFolder = async (reportId, folderId) => {
    const isApiAvailable = apiStatus === 'online';
    
    // 更新 localStorage
    const data = loadAllReportsFromStorage();
    if (data.reports[reportId]) {
      data.reports[reportId].folderId = folderId;
      saveAllReportsToStorage(data);
    }
    
    // 更新 API
    if (isApiAvailable) {
      try {
        const report = await fetchReport(reportId);
        if (report) {
          await updateReport(reportId, { ...report, folderId });
          console.log('报告已移动到文件夹:', reportId, '->', folderId);
        }
      } catch (error) {
        console.error('移动报告到文件夹失败:', error);
      }
    }
    
    return data;
  };

  const handleFileUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result;
        if (typeof content !== 'string') {
          throw new Error('无法读取文件内容');
        }
        
        const fileName = file.name.toLowerCase();
        let parsed;
        
        if (fileName.endsWith('.csv')) {
          parsed = parseCSV(content);
          if (!parsed) {
            throw new Error('CSV 文件格式不正确');
          }
          updateAndSave(parsed.title, parsed.subtitle, parsed.modules);
          flash('✓ CSV 导入成功');
        } else {
          parsed = parseMarkdown(content);
          updateAndSave(parsed.title, parsed.subtitle, parsed.modules);
          flash('✓ Markdown 导入成功');
        }
      } catch (error) {
        console.error('解析失败:', error);
        flash('✗ 解析失败，请检查格式');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAIParse = async () => {
    if (!apiKey.trim()) {
      flash('请先配置 API Key');
      setShowApiKeyInput(true);
      return;
    }
    
    if (!aiInput.trim()) {
      flash('请输入要分析的数据');
      return;
    }
    
    setAiLoading(true);
    flash('AI 正在解析数据...');
    
    try {
      const maxRetries = 2;
      let lastError = null;
      
      for (let retry = 0; retry <= maxRetries; retry++) {
        try {
          const result = await callDeepSeekAPI(aiInput.trim());
          
          if (Array.isArray(result) && result.length > 0) {
            console.log('AI 返回的组件:', result.map(i => i.type));
            const validTypes = ['heading1', 'heading2', 'heading3', 'text', 'kpi', 'table', 'chart', 'line', 'radar', 'bubble', 'funnel', 'comparison', 'quadrant', 'list', 'pie', 'ordered', 'unordered', 'barline', 'progress', 'scatter', 'waterfall', 'heatmap', 'sankey', 'gantt', 'wordcloud'];
            const cleanValue = (val) => {
                if (typeof val === 'function') return undefined;
                if (val === null || val === undefined) return val;
                if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') return val;
                if (Array.isArray(val)) return val.map(cleanValue).filter(v => v !== undefined);
                if (typeof val === 'object') {
                  const cleaned = {};
                  for (const [k, v] of Object.entries(val)) {
                    if (typeof v !== 'function') {
                      cleaned[k] = cleanValue(v);
                    }
                  }
                  return cleaned;
                }
                return String(val);
              };
              
              const seenIds = new Set();
              const newModules = result
                .filter(item => item && item.type && validTypes.includes(item.type))
                .map(item => ({
                  id: item.id || uid(),
                  type: item.type,
                  title: typeof item.title === 'string' ? item.title : 'AI生成',
                  subtitle: typeof item.subtitle === 'string' ? item.subtitle : '',
                  data: cleanValue(item.data) || {},
                  config: cleanValue(item.config) || {}
                }))
                .filter(item => {
                  if (seenIds.has(item.id)) {
                    console.warn('Duplicate ID found, generating new one:', item.id);
                    item.id = uid();
                  }
                  seenIds.add(item.id);
                  return true;
                });
            console.log('过滤后的组件:', newModules.map(i => i.type));
            
            if (newModules.length === 0) {
              if (retry < maxRetries) {
                flash(`⚠ 组件格式不完整，正在重试 (${retry + 1}/${maxRetries + 1})...`);
                continue;
              }
              throw new Error('AI 返回的组件数据格式不正确');
            }
            
            const updatedModules = [...modules, ...newModules];
            updateAndSave(title, subtitle, updatedModules);
            
            // AI 生成完成后自动保存到 API
            const isApiAvailable = apiStatus === 'online';
            if (isApiAvailable) {
              try {
                await saveCurrentReportToAPI({ title, subtitle, modules: updatedModules });
                const allReports = await loadAllReports();
                setReportsData(allReports);
                console.log('AI 生成后自动保存到 API 成功');
              } catch (error) {
                console.error('AI 生成后自动保存到 API 失败:', error);
                // 不阻塞流程，继续执行
              }
            }
            
            flash(`✓ AI 解析成功，添加了 ${newModules.length} 个组件`);
            setAiInput('');
            setShowAiPanel(false);
            return;
          } else {
            if (retry < maxRetries) {
              flash(`⚠ 解析结果为空，正在重试 (${retry + 1}/${maxRetries + 1})...`);
              continue;
            }
            throw new Error('AI 返回数据格式不正确');
          }
        } catch (error) {
          lastError = error;
          if (retry < maxRetries) {
            flash(`⚠ ${error.message}，正在重试 (${retry + 1}/${maxRetries + 1})...`);
          }
        }
      }
      
      throw lastError || new Error('AI 解析失败');
    } catch (error) {
      console.error('AI 解析失败:', error);
      flash('✗ AI 解析失败: ' + error.message);
    } finally {
      setAiLoading(false);
    }
  };

  const handleSaveApiKey = () => {
    if (apiKey.trim()) {
      localStorage.setItem('deepseek_api_key', apiKey);
      setShowApiKeyInput(false);
      flash('✓ API Key 已保存');
    }
  };

  // 更新状态并保存到 localStorage（不调用 API，提升体验）
  const updateAndSave = (newTitle = title, newSubtitle = subtitle, newModules = modules) => {
    setTitle(newTitle);
    setSubtitle(newSubtitle);
    setModules(newModules);
    // 只保存到 localStorage，不调用 API
    saveCurrentReportToStorage({ title: newTitle, subtitle: newSubtitle, modules: newModules });
  };

  // 手动保存到 API（点击保存按钮时调用）
  const saveToAPI = async () => {
    const isApiAvailable = apiStatus === 'online';
    if (isApiAvailable) {
      await saveCurrentReportToAPI({ title, subtitle, modules });
      const allReports = await loadAllReports();
      setReportsData(allReports);
    }
  };

  // 滚动到指定模块
  const scrollToModule = (moduleId) => {
    const element = document.querySelector(`[data-module-id="${moduleId}"]`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const up = (id, fn) => {
    setModules(p => {
      const newModules = p.map(m => {
        if (m.id === id) {
          // 创建深拷贝，确保嵌套数据变化能触发重新渲染
          const cloned = JSON.parse(JSON.stringify(m));
          const updated = fn(cloned);
          return updated;
        }
        return m;
      });
      const filtered = newModules.filter(m => m && m.id);
      saveCurrentReportToStorage({ title, subtitle, modules: filtered });
      return filtered;
    });
  };
  const rm = id => {
    setModules(p => {
      const newModules = p.filter(m => m && m.id !== id);
      saveCurrentReportToStorage({ title, subtitle, modules: newModules });
      return newModules;
    });
    if (sel === id) setSel(null);
  };
  const mv = (id, d) => {
    setModules(p => {
      const cleanP = p.filter(m => m && m.id);
      const i = cleanP.findIndex(m => m.id === id);
      if (i === -1 || (d===-1&&i===0)||(d===1&&i===cleanP.length-1)) return cleanP;
      const n=[...cleanP];
      [n[i],n[i+d]]=[n[i+d],n[i]];
      saveCurrentReportToStorage({ title, subtitle, modules: n });
      return n;
    });
  };
  const add = (type) => {
    const m = cMod(type);
    const newId = m.id;
    setModules(p => {
      const newModules = [...p, m];
      saveCurrentReportToStorage({ title, subtitle, modules: newModules });
      return newModules;
    });
    setAddOpen(false);
    setTimeout(() => setSel(newId), 0);
  };

  const toggleLayout = (id) => {
    setModules(p => {
      const newModules = p.map(m => {
        if (m.id === id) {
          const newLayout = m.layout === 'full' ? 'left' : m.layout === 'left' ? 'right' : 'full';
          return { ...m, layout: newLayout };
        }
        return m;
      });
      saveCurrentReportToStorage({ title, subtitle, modules: newModules });
      return newModules;
    });
  };

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  // 批量选择相关函数
  const toggleBatchMode = () => {
    setIsBatchMode(!isBatchMode);
    if (isBatchMode) {
      setSelectedModules(new Set());
    }
    flash(isBatchMode ? '已退出批量模式' : '已进入批量模式，点击组件进行选择');
  };

  const toggleModuleSelection = (moduleId) => {
    setSelectedModules(prev => {
      const newSet = new Set(prev);
      if (newSet.has(moduleId)) {
        newSet.delete(moduleId);
      } else {
        newSet.add(moduleId);
      }
      return newSet;
    });
  };

  const selectAllModules = () => {
    setSelectedModules(new Set(modules.map(m => m.id)));
    flash(`已选择全部 ${modules.length} 个组件`);
  };

  const clearSelection = () => {
    setSelectedModules(new Set());
    flash('已清空选择');
  };

  const deleteSelectedModules = () => {
    if (selectedModules.size === 0) {
      flash('请先选择要删除的组件');
      return;
    }
    setModules(prev => {
      const newModules = prev.filter(m => !selectedModules.has(m.id));
      saveCurrentReportToStorage({ title, subtitle, modules: newModules });
      return newModules;
    });
    setSelectedModules(new Set());
    flash(`已删除 ${selectedModules.size} 个组件`);
  };

  const moveSelectedModulesTo = (targetIndex) => {
    if (selectedModules.size === 0) {
      flash('请先选择要移动的组件');
      return;
    }
    
    setModules(prev => {
      // 获取选中的组件（保持原有顺序）
      const selectedItems = prev.filter(m => selectedModules.has(m.id));
      // 获取未选中的组件
      const unselectedItems = prev.filter(m => !selectedModules.has(m.id));
      
      // 在目标位置插入选中的组件
      const newModules = [
        ...unselectedItems.slice(0, targetIndex),
        ...selectedItems,
        ...unselectedItems.slice(targetIndex)
      ];
      
      saveCurrentReportToStorage({ title, subtitle, modules: newModules });
      return newModules;
    });
    
    setSelectedModules(new Set());
    setBatchMoveTargetIndex(null);
    flash(`已移动 ${selectedModules.size} 个组件到指定位置`);
  };

  // 创建干净的克隆元素用于截图
  const createCleanClone = (originalElement) => {
    // 深克隆元素
    const clone = originalElement.cloneNode(true);
    
    // 移除编辑面板和操作按钮
    const editPanels = clone.querySelectorAll('[data-edit-panel]');
    const actionButtons = clone.querySelectorAll('[data-action-buttons]');
    editPanels.forEach(el => el.remove());
    actionButtons.forEach(el => el.remove());
    
    // 处理所有元素的颜色
    const allElements = clone.querySelectorAll('*');
    const unsupportedColorFuncs = ['oklch', 'oklab', 'color-mix'];
    const colorProps = ['color', 'backgroundColor', 'borderColor', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor', 'fill', 'stroke', 'stopColor'];
    
    allElements.forEach(el => {
      // 处理计算样式中的颜色
      colorProps.forEach(prop => {
        const value = el.style[prop];
        if (value && unsupportedColorFuncs.some(func => value.toLowerCase().includes(func))) {
          if (prop === 'color') {
            el.style[prop] = '#27272a';
          } else if (prop === 'backgroundColor' || prop === 'fill' || prop === 'stopColor') {
            el.style[prop] = 'transparent';
          } else if (prop.includes('border') || prop === 'stroke') {
            el.style[prop] = '#e4e4e7';
          }
        }
      });
      
      // 处理 SVG 属性
      ['fill', 'stroke', 'stop-color'].forEach(attr => {
        const attrValue = el.getAttribute(attr);
        if (attrValue && unsupportedColorFuncs.some(func => attrValue.toLowerCase().includes(func))) {
          el.setAttribute(attr, attr === 'fill' || attr === 'stop-color' ? 'transparent' : '#e4e4e7');
        }
      });
      
      // 处理内联样式
      const inlineStyle = el.getAttribute('style');
      if (inlineStyle && unsupportedColorFuncs.some(func => inlineStyle.toLowerCase().includes(func))) {
        let newStyle = inlineStyle;
        unsupportedColorFuncs.forEach(func => {
          const regex = new RegExp(`${func}\\([^)]+\\)`, 'gi');
          newStyle = newStyle.replace(regex, 'transparent');
        });
        el.setAttribute('style', newStyle);
      }
    });
    
    return clone;
  };

  // 截图导出功能 - 用于 PDF 和 HTML 导出
  const captureReportScreenshot = async () => {
    flash('正在生成报告截图...');
    
    // 获取报告主体区域
    const reportElement = document.querySelector('.modules-container');
    if (!reportElement) {
      throw new Error('找不到报告内容区域');
    }
    
    // 创建干净的克隆元素
    const cleanClone = createCleanClone(reportElement);
    
    // 将克隆元素添加到文档中但隐藏起来
    cleanClone.style.position = 'fixed';
    cleanClone.style.left = '-9999px';
    cleanClone.style.top = '0';
    cleanClone.style.width = reportElement.scrollWidth + 'px';
    cleanClone.style.backgroundColor = '#ffffff';
    document.body.appendChild(cleanClone);
    
    try {
      // 使用 html2canvas 截图克隆元素
      const canvas = await html2canvas(cleanClone, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        width: cleanClone.scrollWidth,
        height: cleanClone.scrollHeight
      });
      
      return canvas;
    } finally {
      // 移除克隆元素
      document.body.removeChild(cleanClone);
    }
  };

  // 生成独立可查看的 HTML 文件
  const generateStandaloneHTML = () => {
    const esc = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    // 颜色映射 - 使用标准 hex 颜色，避免 oklch
    const colors = {
      primary: '#1d4ed8',
      success: '#047857',
      warning: '#b45309',
      danger: '#b91c1c',
      purple: '#6d28d9',
      cyan: '#0e7490',
      orange: '#c2410c',
      pink: '#be185d'
    };
    const palette = Object.values(colors);
    
    const renderModule = (m, index) => {
      let content = '';
      const modTitle = m.title ? `<h2 style="font-size:17px;font-weight:600;color:#18181b;margin:0 0 8px;">${esc(m.title)}</h2>` : '';
      const modSubtitle = m.subtitle ? `<p style="font-size:13px;color:#71717a;margin:0 0 16px;">${esc(m.subtitle)}</p>` : '';
      
      switch (m.type) {
        case 'heading1':
          content = `<h1 style="font-size:22px;font-weight:700;color:#18181b;margin:24px 0 16px;">${esc(m.data?.content || '')}</h1>`;
          break;
        case 'heading2':
          content = `<h2 style="font-size:18px;font-weight:600;color:#27272a;margin:20px 0 12px;">${esc(m.data?.content || '')}</h2>`;
          break;
        case 'heading3':
          content = `<h3 style="font-size:15px;font-weight:600;color:#3f3f46;margin:16px 0 8px;">${esc(m.data?.content || '')}</h3>`;
          break;
        case 'text':
          content = `<p style="font-size:15px;line-height:1.8;color:#3f3f46;margin:12px 0;">${esc(m.data?.content || '')}</p>`;
          break;
        case 'note':
          content = `<p style="font-size:13px;line-height:1.6;color:#71717a;font-style:italic;margin:12px 0;padding:12px 16px;background:#f4f4f5;border-radius:6px;">${esc(m.data?.content || '')}</p>`;
          break;
        case 'kpi':
          const cols = m.config?.cols || 3;
          content = `<div style="display:grid;grid-template-columns:repeat(${Math.min(cols, 4)}, 1fr);gap:20px;margin:16px 0;">`;
          (m.data?.items || []).forEach(it => {
            const color = (it.change || 0) >= 0 ? colors.success : colors.danger;
            const arrow = (it.change || 0) >= 0 ? '↑' : '↓';
            content += `<div style="padding:20px 0;border-top:3px solid #e4e4e7;">
              <div style="font-size:11px;color:#71717a;text-transform:uppercase;margin-bottom:8px;">${esc(it.label)}</div>
              <div style="font-size:28px;font-weight:700;color:#18181b;margin-bottom:6px;">${esc(it.value)}</div>
              <div style="font-size:13px;color:${color};">${arrow} ${Math.abs(it.change || 0)}%</div>
            </div>`;
          });
          content += '</div>';
          break;
        case 'table':
          content = `<table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">
            <thead><tr style="border-bottom:2px solid #d4d4d8;">`;
          (m.data?.headers || []).forEach(h => {
            content += `<th style="padding:12px 16px;text-align:left;font-weight:600;color:#52525b;font-size:12px;text-transform:uppercase;">${esc(h)}</th>`;
          });
          content += '</tr></thead><tbody>';
          (m.data?.rows || []).forEach((r, idx) => {
            content += `<tr style="border-bottom:1px solid #e4e4e7;">`;
            (r.cells || []).forEach((c, ci) => {
              const isFirst = ci === 0;
              content += `<td style="padding:12px 16px;color:${isFirst ? '#18181b' : '#71717a'};font-weight:${isFirst ? '500' : 'normal'};">${esc(c || '')}</td>`;
            });
            content += '</tr>';
          });
          content += '</tbody></table>';
          break;
        case 'chart':
        case 'hbar':
          const items = m.data?.items || [];
          const series = m.data?.series || [];
          if (items.length > 0 && series.length > 0) {
            const maxVal = Math.max(...items.flatMap(it => it.values || []), 1);
            content = `<div style="margin:16px 0;">`;
            // 图例
            content += `<div style="display:flex;gap:16px;margin-bottom:16px;flex-wrap:wrap;">`;
            series.forEach((s, i) => {
              const color = s.color || palette[i % palette.length];
              content += `<span style="font-size:12px;color:#52525b;display:flex;align-items:center;gap:6px;">
                <span style="width:12px;height:12px;background:${color};border-radius:2px;"></span>${esc(s.name)}
              </span>`;
            });
            content += '</div>';
            // 柱状图
            items.forEach(it => {
              content += `<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
                <span style="width:80px;font-size:13px;color:#71717a;text-align:right;flex-shrink:0;">${esc(it.label)}</span>
                <div style="flex:1;display:flex;gap:4px;height:28px;">`;
              (it.values || []).forEach((v, vi) => {
                const color = series[vi]?.color || palette[vi % palette.length];
                const width = Math.max((v / maxVal) * 100, 3);
                content += `<div style="width:${width}%;background:${color};border-radius:3px;" title="${v}"></div>`;
              });
              content += '</div></div>';
            });
            content += '</div>';
          }
          break;
        case 'line':
          const points = m.data?.points || [];
          const lineSeries = m.data?.series || [];
          if (points.length > 0) {
            content = `<table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:13px;">
              <thead><tr style="border-bottom:2px solid #d4d4d8;"><th style="padding:10px 12px;text-align:left;">日期</th>`;
            lineSeries.forEach(s => {
              content += `<th style="padding:10px 12px;text-align:left;">${esc(s.name)}</th>`;
            });
            content += '</tr></thead><tbody>';
            points.forEach(pt => {
              content += `<tr style="border-bottom:1px solid #e4e4e7;"><td style="padding:10px 12px;">${esc(pt.x)}</td>`;
              (pt.values || []).forEach(v => {
                content += `<td style="padding:10px 12px;">${v}</td>`;
              });
              content += '</tr>';
            });
            content += '</tbody></table>';
          }
          break;
        case 'pie':
          const pieItems = m.data?.items || [];
          if (pieItems.length > 0) {
            const total = pieItems.reduce((sum, it) => sum + (it.value || 0), 0);
            content = `<div style="display:flex;gap:24px;align-items:center;margin:16px 0;flex-wrap:wrap;">`;
            // 饼图
            let gradientParts = [];
            let currentAngle = 0;
            pieItems.forEach((it, idx) => {
              const color = it.color || palette[idx % palette.length];
              const angle = total > 0 ? (it.value / total) * 360 : 0;
              gradientParts.push(`${color} ${currentAngle}deg ${currentAngle + angle}deg`);
              currentAngle += angle;
            });
            content += `<div style="width:180px;height:180px;border-radius:50%;background:conic-gradient(${gradientParts.join(', ')});flex-shrink:0;"></div>`;
            // 图例
            content += `<div style="flex:1;min-width:200px;">`;
            pieItems.forEach((it, idx) => {
              const color = it.color || palette[idx % palette.length];
              const pct = total > 0 ? ((it.value / total) * 100).toFixed(1) : 0;
              content += `<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
                <span style="width:14px;height:14px;border-radius:3px;background:${color};flex-shrink:0;"></span>
                <span style="font-size:14px;color:#3f3f46;flex:1;">${esc(it.label)}</span>
                <span style="font-size:14px;font-weight:600;color:#18181b;">${pct}%</span>
              </div>`;
            });
            content += '</div></div>';
          }
          break;
        case 'list':
          content = `<div style="margin:16px 0;">`;
          (m.data?.items || []).forEach(it => {
            content += `<div style="display:flex;align-items:baseline;gap:12px;margin-bottom:12px;font-size:15px;line-height:1.7;color:#3f3f46;">
              <span style="width:6px;height:6px;border-radius:50%;background:#18181b;flex-shrink:0;margin-top:8px;"></span>
              <span>${it.bold ? `<strong style="color:#18181b;">${esc(it.bold)}</strong> ` : ''}${esc(it.text)}</span>
            </div>`;
          });
          content += '</div>';
          break;
        case 'ordered':
          content = `<ol style="padding-left:24px;margin:16px 0;">`;
          (m.data?.items || []).forEach(it => {
            content += `<li style="font-size:15px;line-height:1.8;color:#3f3f46;margin-bottom:12px;padding-left:8px;">${esc(it.text)}</li>`;
          });
          content += '</ol>';
          break;
        case 'unordered':
          content = `<ul style="padding-left:24px;margin:16px 0;list-style-type:disc;">`;
          (m.data?.items || []).forEach(it => {
            content += `<li style="font-size:15px;line-height:1.8;color:#3f3f46;margin-bottom:12px;padding-left:4px;">${esc(it.text)}</li>`;
          });
          content += '</ul>';
          break;
        case 'progress':
          content = `<div style="margin:16px 0;">`;
          (m.data?.items || []).forEach(it => {
            const pct = it.total > 0 ? (it.current / it.total * 100) : 0;
            const barColor = pct >= 80 ? colors.success : pct >= 50 ? colors.warning : colors.danger;
            content += `<div style="margin-bottom:20px;">
              <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                <span style="font-size:14px;color:#3f3f46;">${esc(it.label)}</span>
                <span style="font-size:14px;color:#71717a;">${it.current?.toLocaleString()}${esc(it.unit || '')} / ${it.total?.toLocaleString()}${esc(it.unit || '')}</span>
              </div>
              <div style="height:10px;background:#e4e4e7;border-radius:5px;overflow:hidden;">
                <div style="height:100%;width:${pct}%;background:${barColor};border-radius:5px;"></div>
              </div>
              <div style="text-align:right;font-size:12px;color:${barColor};font-weight:600;margin-top:6px;">${pct.toFixed(1)}%</div>
            </div>`;
          });
          content += '</div>';
          break;
        case 'funnel':
          const funnelItems = m.data?.items || [];
          if (funnelItems.length > 0) {
            const maxFunnel = Math.max(...funnelItems.flatMap(it => [it.cur || 0, it.prev || 0]), 1);
            content = `<div style="margin:16px 0;">
              <div style="text-align:right;margin-bottom:16px;font-size:12px;color:#71717a;">
                <span style="display:inline-flex;align-items:center;gap:6px;margin-right:16px;">
                  <span style="width:12px;height:8px;background:${colors.primary};border-radius:2px;"></span>本月
                </span>
                <span style="display:inline-flex;align-items:center;gap:6px;">
                  <span style="width:12px;height:8px;background:#d4d4d8;border-radius:2px;"></span>上月
                </span>
              </div>`;
            funnelItems.forEach((it, idx) => {
              if (idx > 0) {
                const loss = ((funnelItems[idx - 1].cur - it.cur) / funnelItems[idx - 1].cur * 100).toFixed(1);
                content += `<div style="text-align:center;font-size:11px;color:#a1a1aa;margin:8px 0;">▼ 流失 ${loss}%</div>`;
              }
              const curWidth = Math.max((it.cur / maxFunnel) * 100, 15);
              const prevWidth = Math.max((it.prev / maxFunnel) * 100, 15);
              content += `<div style="display:flex;align-items:center;gap:12px;margin-bottom:6px;">
                <span style="width:80px;text-align:right;font-size:13px;color:#71717a;flex-shrink:0;">${esc(it.stage)}</span>
                <div style="flex:1;">
                  <div style="width:${curWidth}%;height:28px;background:${colors.primary};border-radius:3px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:600;margin-bottom:4px;">${it.cur?.toLocaleString()}</div>
                  <div style="width:${prevWidth}%;height:20px;background:#d4d4d8;border-radius:3px;display:flex;align-items:center;justify-content:center;color:#52525b;font-size:11px;">${it.prev?.toLocaleString()}</div>
                </div>
              </div>`;
            });
            content += '</div>';
          }
          break;
        case 'image':
          if (m.data?.src) {
            content = `<div style="text-align:center;margin:16px 0;">
              <img src="${m.data.src}" alt="${esc(m.data.alt || '')}" style="max-width:100%;height:auto;max-height:400px;border-radius:8px;" />
              ${m.data.caption ? `<p style="font-size:13px;color:#71717a;margin-top:12px;">${esc(m.data.caption)}</p>` : ''}
            </div>`;
          }
          break;
        default:
          content = `<p style="font-size:13px;color:#a1a1aa;margin:16px 0;">[${m.type} 组件]</p>`;
      }
      
      return `<section style="margin-bottom:40px;page-break-inside:avoid;">${modTitle}${modSubtitle}${content}</section>`;
    };
    
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
      color: #27272a;
      background: #fafafa;
      line-height: 1.6;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      background: #fff;
      min-height: 100vh;
    }
    header {
      padding: 40px 48px 32px;
      border-bottom: 1px solid #e4e4e7;
      background: #fff;
    }
    header h1 {
      font-size: 26px;
      font-weight: 700;
      color: #18181b;
      letter-spacing: -0.3px;
    }
    header .subtitle {
      font-size: 15px;
      color: #71717a;
      margin-top: 8px;
    }
    header .date {
      font-size: 12px;
      color: #a1a1aa;
      margin-top: 12px;
    }
    main {
      padding: 32px 48px 48px;
    }
    footer {
      padding: 24px 48px;
      border-top: 1px solid #e4e4e7;
      text-align: center;
      font-size: 12px;
      color: #a1a1aa;
      background: #fafafa;
    }
    @media print {
      body { background: #fff; }
      .container { box-shadow: none; }
      header, main, footer { padding-left: 24px; padding-right: 24px; }
      section { page-break-inside: avoid; }
    }
    @media (max-width: 640px) {
      header, main, footer { padding-left: 20px; padding-right: 20px; }
      header { padding-top: 24px; padding-bottom: 20px; }
      header h1 { font-size: 22px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>${esc(title)}</h1>
      ${subtitle ? `<p class="subtitle">${esc(subtitle)}</p>` : ''}
      <p class="date">${new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
    </header>
    <main>
      ${modules.map((m, i) => renderModule(m, i)).join('')}
    </main>
    <footer>
      Generated by 报告编辑器 · ${new Date().toLocaleString('zh-CN')}
    </footer>
  </div>
</body>
</html>`;
  };

  // HTML 导出 - 生成独立可查看的 HTML
  const dlHTML = () => {
    try {
      flash('正在生成 HTML...');
      const html = generateStandaloneHTML();
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title || 'report'}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      flash('✓ 已下载 HTML（可离线查看）');
    } catch (error) {
      console.error('HTML导出失败:', error);
      flash('✗ HTML导出失败: ' + error.message);
    }
  };

  // PDF 导出 - 使用浏览器打印
  const dlPDF = () => {
    try {
      flash('正在准备打印...');
      const html = generateStandaloneHTML();
      const w = window.open('', '_blank');
      if (w) {
        w.document.write(html);
        w.document.close();
        setTimeout(() => {
          w.print();
        }, 500);
        flash('打印窗口已打开 → 选择"另存为 PDF"');
      } else {
        dlHTML();
        flash('弹窗被拦截，已下载 HTML（请用浏览器打印为PDF）');
      }
    } catch (error) {
      console.error('PDF导出失败:', error);
      flash('✗ PDF导出失败: ' + error.message);
    }
  };

  // 保存报告为 JSON 文件（用于分享）
  const saveReportAsJSON = () => {
    try {
      const reportData = {
        version: '1.0',
        createdAt: new Date().toISOString(),
        title,
        subtitle,
        modules: modules.map(m => ({
          id: m.id,
          type: m.type,
          title: m.title,
          subtitle: m.subtitle,
          config: m.config,
          data: m.data
        }))
      };
      
      const json = JSON.stringify(reportData, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title || 'report'}_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      flash('✓ 报告已保存为 JSON 文件');
    } catch (error) {
      console.error('保存报告失败:', error);
      flash('✗ 保存失败: ' + error.message);
    }
  };

  // 从 JSON 加载报告
  const loadReportFromJSON = (jsonData) => {
    try {
      if (jsonData.title !== undefined) setTitle(jsonData.title);
      if (jsonData.subtitle !== undefined) setSubtitle(jsonData.subtitle);
      if (jsonData.modules && Array.isArray(jsonData.modules)) {
        setModules(jsonData.modules);
      }
      flash('✓ 报告已加载');
    } catch (error) {
      console.error('加载报告失败:', error);
      flash('✗ 加载失败: ' + error.message);
    }
  };

  const selMod = sel ? modules.find(m => m.id === sel) : null;
  
  // 自定义 Tooltip 格式化
  const chartTipFormatter = (value, name, props) => {
    if (value === null || value === undefined) return ['', name];
    const num = typeof value === 'number' ? value : parseFloat(value);
    if (isNaN(num)) return [String(value), name];
    
    // 保留2位小数
    return [num.toFixed(2), name];
  };
  
  const chartTip = { 
    contentStyle: { borderRadius: '4px', border: '1px solid #e4e4e7', fontSize: 12 },
    formatter: chartTipFormatter
  };

  // 智能格式化数据标签 - 使用千分位显示
  const formatLabel = (value, isPercentage = false) => {
    if (value === null || value === undefined) return '';
    const num = typeof value === 'number' ? value : parseFloat(value);
    if (isNaN(num)) return String(value);
    
    // 如果是百分比格式（值很小，可能是0-1之间）
    if (isPercentage || Math.abs(num) < 1 && Math.abs(num) > 0) {
      // 转换为百分比并保留2位小数
      const pct = num < 1 ? num * 100 : num;
      return `${pct.toFixed(2)}%`;
    }
    
    // 使用千分位格式化，保留2位小数
    return num.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // ─── VIEW RENDERERS ───
  const vHeading1 = (m, onUpdate, setParentIsEditing) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(m.data?.content || '');
    const inputRef = useRef(null);
    
    useEffect(() => {
      setEditValue(m.data?.content || '');
    }, [m.data?.content]);
    
    useEffect(() => {
      if (isEditing && inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
      // 通知父组件编辑状态变化
      if (setParentIsEditing) {
        setParentIsEditing(isEditing);
      }
    }, [isEditing, setParentIsEditing]);
    
    const handleSave = () => {
      if (onUpdate && editValue !== m.data?.content) {
        onUpdate(editValue);
      }
      setIsEditing(false);
    };
    
    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        handleSave();
      } else if (e.key === 'Escape') {
        setEditValue(m.data?.content || '');
        setIsEditing(false);
      }
    };
    
    if (isEditing) {
      return (
        <input
          ref={inputRef}
          className="w-full text-2xl font-bold text-zinc-900 border-b-2 border-blue-400 pb-3 mb-4 bg-transparent focus:outline-none"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          placeholder="输入一级标题..."
        />
      );
    }
    
    return (
      <h1 
        className="text-2xl font-bold text-zinc-900 border-b-2 border-zinc-200 pb-3 mb-4 hover:bg-zinc-50 cursor-text transition-colors px-2 -mx-2 rounded"
        onClick={(e) => {
          e.stopPropagation();
          setIsEditing(true);
        }}
        title="点击编辑"
      >
        {typeof m.data?.content === 'string' ? m.data.content : '点击输入一级标题...'}
      </h1>
    );
  };
  
  const vHeading2 = (m, onUpdate, setParentIsEditing) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(m.data?.content || '');
    const inputRef = useRef(null);
    
    useEffect(() => {
      setEditValue(m.data?.content || '');
    }, [m.data?.content]);
    
    useEffect(() => {
      if (isEditing && inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
      // 通知父组件编辑状态变化
      if (setParentIsEditing) {
        setParentIsEditing(isEditing);
      }
    }, [isEditing, setParentIsEditing]);
    
    const handleSave = () => {
      if (onUpdate && editValue !== m.data?.content) {
        onUpdate(editValue);
      }
      setIsEditing(false);
    };
    
    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        handleSave();
      } else if (e.key === 'Escape') {
        setEditValue(m.data?.content || '');
        setIsEditing(false);
      }
    };
    
    if (isEditing) {
      return (
        <input
          ref={inputRef}
          className="w-full text-lg font-semibold text-zinc-800 mb-3 bg-transparent focus:outline-none border-b border-blue-400"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          placeholder="输入二级标题..."
        />
      );
    }
    
    return (
      <h2 
        className="text-lg font-semibold text-zinc-800 mb-3 hover:bg-zinc-50 cursor-text transition-colors px-2 -mx-2 rounded"
        onClick={(e) => {
          e.stopPropagation();
          setIsEditing(true);
        }}
        title="点击编辑"
      >
        {typeof m.data?.content === 'string' ? m.data.content : '点击输入二级标题...'}
      </h2>
    );
  };
  
  const vHeading3 = (m, onUpdate, setParentIsEditing) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(m.data?.content || '');
    const inputRef = useRef(null);
    
    useEffect(() => {
      setEditValue(m.data?.content || '');
    }, [m.data?.content]);
    
    useEffect(() => {
      if (isEditing && inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
      // 通知父组件编辑状态变化
      if (setParentIsEditing) {
        setParentIsEditing(isEditing);
      }
    }, [isEditing, setParentIsEditing]);
    
    const handleSave = () => {
      if (onUpdate && editValue !== m.data?.content) {
        onUpdate(editValue);
      }
      setIsEditing(false);
    };
    
    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        handleSave();
      } else if (e.key === 'Escape') {
        setEditValue(m.data?.content || '');
        setIsEditing(false);
      }
    };
    
    if (isEditing) {
      return (
        <input
          ref={inputRef}
          className="w-full text-base font-medium text-zinc-700 mb-2 bg-transparent focus:outline-none border-b border-blue-400"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          placeholder="输入三级标题..."
        />
      );
    }
    
    return (
      <h3 
        className="text-base font-medium text-zinc-700 mb-2 hover:bg-zinc-50 cursor-text transition-colors px-2 -mx-2 rounded"
        onClick={(e) => {
          e.stopPropagation();
          setIsEditing(true);
        }}
        title="点击编辑"
      >
        {typeof m.data?.content === 'string' ? m.data.content : '点击输入三级标题...'}
      </h3>
    );
  };
  const vText = (m, onUpdate, setParentIsEditing) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(m.data?.content || '');
    const textareaRef = useRef(null);
    
    useEffect(() => {
      setEditValue(m.data?.content || '');
    }, [m.data?.content]);
    
    useEffect(() => {
      if (isEditing && textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.select();
      }
      // 通知父组件编辑状态变化
      if (setParentIsEditing) {
        setParentIsEditing(isEditing);
      }
    }, [isEditing, setParentIsEditing]);
    
    const handleSave = () => {
      if (onUpdate && editValue !== m.data?.content) {
        onUpdate(editValue);
      }
      setIsEditing(false);
    };
    
    const handleKeyDown = (e) => {
      if (e.key === 'Enter' && e.metaKey) {
        handleSave();
      } else if (e.key === 'Escape') {
        setEditValue(m.data?.content || '');
        setIsEditing(false);
      }
    };
    
    if (isEditing) {
      return (
        <textarea
          ref={textareaRef}
          className="w-full px-3 py-2 text-sm border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
          style={{ minHeight: '80px' }}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          placeholder="在此输入文本内容..."
        />
      );
    }
    
    const content = typeof m.data?.content === 'string' ? m.data.content : '点击输入文本...';
    const lines = content.split('\n');

    return (
      <div
        className="text-sm leading-loose text-zinc-600 hover:bg-zinc-50 hover:rounded px-2 py-1 -mx-2 cursor-text transition-colors whitespace-pre-wrap"
        onClick={(e) => {
          e.stopPropagation();
          setIsEditing(true);
        }}
        title="点击编辑"
      >
        {lines.map((line, index) => (
          <span key={index}>
            {line}
            {index < lines.length - 1 && <br />}
          </span>
        ))}
      </div>
    );
  };

  const vNote = (m, onUpdate, setParentIsEditing) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(m.data?.content || '');
    const textareaRef = useRef(null);

    useEffect(() => {
      setEditValue(m.data?.content || '');
    }, [m.data?.content]);

    useEffect(() => {
      if (isEditing && textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.select();
      }
      // 通知父组件编辑状态变化
      if (setParentIsEditing) {
        setParentIsEditing(isEditing);
      }
    }, [isEditing, setParentIsEditing]);

    const handleSave = () => {
      if (onUpdate && editValue !== m.data?.content) {
        onUpdate(editValue);
      }
      setIsEditing(false);
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Enter' && e.metaKey) {
        handleSave();
      } else if (e.key === 'Escape') {
        setEditValue(m.data?.content || '');
        setIsEditing(false);
      }
    };

    if (isEditing) {
      return (
        <textarea
          ref={textareaRef}
          className="w-full px-3 py-2 text-xs border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none bg-zinc-50"
          style={{ minHeight: '60px' }}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          placeholder="在此输入备注内容..."
        />
      );
    }

    return (
      <p
        className="text-xs leading-relaxed text-zinc-400 hover:bg-zinc-50 hover:rounded px-2 py-1 -mx-2 cursor-text transition-colors italic"
        onClick={(e) => {
          e.stopPropagation();
          setIsEditing(true);
        }}
        title="点击编辑备注"
      >
        {typeof m.data?.content === 'string' && m.data.content ? m.data.content : '点击输入备注...'}
      </p>
    );
  };

  const getColor = (color, fallbackIdx = 0) => {
    if (!color) return P[fallbackIdx % P.length];
    if (color.startsWith('P[')) {
      const idx = parseInt(color.slice(2, color.indexOf(']')));
      return P[idx] || P[fallbackIdx % P.length];
    }
    return color;
  };

  const vKpi = m => {
    const items = m.data?.items || [];
    if (items.length === 0) return <div className="text-zinc-400 text-sm">暂无数据</div>;
    const gc = m.config?.cols===4?'grid-cols-2 sm:grid-cols-4':m.config?.cols===2?'grid-cols-2':'grid-cols-3';
    return <div className={`grid ${gc} gap-5`}>{items.map(it => (
      <div key={it.id} className="pt-3 border-t-2 border-zinc-200">
        <div className="text-xs text-zinc-400 uppercase tracking-wider mb-1">{typeof it.label === 'string' ? it.label : ''}</div>
        <div className="text-2xl font-bold text-zinc-900 tracking-tight">{typeof it.value === 'string' ? it.value : String(it.value || '')}</div>
        <div className={`text-xs mt-1 ${it.change>=0?'text-emerald-700':'text-red-700'}`}>{it.change>=0?'↑':'↓'} {Math.abs(it.change || 0)}%</div>
      </div>
    ))}</div>;
  };

  const vTable = m => {
    const headers = m.data?.headers || [];
    const rows = m.data?.rows || [];
    console.log('vTable data:', { headers, rows, data: m.data });
    if (headers.length === 0) return <div className="text-zinc-400 text-sm">暂无数据</div>;
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-zinc-300">
              {headers.map((h,i) => (
                <th key={`th-${i}`} className="px-3 py-2 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  {typeof h === 'string' ? h : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={`tr-${r.id || idx}`} className="border-b border-zinc-100">
                {(r.cells || []).map((c, ci) => (
                  <td key={`td-${idx}-${ci}`} className={`px-3 py-2 ${ci===0?'font-medium text-zinc-800':'text-zinc-500'}`}>
                    {typeof c === 'string' ? c : String(c || '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const vChart = m => {
    const items = m.data?.items || [];
    const series = m.data?.series || [];
    if (items.length === 0 || series.length === 0) return <div className="text-zinc-400 text-sm">暂无数据</div>;
    
    // 调试日志
    console.log('vChart data:', { items, series });
    
    // 确保每个item的values数组长度与series一致
    const normalizedItems = items.map(it => ({
      ...it,
      values: Array.isArray(it.values) ? it.values : [],
      label: it.label || '未命名'
    }));
    
    const cd = normalizedItems.map(it => { 
      const d = {name: it.label}; 
      series.forEach((s, si) => { 
        const val = it.values[si];
        d[s.name] = typeof val === 'number' ? val : (parseFloat(val) || 0); 
      }); 
      return d; 
    });
    
    console.log('vChart chartData:', cd);
    
    const showLabels = m.config?.showLabels !== false;
    return <ResponsiveContainer width="100%" height={240}><BarChart data={cd} margin={{top:24,right:8,bottom:24,left:0}}><CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false}/><XAxis dataKey="name" tick={{fontSize:11,fill:'#71717a'}} axisLine={{stroke:'#d4d4d8'}}/><YAxis tick={{fontSize:11,fill:'#71717a'}} axisLine={false} tickLine={false}/><Tooltip {...chartTip}/>{series.length>1&&<Legend iconSize={10} iconType="circle" verticalAlign="bottom" height={36}/>}{series.map((s,i) => <Bar key={i} dataKey={s.name} fill={getColor(s.color, i)} radius={[2,2,0,0]} maxBarSize={40}>{showLabels && <LabelList dataKey={s.name} position="top" style={{fontSize:10,fill:'#52525b',fontWeight:500}} formatter={(value) => formatLabel(value)}/>}</Bar>)}</BarChart></ResponsiveContainer>;
  };

  // 横向柱状图
  const vHBar = m => {
    const items = m.data?.items || [];
    const series = m.data?.series || [];
    if (items.length === 0 || series.length === 0) return <div className="text-zinc-400 text-sm">暂无数据</div>;

    const normalizedItems = items.map(it => ({
      ...it,
      values: Array.isArray(it.values) ? it.values : [],
      label: it.label || '未命名'
    }));

    const cd = normalizedItems.map(it => {
      const d = {name: it.label};
      series.forEach((s, si) => {
        const val = it.values[si];
        d[s.name] = typeof val === 'number' ? val : (parseFloat(val) || 0);
      });
      return d;
    });

    const showLabels = m.config?.showLabels !== false;
    return <ResponsiveContainer width="100%" height={240}><BarChart data={cd} layout="vertical" margin={{top:24,right:48,bottom:24,left:64}}><CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" horizontal={false}/><XAxis type="number" tick={{fontSize:11,fill:'#71717a'}} axisLine={{stroke:'#d4d4d8'}}/><YAxis type="category" dataKey="name" tick={{fontSize:11,fill:'#71717a'}} axisLine={false} tickLine={false} width={60}/><Tooltip {...chartTip}/>{series.length>1&&<Legend iconSize={10} iconType="circle" verticalAlign="bottom" height={36}/>}{series.map((s,i) => <Bar key={i} dataKey={s.name} fill={getColor(s.color, i)} radius={[0,2,2,0]} maxBarSize={24}>{showLabels && <LabelList dataKey={s.name} position="right" style={{fontSize:10,fill:'#52525b',fontWeight:500}} formatter={(value) => formatLabel(value)}/>}</Bar>)}</BarChart></ResponsiveContainer>;
  };

  const vFunnel = m => {
    const its = m.data?.items || [];
    if (its.length === 0) return <div className="text-zinc-400 text-sm">暂无数据</div>;
    const mx = Math.max(...its.flatMap(i => [i.cur || 0, i.prev || 0]), 1);
    return (
      <div>
        <div className="flex justify-end gap-4 mb-3 text-xs text-zinc-400">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-1.5 bg-blue-700 rounded-sm inline-block"></span>本月</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-1.5 bg-zinc-300 rounded-sm inline-block"></span>上月</span>
        </div>
        {its.map((it, i) => {
          const cw = Math.max((it.cur/mx)*100, 14);
          const pw = Math.max((it.prev/mx)*100, 14);
          const lossC = i>0 ? ((its[i-1].cur-it.cur)/its[i-1].cur*100).toFixed(1) : null;
          return (
            <div key={it.id} className="mb-1">
              {i>0 && <div className="text-center text-xs text-zinc-300 py-0.5">▾ {lossC}%</div>}
              <div className="flex items-center gap-3">
                <span className="w-16 text-right text-xs text-zinc-500 font-medium flex-shrink-0">{typeof it.stage === 'string' ? it.stage : ''}</span>
                <div className="flex-1 flex flex-col gap-0.5">
                  <div style={{width:`${cw}%`}} className="h-6 bg-blue-700 rounded-sm flex items-center justify-center transition-all duration-500"><span className="text-white text-xs font-semibold">{(it.cur || 0).toLocaleString()}</span></div>
                  <div style={{width:`${pw}%`}} className="h-4 bg-zinc-200 rounded-sm flex items-center justify-center transition-all duration-500"><span className="text-zinc-500 text-xs">{(it.prev || 0).toLocaleString()}</span></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // 折线图 - 支持多折线，单Y轴
  const vLine = m => {
    const points = m.data?.points || [];
    const series = m.data?.series || [];
    const showLabels = m.config?.showLabels !== false;
    if (points.length === 0 || series.length === 0) return <div className="text-zinc-400 text-sm">暂无数据</div>;
    const cd = points.map(pt => { const d = {name:pt.x}; series.forEach((s,si) => { d[s.name]=pt.values?.[si]||0; }); return d; });
    return <ResponsiveContainer width="100%" height={260}><ComposedChart data={cd} margin={{top:24,right:8,bottom:24,left:0}}><CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false}/><XAxis dataKey="name" tick={{fontSize:10,fill:'#71717a'}} axisLine={{stroke:'#d4d4d8'}}/><YAxis tick={{fontSize:10,fill:'#71717a'}} axisLine={false} tickLine={false}/><Tooltip {...chartTip}/><Legend iconSize={10} iconType="circle" verticalAlign="bottom" height={36}/>{series.map((s,i) => { const color = getColor(s.color, i); return <Line key={i} type="monotone" dataKey={s.name} stroke={color} strokeWidth={2} dot={{r:2.5,fill:'#fff',stroke:color,strokeWidth:2}}>{showLabels && <LabelList dataKey={s.name} position="top" style={{fontSize:9,fill:'#52525b'}} formatter={(value) => formatLabel(value)}/>}</Line>; })}</ComposedChart></ResponsiveContainer>;
  };

  // 双折线+柱状图 - 柱状图+两条折线，柱状图用左轴，折线用右轴
  const vBar2Line = m => {
    const items = m.data?.items || [];
    const barSeries = m.data?.barSeries || [];
    const lineSeries = m.data?.lineSeries || [];
    if (items.length === 0) return <div className="text-zinc-400 text-sm">暂无数据</div>;
    const cd = items.map(it => {
      const d = {name: it.label};
      barSeries.forEach((s, si) => { d[s] = (it.barValues || [])[si] || 0; });
      lineSeries.forEach((s, si) => { d[s] = (it.lineValues || [])[si] || 0; });
      return d;
    });
    const showLabels = m.config?.showLabels !== false;
    return (
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={cd} margin={{top:24,right:8,bottom:24,left:0}}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false}/>
          <XAxis dataKey="name" tick={{fontSize:10,fill:'#71717a'}} axisLine={{stroke:'#d4d4d8'}}/>
          <YAxis yAxisId="left" tick={{fontSize:10,fill:'#71717a'}} axisLine={false} tickLine={false}/>
          <YAxis yAxisId="right" orientation="right" tick={{fontSize:10,fill:'#71717a'}} axisLine={false} tickLine={false}/>
          <Tooltip {...chartTip}/>
          <Legend iconSize={10} iconType="circle" verticalAlign="bottom" height={36}/>
          {barSeries.map((s, i) =>
            <Bar key={i} yAxisId="left" dataKey={s} fill={P[i % P.length]} radius={[2,2,0,0]} maxBarSize={30}>
              {showLabels && <LabelList dataKey={s} position="top" style={{fontSize:9,fill:'#52525b'}} formatter={(value) => formatLabel(value)}/>}
            </Bar>
          )}
          {lineSeries.map((s, i) =>
            <Line key={`line-${i}`} yAxisId="right" type="monotone" dataKey={s} stroke={P[(i + barSeries.length) % P.length]} strokeWidth={2} dot={{r:3,fill:'#fff',strokeWidth:2}}>
              {showLabels && <LabelList dataKey={s} position="top" style={{fontSize:9,fill:'#52525b'}} formatter={(value) => formatLabel(value, true)}/>}
            </Line>
          )}
        </ComposedChart>
      </ResponsiveContainer>
    );
  };

  // 堆叠柱状图+折线 - 如图所示格式：堆叠柱状图(两个系列)+折线(百分比)
  const vStackBarLine = m => {
    const items = m.data?.items || [];
    const stackSeries = m.data?.stackSeries || [];
    const lineSeries = m.data?.lineSeries || [];
    if (items.length === 0) return <div className="text-zinc-400 text-sm">暂无数据</div>;
    const cd = items.map(it => {
      const d = {name: it.label};
      stackSeries.forEach((s, si) => { d[s] = (it.stackValues || [])[si] || 0; });
      lineSeries.forEach((s, si) => { d[s] = (it.lineValues || [])[si] || 0; });
      return d;
    });
    const showLabels = m.config?.showLabels !== false;
    return (
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={cd} margin={{top:24,right:8,bottom:24,left:0}}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false}/>
          <XAxis dataKey="name" tick={{fontSize:10,fill:'#71717a'}} axisLine={{stroke:'#d4d4d8'}}/>
          <YAxis yAxisId="left" tick={{fontSize:10,fill:'#71717a'}} axisLine={false} tickLine={false}/>
          <YAxis yAxisId="right" orientation="right" tick={{fontSize:10,fill:'#71717a'}} axisLine={false} tickLine={false} unit="%"/>
          <Tooltip {...chartTip}/>
          <Legend iconSize={10} iconType="circle" verticalAlign="bottom" height={36}/>
          {stackSeries.map((s, i) =>
            <Bar key={i} yAxisId="left" dataKey={s} stackId="stack" fill={P[i % P.length]} radius={i === stackSeries.length - 1 ? [2,2,0,0] : [0,0,0,0]} maxBarSize={35}>
              {showLabels && <LabelList dataKey={s} position="inside" style={{fontSize:9,fill:'#fff',fontWeight:500}}/>}
            </Bar>
          )}
          {lineSeries.map((s, i) =>
            <Line key={`line-${i}`} yAxisId="right" type="monotone" dataKey={s} stroke="#6b7280" strokeWidth={2} dot={{r:3,fill:'#fff',stroke:'#6b7280',strokeWidth:2}}>
              {showLabels && <LabelList dataKey={s} position="top" style={{fontSize:9,fill:'#52525b'}} formatter={(value) => formatLabel(value, true)}/>}
            </Line>
          )}
        </ComposedChart>
      </ResponsiveContainer>
    );
  };

  const vRadar = m => {
    const dims = m.data?.dims || [];
    const series = m.data?.series || [];
    if (dims.length === 0 || series.length === 0) return <div className="text-zinc-400 text-sm">暂无数据</div>;
    const rd = dims.map((d,i) => { const dimName = typeof d === 'object' ? d.name : d; const o = {dim:dimName}; series.forEach(s => { o[s.name]=s.values?.[i]||0; }); return o; });
    return <div className="flex justify-center"><ResponsiveContainer width="100%" height={300}><RadarChart data={rd} cx="50%" cy="50%" outerRadius="70%" margin={{top:8,right:8,bottom:24,left:0}}><PolarGrid stroke="#e4e4e7"/><PolarAngleAxis dataKey="dim" tick={{fontSize:11,fill:'#52525b'}}/><PolarRadiusAxis angle={90} tick={{fontSize:9,fill:'#a1a1aa'}} domain={[0,'auto']}/>{series.map((s,i) => { const color = getColor(s.color, i); return <Radar key={i} name={s.name} dataKey={s.name} stroke={color} fill={color} fillOpacity={0.06} strokeWidth={2}/>; })}<Legend iconSize={10} iconType="circle" verticalAlign="bottom" height={36}/><Tooltip {...chartTip}/></RadarChart></ResponsiveContainer></div>;
  };

  const vBubble = m => {
    const groups = m.data?.groups || [];
    if (groups.length === 0) return <div className="text-zinc-400 text-sm">暂无数据</div>;
    return <ResponsiveContainer width="100%" height={300}><ScatterChart margin={{top:24,right:20,bottom:36,left:4}}><CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7"/><XAxis type="number" dataKey="x" name={m.config?.x} tick={{fontSize:10,fill:'#71717a'}} axisLine={{stroke:'#d4d4d8'}} label={{value:m.config?.x||'',position:'insideBottom',offset:-6,style:{fontSize:10,fill:'#a1a1aa'}}}/><YAxis type="number" dataKey="y" name={m.config?.y} tick={{fontSize:10,fill:'#71717a'}} axisLine={false} tickLine={false} label={{value:m.config?.y||'',angle:-90,position:'insideLeft',style:{fontSize:10,fill:'#a1a1aa'}}}/><ZAxis type="number" dataKey="z" range={[50,400]} name={m.config?.z}/><Tooltip content={<BubbleTip/>}/><Legend iconSize={10} iconType="circle" verticalAlign="bottom" height={36}/>{groups.map((g, i) => { const color = getColor(g.color, i); return <Scatter key={g.id} name={g.name} data={g.pts} fill={color} fillOpacity={0.45} stroke={color} strokeWidth={1.5}><LabelList dataKey="z" position="top" offset={8} style={{fontSize:9,fill:'#52525b'}} formatter={(value) => formatLabel(value)}/></Scatter>; })}</ScatterChart></ResponsiveContainer>;
  };

  const vComparison = m => {
    const items = m.data?.items || [];
    if (items.length === 0) return <div className="text-zinc-400 text-sm">暂无数据</div>;
    const cd = items.map(it => ({name:it.name,'优化前':it.before,'优化后':it.after}));
    return (
      <div>
        <ResponsiveContainer width="100%" height={Math.max(items.length * 56, 120)}><BarChart data={cd} margin={{top:4,right:12,bottom:24,left:0}} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" horizontal={false}/><XAxis type="number" tick={{fontSize:10,fill:'#71717a'}} axisLine={{stroke:'#d4d4d8'}}/><YAxis dataKey="name" type="category" width={100} tick={{fontSize:11,fill:'#3f3f46'}} axisLine={false} tickLine={false}/><Tooltip {...chartTip}/><Legend iconSize={10} iconType="circle" verticalAlign="bottom" height={36}/><Bar dataKey="优化前" fill="#fca5a5" radius={[0,2,2,0]} maxBarSize={16}/><Bar dataKey="优化后" fill="#047857" radius={[0,2,2,0]} maxBarSize={16}/></BarChart></ResponsiveContainer>
        <table className="w-full text-xs mt-3"><thead><tr className="border-b-2 border-zinc-300">{['指标','措施','前','后','改善'].map(h => <th key={h} className="px-2 py-1.5 text-left font-semibold text-zinc-500 uppercase">{h}</th>)}</tr></thead><tbody>{items.map(it => { const imp = it.before ? ((it.before-it.after)/it.before*100).toFixed(1) : '—'; return <tr key={it.id} className="border-b border-zinc-100"><td className="px-2 py-1.5 font-medium text-zinc-800">{typeof it.name === 'string' ? it.name : ''}</td><td className="px-2 py-1.5 text-zinc-500">{typeof it.action === 'string' ? it.action : ''}</td><td className="px-2 py-1.5 text-red-600">{it.before}</td><td className="px-2 py-1.5 text-emerald-700 font-semibold">{it.after}</td><td className="px-2 py-1.5 text-emerald-700">↓{imp}%</td></tr>; })}</tbody></table>
      </div>
    );
  };

  const vQuadrant = m => {
    const points = m.data?.points || [];
    if (points.length === 0) return <div className="text-zinc-400 text-sm">暂无数据</div>;
    return (
      <ResponsiveContainer width="100%" height={320}>
        <ScatterChart margin={{top:20,right:20,bottom:20,left:20}}>
          <XAxis type="number" dataKey="x" name={m.config?.x} domain={[0,100]} tick={{fontSize:10,fill:'#71717a'}} axisLine={{stroke:'#d4d4d8'}} tickLine={false}>
            <text x={80} y={285} fontSize={10} fill="#a1a1aa">{m.config?.x || 'X轴'}</text>
          </XAxis>
          <YAxis type="number" dataKey="y" name={m.config?.y} domain={[0,100]} tick={{fontSize:10,fill:'#71717a'}} axisLine={{stroke:'#d4d4d8'}} tickLine={false}>
            <text x={-20} y={10} fontSize={10} fill="#a1a1aa" transform="rotate(-90)">{m.config?.y || 'Y轴'}</text>
          </YAxis>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7"/>
          <Tooltip {...chartTip} cursor={{strokeDasharray:'3 3'}}/>
          <ReferenceLine x={50} stroke="#d4d4d8" strokeDasharray="3 3"/>
          <ReferenceLine y={50} stroke="#d4d4d8" strokeDasharray="3 3"/>
          <ReferenceArea x1={50} y1={50} x2={100} y2={100} fill="#dbeafe" fillOpacity={0.3}/>
          <ReferenceArea x1={0} y1={50} x2={50} y2={100} fill="#fef3c7" fillOpacity={0.3}/>
          <ReferenceArea x1={0} y1={0} x2={50} y2={50} fill="#fee2e2" fillOpacity={0.3}/>
          <ReferenceArea x1={50} y1={0} x2={100} y2={50} fill="#d1fae5" fillOpacity={0.3}/>
          {points.map((p, i) => (
            <Scatter key={p.id} data={[p]} fill={p.color || P[i % P.length]} fillOpacity={0.7} stroke={p.color || P[i % P.length]} strokeWidth={2}>
              <LabelList dataKey="name" position="top" offset={10} style={{fontSize:11,fill:'#3f3f46',fontWeight:500}}/>
            </Scatter>
          ))}
        </ScatterChart>
      </ResponsiveContainer>
    );
  };

  const vList = m => {
    const items = m.data?.items || [];
    if (items.length === 0) return <div className="text-zinc-400 text-sm">暂无数据</div>;
    return <ul className="space-y-2.5">{items.map(it => <li key={it.id} className="flex items-baseline gap-3 text-sm leading-relaxed text-zinc-600"><span className="w-1 h-1 rounded-full bg-zinc-800 flex-shrink-0 mt-2"></span><span>{it.bold && typeof it.bold === 'string' && <strong className="text-zinc-800">{it.bold}</strong>}{typeof it.text === 'string' ? it.text : String(it.text || '')}</span></li>)}</ul>;
  };

  const vPie = m => {
    const items = m.data?.items || [];
    if (items.length === 0) return <div className="text-zinc-400 text-sm">暂无数据</div>;
    const total = items.reduce((sum, it) => sum + (it.value || 0), 0);
    const [hoveredIdx, setHoveredIdx] = useState(null);
    
    // 计算每个扇区的路径
    const centerX = 100;
    const centerY = 100;
    const radius = 80;
    const innerRadius = 0; // 实心饼图
    
    let currentAngle = -90; // 从顶部开始
    const sectors = items.map((it, idx) => {
      const color = it.color?.startsWith('P[') ? P[parseInt(it.color.slice(2, -1))] || P[idx % P.length] : it.color || P[idx % P.length];
      const angle = total > 0 ? (it.value / total) * 360 : 0;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      currentAngle += angle;
      
      // 计算路径
      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;
      
      const x1 = centerX + radius * Math.cos(startRad);
      const y1 = centerY + radius * Math.sin(startRad);
      const x2 = centerX + radius * Math.cos(endRad);
      const y2 = centerY + radius * Math.sin(endRad);
      
      const largeArcFlag = angle > 180 ? 1 : 0;
      
      const path = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
      
      // 计算标签位置（扇区中心）
      const midAngle = startAngle + angle / 2;
      const midRad = (midAngle * Math.PI) / 180;
      const labelRadius = radius * 0.65; // 标签在扇区内部
      const labelX = centerX + labelRadius * Math.cos(midRad);
      const labelY = centerY + labelRadius * Math.sin(midRad);
      
      return {
        ...it,
        color,
        angle,
        startAngle,
        endAngle,
        path,
        labelX,
        labelY,
        pct: total > 0 ? (it.value / total * 100).toFixed(1) : 0
      };
    });
    
    return (
      <div className="flex flex-col items-center">
        <svg width="200" height="200" viewBox="0 0 200 200" className="flex-shrink-0">
          {sectors.map((sector, idx) => (
            <g key={sector.id}>
              <path
                d={sector.path}
                fill={sector.color}
                stroke="#fff"
                strokeWidth="2"
                className="transition-all duration-200 cursor-pointer"
                style={{
                  transform: hoveredIdx === idx ? 'scale(1.05)' : 'scale(1)',
                  transformOrigin: `${centerX}px ${centerY}px`,
                  opacity: hoveredIdx !== null && hoveredIdx !== idx ? 0.6 : 1
                }}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
              {/* 只在扇区足够大时显示百分比标签 */}
              {parseFloat(sector.pct) >= 8 && (
                <text
                  x={sector.labelX}
                  y={sector.labelY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-[11px] font-semibold fill-white pointer-events-none"
                  style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
                >
                  {sector.pct}%
                </text>
              )}
            </g>
          ))}
        </svg>
        
        {/* 图例 */}
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-3">
          {sectors.map((sector, idx) => (
            <div 
              key={`legend-${sector.id}`}
              className={`flex items-center gap-1.5 px-2 py-1 rounded transition-all duration-200 cursor-pointer ${hoveredIdx === idx ? 'bg-zinc-100' : ''}`}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <span 
                className="w-3 h-3 rounded flex-shrink-0" 
                style={{ background: sector.color }}
              />
              <span className="text-xs text-zinc-600">{sector.label}</span>
              <span className="text-xs font-semibold text-zinc-800">{sector.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const vOrdered = (m, onUpdate, setParentIsEditing) => {
    const items = m.data?.items || [];
    const [editingId, setEditingId] = useState(null);
    const [editValue, setEditValue] = useState('');
    const inputRef = useRef(null);
    
    useEffect(() => {
      if (editingId && inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
      // 通知父组件编辑状态变化
      if (setParentIsEditing) {
        setParentIsEditing(!!editingId);
      }
    }, [editingId, setParentIsEditing]);
    
    const handleStartEdit = (it, e) => {
      e.stopPropagation();
      setEditingId(it.id);
      setEditValue(it.text || '');
    };
    
    const handleSave = (it) => {
      if (onUpdate && editValue !== it.text) {
        onUpdate(it.id, editValue);
      }
      setEditingId(null);
    };
    
    const handleKeyDown = (e, it) => {
      if (e.key === 'Enter') {
        handleSave(it);
      } else if (e.key === 'Escape') {
        setEditValue(it.text || '');
        setEditingId(null);
      }
    };
    
    if (items.length === 0) return <div className="text-zinc-400 text-sm">暂无数据</div>;
    
    return (
      <ol className="list-decimal list-outside space-y-2 text-sm text-zinc-600 pl-5">
        {items.map(it => (
          <li key={it.id} className="leading-relaxed pl-1">
            {editingId === it.id ? (
              <input
                ref={inputRef}
                className="w-full px-2 py-1 text-sm border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-200"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => handleSave(it)}
                onKeyDown={(e) => handleKeyDown(e, it)}
                placeholder="输入步骤..."
              />
            ) : (
              <span 
                className="hover:bg-zinc-50 cursor-text transition-colors px-2 -mx-2 py-1 rounded"
                onClick={(e) => handleStartEdit(it, e)}
                title="点击编辑"
              >
                {typeof it.text === 'string' ? it.text : String(it.text || '')}
              </span>
            )}
          </li>
        ))}
      </ol>
    );
  };

  const vUnordered = (m, onUpdate, setParentIsEditing) => {
    const items = m.data?.items || [];
    const [editingId, setEditingId] = useState(null);
    const [editValue, setEditValue] = useState('');
    const inputRef = useRef(null);
    
    useEffect(() => {
      if (editingId && inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
      // 通知父组件编辑状态变化
      if (setParentIsEditing) {
        setParentIsEditing(!!editingId);
      }
    }, [editingId, setParentIsEditing]);
    
    const handleStartEdit = (it, e) => {
      e.stopPropagation();
      setEditingId(it.id);
      setEditValue(it.text || '');
    };
    
    const handleSave = (it) => {
      if (onUpdate && editValue !== it.text) {
        onUpdate(it.id, editValue);
      }
      setEditingId(null);
    };
    
    const handleKeyDown = (e, it) => {
      if (e.key === 'Enter') {
        handleSave(it);
      } else if (e.key === 'Escape') {
        setEditValue(it.text || '');
        setEditingId(null);
      }
    };
    
    if (items.length === 0) return <div className="text-zinc-400 text-sm">暂无数据</div>;
    
    return (
      <ul className="list-disc list-outside space-y-2 text-sm text-zinc-600 pl-5">
        {items.map(it => (
          <li key={it.id} className="leading-relaxed pl-1">
            {editingId === it.id ? (
              <input
                ref={inputRef}
                className="w-full px-2 py-1 text-sm border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-200"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => handleSave(it)}
                onKeyDown={(e) => handleKeyDown(e, it)}
                placeholder="输入项目..."
              />
            ) : (
              <span 
                className="hover:bg-zinc-50 cursor-text transition-colors px-2 -mx-2 py-1 rounded"
                onClick={(e) => handleStartEdit(it, e)}
                title="点击编辑"
              >
                {typeof it.text === 'string' ? it.text : String(it.text || '')}
              </span>
            )}
          </li>
        ))}
      </ul>
    );
  };

  const vBarline = m => {
    const items = m.data?.items || [];
    if (items.length === 0) return <div className="text-zinc-400 text-sm">暂无数据</div>;
    const cd = items.map(it => {
      const d = {name: it.label};
      (m.data.barSeries || []).forEach((s, si) => { d[s] = (it.barValues || [])[si] || 0; });
      (m.data.lineSeries || []).forEach((s, si) => { d[s] = (it.lineValues || [])[si] || 0; });
      return d;
    });
    const hasBar = (m.data.barSeries || []).length > 0;
    const hasLine = (m.data.lineSeries || []).length > 0;
    const showLabels = m.config?.showLabels !== false;
    return (
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={cd} margin={{top:24,right:8,bottom:24,left:0}}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false}/>
          <XAxis dataKey="name" tick={{fontSize:10,fill:'#71717a'}} axisLine={{stroke:'#d4d4d8'}}/>
          {hasBar && <YAxis yAxisId="left" tick={{fontSize:10,fill:'#71717a'}} axisLine={false} tickLine={false}/>}
          {hasLine && <YAxis yAxisId="right" orientation="right" tick={{fontSize:10,fill:'#71717a'}} axisLine={false} tickLine={false}/>}
          <Tooltip {...chartTip}/>
          <Legend iconSize={10} iconType="circle" verticalAlign="bottom" height={36}/>
          {hasBar && (m.data.barSeries || []).map((s, i) =>
            <Bar key={i} yAxisId="left" dataKey={s} fill={P[i % P.length]} radius={[2,2,0,0]} maxBarSize={30}>{showLabels && <LabelList dataKey={s} position="top" style={{fontSize:9,fill:'#52525b'}} formatter={(value) => formatLabel(value)}/>}</Bar>
          )}
          {hasLine && (m.data.lineSeries || []).map((s, i) =>
            <Line key={`line-${i}`} yAxisId="right" type="monotone" dataKey={s} stroke={P[(i + (m.data.barSeries || []).length) % P.length]} strokeWidth={2} dot={{r:3,fill:'#fff',strokeWidth:2}}>{showLabels && <LabelList dataKey={s} position="top" style={{fontSize:9,fill:'#52525b'}} formatter={(value) => formatLabel(value, true)}/>}</Line>
          )}
        </ComposedChart>
      </ResponsiveContainer>
    );
  };

  const vProgress = m => {
    const items = m.data?.items || [];
    if (items.length === 0) return <div className="text-zinc-400 text-sm">暂无数据</div>;
    return (
      <div className="space-y-4">
        {items.map(it => {
        const pct = it.total > 0 ? (it.current / it.total * 100).toFixed(1) : 0;
        const barColor = pct >= 80 ? P[1] : pct >= 50 ? P[2] : P[3];
        return (
          <div key={it.id}>
            <div className="flex justify-between mb-1">
              <span className="text-sm text-zinc-600">{typeof it.label === 'string' ? it.label : ''}</span>
              <span className="text-sm text-zinc-500">{it.current?.toLocaleString()}{it.unit || ''} / {it.total?.toLocaleString()}{it.unit || ''}</span>
            </div>
            <div className="h-2.5 bg-zinc-200 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{width: `${pct}%`, background: barColor}}></div>
            </div>
             <div className="text-right text-xs font-medium mt-1" style={{color: barColor}}>{pct}%</div>
          </div>
        );
      })}
    </div>
  );
  };

  // 瀑布图
  const vWaterfall = m => {
    const items = m.data?.items || [];
    if (items.length === 0) return <div className="text-zinc-400 text-sm">暂无数据</div>;
    
    let runningTotal = 0;
    const processedItems = items.map(it => {
      const start = runningTotal;
      let end;
      if (it.type === 'total') {
        end = it.value;
        runningTotal = it.value;
      } else {
        end = runningTotal + it.value;
        runningTotal = end;
      }
      return { ...it, start, end };
    });
    
    const maxValue = Math.max(...processedItems.map(it => Math.max(it.start, it.end)), 1);
    const minValue = Math.min(...processedItems.map(it => Math.min(it.start, it.end)), 0);
    const range = maxValue - minValue;
    
    // 图表区域高度（像素）
    const chartHeight = 180;
    
    return (
      <div className="space-y-3">
        {/* 图表区域 */}
        <div className="relative" style={{ height: `${chartHeight + 40}px` }}>
          {/* Y轴刻度 */}
          <div className="absolute left-0 top-0 bottom-10 w-14 flex flex-col justify-between text-xs text-zinc-400 text-right pr-3">
            <span>{Math.round(maxValue).toLocaleString()}</span>
            <span>{Math.round((maxValue + minValue) / 2).toLocaleString()}</span>
            <span>{Math.round(minValue).toLocaleString()}</span>
          </div>
          
          {/* 柱状图区域 */}
          <div className="absolute left-16 right-0 top-0 bottom-10 flex items-end gap-2">
            {processedItems.map((it, i) => {
              const color = it.type === 'total' ? '#3b82f6' : it.type === 'positive' ? '#10b981' : '#ef4444';
              const bottom = Math.min(it.start, it.end);
              const height = Math.abs(it.end - it.start);
              
              // 计算像素位置（而不是百分比）
              const bottomPx = ((bottom - minValue) / range) * chartHeight;
              const heightPx = Math.max((height / range) * chartHeight, 4);
              
              return (
                <div key={i} className="flex-1 flex flex-col items-center relative group" style={{ height: `${chartHeight}px` }}>
                  {/* 柱子容器 */}
                  <div className="w-full relative" style={{ height: `${chartHeight}px` }}>
                    {/* 连接线 - 从当前柱子的顶部连接到下一个柱子的起点 */}
                    {i < processedItems.length - 1 && (
                      <div 
                        className="absolute w-px bg-zinc-400"
                        style={{
                          left: '50%',
                          bottom: `${bottomPx + heightPx}px`,
                          height: '12px',
                          transform: 'translateX(-50%)'
                        }}
                      />
                    )}
                    
                    {/* 柱体 */}
                    <div
                      className="w-full absolute rounded transition-all duration-300 cursor-pointer hover:opacity-80"
                      style={{ 
                        bottom: `${bottomPx}px`,
                        height: `${heightPx}px`,
                        background: color,
                        minHeight: '4px'
                      }}
                    />
                    
                    {/* 数据标签 */}
                    <div
                      className="absolute left-1/2 transform -translate-x-1/2 text-[10px] font-semibold text-zinc-700 whitespace-nowrap"
                      style={{
                        bottom: `${bottomPx + heightPx + 4}px`
                      }}
                    >
                      {it.value.toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </div>
                    
                    {/* 悬停提示 */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-zinc-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                      <div className="font-medium">{it.label}</div>
                      <div>{it.type === 'total' ? '合计: ' : it.value > 0 ? '增加: +' : '减少: '}{it.value.toLocaleString()}</div>
                      <div className="text-zinc-400">累计: {it.end.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* 零线 */}
          {minValue < 0 && (
            <div 
              className="absolute left-16 right-0 border-t border-zinc-400 border-dashed"
              style={{ bottom: `${((0 - minValue) / range) * chartHeight + 40}px` }}
            />
          )}
        </div>
        
        {/* X轴标签 */}
        <div className="flex gap-2 pl-16 -mt-8">
          {processedItems.map((it, i) => (
            <div key={i} className="flex-1 text-center">
              <span className="text-xs text-zinc-500 truncate block" title={it.label}>{it.label}</span>
            </div>
          ))}
        </div>
        
        {/* 图例 */}
        <div className="flex gap-4 justify-center text-xs pt-2">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{background: '#10b981'}}></span>增加</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{background: '#ef4444'}}></span>减少</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{background: '#3b82f6'}}></span>合计</span>
        </div>
      </div>
    );
  };

  // 散点图
  const vScatter = m => {
    const groups = m.data?.groups || [];
    if (groups.length === 0) return <div className="text-zinc-400 text-sm">暂无数据</div>;
    
    const allPoints = groups.flatMap(g => g.pts || []);
    const maxX = Math.max(...allPoints.map(p => p.x), 1);
    const maxY = Math.max(...allPoints.map(p => p.y), 1);
    
    return (
      <div>
        <div className="flex gap-2 mb-3">
          {groups.map((g, i) => (
            <span key={i} className="text-xs flex items-center gap-1">
              <span className="w-3 h-3 rounded-full" style={{background: g.color}}></span>
              {g.name}
            </span>
          ))}
        </div>
        <div className="relative h-48 border border-zinc-200 rounded bg-zinc-50">
          {groups.map((g, gi) => 
            (g.pts || []).map((p, pi) => (
              <div key={`${gi}-${pi}`}>
                <div
                  className="absolute w-3 h-3 rounded-full transform -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: `${(p.x / maxX) * 90 + 5}%`,
                    top: `${100 - (p.y / maxY) * 90 - 5}%`,
                    background: g.color
                  }}
                  title={`${g.name}: (${p.x}, ${p.y})`}
                />
                <div
                  className="absolute text-[9px] text-zinc-500 font-medium transform -translate-x-1/2"
                  style={{
                    left: `${(p.x / maxX) * 90 + 5}%`,
                    top: `${100 - (p.y / maxY) * 90 - 5 - 8}%`,
                    whiteSpace: 'nowrap'
                  }}
                >
                  ({p.x}, {p.y})
                </div>
              </div>
            ))
          )}
        </div>
        <div className="flex justify-between text-xs text-zinc-400 mt-1">
          <span>{m.config?.x || 'X'}</span>
          <span>{m.config?.y || 'Y'}</span>
        </div>
      </div>
    );
  };

  // 热力图
  const vHeatmap = m => {
    const rows = m.data?.rows || [];
    const cols = m.data?.cols || [];
    if (rows.length === 0 || cols.length === 0) return <div className="text-zinc-400 text-sm">暂无数据</div>;
    
    const allValues = rows.flatMap(r => r.values || []);
    const maxVal = Math.max(...allValues, 1);
    
    const getColor = (val) => {
      const intensity = val / maxVal;
      return `rgba(59, 130, 246, ${0.1 + intensity * 0.9})`;
    };
    
    return (
      <div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="p-1"></th>
                {cols.map((c, i) => (
                  <th key={i} className="p-1 text-zinc-500 font-normal">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri}>
                  <td className="p-1 text-zinc-600 font-medium">{row.label}</td>
                  {(row.values || []).map((v, vi) => (
                    <td 
                      key={vi} 
                      className="p-1 text-center font-medium"
                      style={{ background: getColor(v), color: v / maxVal > 0.5 ? '#fff' : '#374151' }}
                    >
                      {v}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // 桑基图
  const vSankey = m => {
    const nodes = m.data?.nodes || [];
    const links = m.data?.links || [];
    if (nodes.length === 0) return <div className="text-zinc-400 text-sm">暂无数据</div>;
    
    // 计算节点层级（source节点在左，target节点在右）
    const sourceIds = new Set(links.map(l => l.source));
    const targetIds = new Set(links.map(l => l.target));
    
    const leftNodes = nodes.filter(n => sourceIds.has(n.id) && !targetIds.has(n.id));
    const middleNodes = nodes.filter(n => sourceIds.has(n.id) && targetIds.has(n.id));
    const rightNodes = nodes.filter(n => !sourceIds.has(n.id) && targetIds.has(n.id));
    
    const nodeColors = {};
    nodes.forEach((n, i) => { nodeColors[n.id] = P[i % P.length]; });
    
    const nodeYPositions = {};
    const nodeXPositions = {};
    
    // 计算节点位置
    const calculatePositions = (nodeList, xPos) => {
      const totalHeight = nodeList.length * 50 + (nodeList.length - 1) * 20;
      const startY = Math.max(20, (300 - totalHeight) / 2);
      nodeList.forEach((n, i) => {
        nodeXPositions[n.id] = xPos;
        nodeYPositions[n.id] = startY + i * 70;
      });
    };
    
    calculatePositions(leftNodes, 60);
    calculatePositions(middleNodes, 200);
    calculatePositions(rightNodes, 340);
    
    return (
      <div className="relative" style={{ height: Math.max(200, nodes.length * 60) }}>
        <svg width="100%" height="100%" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet" className="overflow-visible">
          {/* 连接线 */}
          {links.map((link, i) => {
            const x1 = nodeXPositions[link.source] + 40;
            const y1 = nodeYPositions[link.source] + 20;
            const x2 = nodeXPositions[link.target];
            const y2 = nodeYPositions[link.target] + 20;
            
            if (x1 === undefined || y1 === undefined || x2 === undefined || y2 === undefined) return null;
            
            const strokeWidth = Math.max(Math.min(link.value / 10, 20), 2);
            
            return (
              <path
                key={i}
                d={`M ${x1} ${y1} C ${x1 + 50} ${y1}, ${x2 - 50} ${y2}, ${x2} ${y2}`}
                fill="none"
                stroke={nodeColors[link.source]}
                strokeWidth={strokeWidth}
                opacity="0.5"
              />
            );
          })}
          
          {/* 节点 */}
          {nodes.map((node) => {
            const x = nodeXPositions[node.id];
            const y = nodeYPositions[node.id];
            if (x === undefined || y === undefined) return null;
            
            return (
              <g key={node.id}>
                <rect
                  x={x}
                  y={y}
                  width={40}
                  height={40}
                  rx={6}
                  fill={nodeColors[node.id]}
                />
                <text
                  x={x + 20}
                  y={y + 25}
                  textAnchor="middle"
                  className="text-xs fill-white font-medium"
                >
                  {node.name.length > 4 ? node.name.slice(0, 4) + '...' : node.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  // 甘特图
  const vGantt = m => {
    const tasks = m.data?.tasks || [];
    if (tasks.length === 0) return <div className="text-zinc-400 text-sm">暂无数据</div>;
    
    const startDate = new Date(Math.min(...tasks.map(t => new Date(t.start))));
    const endDate = new Date(Math.max(...tasks.map(t => new Date(t.end))));
    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    
    const getLeft = (date) => {
      const days = Math.ceil((new Date(date) - startDate) / (1000 * 60 * 60 * 24));
      return (days / totalDays) * 100;
    };
    
    const getWidth = (start, end) => {
      const days = Math.ceil((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24)) + 1;
      return (days / totalDays) * 100;
    };
    
    return (
      <div className="space-y-3">
        {tasks.map((task, i) => (
          <div key={task.id || i} className="relative">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-zinc-700">{task.name}</span>
              <span className="text-xs text-zinc-400">{task.start} ~ {task.end}</span>
              <span className="text-xs font-medium" style={{color: task.color}}>{task.progress}%</span>
            </div>
            <div className="h-6 bg-zinc-100 rounded relative">
              <div
                className="h-full rounded relative"
                style={{
                  width: `${getWidth(task.start, task.end)}%`,
                  marginLeft: `${getLeft(task.start)}%`,
                  background: task.color || P[i % P.length]
                }}
              >
                <div 
                  className="absolute top-0 left-0 h-full bg-black/20 rounded"
                  style={{ width: `${task.progress}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // 词云图
  const vWordcloud = m => {
    const words = m.data?.words || [];
    if (words.length === 0) return <div className="text-zinc-400 text-sm">暂无数据</div>;
    
    const maxVal = Math.max(...words.map(w => w.value), 1);
    
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
    
    return (
      <div className="flex flex-wrap gap-3 items-center justify-center p-4 bg-zinc-50 rounded-lg min-h-32">
        {words.map((w, i) => {
          const size = 12 + (w.value / maxVal) * 24;
          return (
            <span
              key={i}
              className="font-semibold transition-transform hover:scale-110 cursor-default"
              style={{
                fontSize: `${size}px`,
                color: colors[i % colors.length],
                opacity: 0.7 + (w.value / maxVal) * 0.3
              }}
            >
              {w.text}
            </span>
          );
        })}
      </div>
    );
  };

  // 中国地图组件 - 使用简化的 SVG 地图
  const vChinaMap = m => {
    const items = m.data?.items || [];
    const config = m.config || {};
    const colorMin = config.colorMin || '#e0f2fe';
    const colorMax = config.colorMax || '#0369a1';
    
    if (items.length === 0) return <div className="text-zinc-400 text-sm">暂无数据</div>;
    
    // 计算数值范围
    const values = items.map(i => i.value || 0);
    const maxVal = Math.max(...values, 1);
    const minVal = Math.min(...values, 0);
    
    // 颜色插值函数
    const interpolateColor = (value) => {
      const ratio = (value - minVal) / (maxVal - minVal);
      const hex2rgb = (hex) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return [r, g, b];
      };
      const rgb2hex = (r, g, b) => {
        return '#' + [r, g, b].map(x => Math.round(x).toString(16).padStart(2, '0')).join('');
      };
      const [r1, g1, b1] = hex2rgb(colorMin);
      const [r2, g2, b2] = hex2rgb(colorMax);
      const r = r1 + (r2 - r1) * ratio;
      const g = g1 + (g2 - g1) * ratio;
      const b = b1 + (b2 - b1) * ratio;
      return rgb2hex(r, g, b);
    };
    
    // 中国各省市坐标（简化版）
    const provinceCoords = {
      '北京': [116.4, 40.0], '天津': [117.2, 39.1], '河北': [114.5, 38.0],
      '山西': [112.5, 37.9], '内蒙古': [111.7, 41.0], '辽宁': [123.4, 41.8],
      '吉林': [125.3, 43.9], '黑龙江': [126.6, 45.8], '上海': [121.5, 31.2],
      '江苏': [118.8, 32.1], '浙江': [120.2, 30.3], '安徽': [117.3, 31.9],
      '福建': [119.3, 26.1], '江西': [115.9, 28.7], '山东': [117.0, 36.7],
      '河南': [113.7, 34.8], '湖北': [114.3, 30.6], '湖南': [112.9, 28.2],
      '广东': [113.3, 23.1], '广西': [108.3, 22.8], '海南': [110.3, 20.0],
      '重庆': [106.5, 29.6], '四川': [104.1, 30.7], '贵州': [106.7, 26.6],
      '云南': [102.7, 25.0], '西藏': [91.1, 29.7], '陕西': [108.9, 34.3],
      '甘肃': [103.8, 36.1], '青海': [101.8, 36.6], '宁夏': [106.3, 38.5],
      '新疆': [87.6, 43.8], '台湾': [121.0, 23.7], '香港': [114.2, 22.3],
      '澳门': [113.5, 22.2]
    };
    
    // 坐标转换到 SVG 空间
    const lngToX = (lng) => ((lng - 73) / (136 - 73)) * 100;
    const latToY = (lat) => 100 - ((lat - 18) / (54 - 18)) * 100;
    
    // 按数值排序，高数值的显示在前面
    const sortedItems = [...items].sort((a, b) => (b.value || 0) - (a.value || 0));
    
    return (
      <div className="w-full">
        <div className="relative w-full" style={{ paddingBottom: '75%' }}>
          <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
            {/* 背景 */}
            <rect width="100" height="100" fill="#f8fafc" rx="4" />
            
            {/* 中国轮廓（简化版） */}
            <path 
              d="M20,35 Q25,25 35,22 L50,18 Q60,15 70,20 L80,25 Q85,30 85,40 L88,50 Q90,60 85,70 L80,80 Q75,85 65,85 L50,88 Q40,90 30,85 L20,80 Q15,75 12,65 L10,55 Q8,45 12,40 Z" 
              fill="#f1f5f9" 
              stroke="#cbd5e1" 
              strokeWidth="0.5"
            />
            
            {/* 南海诸岛示意 */}
            <rect x="82" y="82" width="12" height="8" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="0.3" rx="1" />
            <text x="88" y="87" fontSize="2" fill="#94a3b8" textAnchor="middle">南海</text>
            
            {/* 数据点 */}
            {sortedItems.map((item, idx) => {
              const coords = provinceCoords[item.name];
              if (!coords) return null;
              const x = lngToX(coords[0]);
              const y = latToY(coords[1]);
              const value = item.value || 0;
              const color = interpolateColor(value);
              const radius = 2 + (value / maxVal) * 4;
              
              return (
                <g key={`map-point-${item.id || idx}`}>
                  <circle 
                    cx={x} 
                    cy={y} 
                    r={radius * 1.5} 
                    fill={color} 
                    opacity="0.3"
                  />
                  <circle 
                    cx={x} 
                    cy={y} 
                    r={radius} 
                    fill={color} 
                    stroke="#fff" 
                    strokeWidth="0.3"
                  />
                  <text 
                    x={x} 
                    y={y - radius - 1} 
                    fontSize="2" 
                    fill="#475569" 
                    textAnchor="middle"
                    fontWeight="500"
                  >
                    {item.name}
                  </text>
                  <text 
                    x={x} 
                    y={y + radius + 2.5} 
                    fontSize="1.8" 
                    fill="#64748b" 
                    textAnchor="middle"
                  >
                    {value}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
        
        {/* 图例 */}
        <div className="flex items-center justify-center gap-4 mt-3 text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <span>低</span>
            <div 
              className="w-20 h-3 rounded" 
              style={{ 
                background: `linear-gradient(to right, ${colorMin}, ${colorMax})` 
              }} 
            />
            <span>高</span>
          </div>
          <div className="text-zinc-400">
            共 {items.length} 个地区
          </div>
        </div>
        
        {/* 数据表格 */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-200">
                <th className="text-left py-2 px-2 text-zinc-500 font-medium">排名</th>
                <th className="text-left py-2 px-2 text-zinc-500 font-medium">地区</th>
                <th className="text-right py-2 px-2 text-zinc-500 font-medium">数值</th>
                <th className="text-right py-2 px-2 text-zinc-500 font-medium">占比</th>
              </tr>
            </thead>
            <tbody>
              {sortedItems.slice(0, 10).map((item, idx) => {
                const total = items.reduce((sum, i) => sum + (i.value || 0), 0);
                const percent = total > 0 ? ((item.value || 0) / total * 100).toFixed(1) : 0;
                return (
                  <tr key={`map-row-${item.id || idx}`} className="border-b border-zinc-100">
                    <td className="py-1.5 px-2 text-zinc-400">{idx + 1}</td>
                    <td className="py-1.5 px-2">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2 h-2 rounded-full" 
                          style={{ backgroundColor: interpolateColor(item.value || 0) }}
                        />
                        {item.name}
                      </div>
                    </td>
                    <td className="py-1.5 px-2 text-right font-medium">{item.value}</td>
                    <td className="py-1.5 px-2 text-right text-zinc-400">{percent}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const vImage = m => {
    const src = m.data?.src;
    const alt = m.data?.alt || '图片';
    const caption = m.data?.caption;
    
    if (!src) {
      return (
        <div className="flex flex-col items-center justify-center p-8 bg-zinc-50 border-2 border-dashed border-zinc-200 rounded-lg text-zinc-400">
          <Image size={48} className="mb-2 text-zinc-300" />
          <span className="text-sm">暂无图片</span>
          <span className="text-xs text-zinc-400 mt-1">请在编辑面板中上传图片</span>
        </div>
      );
    }
    
    return (
      <div className="flex flex-col items-center">
        <img 
          src={src} 
          alt={alt}
          className="max-w-full h-auto rounded-lg shadow-sm"
          style={{ maxHeight: '400px' }}
        />
        {caption && (
          <span className="text-sm text-zinc-500 mt-2 text-center">{caption}</span>
        )}
      </div>
    );
  };

  // 附件组件 - 支持文件上传和下载
  const vAttachment = m => {
    const files = m.data?.files || [];
    
    // 获取文件图标
    const getFileIcon = (filename) => {
      const ext = filename.split('.').pop().toLowerCase();
      const iconMap = {
        'pdf': { icon: FileText, color: '#ef4444' },
        'doc': { icon: FileText, color: '#3b82f6' },
        'docx': { icon: FileText, color: '#3b82f6' },
        'xls': { icon: FileSpreadsheet, color: '#10b981' },
        'xlsx': { icon: FileSpreadsheet, color: '#10b981' },
        'ppt': { icon: FileText, color: '#f59e0b' },
        'pptx': { icon: FileText, color: '#f59e0b' },
        'zip': { icon: FileText, color: '#8b5cf6' },
        'rar': { icon: FileText, color: '#8b5cf6' },
        'jpg': { icon: Image, color: '#ec4899' },
        'jpeg': { icon: Image, color: '#ec4899' },
        'png': { icon: Image, color: '#ec4899' },
        'gif': { icon: Image, color: '#ec4899' },
        'mp4': { icon: FileText, color: '#f43f5e' },
        'mp3': { icon: FileText, color: '#06b6d4' },
      };
      return iconMap[ext] || { icon: FileText, color: '#71717a' };
    };

    // 处理文件下载
    const handleDownload = (file) => {
      if (file.url && file.url !== '#') {
        // 创建临时链接下载
        const link = document.createElement('a');
        link.href = file.url;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    };

    if (files.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center p-8 bg-zinc-50 border-2 border-dashed border-zinc-200 rounded-lg text-zinc-400">
          <Paperclip size={48} className="mb-2 text-zinc-300" />
          <span className="text-sm">暂无附件</span>
          <span className="text-xs text-zinc-400 mt-1">请在编辑面板中添加文件</span>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {files.map((file) => {
          const { icon: FileIcon, color } = getFileIcon(file.name);
          return (
            <div
              key={file.id}
              onClick={() => handleDownload(file)}
              className="flex items-center gap-3 p-3 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-lg cursor-pointer transition-colors group"
            >
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${color}15` }}
              >
                <FileIcon size={20} style={{ color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-zinc-700 truncate group-hover:text-blue-600 transition-colors">
                  {file.name}
                </div>
                <div className="text-xs text-zinc-400">
                  {file.size}
                </div>
              </div>
              <Download size={18} className="text-zinc-400 group-hover:text-blue-600 transition-colors flex-shrink-0" />
            </div>
          );
        })}
      </div>
    );
  };

  const viewR = { heading1:vHeading1, heading2:vHeading2, heading3:vHeading3, text:vText, note:vNote, kpi:vKpi, table:vTable, chart:vChart, hbar:vHBar, funnel:vFunnel, line:vLine, bar2line:vBar2Line, stackbarline:vStackBarLine, radar:vRadar, bubble:vBubble, comparison:vComparison, quadrant:vQuadrant, list:vList, pie:vPie, ordered:vOrdered, unordered:vUnordered, barline:vBarline, progress:vProgress, waterfall:vWaterfall, scatter:vScatter, heatmap:vHeatmap, chinamap:vChinaMap, sankey:vSankey, gantt:vGantt, wordcloud:vWordcloud, image:vImage, attachment:vAttachment };

  // ─── EDIT PANEL ───
  const F = ({label,children}) => <div className="mb-4"><label className="block text-xs font-medium text-zinc-400 mb-1">{label}</label>{children}</div>;
  const AddBtn = ({onClick,label}) => <button onClick={onClick} className="text-xs text-blue-700 hover:text-blue-900 font-medium flex items-center gap-1 mt-2"><Plus size={11}/>{label}</button>;
  const DelBtn = ({onClick}) => <button onClick={onClick} className="p-0.5 text-zinc-300 hover:text-red-500 flex-shrink-0"><Trash2 size={12}/></button>;

  // 可编辑输入框组件 - 使用本地状态避免频繁重新渲染
  const EditableInput = ({ value, onSave, className = '', placeholder = '', type = 'text' }) => {
    const [localValue, setLocalValue] = useState(value);
    const inputRef = useRef(null);
    
    useEffect(() => {
      setLocalValue(value);
    }, [value]);
    
    const handleBlur = () => {
      if (localValue !== value) {
        onSave(localValue);
      }
    };
    
    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        inputRef.current?.blur();
      }
    };
    
    if (type === 'number') {
      return (
        <input
          ref={inputRef}
          className={className}
          type="number"
          value={localValue}
          placeholder={placeholder}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
        />
      );
    }
    
    return (
      <input
        ref={inputRef}
        className={className}
        type="text"
        value={localValue}
        placeholder={placeholder}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      />
    );
  };

  const editContent = (m) => {
    if (!m) return null;
    switch(m.type) {
      case 'heading1': return <F label="标题内容"><EditableInput className={I} value={m.data.content} onSave={v => up(m.id, o => { o.data.content = v; return o; })} /></F>;
      case 'heading2': return <F label="标题内容"><EditableInput className={I} value={m.data.content} onSave={v => up(m.id, o => { o.data.content = v; return o; })} /></F>;
      case 'heading3': return <F label="标题内容"><EditableInput className={I} value={m.data.content} onSave={v => up(m.id, o => { o.data.content = v; return o; })} /></F>;
      case 'text': return <F label="内容"><textarea
        className={`${I}`}
        style={{minHeight:'100px', resize: 'none'}}
        defaultValue={m.data.content}
        onBlur={(e) => {
          up(m.id, o => {
            o.data.content = e.target.value;
            return o;
          });
        }}
      /></F>;
      case 'note': return <F label="备注内容"><textarea
        className={`${I}`}
        style={{minHeight:'60px', resize: 'none'}}
        defaultValue={m.data.content}
        onBlur={(e) => {
          up(m.id, o => {
            o.data.content = e.target.value;
            return o;
          });
        }}
      /></F>;
      case 'kpi': return <>
        <F label="列数"><div className="flex gap-1.5">{[2,3,4].map(n=><button key={n} onClick={()=>up(m.id,o=>{o.config.cols=n;return o;})} className={`px-3 py-1 rounded text-xs font-medium ${m.config?.cols===n?'bg-zinc-800 text-white':'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'}`}>{n}列</button>)}</div></F>
        {(m.data?.items || []).map((it,i)=><div key={it.id || i} className="flex gap-1.5 mb-2 flex-wrap items-end"><div className="flex-1" style={{minWidth:'50px'}}><span className="text-xs text-zinc-300">标签</span><EditableInput className={ISmall+' w-full'} value={it.label || ''} onSave={v=>up(m.id,o=>{o.data.items[i].label=v;return o;})}/></div><div className="w-16"><span className="text-xs text-zinc-300">值</span><EditableInput className={ISmall+' w-full'} value={it.value || ''} onSave={v=>up(m.id,o=>{o.data.items[i].value=v;return o;})}/></div><div className="w-14"><span className="text-xs text-zinc-300">%</span><EditableInput className={ISmall+' w-full'} type="number" value={it.change || 0} onSave={v=>up(m.id,o=>{o.data.items[i].change=parseFloat(v)||0;return o;})}/></div><DelBtn onClick={()=>up(m.id,o=>{o.data.items.splice(i,1);return o;})}/></div>)}
        <AddBtn onClick={()=>up(m.id,o=>{if(!o.data.items) o.data.items=[];o.data.items.push({id:uid(),label:'',value:'',change:0,unit:''});return o;})} label="添加指标"/>
      </>;
      case 'table': return <>
        <F label="表头">{(m.data?.headers || []).map((h,i)=><div key={`table-header-${i}`} className="flex items-center gap-1.5 mb-1"><EditableInput className={ISmall+' flex-1'} value={h || ''} onSave={v=>up(m.id,o=>{o.data.headers[i]=v;return o;})}/>{(m.data?.headers || []).length>1&&<DelBtn onClick={()=>up(m.id,o=>{o.data.headers.splice(i,1);(o.data?.rows || []).forEach(r=>r.cells.splice(i,1));return o;})}/>}</div>)}<AddBtn onClick={()=>up(m.id,o=>{if(!o.data.headers) o.data.headers=[];if(!o.data.rows) o.data.rows=[];o.data.headers.push(`列${o.data.headers.length+1}`);o.data.rows.forEach(r=>r.cells.push(''));return o;})} label="添加列"/></F>
        <F label="行数据">{(m.data?.rows || []).map((r,ri)=><div key={`table-row-${r.id || ri}`} className="flex gap-1 mb-1 items-center">{(r.cells || []).map((c,ci)=><EditableInput key={`table-cell-${ri}-${ci}`} className={ISmall+' flex-1'} value={c || ''} onSave={v=>up(m.id,o=>{o.data.rows[ri].cells[ci]=v;return o;})}/>)}<DelBtn onClick={()=>up(m.id,o=>{o.data.rows.splice(ri,1);return o;})}/></div>)}<AddBtn onClick={()=>up(m.id,o=>{if(!o.data.rows) o.data.rows=[];o.data.rows.push({id:uid(),cells:(o.data?.headers || []).map(()=>'')});return o;})} label="添加行"/></F>
      </>;
      case 'chart': return <>
        <F label="显示数据标签"><div className="flex items-center gap-2"><input type="checkbox" checked={m.config?.showLabels !== false} onChange={e=>up(m.id,o=>{o.config.showLabels=e.target.checked;return o;})} className="w-4 h-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"/><span className="text-xs text-zinc-600">在图表上显示数值标签</span></div></F>
        <F label="系列">{(m.data?.series || []).map((s,i)=><div key={i} className="flex items-center gap-1.5 mb-1"><input type="color" value={s.color || P[0]} className="w-5 h-5 rounded cursor-pointer border-0 flex-shrink-0" onChange={e=>up(m.id,o=>{o.data.series[i].color=e.target.value;return o;})}/><EditableInput className={ISmall+' flex-1'} value={s.name || ''} onSave={v=>up(m.id,o=>{o.data.series[i].name=v;return o;})}/>{(m.data?.series || []).length>1&&<DelBtn onClick={()=>up(m.id,o=>{o.data.series.splice(i,1);(o.data?.items || []).forEach(it=>it.values.splice(i,1));return o;})}/>}</div>)}<AddBtn onClick={()=>up(m.id,o=>{if(!o.data.series) o.data.series=[];if(!o.data.items) o.data.items=[];const ci=o.data.series.length;o.data.series.push({name:`系列${ci+1}`,color:P[ci%P.length]});o.data.items.forEach(it=>it.values.push(0));return o;})} label="添加系列"/></F>
        <F label="数据">{(m.data?.items || []).map((it,i)=><div key={it.id || i} className="flex gap-1 mb-1 items-center flex-wrap"><EditableInput className={ISmall+' w-16'} value={it.label || ''} placeholder="类别" onSave={v=>up(m.id,o=>{o.data.items[i].label=v;return o;})}/>{(it.values || []).map((v,vi)=><EditableInput key={vi} className={ISmall+' w-14'} type="number" value={v || 0} onSave={v=>up(m.id,o=>{o.data.items[i].values[vi]=parseFloat(v)||0;return o;})}/>)}<DelBtn onClick={()=>up(m.id,o=>{o.data.items.splice(i,1);return o;})}/></div>)}<AddBtn onClick={()=>up(m.id,o=>{if(!o.data.items) o.data.items=[];o.data.items.push({id:uid(),label:'',values:(o.data?.series || []).map(()=>0)});return o;})} label="添加数据"/></F>
      </>;
      case 'hbar': return <>
        <F label="显示数据标签"><div className="flex items-center gap-2"><input type="checkbox" checked={m.config?.showLabels !== false} onChange={e=>up(m.id,o=>{o.config.showLabels=e.target.checked;return o;})} className="w-4 h-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"/><span className="text-xs text-zinc-600">在图表上显示数值标签</span></div></F>
        <F label="系列">{(m.data?.series || []).map((s,i)=><div key={i} className="flex items-center gap-1.5 mb-1"><input type="color" value={s.color || P[0]} className="w-5 h-5 rounded cursor-pointer border-0 flex-shrink-0" onChange={e=>up(m.id,o=>{o.data.series[i].color=e.target.value;return o;})}/><EditableInput className={ISmall+' flex-1'} value={s.name || ''} onSave={v=>up(m.id,o=>{o.data.series[i].name=v;return o;})}/>{(m.data?.series || []).length>1&&<DelBtn onClick={()=>up(m.id,o=>{o.data.series.splice(i,1);(o.data?.items || []).forEach(it=>it.values.splice(i,1));return o;})}/>}</div>)}<AddBtn onClick={()=>up(m.id,o=>{if(!o.data.series) o.data.series=[];if(!o.data.items) o.data.items=[];const ci=o.data.series.length;o.data.series.push({name:`系列${ci+1}`,color:P[ci%P.length]});o.data.items.forEach(it=>it.values.push(0));return o;})} label="添加系列"/></F>
        <F label="数据">{(m.data?.items || []).map((it,i)=><div key={it.id || i} className="flex gap-1 mb-1 items-center flex-wrap"><EditableInput className={ISmall+' w-16'} value={it.label || ''} placeholder="类别" onSave={v=>up(m.id,o=>{o.data.items[i].label=v;return o;})}/>{(it.values || []).map((v,vi)=><EditableInput key={vi} className={ISmall+' w-14'} type="number" value={v || 0} onSave={v=>up(m.id,o=>{o.data.items[i].values[vi]=parseFloat(v)||0;return o;})}/>)}<DelBtn onClick={()=>up(m.id,o=>{o.data.items.splice(i,1);return o;})}/></div>)}<AddBtn onClick={()=>up(m.id,o=>{if(!o.data.items) o.data.items=[];o.data.items.push({id:uid(),label:'',values:(o.data?.series || []).map(()=>0)});return o;})} label="添加数据"/></F>
      </>;
      case 'funnel': return <>
        <F label="阶段">{m.data.items.map((it,i)=><div key={it.id} className="flex gap-1.5 mb-2 items-center flex-wrap"><EditableInput className={ISmall+' flex-1'} style={{minWidth:'50px'}} value={it.stage} placeholder="阶段" onSave={v=>up(m.id,o=>{o.data.items[i].stage=v;return o;})}/><div className="text-xs text-zinc-300">本</div><EditableInput className={ISmall+' w-16'} type="number" value={it.cur} onSave={v=>up(m.id,o=>{o.data.items[i].cur=parseFloat(v)||0;return o;})}/><div className="text-xs text-zinc-300">上</div><EditableInput className={ISmall+' w-16'} type="number" value={it.prev} onSave={v=>up(m.id,o=>{o.data.items[i].prev=parseFloat(v)||0;return o;})}/><DelBtn onClick={()=>up(m.id,o=>{o.data.items.splice(i,1);return o;})}/></div>)}<AddBtn onClick={()=>up(m.id,o=>{o.data.items.push({id:uid(),stage:'',cur:0,prev:0});return o;})} label="添加阶段"/></F>
      </>;
      case 'line': return <>
        <F label="显示数据标签"><div className="flex items-center gap-2"><input type="checkbox" checked={m.config?.showLabels !== false} onChange={e=>up(m.id,o=>{o.config.showLabels=e.target.checked;return o;})} className="w-4 h-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"/><span className="text-xs text-zinc-600">在图表上显示数值标签</span></div></F>
        <F label="Y轴标题"><EditableInput className={ISmall+' w-full'} value={m.config?.y||''} placeholder="可选" onSave={v=>up(m.id,o=>{o.config.y=v;return o;})}/></F>
        <F label="系列">{m.data.series.map((s,i)=><div key={i} className="flex items-center gap-1.5 mb-1"><input type="color" value={s.color} className="w-5 h-5 rounded cursor-pointer border-0 flex-shrink-0" onChange={e=>up(m.id,o=>{o.data.series[i].color=e.target.value;return o;})}/><EditableInput className={ISmall+' flex-1'} value={s.name} onSave={v=>up(m.id,o=>{o.data.series[i].name=v;return o;})}/>{m.data.series.length>1&&<DelBtn onClick={()=>up(m.id,o=>{o.data.series.splice(i,1);o.data.points.forEach(p=>p.values.splice(i,1));return o;})}/>}</div>)}<AddBtn onClick={()=>up(m.id,o=>{const ci=o.data.series.length;o.data.series.push({name:`系列${ci+1}`,color:P[ci%P.length]});o.data.points.forEach(p=>p.values.push(0));return o;})} label="添加系列"/></F>
        <F label="数据">{m.data.points.map((pt,i)=><div key={pt.id} className="flex gap-1 mb-1 items-center flex-wrap"><EditableInput className={ISmall+' w-14'} value={pt.x} placeholder="X" onSave={v=>up(m.id,o=>{o.data.points[i].x=v;return o;})}/>{pt.values.map((v,vi)=><EditableInput key={vi} className={ISmall+' w-12'} type="number" value={v} onSave={v=>up(m.id,o=>{o.data.points[i].values[vi]=parseFloat(v)||0;return o;})}/>)}<DelBtn onClick={()=>up(m.id,o=>{o.data.points.splice(i,1);return o;})}/></div>)}<AddBtn onClick={()=>up(m.id,o=>{o.data.points.push({id:uid(),x:'',values:o.data.series.map(()=>0)});return o;})} label="添加点"/></F>
      </>;
      case 'radar': return <>
        <F label="维度"><div className="flex flex-wrap gap-1">{m.data.dims.map((d,i)=><div key={i} className="flex items-center gap-0.5 bg-zinc-50 rounded px-1.5 py-0.5"><EditableInput className="bg-transparent text-xs outline-none w-12" value={typeof d === 'object' ? d.name : d} onSave={v=>up(m.id,o=>{if(typeof o.data.dims[i]==='object'){o.data.dims[i].name=v;}else{o.data.dims[i]=v;}return o;})}/>{m.data.dims.length>2&&<button onClick={()=>up(m.id,o=>{o.data.dims.splice(i,1);o.data.series.forEach(s=>s.values.splice(i,1));return o;})} className="text-zinc-300 hover:text-red-500"><X size={10}/></button>}</div>)}<button onClick={()=>up(m.id,o=>{o.data.dims.push('新');o.data.series.forEach(s=>s.values.push(50));return o;})} className="text-blue-700"><Plus size={13}/></button></div></F>
        {m.data.series.map((s,si)=><div key={si} className="mb-3 p-2 bg-zinc-50 rounded"><div className="flex items-center gap-1.5 mb-2"><input type="color" value={s.color} className="w-5 h-5 rounded cursor-pointer border-0" onChange={e=>up(m.id,o=>{o.data.series[si].color=e.target.value;return o;})}/><EditableInput className={ISmall+' flex-1'} value={s.name} onSave={v=>up(m.id,o=>{o.data.series[si].name=v;return o;})}/>{m.data.series.length>1&&<DelBtn onClick={()=>up(m.id,o=>{o.data.series.splice(si,1);return o;})}/>}</div><div className="flex flex-wrap gap-1.5">{s.values.map((v,vi)=><div key={vi} className="text-center"><span className="text-xs text-zinc-300 block truncate w-10">{typeof m.data.dims[vi]==='object'?m.data.dims[vi].name:m.data.dims[vi]}</span><EditableInput className={ISmall+' w-10 text-center'} type="number" value={v} onSave={v=>up(m.id,o=>{o.data.series[si].values[vi]=parseFloat(v)||0;return o;})}/></div>)}</div></div>)}
        <AddBtn onClick={()=>up(m.id,o=>{o.data.series.push({name:'新系列',color:P[o.data.series.length%P.length],values:o.data.dims.map(()=>50)});return o;})} label="添加系列"/>
      </>;
      case 'bubble': return <>
        <div className="flex gap-1.5 mb-3 flex-wrap">{[['x','X轴'],['y','Y轴'],['z','气泡']].map(([k,l])=><div key={k} className="flex-1" style={{minWidth:'50px'}}><span className="text-xs text-zinc-300">{l}</span><EditableInput className={ISmall+' w-full'} value={m.config?.[k]||''} onSave={v=>up(m.id,o=>{o.config[k]=v;return o;})}/></div>)}</div>
        {m.data.groups.map((g,gi)=><div key={g.id} className="mb-3 p-2 bg-zinc-50 rounded"><div className="flex items-center gap-1.5 mb-2"><input type="color" value={g.color} className="w-5 h-5 rounded cursor-pointer border-0" onChange={e=>up(m.id,o=>{o.data.groups[gi].color=e.target.value;return o;})}/><EditableInput className={ISmall+' flex-1'} value={g.name} onSave={v=>up(m.id,o=>{o.data.groups[gi].name=v;return o;})}/>{m.data.groups.length>1&&<DelBtn onClick={()=>up(m.id,o=>{o.data.groups.splice(gi,1);return o;})}/>}</div>{g.pts.map((p,pi)=><div key={p.id} className="flex gap-1 mb-1 items-center"><EditableInput className={ISmall+' w-12'} placeholder="标签" value={p.label} onSave={v=>up(m.id,o=>{o.data.groups[gi].pts[pi].label=v;return o;})}/>{['x','y','z'].map(k=><EditableInput key={k} className={ISmall+' w-10'} type="number" value={p[k]} onSave={v=>up(m.id,o=>{o.data.groups[gi].pts[pi][k]=parseFloat(v)||0;return o;})}/>)}<DelBtn onClick={()=>up(m.id,o=>{o.data.groups[gi].pts.splice(pi,1);return o;})}/></div>)}<AddBtn onClick={()=>up(m.id,o=>{o.data.groups[gi].pts.push({id:uid(),x:0,y:0,z:50,label:''});return o;})} label="点"/></div>)}
        <AddBtn onClick={()=>up(m.id,o=>{o.data.groups.push({id:uid(),name:'新组',color:P[o.data.groups.length%P.length],pts:[{id:uid(),x:0,y:0,z:50,label:''}]});return o;})} label="添加组"/>
      </>;
      case 'comparison': return <>
        <F label="对比项">{m.data.items.map((it,i)=><div key={it.id} className="flex gap-1 mb-2 items-center flex-wrap"><EditableInput className={ISmall+' flex-1'} style={{minWidth:'40px'}} placeholder="指标" value={it.name} onSave={v=>up(m.id,o=>{o.data.items[i].name=v;return o;})}/><EditableInput className={ISmall+' flex-1'} style={{minWidth:'40px'}} placeholder="措施" value={it.action} onSave={v=>up(m.id,o=>{o.data.items[i].action=v;return o;})}/><EditableInput className={ISmall+' w-14'} type="number" placeholder="前" value={it.before} onSave={v=>up(m.id,o=>{o.data.items[i].before=parseFloat(v)||0;return o;})}/><EditableInput className={ISmall+' w-14'} type="number" placeholder="后" value={it.after} onSave={v=>up(m.id,o=>{o.data.items[i].after=parseFloat(v)||0;return o;})}/><DelBtn onClick={()=>up(m.id,o=>{o.data.items.splice(i,1);return o;})}/></div>)}<AddBtn onClick={()=>up(m.id,o=>{o.data.items.push({id:uid(),name:'',action:'',before:0,after:0});return o;})} label="添加项"/></F>
      </>;
      case 'quadrant': return <>
        <F label="坐标轴设置">
          <div className="flex gap-2 mb-2">
            <div className="flex-1"><span className="text-xs text-zinc-400">X轴</span><EditableInput className={ISmall+' w-full'} value={m.config?.x||''} onSave={v=>up(m.id,o=>{o.config.x=v;return o;})}/></div>
            <div className="flex-1"><span className="text-xs text-zinc-400">Y轴</span><EditableInput className={ISmall+' w-full'} value={m.config?.y||''} onSave={v=>up(m.id,o=>{o.config.y=v;return o;})}/></div>
          </div>
        </F>
        <F label="数据点">
          {m.data.points.map((p,i)=><div key={p.id} className="flex gap-1.5 mb-2 items-center flex-wrap">
            <input type="color" value={p.color||P[i%P.length]} className="w-6 h-6 rounded cursor-pointer border-0 flex-shrink-0" onChange={e=>up(m.id,o=>{o.data.points[i].color=e.target.value;return o;})}/>
            <EditableInput className={ISmall+' w-16'} placeholder="名称" value={p.name} onSave={v=>up(m.id,o=>{o.data.points[i].name=v;return o;})}/>
            <EditableInput className={ISmall+' w-14'} type="number" placeholder="X" value={p.x} onSave={v=>up(m.id,o=>{o.data.points[i].x=parseFloat(v)||0;return o;})}/>
            <EditableInput className={ISmall+' w-14'} type="number" placeholder="Y" value={p.y} onSave={v=>up(m.id,o=>{o.data.points[i].y=parseFloat(v)||0;return o;})}/>
            <DelBtn onClick={()=>up(m.id,o=>{o.data.points.splice(i,1);return o;})}/>
          </div>)}
          <AddBtn onClick={()=>up(m.id,o=>{o.data.points.push({id:uid(),name:'',x:50,y:50,color:P[o.data.points.length%P.length]});return o;})} label="添加点"/>
        </F>
      </>;
      case 'list': return <>
        <F label="要点">{m.data.items.map((it,i)=><div key={it.id} className="flex gap-1.5 mb-2 items-center"><EditableInput className={ISmall+' w-20'} placeholder="加粗" value={it.bold} onSave={v=>up(m.id,o=>{o.data.items[i].bold=v;return o;})}/><EditableInput className={ISmall+' flex-1'} placeholder="内容" value={it.text} onSave={v=>up(m.id,o=>{o.data.items[i].text=v;return o;})}/><DelBtn onClick={()=>up(m.id,o=>{o.data.items.splice(i,1);return o;})}/></div>)}<AddBtn onClick={()=>up(m.id,o=>{o.data.items.push({id:uid(),bold:'',text:''});return o;})} label="添加要点"/></F>
      </>;
      case 'pie': return <>
        <F label="饼图数据">{m.data.items.map((it,i)=><div key={it.id} className="flex gap-1.5 mb-2 items-center"><EditableInput className={ISmall+' w-24'} placeholder="名称" value={it.label} onSave={v=>up(m.id,o=>{o.data.items[i].label=v;return o;})}/><EditableInput className={ISmall+' w-16'} type="number" placeholder="数值" value={it.value} onSave={v=>up(m.id,o=>{o.data.items[i].value=parseFloat(v)||0;return o;})}/><select className={ISmall+' w-16'} value={it.color} onChange={e=>up(m.id,o=>{o.data.items[i].color=e.target.value;return o;})}><option value="P[0]">P[0]</option><option value="P[1]">P[1]</option><option value="P[2]">P[2]</option><option value="P[3]">P[3]</option><option value="P[4]">P[4]</option><option value="P[5]">P[5]</option></select><DelBtn onClick={()=>up(m.id,o=>{o.data.items.splice(i,1);return o;})}/></div>)}<AddBtn onClick={()=>up(m.id,o=>{o.data.items.push({id:uid(),label:'',value:0,color:'P['+o.data.items.length%P.length+']'});return o;})} label="添加分类"/></F>
      </>;
      case 'ordered': return <>
        <F label="有序列表">{m.data.items.map((it,i)=><div key={it.id} className="flex gap-1.5 mb-2 items-center"><span className="text-xs text-zinc-400 w-4">{i+1}.</span><EditableInput className={ISmall+' flex-1'} placeholder="内容" value={it.text} onSave={v=>up(m.id,o=>{o.data.items[i].text=v;return o;})}/><DelBtn onClick={()=>up(m.id,o=>{o.data.items.splice(i,1);return o;})}/></div>)}<AddBtn onClick={()=>up(m.id,o=>{o.data.items.push({id:uid(),text:''});return o;})} label="添加步骤"/></F>
      </>;
      case 'unordered': return <>
        <F label="无序列表">{m.data.items.map((it,i)=><div key={it.id} className="flex gap-1.5 mb-2 items-center"><span className="text-zinc-400">•</span><EditableInput className={ISmall+' flex-1'} placeholder="内容" value={it.text} onSave={v=>up(m.id,o=>{o.data.items[i].text=v;return o;})}/><DelBtn onClick={()=>up(m.id,o=>{o.data.items.splice(i,1);return o;})}/></div>)}<AddBtn onClick={()=>up(m.id,o=>{o.data.items.push({id:uid(),text:''});return o;})} label="添加项目"/></F>
      </>;
      case 'barline': return <>
        <F label="显示数据标签"><div className="flex items-center gap-2"><input type="checkbox" checked={m.config?.showLabels !== false} onChange={e=>up(m.id,o=>{o.config.showLabels=e.target.checked;return o;})} className="w-4 h-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"/><span className="text-xs text-zinc-600">在图表上显示数值标签</span></div></F>
        <F label="柱状系列">{m.data.barSeries.map((s,i)=><div key={i} className="flex items-center gap-1.5 mb-1"><EditableInput className={ISmall+' flex-1'} value={s} onSave={v=>up(m.id,o=>{o.data.barSeries[i]=v;return o;})}/>{m.data.barSeries.length>1&&<DelBtn onClick={()=>up(m.id,o=>{o.data.barSeries.splice(i,1);o.data.items.forEach(it=>it.barValues.splice(i,1));return o;})}/>}</div>)}<AddBtn onClick={()=>up(m.id,o=>{o.data.barSeries.push(`柱状${o.data.barSeries.length+1}`);o.data.items.forEach(it=>it.barValues.push(0));return o;})} label="添加柱状系列"/></F>
        <F label="折线系列">{m.data.lineSeries.map((s,i)=><div key={i} className="flex items-center gap-1.5 mb-1"><EditableInput className={ISmall+' flex-1'} value={s} onSave={v=>up(m.id,o=>{o.data.lineSeries[i]=v;return o;})}/>{m.data.lineSeries.length>1&&<DelBtn onClick={()=>up(m.id,o=>{o.data.lineSeries.splice(i,1);o.data.items.forEach(it=>it.lineValues.splice(i,1));return o;})}/>}</div>)}<AddBtn onClick={()=>up(m.id,o=>{o.data.lineSeries.push(`折线${o.data.lineSeries.length+1}`);o.data.items.forEach(it=>it.lineValues.push(0));return o;})} label="添加折线"/></F>
        <F label="组合图数据">{m.data.items.map((it,i)=><div key={it.id} className="flex gap-1.5 mb-2 items-center flex-wrap"><EditableInput className={ISmall+' w-14'} placeholder="标签" value={it.label} onSave={v=>up(m.id,o=>{o.data.items[i].label=v;return o;})}/>{it.barValues.map((v,vi)=><EditableInput key={vi} className={ISmall+' w-12'} type="number" placeholder={`柱${vi+1}`} value={v} onSave={v=>up(m.id,o=>{o.data.items[i].barValues[vi]=parseFloat(v)||0;return o;})}/>)}{it.lineValues.map((v,vi)=><EditableInput key={vi} className={ISmall+' w-12'} type="number" placeholder={`线${vi+1}`} value={v} onSave={v=>up(m.id,o=>{o.data.items[i].lineValues[vi]=parseFloat(v)||0;return o;})}/>)}<DelBtn onClick={()=>up(m.id,o=>{o.data.items.splice(i,1);return o;})}/></div>)}<AddBtn onClick={()=>up(m.id,o=>{o.data.items.push({id:uid(),label:'',barValues:o.data.barSeries.map(()=>0),lineValues:o.data.lineSeries.map(()=>0)});return o;})} label="添加数据"/></F>
      </>;
      case 'bar2line': return <>
        <F label="显示数据标签"><div className="flex items-center gap-2"><input type="checkbox" checked={m.config?.showLabels !== false} onChange={e=>up(m.id,o=>{o.config.showLabels=e.target.checked;return o;})} className="w-4 h-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"/><span className="text-xs text-zinc-600">在图表上显示数值标签</span></div></F>
        <div className="flex gap-2 mb-2"><EditableInput className={ISmall+' flex-1'} placeholder="柱状系列名" value={m.data.barSeries?.[0]||''} onSave={v=>up(m.id,o=>{o.data.barSeries=[v];return o;})}/></div>
        <F label="折线系列">{m.data.lineSeries.map((s,i)=><div key={i} className="flex items-center gap-1.5 mb-1"><EditableInput className={ISmall+' flex-1'} value={s} onSave={v=>up(m.id,o=>{o.data.lineSeries[i]=v;return o;})}/>{m.data.lineSeries.length>1&&<DelBtn onClick={()=>up(m.id,o=>{o.data.lineSeries.splice(i,1);o.data.items.forEach(it=>it.lineValues.splice(i,1));return o;})}/>}</div>)}<AddBtn onClick={()=>up(m.id,o=>{o.data.lineSeries.push(`折线${o.data.lineSeries.length+1}`);o.data.items.forEach(it=>it.lineValues.push(0));return o;})} label="添加折线"/></F>
        <F label="数据">{m.data.items.map((it,i)=><div key={it.id} className="flex gap-1.5 mb-2 items-center flex-wrap"><EditableInput className={ISmall+' w-14'} placeholder="标签" value={it.label} onSave={v=>up(m.id,o=>{o.data.items[i].label=v;return o;})}/><EditableInput className={ISmall+' w-14'} type="number" placeholder="柱值" value={it.barValues?.[0]||0} onSave={v=>up(m.id,o=>{o.data.items[i].barValues=[parseFloat(v)||0];return o;})}/>{it.lineValues.map((v,vi)=><EditableInput key={vi} className={ISmall+' w-12'} type="number" value={v} onSave={v=>up(m.id,o=>{o.data.items[i].lineValues[vi]=parseFloat(v)||0;return o;})}/>)}<DelBtn onClick={()=>up(m.id,o=>{o.data.items.splice(i,1);return o;})}/></div>)}<AddBtn onClick={()=>up(m.id,o=>{o.data.items.push({id:uid(),label:'',barValues:[0],lineValues:o.data.lineSeries.map(()=>0)});return o;})} label="添加数据"/></F>
      </>;
      case 'stackbarline': return <>
        <F label="显示数据标签"><div className="flex items-center gap-2"><input type="checkbox" checked={m.config?.showLabels !== false} onChange={e=>up(m.id,o=>{o.config.showLabels=e.target.checked;return o;})} className="w-4 h-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"/><span className="text-xs text-zinc-600">在图表上显示数值标签</span></div></F>
        <div className="flex gap-2 mb-2"><EditableInput className={ISmall+' flex-1'} placeholder="折线系列名" value={m.data.lineSeries?.[0]||''} onSave={v=>up(m.id,o=>{o.data.lineSeries=[v];return o;})}/></div>
        <F label="堆叠系列">{m.data.stackSeries.map((s,i)=><div key={i} className="flex items-center gap-1.5 mb-1"><EditableInput className={ISmall+' flex-1'} value={s} onSave={v=>up(m.id,o=>{o.data.stackSeries[i]=v;return o;})}/>{m.data.stackSeries.length>1&&<DelBtn onClick={()=>up(m.id,o=>{o.data.stackSeries.splice(i,1);o.data.items.forEach(it=>it.stackValues.splice(i,1));return o;})}/>}</div>)}<AddBtn onClick={()=>up(m.id,o=>{o.data.stackSeries.push(`系列${o.data.stackSeries.length+1}`);o.data.items.forEach(it=>it.stackValues.push(0));return o;})} label="添加堆叠系列"/></F>
        <F label="数据">{m.data.items.map((it,i)=><div key={it.id} className="flex gap-1.5 mb-2 items-center flex-wrap"><EditableInput className={ISmall+' w-14'} placeholder="标签" value={it.label} onSave={v=>up(m.id,o=>{o.data.items[i].label=v;return o;})}/>{it.stackValues.map((v,vi)=><EditableInput key={vi} className={ISmall+' w-12'} type="number" value={v} onSave={v=>up(m.id,o=>{o.data.items[i].stackValues[vi]=parseFloat(v)||0;return o;})}/>)}<EditableInput className={ISmall+' w-14'} type="number" placeholder="折线%" value={it.lineValues?.[0]||0} onSave={v=>up(m.id,o=>{o.data.items[i].lineValues=[parseFloat(v)||0];return o;})}/><DelBtn onClick={()=>up(m.id,o=>{o.data.items.splice(i,1);return o;})}/></div>)}<AddBtn onClick={()=>up(m.id,o=>{o.data.items.push({id:uid(),label:'',stackValues:o.data.stackSeries.map(()=>0),lineValues:[0]});return o;})} label="添加数据"/></F>
      </>;
      case 'progress': return <>
        <F label="进度条">{m.data.items.map((it,i)=><div key={it.id} className="flex gap-1.5 mb-2 items-center"><EditableInput className={ISmall+' w-24'} placeholder="名称" value={it.label} onSave={v=>up(m.id,o=>{o.data.items[i].label=v;return o;})}/><EditableInput className={ISmall+' w-16'} type="number" placeholder="当前" value={it.current} onSave={v=>up(m.id,o=>{o.data.items[i].current=parseFloat(v)||0;return o;})}/><EditableInput className={ISmall+' w-16'} type="number" placeholder="目标" value={it.total} onSave={v=>up(m.id,o=>{o.data.items[i].total=parseFloat(v)||0;return o;})}/><EditableInput className={ISmall+' w-14'} placeholder="单位" value={it.unit||''} onSave={v=>up(m.id,o=>{o.data.items[i].unit=v;return o;})}/><DelBtn onClick={()=>up(m.id,o=>{o.data.items.splice(i,1);return o;})}/></div>)}<AddBtn onClick={()=>up(m.id,o=>{o.data.items.push({id:uid(),label:'',current:0,total:100,unit:''});return o;})} label="添加进度"/></F>
      </>;
      case 'waterfall': return <>
        <F label="Y轴名称"><EditableInput className={ISmall+' w-full'} value={m.config?.y||''} onSave={v=>up(m.id,o=>{o.config.y=v;return o;})}/></F>
        <F label="瀑布图数据">{m.data.items.map((it,i)=><div key={it.id} className="flex gap-1.5 mb-2 items-center flex-wrap">
          <EditableInput className={ISmall+' w-16'} placeholder="标签" value={it.label} onSave={v=>up(m.id,o=>{o.data.items[i].label=v;return o;})}/>
          <EditableInput className={ISmall+' w-16'} type="number" placeholder="数值" value={it.value} onSave={v=>up(m.id,o=>{o.data.items[i].value=parseFloat(v)||0;return o;})}/>
          <select className={ISmall+' w-20'} value={it.type} onChange={e=>up(m.id,o=>{o.data.items[i].type=e.target.value;return o;})}>
            <option value="positive">增加</option>
            <option value="negative">减少</option>
            <option value="total">合计</option>
          </select>
          <DelBtn onClick={()=>up(m.id,o=>{o.data.items.splice(i,1);return o;})}/>
        </div>)}
        <AddBtn onClick={()=>up(m.id,o=>{o.data.items.push({id:uid(),label:'',value:0,type:'positive'});return o;})} label="添加数据"/></F>
      </>;
      case 'scatter': return <>
        <div className="flex gap-2 mb-3"><div className="flex-1"><span className="text-xs text-zinc-400">X轴</span><EditableInput className={ISmall+' w-full'} value={m.config?.x||''} onSave={v=>up(m.id,o=>{o.config.x=v;return o;})}/></div><div className="flex-1"><span className="text-xs text-zinc-400">Y轴</span><EditableInput className={ISmall+' w-full'} value={m.config?.y||''} onSave={v=>up(m.id,o=>{o.config.y=v;return o;})}/></div></div>
        {m.data.groups.map((g,gi)=><div key={g.id} className="mb-3 p-2 bg-zinc-50 rounded"><div className="flex items-center gap-1.5 mb-2"><input type="color" value={g.color} className="w-5 h-5 rounded cursor-pointer border-0" onChange={e=>up(m.id,o=>{o.data.groups[gi].color=e.target.value;return o;})}/><EditableInput className={ISmall+' flex-1'} value={g.name} onSave={v=>up(m.id,o=>{o.data.groups[gi].name=v;return o;})}/>{m.data.groups.length>1&&<DelBtn onClick={()=>up(m.id,o=>{o.data.groups.splice(gi,1);return o;})}/>}</div>{g.pts.map((p,pi)=><div key={p.id} className="flex gap-1 mb-1 items-center"><EditableInput className={ISmall+' w-16'} type="number" placeholder="X" value={p.x} onSave={v=>up(m.id,o=>{o.data.groups[gi].pts[pi].x=parseFloat(v)||0;return o;})}/><EditableInput className={ISmall+' w-16'} type="number" placeholder="Y" value={p.y} onSave={v=>up(m.id,o=>{o.data.groups[gi].pts[pi].y=parseFloat(v)||0;return o;})}/><DelBtn onClick={()=>up(m.id,o=>{o.data.groups[gi].pts.splice(pi,1);return o;})}/></div>)}<AddBtn onClick={()=>up(m.id,o=>{o.data.groups[gi].pts.push({id:uid(),x:0,y:0});return o;})} label="添加点"/></div>)}
        <AddBtn onClick={()=>up(m.id,o=>{o.data.groups.push({id:uid(),name:'新系列',color:P[o.data.groups.length%P.length],pts:[{id:uid(),x:0,y:0}]});return o;})} label="添加系列"/>
      </>;
      case 'heatmap': return <>
        <div className="flex gap-2 mb-3"><div className="flex-1"><span className="text-xs text-zinc-400">X轴</span><EditableInput className={ISmall+' w-full'} value={m.config?.x||''} onSave={v=>up(m.id,o=>{o.config.x=v;return o;})}/></div><div className="flex-1"><span className="text-xs text-zinc-400">Y轴</span><EditableInput className={ISmall+' w-full'} value={m.config?.y||''} onSave={v=>up(m.id,o=>{o.config.y=v;return o;})}/></div></div>
        <F label="列标签"><div className="flex flex-wrap gap-1">{(m.data.cols||[]).map((c,i)=><div key={i} className="flex items-center gap-0.5"><EditableInput className={ISmall+' w-14'} value={c} onSave={v=>up(m.id,o=>{o.data.cols[i]=v;return o;})}/><DelBtn onClick={()=>up(m.id,o=>{o.data.cols.splice(i,1);o.data.rows.forEach(r=>r.values.splice(i,1));return o;})}/></div>)}<AddBtn onClick={()=>up(m.id,o=>{o.data.cols.push('新列');o.data.rows.forEach(r=>r.values.push(0));return o;})} label="+" small/></div></F>
        <F label="行数据">{(m.data.rows||[]).map((row,ri)=><div key={ri} className="mb-2 p-2 bg-zinc-50 rounded"><div className="flex items-center gap-1 mb-1"><EditableInput className={ISmall+' w-16'} placeholder="行名" value={row.label} onSave={v=>up(m.id,o=>{o.data.rows[ri].label=v;return o;})}/><DelBtn onClick={()=>up(m.id,o=>{o.data.rows.splice(ri,1);return o;})}/></div><div className="flex flex-wrap gap-1">{row.values.map((v,vi)=><EditableInput key={vi} className={ISmall+' w-12'} type="number" value={v} onSave={v=>up(m.id,o=>{o.data.rows[ri].values[vi]=parseFloat(v)||0;return o;})}/>)}</div></div>)}
        <AddBtn onClick={()=>up(m.id,o=>{o.data.rows.push({label:'新行',values:(m.data.cols||[]).map(()=>0)});return o;})} label="添加行"/></F>
      </>;
      case 'chinamap': return <>
        <F label="颜色范围">
          <div className="flex gap-2 mb-2">
            <div className="flex-1">
              <span className="text-xs text-zinc-400">最小值颜色</span>
              <input 
                type="color" 
                value={m.config?.colorMin || '#e0f2fe'} 
                className="w-full h-8 rounded cursor-pointer border border-zinc-200"
                onChange={e=>up(m.id,o=>{o.config.colorMin=e.target.value;return o;})}
              />
            </div>
            <div className="flex-1">
              <span className="text-xs text-zinc-400">最大值颜色</span>
              <input 
                type="color" 
                value={m.config?.colorMax || '#0369a1'} 
                className="w-full h-8 rounded cursor-pointer border border-zinc-200"
                onChange={e=>up(m.id,o=>{o.config.colorMax=e.target.value;return o;})}
              />
            </div>
          </div>
        </F>
        <F label="地区数据">
          {(m.data.items||[]).map((item,i)=><div key={item.id} className="flex gap-1.5 mb-1 items-center">
            <select 
              className={ISmall+' w-20'} 
              value={item.name}
              onChange={e=>up(m.id,o=>{o.data.items[i].name=e.target.value;return o;})}
            >
              {['北京','天津','河北','山西','内蒙古','辽宁','吉林','黑龙江','上海','江苏','浙江','安徽','福建','江西','山东','河南','湖北','湖南','广东','广西','海南','重庆','四川','贵州','云南','西藏','陕西','甘肃','青海','宁夏','新疆','台湾','香港','澳门'].map(prov=><option key={prov} value={prov}>{prov}</option>)}
            </select>
            <EditableInput className={ISmall+' w-16'} type="number" placeholder="数值" value={item.value} onSave={v=>up(m.id,o=>{o.data.items[i].value=parseFloat(v)||0;return o;})}/>
            <DelBtn onClick={()=>up(m.id,o=>{o.data.items.splice(i,1);return o;})}/>
          </div>)}
          <AddBtn onClick={()=>up(m.id,o=>{o.data.items.push({id:uid(),name:'北京',value:0});return o;})} label="添加地区"/>
        </F>
      </>;
      case 'sankey': return <>
        <F label="节点">{(m.data.nodes||[]).map((n,i)=><div key={i} className="flex gap-1.5 mb-1 items-center"><EditableInput className={ISmall+' w-16'} placeholder="ID" value={n.id} onSave={v=>up(m.id,o=>{o.data.nodes[i].id=v;return o;})}/><EditableInput className={ISmall+' flex-1'} placeholder="名称" value={n.name} onSave={v=>up(m.id,o=>{o.data.nodes[i].name=v;return o;})}/><DelBtn onClick={()=>up(m.id,o=>{o.data.nodes.splice(i,1);return o;})}/></div>)}<AddBtn onClick={()=>up(m.id,o=>{o.data.nodes.push({id:'new',name:'新节点'});return o;})} label="添加节点"/></F>
        <F label="连接">{(m.data.links||[]).map((l,i)=><div key={i} className="flex gap-1.5 mb-1 items-center flex-wrap"><select className={ISmall+' w-16'} value={l.source} onChange={e=>up(m.id,o=>{o.data.links[i].source=e.target.value;return o;})}>{(m.data.nodes||[]).map(n=><option key={n.id} value={n.id}>{n.name}</option>)}</select><span className="text-zinc-400">→</span><select className={ISmall+' w-16'} value={l.target} onChange={e=>up(m.id,o=>{o.data.links[i].target=e.target.value;return o;})}>{(m.data.nodes||[]).map(n=><option key={n.id} value={n.id}>{n.name}</option>)}</select><EditableInput className={ISmall+' w-14'} type="number" placeholder="值" value={l.value} onSave={v=>up(m.id,o=>{o.data.links[i].value=parseFloat(v)||0;return o;})}/><DelBtn onClick={()=>up(m.id,o=>{o.data.links.splice(i,1);return o;})}/></div>)}<AddBtn onClick={()=>up(m.id,o=>{o.data.links.push({source:(m.data.nodes?.[0]?.id||''),target:(m.data.nodes?.[1]?.id||''),value:10});return o;})} label="添加连接"/></F>
      </>;
      case 'gantt': return <>
        <F label="任务">{(m.data.tasks||[]).map((t,i)=><div key={t.id} className="mb-3 p-2 bg-zinc-50 rounded"><div className="flex gap-1.5 mb-2 items-center"><input type="color" value={t.color||P[i%P.length]} className="w-5 h-5 rounded cursor-pointer border-0" onChange={e=>up(m.id,o=>{o.data.tasks[i].color=e.target.value;return o;})}/><input className={ISmall+' flex-1'} placeholder="任务名" value={t.name} onChange={e=>up(m.id,o=>{o.data.tasks[i].name=e.target.value;return o;})}/><DelBtn onClick={()=>up(m.id,o=>{o.data.tasks.splice(i,1);return o;})}/></div><div className="flex gap-1.5 items-center"><input className={ISmall+' w-24'} type="date" value={t.start} onChange={e=>up(m.id,o=>{o.data.tasks[i].start=e.target.value;return o;})}/><input className={ISmall+' w-24'} type="date" value={t.end} onChange={e=>up(m.id,o=>{o.data.tasks[i].end=e.target.value;return o;})}/><input className={ISmall+' w-14'} type="number" placeholder="%" min="0" max="100" value={t.progress} onChange={e=>up(m.id,o=>{o.data.tasks[i].progress=parseInt(e.target.value)||0;return o;})}/></div></div>)}<AddBtn onClick={()=>up(m.id,o=>{o.data.tasks.push({id:uid(),name:'新任务',start:'2024-01-01',end:'2024-01-10',progress:0,color:P[o.data.tasks.length%P.length]});return o;})} label="添加任务"/></F>
      </>;
      case 'wordcloud': return <>
        <F label="词语">{(m.data.words||[]).map((w,i)=><div key={i} className="flex gap-1.5 mb-1 items-center"><input className={ISmall+' flex-1'} placeholder="词语" value={w.text} onChange={e=>up(m.id,o=>{o.data.words[i].text=e.target.value;return o;})}/><input className={ISmall+' w-16'} type="number" placeholder="权重" value={w.value} onChange={e=>up(m.id,o=>{o.data.words[i].value=parseFloat(e.target.value)||0;return o;})}/><DelBtn onClick={()=>up(m.id,o=>{o.data.words.splice(i,1);return o;})}/></div>)}<AddBtn onClick={()=>up(m.id,o=>{o.data.words.push({text:'',value:50});return o;})} label="添加词语"/></F>
      </>;
      case 'image': return <>
        <F label="图片">
          {m.data?.src ? (
            <div className="mb-3">
              <img 
                src={m.data.src} 
                alt="预览" 
                className="max-w-full h-auto rounded border border-zinc-200"
                style={{ maxHeight: '150px' }}
              />
            </div>
          ) : (
            <div className="mb-3 p-4 bg-zinc-50 border-2 border-dashed border-zinc-200 rounded text-center text-zinc-400 text-sm">
              暂无图片
            </div>
          )}
          <input 
            type="file" 
            accept="image/*"
            className="hidden"
            id={`image-upload-${m.id}`}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                  up(m.id, o => {
                    o.data.src = event.target.result;
                    return o;
                  });
                };
                reader.readAsDataURL(file);
              }
            }}
          />
          <label 
            htmlFor={`image-upload-${m.id}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded text-xs font-medium cursor-pointer hover:bg-blue-100 transition-colors"
          >
            <Upload size={14} />
            {m.data?.src ? '更换图片' : '上传图片'}
          </label>
          {m.data?.src && (
            <button 
              onClick={() => up(m.id, o => { o.data.src = ''; return o; })}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 ml-2 text-red-600 hover:bg-red-50 rounded text-xs font-medium transition-colors"
            >
              <Trash2 size={14} />
              删除
            </button>
          )}
        </F>
        <F label="替代文本">
          <EditableInput 
            className={I} 
            placeholder="图片描述（用于无障碍访问）"
            value={m.data?.alt || ''} 
            onSave={v => up(m.id, o => { o.data.alt = v; return o; })} 
          />
        </F>
        <F label="图片说明">
          <EditableInput 
            className={I} 
            placeholder="图片下方显示的说明文字"
            value={m.data?.caption || ''} 
            onSave={v => up(m.id, o => { o.data.caption = v; return o; })} 
          />
        </F>
      </>;
      case 'attachment': return <>
        <F label="文件列表">
          {(m.data?.files || []).map((file, i) => (
            <div key={file.id} className="flex items-center gap-2 mb-2 p-2 bg-zinc-50 rounded border border-zinc-200">
              <Paperclip size={16} className="text-zinc-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <EditableInput 
                  className={ISmall + ' w-full'} 
                  placeholder="文件名"
                  value={file.name} 
                  onSave={v => up(m.id, o => { o.data.files[i].name = v; return o; })} 
                />
              </div>
              <EditableInput 
                className={ISmall + ' w-20'} 
                placeholder="大小"
                value={file.size} 
                onSave={v => up(m.id, o => { o.data.files[i].size = v; return o; })} 
              />
              <DelBtn onClick={() => up(m.id, o => { o.data.files.splice(i, 1); return o; })} />
            </div>
          ))}
          <input 
            type="file" 
            className="hidden"
            id={`attachment-upload-${m.id}`}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                  up(m.id, o => {
                    const size = file.size < 1024 * 1024 
                      ? (file.size / 1024).toFixed(1) + ' KB'
                      : (file.size / (1024 * 1024)).toFixed(1) + ' MB';
                    o.data.files.push({
                      id: uid(),
                      name: file.name,
                      size: size,
                      url: event.target.result,
                      type: file.type
                    });
                    return o;
                  });
                };
                reader.readAsDataURL(file);
              }
            }}
          />
          <label 
            htmlFor={`attachment-upload-${m.id}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded text-xs font-medium cursor-pointer hover:bg-blue-100 transition-colors mt-2"
          >
            <Upload size={14} />
            添加文件
          </label>
        </F>
      </>;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      {/* Toast */}
      <AnimatePresence>{toast && <motion.div initial={{opacity:0,y:-20}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-20}} className="fixed top-4 left-1/2 z-50 bg-zinc-800 text-white text-sm px-5 py-2.5 rounded shadow-lg" style={{transform:'translateX(-50%)'}}>{toast}</motion.div>}</AnimatePresence>

      {/* Excel格式样例弹窗 */}
      <AnimatePresence>
        {showExcelFormatModal && excelFormatModalType && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            onClick={() => { setShowExcelFormatModal(false); setExcelFormatModalModuleId(null); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {(() => {
                const example = EXCEL_FORMAT_EXAMPLES[excelFormatModalType];
                if (!example) return null;
                return (
                  <>
                    <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 bg-zinc-50">
                      <div>
                        <h3 className="text-lg font-semibold text-zinc-800">{example.title} - Excel格式要求</h3>
                        <p className="text-sm text-zinc-500 mt-1">{example.description}</p>
                      </div>
                      <button
                        onClick={() => { setShowExcelFormatModal(false); setExcelFormatModalModuleId(null); }}
                        className="p-1 text-zinc-400 hover:text-zinc-600 rounded"
                      >
                        <X size={20} />
                      </button>
                    </div>
                    <div className="p-6 overflow-y-auto max-h-[60vh]">
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-zinc-700 mb-2">数据格式示例：</h4>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm border border-zinc-200 rounded-lg overflow-hidden">
                            <thead className="bg-zinc-100">
                              <tr>
                                {example.headers.map((header, idx) => (
                                  <th key={idx} className="px-3 py-2 text-left font-medium text-zinc-700 border-b border-zinc-200">
                                    {header}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {example.rows.map((row, rowIdx) => (
                                <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-zinc-50'}>
                                  {row.map((cell, cellIdx) => (
                                    <td key={cellIdx} className="px-3 py-2 text-zinc-600 border-b border-zinc-100">
                                      {cell}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-blue-800 mb-2">导入说明：</h4>
                        <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                          <li>支持 .xlsx, .xls, .csv 格式文件</li>
                          <li>第一行必须是表头（列名）</li>
                          <li>数据从第二行开始</li>
                          <li>确保数据格式与示例一致</li>
                          <li>空行会被自动过滤</li>
                        </ul>
                      </div>
                    </div>
                    <div className="flex justify-end gap-3 px-6 py-4 border-t border-zinc-200 bg-zinc-50">
                      <button
                        onClick={() => { setShowExcelFormatModal(false); setExcelFormatModalModuleId(null); }}
                        className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-800"
                      >
                        关闭
                      </button>
                      <label
                        htmlFor={`excel-import-modal`}
                        className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer"
                      >
                        选择文件导入
                        <input
                          type="file"
                          id={`excel-import-modal`}
                          accept=".xlsx,.xls,.csv"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setShowExcelFormatModal(false);
                              // 使用存储的模块ID找到目标模块
                              const targetModule = modules.find(m => m.id === excelFormatModalModuleId);
                              if (targetModule) {
                                try {
                                  flash('正在解析Excel文件...');
                                  const excelData = await parseExcel(file);
                                  const newData = convertExcelToModuleData(targetModule.type, excelData);
                                  if (newData) {
                                    up(targetModule.id, o => {
                                      // 对于表格类型，完全替换数据而不是合并
                                      if (targetModule.type === 'table') {
                                        o.data = newData;
                                      } else {
                                        o.data = { ...o.data, ...newData };
                                      }
                                      return o;
                                    });
                                    flash(`✓ 已成功导入 ${excelData.length - 1} 行数据`);
                                  } else {
                                    flash('✗ 无法解析Excel数据格式');
                                  }
                                } catch (error) {
                                  console.error('Excel导入失败:', error);
                                  flash('✗ Excel导入失败: ' + error.message);
                                }
                              } else {
                                flash('✗ 未找到目标组件，请重试');
                              }
                            }
                            e.target.value = '';
                          }}
                        />
                      </label>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 加载遮罩 */}
      {isLoading && (
        <div className="fixed inset-0 z-50 bg-white/80 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-zinc-200 border-t-blue-600 rounded-full animate-spin"></div>
            <span className="text-sm text-zinc-500">加载中...</span>
          </div>
        </div>
      )}

      {/* API 状态指示器 */}
      <div className="fixed top-4 right-4 z-40 flex items-center gap-2">
        {apiStatus === 'checking' && (
          <span className="flex items-center gap-1 text-xs text-zinc-400">
            <RefreshCw size={12} className="animate-spin" />
            检查服务...
          </span>
        )}
        {apiStatus === 'online' && (
          <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
            <Cloud size={12} />
            团队同步已开启
          </span>
        )}
        {apiStatus === 'offline' && (
          <span className="flex items-center gap-1 text-xs text-zinc-500 bg-zinc-100 px-2 py-1 rounded" title="数据将保存在本地">
            <CloudOff size={12} />
            本地模式
          </span>
        )}
      </div>

      {/* 报告列表 */}
      <AnimatePresence>
        {showReportList && (
          <motion.div 
            initial={{opacity:0,y:-8}} 
            animate={{opacity:1,y:0}} 
            exit={{opacity:0,y:-8}} 
            className="fixed top-16 right-4 bg-white border border-zinc-200 rounded shadow-lg z-40 w-80"
          >
            <div className="p-3 border-b border-zinc-200 font-medium text-zinc-800 flex justify-between items-center">
              <span>文件管理</span>
              <button 
                onClick={() => setShowNewFolderInput(true)}
                className="p-1 text-zinc-400 hover:text-zinc-700 rounded"
                title="新建文件夹"
              >
                <FolderPlus size={16} />
              </button>
            </div>
            {showNewFolderInput && (
              <div className="p-2 border-b border-zinc-200 bg-zinc-50 flex items-center gap-2">
                <input 
                  autoFocus
                  className="flex-1 text-sm border border-blue-300 rounded px-2 py-1 outline-none"
                  placeholder="输入文件夹名称"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter' && newFolderName.trim()) {
                      console.log('>>> 开始创建文件夹 (Enter键):', newFolderName.trim());
                      const newFolderId = 'folder_' + Date.now();
                      const newFolder = { 
                        id: newFolderId, 
                        name: newFolderName.trim(), 
                        createdAt: Date.now(),
                        reports: []
                      };
                      console.log('>>> 调用 saveFolder:', newFolder);
                      const data = await saveFolder(newFolder);
                      console.log('>>> saveFolder 返回:', data);
                      setReportsData(data);
                      setShowNewFolderInput(false);
                      setNewFolderName('');
                      flash('文件夹已创建');
                    } else if (e.key === 'Escape') {
                      setShowNewFolderInput(false);
                      setNewFolderName('');
                    }
                  }}
                />
                <button 
                  onClick={async () => {
                    if (newFolderName.trim()) {
                      const newFolderId = 'folder_' + Date.now();
                      const newFolder = { 
                        id: newFolderId, 
                        name: newFolderName.trim(), 
                        createdAt: Date.now(),
                        reports: []
                      };
                      const data = await saveFolder(newFolder);
                      setReportsData(data);
                      setShowNewFolderInput(false);
                      setNewFolderName('');
                      flash('文件夹已创建');
                    }
                  }}
                  className="p-1 text-blue-600 hover:text-blue-700"
                >
                  <Plus size={16} />
                </button>
                <button 
                  onClick={() => {
                    setShowNewFolderInput(false);
                    setNewFolderName('');
                  }}
                  className="p-1 text-zinc-400 hover:text-zinc-600"
                >
                  <X size={16} />
                </button>
              </div>
            )}
            <div className="max-h-96 overflow-y-auto">
              {(() => {
                const folders = reportsData.folders || {};
                const reports = reportsData.reports || {};
                const rootReports = Object.entries(reports).filter(([id, r]) => !r.folderId);
                
                console.log('渲染报告列表:', Object.keys(reports).length, '个报告', Object.keys(folders).length, '个文件夹');
                console.log('根目录报告:', rootReports.map(([id, r]) => ({ id, title: r.title, folderId: r.folderId })));
                console.log('所有报告:', Object.entries(reports).map(([id, r]) => ({ id, title: r.title, folderId: r.folderId })));
                
                if (Object.keys(folders).length === 0 && rootReports.length === 0) {
                  return <div className="p-4 text-center text-zinc-400 text-sm">暂无保存的文件</div>;
                }

                return (
                  <>
                    {Object.entries(folders).map(([folderId, folder]) => {
                      const folderReports = Object.entries(reports).filter(([id, r]) => r.folderId === folderId);
                      const isExpanded = true;
                      return (
                        <div key={folderId} className="border-b border-zinc-100">
                          <div 
                            className={`p-2 hover:bg-zinc-50 flex items-center gap-2 ${folderDragOver === folderId ? 'bg-blue-50' : ''}`}
                            onDragOver={(e) => { e.preventDefault(); setFolderDragOver(folderId); }}
                            onDragLeave={() => setFolderDragOver(null)}
                            onDrop={async (e) => {
                              e.preventDefault();
                              const reportId = e.dataTransfer.getData('reportId');
                              if (reportId) {
                                const data = await moveReportToFolder(reportId, folderId);
                                setReportsData(data);
                                flash('文件已移动到文件夹');
                              }
                              setFolderDragOver(null);
                            }}
                          >
                            {editingFolderId === folderId ? (
                              <input 
                                autoFocus
                                className="flex-1 text-sm border border-blue-300 rounded px-1 py-0.5 outline-none"
                                defaultValue={folder.name}
                                onBlur={async (e) => {
                                  const newName = e.target.value.trim();
                                  if (newName && newName !== folder.name) {
                                    const updatedFolder = { ...folder, name: newName };
                                    const data = await saveFolder(updatedFolder);
                                    setReportsData(data);
                                  }
                                  setEditingFolderId(null);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.target.blur();
                                  } else if (e.key === 'Escape') {
                                    setEditingFolderId(null);
                                  }
                                }}
                              />
                            ) : (
                              <>
                                <Folder size={14} className="text-zinc-400 flex-shrink-0" />
                                <span className="flex-1 text-sm text-zinc-700 truncate">{folder.name}</span>
                                <span className="text-xs text-zinc-400">({folderReports.length})</span>
                                <button 
                                  onClick={() => setEditingFolderId(folderId)}
                                  className="p-0.5 text-zinc-400 hover:text-zinc-600"
                                  title="重命名"
                                >
                                  <Pencil size={12} />
                                </button>
                                <button 
                                  onClick={async () => {
                                    if (window.confirm('确定要删除这个文件夹吗？文件夹内的文件将被移到根目录。')) {
                                      // 先将文件夹内的报告移到根目录
                                      const folderReportsList = Object.entries(reportsData.reports || {}).filter(([id, r]) => r.folderId === folderId);
                                      for (const [reportId] of folderReportsList) {
                                        await moveReportToFolder(reportId, null);
                                      }
                                      // 删除文件夹
                                      const data = await removeFolder(folderId);
                                      setReportsData(data);
                                      flash('文件夹已删除');
                                    }
                                  }}
                                  className="p-0.5 text-zinc-400 hover:text-red-500"
                                  title="删除"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </>
                            )}
                          </div>
                          {folderReports.length > 0 && (
                            <div className="pl-4">
                              {folderReports.map(([id, report]) => (
                                <FileItem key={id} id={id} report={report} setReportsData={setReportsData} flash={flash} currentReportId={currentReportId} setTitle={setTitle} setSubtitle={setSubtitle} setModules={setModules} setSel={setSel} setShowReportList={setShowReportList} modules={modules} apiAvailable={apiAvailable} />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {rootReports.length > 0 && (
                      <div>
                        <div className="p-2 text-xs text-zinc-400 font-medium">根目录</div>
                        {rootReports.map(([id, report]) => (
                          <FileItem key={id} id={id} report={report} setReportsData={setReportsData} flash={flash} isRoot currentReportId={currentReportId} setTitle={setTitle} setSubtitle={setSubtitle} setModules={setModules} setSel={setSel} setShowReportList={setShowReportList} modules={modules} apiAvailable={apiAvailable} />
                        ))}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
            <div className="p-2 border-t border-zinc-200">
              <button 
                onClick={async () => {
                  const newTitle = '新报告';
                  const newSubtitle = '';
                  const newModules = [];
                  const newId = 'report_' + Date.now();
                  
                  const isApiAvailable = apiStatus === 'online';
                  console.log('新建报告(列表), API可用:', isApiAvailable, 'apiStatus:', apiStatus);
                  
                  // 保存到 API（如果可用）
                  if (isApiAvailable) {
                    try {
                      await createReport({
                        id: newId,
                        title: newTitle,
                        subtitle: newSubtitle,
                        modules: newModules,
                        folderId: null,
                        created_by: 'user'
                      });
                      console.log('新报告已创建到 API:', newId);
                    } catch (error) {
                      console.error('创建报告到 API 失败:', error);
                    }
                  }
                  
                  // 同时保存到 localStorage
                  const data = loadAllReportsFromStorage();
                  data.reports[newId] = { 
                    id: newId,
                    title: newTitle, 
                    subtitle: newSubtitle, 
                    modules: newModules, 
                    folderId: null,
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                  };
                  saveAllReportsToStorage(data);
                  setReportsData(data);
                  currentReportId = newId;
                  localStorage.setItem('reportBuilderCurrentReport', newId);
                  setTitle(newTitle);
                  setSubtitle(newSubtitle);
                  setModules([]);
                  setSel(null);
                  setShowReportList(false);
                  flash('已创建新报告');
                }}
                className="w-full py-2 text-sm text-zinc-600 hover:bg-zinc-50 rounded flex items-center justify-center gap-2"
              >
                <Plus size={14} />新建报告
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-zinc-200">
        <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <input className="text-base font-bold text-zinc-900 tracking-tight bg-transparent outline-none flex-1 min-w-0 truncate" value={title} onChange={e => updateAndSave(e.target.value, subtitle, modules)} />
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button onClick={async () => {
              if (window.confirm('确定要新建报告吗？当前报告的更改会被保存。')) {
                // 保存当前报告到 localStorage
                saveCurrentReportToStorage({ title, subtitle, modules });
                const newTitle = '新报告';
                const newSubtitle = '';
                const newModules = [];
                const newReportId = `report_${Date.now()}`;
                
                const isApiAvailable = apiStatus === 'online';
                console.log('新建报告, API可用:', isApiAvailable, 'apiStatus:', apiStatus);
                
                // 保存到 API（如果可用）
                if (isApiAvailable) {
                  try {
                    await createReport({
                      id: newReportId,
                      title: newTitle,
                      subtitle: newSubtitle,
                      modules: newModules,
                      folderId: null,
                      created_by: 'user'
                    });
                    console.log('新报告已创建到 API:', newReportId);
                  } catch (error) {
                    console.error('创建报告到 API 失败:', error);
                  }
                }
                
                // 同时保存到 localStorage
                const allReports = loadAllReportsFromStorage();
                allReports.reports[newReportId] = { 
                  id: newReportId,
                  title: newTitle, 
                  subtitle: newSubtitle, 
                  modules: newModules,
                  folderId: null,
                  createdAt: Date.now(),
                  updatedAt: Date.now()
                };
                saveAllReportsToStorage(allReports);
                currentReportId = newReportId;
                localStorage.setItem('reportBuilderCurrentReport', newReportId);
                setTitle(newTitle);
                setSubtitle(newSubtitle);
                setModules(newModules);
                setSel(null);
                setReportsData(allReports);
                flash('已新建报告');
              }
            }} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded transition-colors"><FileText size={13}/>新建</button>
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded transition-colors"><Upload size={13}/>导入</button>
            <button onClick={() => setShowAiPanel(!showAiPanel)} className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded transition-colors ${showAiPanel ? 'bg-blue-600 text-white' : 'text-zinc-600 bg-blue-100 hover:bg-blue-200'}`}><Sparkles size={13}/>AI解析</button>
            <input ref={fileInputRef} type="file" accept=".md,.markdown,.txt,.csv" className="hidden" onChange={handleFileUpload} />
            <button onClick={() => setShowReportList(!showReportList)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded transition-colors"><List size={13}/>文件</button>
            <button onClick={async () => { await saveToAPI(); flash('✓ 报告已同步到服务器'); }} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors"><Save size={13}/>保存</button>
            <button onClick={dlHTML} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded transition-colors"><Download size={13}/>HTML</button>
            <button onClick={dlPDF} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-zinc-800 hover:bg-zinc-700 rounded transition-colors"><Download size={13}/>PDF</button>
            <button 
              onClick={toggleBatchMode} 
              className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded transition-colors ${isBatchMode ? 'bg-green-600 text-white' : 'text-zinc-600 bg-zinc-100 hover:bg-zinc-200'}`}
            >
              <CheckSquare size={13}/>
              {isBatchMode ? '批量中' : '批量'}
            </button>
          </div>
        </div>
      </header>

      {/* AI 解析面板 */}
      <AnimatePresence>
        {showAiPanel && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-b border-zinc-200 bg-blue-50 overflow-hidden"
          >
            <div className="p-4 max-w-4xl mx-auto">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="text-blue-600" size={16} />
                <span className="text-sm font-medium text-blue-800">AI 数据分析</span>
                <span className="text-xs text-blue-600">(使用 ollama.rnd.huawei.com/library/qwen3:1.7b 模型)</span>
                <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded">慎用，使用前务必与lihaoze确认是否可用</span>
                {!showApiKeyInput && (
                  <button 
                    onClick={() => setShowApiKeyInput(true)}
                    className="text-xs text-blue-500 hover:text-blue-700 underline ml-2"
                  >
                    修改 API Key
                  </button>
                )}
              </div>
              
              {showApiKeyInput && (
                <div className="mb-3 p-3 bg-white rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-medium text-blue-800">API Key 配置</span>
                  </div>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKeyState(e.target.value)}
                    placeholder="请输入 API Key"
                    className="w-full px-3 py-1.5 text-sm border border-blue-200 rounded focus:outline-none focus:border-blue-400"
                  />
                  <div className="flex justify-end gap-2 mt-2">
                    <button 
                      onClick={handleSaveApiKey}
                      disabled={!apiKey.trim()}
                      className={`px-3 py-1 text-xs font-medium rounded ${
                        apiKey.trim() ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-200 text-white cursor-not-allowed'
                      }`}
                    >
                      保存
                    </button>
                  </div>
                </div>
              )}
              
              <p className="text-xs text-blue-700 mb-2">
                <span className="font-semibold">输入报告内容：</span>直接输入报告文字，AI将自动提取数据并生成图表
              </p>
              <textarea
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                placeholder="请输入报告内容，可以包含：

1. 报告标题和章节标题
2. 数据描述（如：本月销售额100万，同比增长20%）
3. 表格数据（支持Excel/CSV格式粘贴）
4. 需要展示的具体图表要求

示例：
2024年Q1销售报告

一、整体业绩
本季度总销售额500万元，完成率105%，同比增长25%。
其中线上渠道300万，线下渠道200万。

二、产品线分析
产品A：销售额200万，占比40%
产品B：销售额150万，占比30%  
产品C：销售额100万，占比20%
其他：销售额50万，占比10%

三、区域分布
华东区 180万 | 华南区 120万 | 华北区 100万 | 其他 100万

请生成柱状图展示产品线数据，饼图展示区域分布..."
                className="w-full h-72 px-3 py-2 text-sm border border-blue-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 bg-white resize-none"
              />
              <div className="flex justify-end gap-2 mt-3">
                <button 
                  onClick={() => { setShowAiPanel(false); setAiInput(''); }}
                  className="px-4 py-1.5 text-xs text-zinc-600 hover:text-zinc-800"
                >
                  取消
                </button>
                <button 
                  onClick={handleAIParse}
                  disabled={aiLoading || !aiInput.trim()}
                  className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    aiLoading || !aiInput.trim() 
                      ? 'bg-blue-300 text-white cursor-not-allowed' 
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {aiLoading ? (
                    <>
                      <Sparkles className="animate-pulse" size={13} />
                      AI 解析中...
                    </>
                  ) : (
                    <>
                      <Sparkles size={13} />
                      开始解析
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Report area */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 sm:px-8 py-10">
            {/* Title */}
            <div className="mb-12 pb-6 border-b border-zinc-200">
              <input className="text-2xl font-bold text-zinc-900 tracking-tight bg-transparent outline-none w-full" value={title} onChange={e => updateAndSave(e.target.value, subtitle, modules)} placeholder="报告标题" />
              <input className="text-sm text-zinc-400 mt-2 bg-transparent outline-none w-full" value={subtitle} onChange={e => updateAndSave(title, e.target.value, modules)} placeholder="添加副标题..." />
              <div className="text-xs text-zinc-300 mt-3 font-mono">{new Date().toLocaleDateString('zh-CN', { year:'numeric', month:'long', day:'numeric' })}</div>
            </div>

            {/* Modules */}
            <div className="modules-container">
            {(() => {
              // 检查并修复重复的 ID
              const seenIds = new Set();
              const dedupedModules = modules.map(mod => {
                if (!mod.id || seenIds.has(mod.id)) {
                  const newId = uid();
                  console.warn('Duplicate or missing module ID found, assigning new ID:', mod.id, '->', newId);
                  return { ...mod, id: newId };
                }
                seenIds.add(mod.id);
                return mod;
              });
              
              // 如果有重复的 ID，更新状态
              if (dedupedModules.some((mod, i) => mod.id !== modules[i]?.id)) {
                setTimeout(() => {
                  updateAndSave(title, subtitle, dedupedModules);
                }, 0);
              }
              
              return dedupedModules.map((mod, idx) => {
                const isSelected = sel === mod.id;
                if (!mod.type || !viewR[mod.type]) {
                  console.warn('Invalid module:', mod);
                  return null;
                }

                const isLeftHalf = mod.layout === 'left';
                const isRightHalf = mod.layout === 'right';

                return (
                  <DraggableModule
                    key={mod.id}
                    mod={mod} 
                    isSelected={isSelected}
                    index={idx}
                    totalCount={modules.length}
                    dragStartIndex={dragStartIndex}
                    dragOverIndex={dragOverIndex}
                    dragOverPosition={dragOverPosition}
                    onDragStart={handleDragStartIndex}
                    onDragOver={handleDragOverIndex}
                    onDragEnd={handleDragEndIndex}
                    onToggleLayout={() => toggleLayout(mod.id)}
                    isLeftHalf={isLeftHalf}
                    isRightHalf={isRightHalf}
                    onSelect={() => {
                      if (!isSelected) {
                        setSel(mod.id);
                        // 不再滚动到顶部，而是让编辑面板显示在组件下方
                    } else {
                      setSel(null);
                    }
                  }}
                  onMoveUp={() => mv(mod.id, -1)}
                  onMoveDown={() => mv(mod.id, 1)}
                  onDelete={() => rm(mod.id)}
                  onReorder={(newIndex) => {
                    const oldIndex = modules.findIndex(m => m.id === mod.id);
                    if (oldIndex !== newIndex && newIndex >= 0 && newIndex < modules.length) {
                      const newModules = [...modules];
                      const [removed] = newModules.splice(oldIndex, 1);
                      newModules.splice(newIndex, 0, removed);
                      updateAndSave(title, subtitle, newModules);
                    }
                  }}
                  onUpdate={(arg1, arg2) => {
                    // 支持不同类型的更新
                    // 标题和文本组件: onUpdate(newContent)
                    // 列表组件: onUpdate(itemId, newText)
                    if (mod.type === 'text' || mod.type === 'note' || mod.type.startsWith('heading')) {
                      up(mod.id, o => {
                        o.data.content = arg1;
                        return o;
                      });
                    } else if (mod.type === 'ordered' || mod.type === 'unordered') {
                      const itemId = arg1;
                      const newText = arg2;
                      up(mod.id, o => {
                        const item = o.data.items.find(it => it.id === itemId);
                        if (item) {
                          item.text = newText;
                        }
                        return o;
                      });
                    }
                  }}
                  onChangeType={(newType) => {
                    // 切换文本类组件类型
                    up(mod.id, o => {
                      o.type = newType;
                      // 根据新类型初始化数据
                      if (newType === 'ordered' || newType === 'unordered') {
                        if (!o.data.items || o.data.items.length === 0) {
                          o.data.items = [{ id: uid(), text: o.data.content || '新项目' }];
                        }
                      } else if (newType === 'text' || newType === 'note' || newType.startsWith('heading')) {
                        if (!o.data.content) {
                          o.data.content = newType === 'note' ? '备注内容' : '文本内容';
                        }
                      }
                      return o;
                    });
                    flash(`✓ 已切换为${TYPES.find(t => t.type === newType)?.label || newType}`);
                  }}
                  onInsertBelow={(type) => {
                    // 在下方插入新组件，支持选择类型
                    const currentIndex = modules.findIndex(m => m.id === mod.id);
                    const newModule = cMod(type || 'text');
                    setModules(prev => {
                      const newModules = [...prev];
                      newModules.splice(currentIndex + 1, 0, newModule);
                      saveCurrentReportToStorage({ title, subtitle, modules: newModules });
                      return newModules;
                    });
                    setSel(newModule.id);
                    flash(`✓ 已插入${TYPES.find(t => t.type === (type || 'text'))?.label || '组件'}`);
                  }}
                  onImportExcel={async (module, file) => {
                    try {
                      flash('正在解析Excel文件...');
                      const excelData = await parseExcel(file);
                      console.log('Excel parsed data:', excelData);
                      const newData = convertExcelToModuleData(module.type, excelData);
                      console.log('Converted newData:', newData, 'for module:', module.id, 'type:', module.type);
                      
                      if (newData) {
                        up(module.id, o => {
                          console.log('Before update - o.data:', o.data);
                          // 对于表格类型，完全替换数据而不是合并
                          if (module.type === 'table') {
                            o.data = newData;
                          } else {
                            o.data = { ...o.data, ...newData };
                          }
                          console.log('After update - o.data:', o.data);
                          return o;
                        });
                        flash(`✓ 已成功导入 ${excelData.length - 1} 行数据`);
                      } else {
                        flash('✗ 无法解析Excel数据格式');
                      }
                    } catch (error) {
                      console.error('Excel导入失败:', error);
                      flash('✗ Excel导入失败: ' + error.message);
                    }
                  }}
                  onShowExcelFormat={(type, moduleId) => {
                    setExcelFormatModalType(type);
                    setExcelFormatModalModuleId(moduleId);
                    setShowExcelFormatModal(true);
                  }}
                  viewR={viewR}
                  editContent={editContent}
                  up={up}
                  TYPES={TYPES}
                  I={I}
                  ISmall={ISmall}
                  F={F}
                  AddBtn={AddBtn}
                  DelBtn={DelBtn}
                  EditableInput={EditableInput}
                  setSel={setSel}
                  COMPONENT_CATEGORIES={COMPONENT_CATEGORIES}
                  isBatchMode={isBatchMode}
                  isModuleSelected={selectedModules.has(mod.id)}
                  onToggleModuleSelection={toggleModuleSelection}
                  onSetBatchMoveTarget={moveSelectedModulesTo}
                />
              );
              });
            })()}
            </div>

            {/* 批量操作工具栏 */}
            {isBatchMode && (
              <div className="sticky bottom-0 left-0 right-0 bg-white border-t border-zinc-200 p-3 shadow-lg z-50">
                <div className="flex items-center justify-between max-w-3xl mx-auto">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-zinc-700">
                      已选择 {selectedModules.size} 个组件
                    </span>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={selectAllModules}
                        className="px-2 py-1 text-xs bg-zinc-100 hover:bg-zinc-200 rounded text-zinc-600"
                      >
                        全选
                      </button>
                      <button 
                        onClick={clearSelection}
                        className="px-2 py-1 text-xs bg-zinc-100 hover:bg-zinc-200 rounded text-zinc-600"
                      >
                        清空
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500">点击组件间区域可移动选中项</span>
                    <button 
                      onClick={deleteSelectedModules}
                      className="px-3 py-1.5 text-xs bg-red-50 hover:bg-red-100 text-red-600 rounded flex items-center gap-1"
                    >
                      <Trash2 size={12} />
                      删除
                    </button>
                    <button 
                      onClick={toggleBatchMode}
                      className="px-3 py-1.5 text-xs bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded"
                    >
                      退出
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Add module */}
            <div className="relative mt-6 mb-20">
              <button onClick={() => setAddOpen(!addOpen)} className="w-full py-2.5 border border-dashed border-zinc-200 rounded text-zinc-300 hover:text-zinc-500 hover:border-zinc-400 transition-colors flex items-center justify-center gap-1.5 text-sm">
                {addOpen ? <X size={14}/> : <Plus size={14}/>}{addOpen ? '收起' : '添加模块'}
              </button>
              <AnimatePresence>
                {addOpen && (
                  <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} className="absolute top-full mt-1.5 left-0 right-0 bg-white border border-zinc-200 rounded shadow-lg z-30 py-2 max-h-80 overflow-y-auto">
                    {Object.entries(COMPONENT_CATEGORIES).sort((a,b) => a[1].order - b[1].order).map(([catKey, catInfo]) => {
                      const catTypes = TYPES.filter(t => t.category === catKey);
                      if (catTypes.length === 0) return null;
                      return (
                        <div key={catKey} className="mb-2">
                          <div className="px-3 py-1 text-xs font-semibold text-zinc-400 uppercase tracking-wider bg-zinc-50">{catInfo.label}</div>
                          <div className="grid grid-cols-2">
                            {catTypes.map(t => {
                              const Icon = t.icon;
                              return <button key={t.type} onClick={() => add(t.type)} className="px-3 py-2 text-left flex items-center gap-2.5 hover:bg-zinc-50 transition-colors"><Icon size={14} className="text-zinc-400"/><span className="text-xs font-medium text-zinc-700">{t.label}</span></button>;
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </main>

        {/* 编辑面板已改为内联显示在每个组件下方 */}
      </div>
    </div>
  );
}
