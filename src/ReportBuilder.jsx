import React, { useState, useRef, useCallback, useMemo } from 'react';
import html2canvas from 'html2canvas';
import { marked } from 'marked';
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
  PieChart, ListOrdered, Gauge as ProgressIcon, GripVertical, Folder, FolderPlus
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

let _id = 0;
const uid = () => `_${Date.now()}_${++_id}_${Math.random().toString(36).substr(2, 9)}`;
const P = ['#1d4ed8','#047857','#b45309','#b91c1c','#6d28d9','#0e7490','#c2410c','#be185d'];

const FileItem = ({ id, report, setReportsData, flash, isRoot }) => {
  const currentReportId = localStorage.getItem('reportBuilderCurrentReport');
  const isCurrent = currentReportId === id;
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (e) => {
    e.dataTransfer.setData('reportId', id);
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  return (
    <div 
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`p-2 border-b border-zinc-100 hover:bg-zinc-50 cursor-pointer flex items-center gap-2 ${isCurrent ? 'bg-blue-50' : ''} ${isDragging ? 'opacity-50' : ''}`}
    >
      <FileText size={14} className="text-zinc-400 flex-shrink-0" />
      <div className="flex-1 min-w-0" onClick={(e) => {
        if (window.confirm('确定要打开这个报告吗？当前报告的更改会被保存。')) {
          saveCurrentReportToStorage({ title: document.querySelector('input[placeholder="报告标题"]')?.value || '新报告', subtitle: document.querySelector('input[placeholder="添加副标题..."]')?.value || '', modules });
          localStorage.setItem('reportBuilderCurrentReport', id);
          setTitle(report.title);
          setSubtitle(report.subtitle);
          setModules(report.modules || []);
          setSel(null);
          setShowReportList(false);
          flash('已打开报告');
        }
      }}>
        <div className="font-medium text-sm text-zinc-800 truncate">{report.title}</div>
        <div className="text-xs text-zinc-400 truncate">{report.subtitle || '无副标题'}</div>
      </div>
      <button 
        onClick={(e) => {
          e.stopPropagation();
          if (window.confirm('确定要删除这个报告吗？')) {
            const data = loadAllReportsFromStorage();
            delete data.reports[id];
            saveAllReportsToStorage(data);
            setReportsData(data);
            const currentReportId = localStorage.getItem('reportBuilderCurrentReport');
            if (currentReportId === id) {
              const remainingReports = Object.entries(data.reports);
              if (remainingReports.length > 0) {
                const [firstId, firstReport] = remainingReports[0];
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
        }}
        className="p-1 text-zinc-400 hover:text-red-500 rounded"
        title="删除"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
};

const TYPES = [
  { type:'heading1', label:'一级标题', icon:FileText },
  { type:'heading2', label:'二级标题', icon:FileText },
  { type:'heading3', label:'三级标题', icon:FileText },
  { type:'text', label:'文本', icon:FileText },
  { type:'kpi', label:'指标卡', icon:TrendingUp },
  { type:'table', label:'表格', icon:LayoutGrid },
  { type:'chart', label:'柱状图', icon:BarChart3 },
  { type:'funnel', label:'漏斗图', icon:Filter },
  { type:'line', label:'双轴折线', icon:Activity },
  { type:'radar', label:'雷达图', icon:Target },
  { type:'bubble', label:'气泡图', icon:Circle },
  { type:'comparison', label:'对比分析', icon:ArrowLeftRight },
  { type:'quadrant', label:'四象限', icon:Gauge },
  { type:'list', label:'要点列表', icon:List },
  { type:'pie', label:'饼图', icon:PieChart },
  { type:'ordered', label:'有序列表', icon:ListOrdered },
  { type:'unordered', label:'无序列表', icon:List },
  { type:'barline', label:'组合图', icon:BarChart3 },
  { type:'progress', label:'进度条', icon:ProgressIcon },
];

function DraggableModule({ mod, isSelected, onSelect, onMoveUp, onMoveDown, onDelete, onReorder, viewR, index, totalCount, dragStartIndex, dragOverIndex, dragOverPosition, onDragStart, onDragOver, onDragEnd }) {
  const handleDragStart = (e) => {
    e.dataTransfer.effectAllowed = 'move';
    onDragStart(index);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    const position = e.clientY < midpoint ? 'before' : 'after';
    onDragOver(index, position);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    onDragEnd();
  };

  const handleDragEnd = (e) => {
    onDragEnd();
  };

  const isBeingDragged = dragStartIndex === index;
  const isDropTarget = dragOverIndex === index && dragStartIndex !== null && dragStartIndex !== index;
  const showLineBefore = isDropTarget && dragOverPosition === 'before';
  const showLineAfter = isDropTarget && dragOverPosition === 'after';

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragEnd={handleDragEnd}
      data-module-id={mod.id}
      className={`group relative mb-6 rounded transition-all cursor-move ${isSelected ? 'ring-2 ring-blue-400 ring-offset-4' : ''} ${isBeingDragged ? 'opacity-30' : ''}`}
    >
      {showLineBefore && (
        <div className="absolute -top-3 left-0 right-0 h-0.5 bg-blue-400 rounded-full" />
      )}
      {showLineAfter && (
        <div className="absolute -bottom-3 left-0 right-0 h-0.5 bg-blue-400 rounded-full" />
      )}
      
      {/* Drag handle indicator */}
      <div className={`absolute left-1/2 -top-3 transform -translate-x-1/2 bg-white border border-zinc-200 rounded shadow-sm px-2 py-0.5 transition-opacity z-20 ${isSelected || isBeingDragged ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
        <GripVertical size={14} className="text-zinc-400" />
      </div>

      {/* Toolbar */}
      <div className={`absolute -top-3 right-0 flex items-center gap-0.5 bg-white border border-zinc-200 rounded shadow-sm px-1 py-0.5 transition-opacity z-10 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
        <button onClick={(e) => { e.stopPropagation(); onMoveUp(); }} className="p-1 text-zinc-400 hover:text-zinc-700 rounded" title="上移"><ChevronUp size={14}/></button>
        <button onClick={(e) => { e.stopPropagation(); onMoveDown(); }} className="p-1 text-zinc-400 hover:text-zinc-700 rounded" title="下移"><ChevronDown size={14}/></button>
        <button onClick={(e) => { e.stopPropagation(); onSelect(); }} className={`p-1 rounded ${isSelected ? 'text-blue-600 bg-blue-50' : 'text-zinc-400 hover:text-zinc-700'}`} title="编辑"><Pencil size={13}/></button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1 text-zinc-400 hover:text-red-500 rounded" title="删除"><Trash2 size={13}/></button>
      </div>

      {/* Content */}
      <div onClick={(e) => { e.stopPropagation(); onSelect(); }} className="cursor-pointer">
        {(() => {
          try {
            const Renderer = viewR[mod.type];
            if (!Renderer) return <div className="text-zinc-400 text-sm">Unknown type: {mod.type}</div>;
            const element = Renderer(mod);
            if (element === null || element === undefined) return <div className="text-zinc-400 text-sm">No content</div>;
            if (typeof element === 'function') return <div className="text-zinc-400 text-sm">Invalid content (function)</div>;
            return element;
          } catch (err) {
            console.error('Render error:', err);
            return <div className="text-zinc-400 text-sm">Render error: {err.message}</div>;
          }
        })()}
      </div>
    </div>
  );
}

const API_CONFIG = {
  baseURL: typeof window !== 'undefined' && window.location.hostname === 'localhost' 
    ? 'http://api.openai.rnd.huawei.com'
    : '/api/proxy',
  model: 'qwen3-30b-a3b-instruct-2507',
  getApiKey: () => localStorage.getItem('deepseek_api_key') || 'sk-1234'
};

const setApiKey = (key) => {
  localStorage.setItem('deepseek_api_key', key);
};

async function callDeepSeekAPI(stylePrompt, dataPrompt, analysisPrompt) {
  let basePrompt = 'Convert data to JSON component array.';
  if (analysisPrompt) {
    basePrompt += '\nAnalysis requirement:' + analysisPrompt;
  }
  basePrompt += '\n\n[CRITICAL RULES - MUST FOLLOW]';
  basePrompt += '\n1.Return ONLY a valid JSON array, no markdown, no explanations';
  basePrompt += '\n2.EVERY component MUST have complete data field with actual values from input';
  basePrompt += '\n3.NEVER return empty data or placeholder values';
  basePrompt += '\n4.Use ordered/unordered for lists instead of text paragraphs';
  basePrompt += '\n5.Each chart MUST be preceded by heading3 with descriptive title';
  basePrompt += '\n6.Use heading hierarchy: heading1 (report) -> heading2 (section) -> heading3 (chart)';
  basePrompt += '\n\n[Component Selection Guide]';
  basePrompt += '\n- Use "ordered" for numbered lists, steps, rankings';
  basePrompt += '\n- Use "unordered" for bullet points, features, findings';
  basePrompt += '\n- Use "list" for key-value pairs with bold labels';
  basePrompt += '\n- Use "text" ONLY for paragraphs without list structure';
  basePrompt += '\n- Use "chart" for bar charts with multiple series';
  basePrompt += '\n- Use "line" for trend data over time';
  basePrompt += '\n- Use "pie" for percentage distributions';
  basePrompt += '\n- Use "table" for structured tabular data';
  basePrompt += '\n\n[Colors] Use P[0]-P[5] only';
  basePrompt += '\nP[0]=blue P[1]=green P[2]=orange P[3]=red P[4]=purple P[5]=cyan';
  basePrompt += '\n\n[Examples]';
  basePrompt += '\nheading1:{"id":"_1","type":"heading1","title":"","data":{"content":"Report Title"}}';
  basePrompt += '\nheading2:{"id":"_2","type":"heading2","title":"","data":{"content":"Section Title"}}';
  basePrompt += '\nheading3:{"id":"_3","type":"heading3","title":"","data":{"content":"Chart Title"}}';
  basePrompt += '\nkpi:{"id":"_4","type":"kpi","title":"","config":{"cols":4},"data":{"items":[{"id":"_4_1","label":"Orders","value":"12500","change":15}]}}';
  basePrompt += '\nchart:{"id":"_5","type":"chart","title":"","data":{"series":[{"name":"Current","color":"P[0]"}],"items":[{"id":"_5_1","label":"A","values":[120]}]}}';
  basePrompt += '\nline:{"id":"_6","type":"line","title":"","data":{"series":[{"name":"Amount","color":"P[0]","axis":"left"}],"points":[{"id":"_6_1","x":"Jan","values":[100]}]}}';
  basePrompt += '\npie:{"id":"_7","type":"pie","title":"","data":{"items":[{"id":"_7_1","label":"A","value":35,"color":"P[0]"}]}}';
  basePrompt += '\ntable:{"id":"_8","type":"table","title":"","data":{"headers":["Item","Value"],"rows":[{"id":"_8_1","cells":["A","100"]}]}}';
  basePrompt += '\ntext:{"id":"_9","type":"text","title":"","data":{"content":"Analysis conclusion"}}';
  basePrompt += '\nordered:{"id":"_10","type":"ordered","title":"","data":{"items":[{"id":"_10_1","text":"First point"},{"id":"_10_2","text":"Second point"}]}}';
  basePrompt += '\nunordered:{"id":"_11","type":"unordered","title":"","data":{"items":[{"id":"_11_1","text":"Bullet 1"},{"id":"_11_2","text":"Bullet 2"}]}}';
  basePrompt += '\nlist:{"id":"_12","type":"list","title":"","data":{"items":[{"id":"_12_1","bold":"Label:","text":"Value description"}]}}';
  basePrompt += '\n\n[Data Requirements]';
  basePrompt += '\n1.ALL data fields MUST contain actual values from input data';
  basePrompt += '\n2.NEVER use empty strings "" or null for required data fields';
  basePrompt += '\n3.For charts: items array must have at least 1 entry with real values';
  basePrompt += '\n4.For lists: items array must have at least 1 entry with real text';
  basePrompt += '\n5.For tables: headers and rows must have actual content';
  basePrompt += '\n\nStyle:' + (stylePrompt || 'Professional');
  basePrompt += '\nData:' + dataPrompt;

  const prompt = basePrompt + '\n\nGenerate JSON component array from above data. Return JSON only, no other text.';

  try {
    const apiKey = API_CONFIG.getApiKey();
    if (!apiKey) {
      throw new Error('请先配置 API Key');
    }
    
    const response = await fetch(`${API_CONFIG.baseURL}/v1/chat/completions`, {
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
        max_tokens: 4096
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API 请求失败: ${response.status} - ${errorText}`);
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
      
      // 处理未完成的键值对（如 "name": 后面没有值）
      // 移除末尾的不完整键值对
      jsonStr = jsonStr.replace(/,\s*"[^"]*":\s*$/g, '');
      jsonStr = jsonStr.replace(/"[^"]*":\s*$/g, '');
      
      // 处理未完成的字符串值
      const lastColon = jsonStr.lastIndexOf(':');
      if (lastColon > 0) {
        const afterColon = jsonStr.substring(lastColon + 1).trim();
        if (afterColon === '"' || afterColon.startsWith('"') && !afterColon.endsWith('"') && !afterColon.includes(',')) {
          // 未完成的字符串值，移除这个键值对
          jsonStr = jsonStr.substring(0, lastColon);
          // 找到前面的逗号或左大括号
          let i = jsonStr.length - 1;
          while (i >= 0 && jsonStr[i] !== ',' && jsonStr[i] !== '{') {
            i--;
          }
          if (i >= 0 && jsonStr[i] === ',') {
            jsonStr = jsonStr.substring(0, i);
          }
        }
      }
      
      let openBraces = 0;
      let openBrackets = 0;
      let inString = false;
      let escapeNext = false;
      
      for (let i = jsonStr.length - 1; i >= 0; i--) {
        const char = jsonStr[i];
        if (escapeNext) {
          escapeNext = false;
          continue;
        }
        if (char === '\\') {
          escapeNext = true;
          continue;
        }
        if (char === '"') {
          inString = !inString;
        }
      }
      
      if (inString) {
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
        return null;
      }
    };
    
    let jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = tryParseIncompleteJSON(jsonMatch[0]);
      if (parsed && Array.isArray(parsed)) {
        console.log('成功解析数组，包含', parsed.length, '个模块');
        return parsed;
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
        return validItems;
      }
    }
    
    jsonMatch = text.match(/\{[\s\S]*"type"[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = tryParseIncompleteJSON(jsonMatch[0]);
      if (parsed) {
        if (parsed.modules && Array.isArray(parsed.modules)) {
          return parsed.modules;
        }
        if (parsed.type) {
          return [parsed];
        }
      }
    }
    
    // 尝试直接解析整个文本为JSON
    try {
      const directParsed = JSON.parse(text);
      if (Array.isArray(directParsed)) {
        return directParsed;
      }
      if (directParsed && directParsed.type) {
        return [directParsed];
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
        return items;
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
  const b = { id:uid(), type, title:TYPES.find(t=>t.type===type)?.label||'', subtitle:'' };
  switch(type) {
    case 'heading1': return {...b,data:{content:'一级标题'}};
    case 'heading2': return {...b,data:{content:'二级标题'}};
    case 'heading3': return {...b,data:{content:'三级标题'}};
    case 'text': return {...b,data:{content:'在此输入文本内容...'}};
    case 'kpi': return {...b,config:{cols:3},data:{items:[{id:uid(),label:'指标名',value:'0',change:0,unit:''}]}};
    case 'table': return {...b,data:{headers:['列1','列2','列3'],rows:[{id:uid(),cells:['','','']}]}};
    case 'chart': return {...b,data:{series:[{name:'系列1',color:P[0]}],items:[{id:uid(),label:'类别1',values:[100]}]}};
    case 'funnel': return {...b,data:{items:[{id:uid(),stage:'阶段1',cur:1000,prev:900},{id:uid(),stage:'阶段2',cur:600,prev:500}]}};
    case 'line': return {...b,config:{left:'左轴',right:'右轴(%)'},data:{series:[{name:'指标A',color:P[0],axis:'left'},{name:'指标B',color:P[1],axis:'right'}],points:[{id:uid(),x:'Day1',values:[100,40]}]}};
    case 'radar': return {...b,data:{dims:['维度1','维度2','维度3','维度4','维度5'],series:[{name:'系列1',color:P[0],values:[80,70,60,90,75]}]}};
    case 'bubble': return {...b,config:{x:'X轴',y:'Y轴',z:'气泡'},data:{groups:[{id:uid(),name:'组1',color:P[0],pts:[{id:uid(),x:50,y:60,z:80,label:'A'}]}]}};
    case 'comparison': return {...b,data:{items:[{id:uid(),name:'指标',action:'措施',before:0,after:0}]}};
    case 'quadrant': return {...b,config:{x:'X轴',y:'Y轴'},data:{points:[{id:uid(),x:30,y:70,name:'A',color:P[0]},{id:uid(),x:80,y:20,name:'B',color:P[1]},{id:uid(),x:20,y:30,name:'C',color:P[2]},{id:uid(),x:70,y:80,name:'D',color:P[3]}]}};
    case 'list': return {...b,data:{items:[{id:uid(),bold:'',text:'要点内容'}]}};
    case 'pie': return {...b,data:{items:[{id:uid(),label:'类别A',value:35,color:P[0]},{id:uid(),label:'类别B',value:28,color:P[1]},{id:uid(),label:'类别C',value:20,color:P[2]},{id:uid(),label:'其他',value:17,color:P[3]}]}};
    case 'ordered': return {...b,data:{items:[{id:uid(),text:'第一步：收集数据'},{id:uid(),text:'第二步：分析趋势'},{id:uid(),text:'第三步：生成报告'}]}};
    case 'unordered': return {...b,data:{items:[{id:uid(),text:'确保数据准确性'},{id:uid(),text:'及时更新最新数据'},{id:uid(),text:'定期检查系统运行'}]}};
    case 'barline': return {...b,config:{bar:'销售额',line:'增长率'},data:{barSeries:['销售额'],lineSeries:['增长率'],items:[{id:uid(),label:'1月',barValues:[100],lineValues:[5]},{id:uid(),label:'2月',barValues:[120],lineValues:[20]},{id:uid(),label:'3月',barValues:[150],lineValues:[25]}]}};
    case 'progress': return {...b,data:{items:[{id:uid(),label:'销售目标',current:75,total:100,unit:'%'},{id:uid(),label:'新客开发',current:320,total:500,unit:'人'}]}};
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
          if(m.type==='chart'){
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

const BubbleTip = ({active,payload}) => {
  if(!active||!payload?.length) return null;
  const d = payload[0]?.payload;
  return d ? <div className="bg-white p-2 rounded shadow border border-zinc-100 text-xs"><div className="font-semibold">{d.label}</div><div className="text-zinc-400">X:{d.x} Y:{d.y} Z:{d.z}</div></div> : null;
};

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

const saveAllReportsToStorage = (data) => {
  try {
    localStorage.setItem('reportBuilderReports', JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save reports to localStorage:', error);
  }
};

const loadCurrentReportFromStorage = () => {
  try {
    const currentReportId = localStorage.getItem('reportBuilderCurrentReport');
    const data = loadAllReportsFromStorage();
    const reports = data.reports || {};
    if (currentReportId && reports[currentReportId]) {
      return reports[currentReportId];
    }
    const reportKeys = Object.keys(reports);
    if (reportKeys.length > 0) {
      const firstReportId = reportKeys[0];
      localStorage.setItem('reportBuilderCurrentReport', firstReportId);
      return reports[firstReportId];
    }
  } catch (error) {
    console.error('Failed to load current report from localStorage:', error);
    localStorage.removeItem('reportBuilderCurrentReport');
    localStorage.removeItem('reportBuilderReports');
  }
  return { title: '新报告', subtitle: '', modules: [] };
};

const saveCurrentReportToStorage = (report) => {
  try {
    const data = loadAllReportsFromStorage();
    const currentReportId = localStorage.getItem('reportBuilderCurrentReport') || `report_${Date.now()}`;
    const cleanReport = {
      ...report,
      modules: (report.modules || []).filter(m => m && m.id)
    };
    data.reports[currentReportId] = cleanReport;
    saveAllReportsToStorage(data);
    localStorage.setItem('reportBuilderCurrentReport', currentReportId);
  } catch (error) {
    console.error('Failed to save current report to localStorage:', error);
  }
};

export default function ReportBuilder() {
  const initialData = loadCurrentReportFromStorage();
  const [title, setTitle] = useState(initialData.title);
  const [subtitle, setSubtitle] = useState(initialData.subtitle);
  const [modules, setModules] = useState(() => (initialData.modules || []).filter(m => m && m.id));
  const [reportsData, setReportsData] = useState(() => {
    try {
      return loadAllReportsFromStorage();
    } catch (e) {
      console.error('Failed to load reports:', e);
      return { folders: {}, reports: {} };
    }
  });
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
  const fileInputRef = useRef(null);

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
      if (dragOverPosition === 'before') {
        newIndex = dragOverIndex;
      } else {
        newIndex = dragOverIndex + 1;
      }
      
      if (newIndex > dragStartIndex) {
        newIndex = newIndex - 1;
      }
      
      if (newIndex >= 0 && newIndex < modules.length && newIndex !== dragStartIndex) {
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
          const result = await callDeepSeekAPI(aiStyleInput, aiInput, aiAnalysisInput);
          
          if (Array.isArray(result) && result.length > 0) {
            console.log('AI 返回的组件:', result.map(i => i.type));
            const validTypes = ['heading1', 'heading2', 'heading3', 'text', 'kpi', 'table', 'chart', 'line', 'radar', 'bubble', 'funnel', 'comparison', 'quadrant', 'list', 'pie', 'ordered', 'unordered', 'barline', 'progress'];
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
            
            updateAndSave(title, subtitle, [...modules, ...newModules]);
            flash(`✓ AI 解析成功，添加了 ${newModules.length} 个组件`);
            setAiInput('');
            setAiStyleInput('');
            setAiAnalysisInput('');
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

  // 更新状态并保存到本地存储
  const updateAndSave = (newTitle = title, newSubtitle = subtitle, newModules = modules) => {
    setTitle(newTitle);
    setSubtitle(newSubtitle);
    setModules(newModules);
    saveCurrentReportToStorage({ title: newTitle, subtitle: newSubtitle, modules: newModules });
    setReportsData(loadAllReportsFromStorage());
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
      const newModules = p.map(m => m.id === id ? fn(JSON.parse(JSON.stringify(m))) : m);
      const filtered = newModules.filter(m => m && m.id);
      saveCurrentReportToStorage({ title, subtitle, modules: filtered });
      return filtered;
    });
  };
  const rm = id => {
    console.log('删除模块:', id);
    setModules(p => {
      const newModules = p.filter(m => m && m.id !== id);
      console.log('删除后剩余模块:', newModules.length);
      saveCurrentReportToStorage({ title, subtitle, modules: newModules });
      return newModules;
    });
    if (sel === id) setSel(null);
  };
  const mv = (id, d) => {
    console.log('移动模块:', id, '方向:', d);
    setModules(p => {
      const cleanP = p.filter(m => m && m.id);
      const i = cleanP.findIndex(m => m.id === id);
      console.log('当前索引:', i, '总数:', cleanP.length);
      if (i === -1 || (d===-1&&i===0)||(d===1&&i===cleanP.length-1)) return cleanP;
      const n=[...cleanP];
      [n[i],n[i+d]]=[n[i+d],n[i]];
      console.log('移动后顺序:', n.map(m => m.id));
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

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

 const dlHTML = async () => {
  flash('正在生成图表截图...');

  // 1. 截取所有 Recharts 图表
  const chartImages = {};
  for (const mod of modules) {
    if (['line', 'radar', 'bubble', 'comparison', 'chart'].includes(mod.type)) {
      const el = document.querySelector(`[data-module-id="${mod.id}"] .recharts-wrapper`);
      if (el) {
        try {
          const canvas = await html2canvas(el, { backgroundColor: '#ffffff', scale: 2 });
          chartImages[mod.id] = canvas.toDataURL('image/png');
        } catch (e) {
          console.error('截图失败:', mod.title, e);
        }
      }
    }
  }

  // 2. 生成 HTML（传入截图数据）
  const html = genHTML(title, subtitle, modules, chartImages);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title || 'report'}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  flash('✓ 已下载 HTML（含图表）');
};

  const dlPDF = () => {
    const html = genHTML(title, subtitle, modules);
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => { try { w.print(); } catch(e) {} }, 600); flash('打印窗口已打开 → 选择"另存为 PDF"'); }
    else { dlHTML(); flash('弹窗被拦截，已改为下载 HTML'); }
  };

  const selMod = sel ? modules.find(m => m.id === sel) : null;
  const chartTip = { contentStyle: { borderRadius: '4px', border: '1px solid #e4e4e7', fontSize: 12 } };

  // ─── VIEW RENDERERS ───
  const vHeading1 = m => <h1 className="text-2xl font-bold text-zinc-900 border-b-2 border-zinc-200 pb-3 mb-4">{typeof m.data?.content === 'string' ? m.data.content : ''}</h1>;
  const vHeading2 = m => <h2 className="text-lg font-semibold text-zinc-800 mb-3">{typeof m.data?.content === 'string' ? m.data.content : ''}</h2>;
  const vHeading3 = m => <h3 className="text-base font-medium text-zinc-700 mb-2">{typeof m.data?.content === 'string' ? m.data.content : ''}</h3>;
  const vText = m => <p className="text-sm leading-loose text-zinc-600">{typeof m.data?.content === 'string' ? m.data.content : ''}</p>;

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
    if (headers.length === 0) return <div className="text-zinc-400 text-sm">暂无数据</div>;
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm"><thead><tr className="border-b-2 border-zinc-300">{headers.map((h,i) => <th key={i} className="px-3 py-2 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">{typeof h === 'string' ? h : ''}</th>)}</tr></thead>
        <tbody>{rows.map(r => <tr key={r.id} className="border-b border-zinc-100">{r.cells.map((c,ci) => <td key={ci} className={`px-3 py-2 ${ci===0?'font-medium text-zinc-800':'text-zinc-500'}`}>{typeof c === 'string' ? c : String(c || '')}</td>)}</tr>)}</tbody></table>
      </div>
    );
  };

  const vChart = m => {
    const items = m.data?.items || [];
    const series = m.data?.series || [];
    if (items.length === 0 || series.length === 0) return <div className="text-zinc-400 text-sm">暂无数据</div>;
    const cd = items.map(it => { const d = {name:it.label}; series.forEach((s,si) => { d[s.name]=it.values?.[si]||0; }); return d; });
    return <ResponsiveContainer width="100%" height={240}><BarChart data={cd} margin={{top:8,right:8,bottom:24,left:0}}><CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false}/><XAxis dataKey="name" tick={{fontSize:11,fill:'#71717a'}} axisLine={{stroke:'#d4d4d8'}}/><YAxis tick={{fontSize:11,fill:'#71717a'}} axisLine={false} tickLine={false}/><Tooltip {...chartTip}/>{series.length>1&&<Legend iconSize={8} verticalAlign="bottom" height={36}/>}{series.map((s,i) => <Bar key={i} dataKey={s.name} fill={getColor(s.color, i)} radius={[2,2,0,0]} maxBarSize={40}/>)}</BarChart></ResponsiveContainer>;
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
        {its.length>1 && <div className="mt-3 pt-2 border-t border-zinc-100 text-center text-xs text-zinc-400">端到端：本月 <span className="font-semibold text-zinc-700">{((its[its.length-1].cur/its[0].cur)*100).toFixed(1)}%</span> / 上月 {((its[its.length-1].prev/its[0].prev)*100).toFixed(1)}%</div>}
      </div>
    );
  };

  const vLine = m => {
    const points = m.data?.points || [];
    const series = m.data?.series || [];
    if (points.length === 0 || series.length === 0) return <div className="text-zinc-400 text-sm">暂无数据</div>;
    const cd = points.map(pt => { const d = {name:pt.x}; series.forEach((s,si) => { d[s.name]=pt.values?.[si]||0; }); return d; });
    const hL = series.some(s => s.axis==='left');
    const hR = series.some(s => s.axis==='right');
    return <ResponsiveContainer width="100%" height={260}><ComposedChart data={cd} margin={{top:8,right:8,bottom:24,left:0}}><CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false}/><XAxis dataKey="name" tick={{fontSize:10,fill:'#71717a'}} axisLine={{stroke:'#d4d4d8'}}/>{hL&&<YAxis yAxisId="left" tick={{fontSize:10,fill:'#71717a'}} axisLine={false} tickLine={false}/>}{hR&&<YAxis yAxisId="right" orientation="right" tick={{fontSize:10,fill:'#71717a'}} axisLine={false} tickLine={false}/>}<Tooltip {...chartTip}/><Legend iconSize={8} verticalAlign="bottom" height={36}/>{series.map((s,i) => { const color = getColor(s.color, i); return <Line key={i} yAxisId={s.axis} type="monotone" dataKey={s.name} stroke={color} strokeWidth={2} dot={{r:2.5,fill:'#fff',stroke:color,strokeWidth:2}}/>; })}</ComposedChart></ResponsiveContainer>;
  };

  const vRadar = m => {
    const dims = m.data?.dims || [];
    const series = m.data?.series || [];
    if (dims.length === 0 || series.length === 0) return <div className="text-zinc-400 text-sm">暂无数据</div>;
    const rd = dims.map((d,i) => { const o = {dim:d}; series.forEach(s => { o[s.name]=s.values?.[i]||0; }); return o; });
    return <div className="flex justify-center"><ResponsiveContainer width="100%" height={300}><RadarChart data={rd} cx="50%" cy="50%" outerRadius="70%" margin={{top:8,right:8,bottom:24,left:0}}><PolarGrid stroke="#e4e4e7"/><PolarAngleAxis dataKey="dim" tick={{fontSize:11,fill:'#52525b'}}/><PolarRadiusAxis angle={90} tick={{fontSize:9,fill:'#a1a1aa'}} domain={[0,'auto']}/>{series.map((s,i) => { const color = getColor(s.color, i); return <Radar key={i} name={s.name} dataKey={s.name} stroke={color} fill={color} fillOpacity={0.06} strokeWidth={2}/>; })}<Legend iconSize={8} verticalAlign="bottom" height={36}/><Tooltip {...chartTip}/></RadarChart></ResponsiveContainer></div>;
  };

  const vBubble = m => {
    const groups = m.data?.groups || [];
    if (groups.length === 0) return <div className="text-zinc-400 text-sm">暂无数据</div>;
    return <ResponsiveContainer width="100%" height={300}><ScatterChart margin={{top:12,right:20,bottom:36,left:4}}><CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7"/><XAxis type="number" dataKey="x" name={m.config?.x} tick={{fontSize:10,fill:'#71717a'}} axisLine={{stroke:'#d4d4d8'}} label={{value:m.config?.x||'',position:'insideBottom',offset:-6,style:{fontSize:10,fill:'#a1a1aa'}}}/><YAxis type="number" dataKey="y" name={m.config?.y} tick={{fontSize:10,fill:'#71717a'}} axisLine={false} tickLine={false} label={{value:m.config?.y||'',angle:-90,position:'insideLeft',style:{fontSize:10,fill:'#a1a1aa'}}}/><ZAxis type="number" dataKey="z" range={[50,400]} name={m.config?.z}/><Tooltip content={<BubbleTip/>}/><Legend iconSize={8} verticalAlign="bottom" height={36}/>{groups.map((g, i) => { const color = getColor(g.color, i); return <Scatter key={g.id} name={g.name} data={g.pts} fill={color} fillOpacity={0.45} stroke={color} strokeWidth={1.5}/>; })}</ScatterChart></ResponsiveContainer>;
  };

  const vComparison = m => {
    const items = m.data?.items || [];
    if (items.length === 0) return <div className="text-zinc-400 text-sm">暂无数据</div>;
    const cd = items.map(it => ({name:it.name,'优化前':it.before,'优化后':it.after}));
    return (
      <div>
        <ResponsiveContainer width="100%" height={Math.max(items.length * 56, 120)}><BarChart data={cd} margin={{top:4,right:12,bottom:24,left:0}} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" horizontal={false}/><XAxis type="number" tick={{fontSize:10,fill:'#71717a'}} axisLine={{stroke:'#d4d4d8'}}/><YAxis dataKey="name" type="category" width={100} tick={{fontSize:11,fill:'#3f3f46'}} axisLine={false} tickLine={false}/><Tooltip {...chartTip}/><Legend iconSize={8} verticalAlign="bottom" height={36}/><Bar dataKey="优化前" fill="#fca5a5" radius={[0,2,2,0]} maxBarSize={16}/><Bar dataKey="优化后" fill="#047857" radius={[0,2,2,0]} maxBarSize={16}/></BarChart></ResponsiveContainer>
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
    let accumulatedAngle = 0;
    const gradientParts = items.map((it, idx) => {
      const color = it.color?.startsWith('P[') ? P[parseInt(it.color.slice(2, -1))] || P[idx % P.length] : it.color || P[idx % P.length];
      const angle = total > 0 ? (it.value / total) * 360 : 0;
      const startAngle = accumulatedAngle;
      accumulatedAngle += angle;
      return `${color} ${startAngle}deg ${accumulatedAngle}deg`;
    });
    return (
      <div className="flex items-center gap-8">
        <div 
          className="relative w-40 h-40 flex-shrink-0 transition-transform duration-200"
          style={{background: `conic-gradient(${gradientParts.join(', ')})`, borderRadius: '50%'}}
          onMouseEnter={() => setHoveredIdx(-1)}
          onMouseLeave={() => setHoveredIdx(null)}
        >
        </div>
        <div className="flex-1">
          {items.map((it, idx) => {
            const color = it.color?.startsWith('P[') ? P[parseInt(it.color.slice(2, -1))] || P[idx % P.length] : it.color || P[idx % P.length];
            const pct = total > 0 ? (it.value / total * 100).toFixed(1) : 0;
            return (
              <div 
                key={it.id} 
                className={`flex items-center gap-2 mb-2 p-2 rounded transition-all duration-200 cursor-pointer ${hoveredIdx === idx ? 'bg-zinc-100 shadow-sm' : ''}`}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                <span className="w-3 h-3 rounded flex-shrink-0" style={{background: color, transform: hoveredIdx === idx ? 'scale(1.2)' : 'scale(1)', transition: 'transform 0.2s'}}></span>
                <span className="text-sm text-zinc-600 flex-1">{typeof it.label === 'string' ? it.label : ''}</span>
                <span className="text-sm font-semibold text-zinc-800">{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const vOrdered = m => {
    const items = m.data?.items || [];
    if (items.length === 0) return <div className="text-zinc-400 text-sm">暂无数据</div>;
    return (
      <ol className="list-decimal list-inside space-y-2 text-sm text-zinc-600">
        {items.map(it => <li key={it.id} className="leading-relaxed">{typeof it.text === 'string' ? it.text : String(it.text || '')}</li>)}
      </ol>
    );
  };

  const vUnordered = m => {
    const items = m.data?.items || [];
    if (items.length === 0) return <div className="text-zinc-400 text-sm">暂无数据</div>;
    return (
      <ul className="list-disc list-inside space-y-2 text-sm text-zinc-600">
        {items.map(it => <li key={it.id} className="leading-relaxed">{typeof it.text === 'string' ? it.text : String(it.text || '')}</li>)}
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
    return (
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={cd} margin={{top:8,right:8,bottom:24,left:0}}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false}/>
          <XAxis dataKey="name" tick={{fontSize:10,fill:'#71717a'}} axisLine={{stroke:'#d4d4d8'}}/>
          {hasBar && <YAxis yAxisId="left" tick={{fontSize:10,fill:'#71717a'}} axisLine={false} tickLine={false}/>}
          {hasLine && <YAxis yAxisId="right" orientation="right" tick={{fontSize:10,fill:'#71717a'}} axisLine={false} tickLine={false}/>}
          <Tooltip {...chartTip}/>
          <Legend iconSize={8} verticalAlign="bottom" height={36}/>
          {hasBar && (m.data.barSeries || []).map((s, i) => 
            <Bar key={i} yAxisId="left" dataKey={s} fill={P[i % P.length]} radius={[2,2,0,0]} maxBarSize={30}/>
          )}
          {hasLine && (m.data.lineSeries || []).map((s, i) => 
            <Line key={`line-${i}`} yAxisId="right" type="monotone" dataKey={s} stroke={P[(i + (m.data.barSeries || []).length) % P.length]} strokeWidth={2} dot={{r:3,fill:'#fff',strokeWidth:2}}/>
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

  const viewR = { heading1:vHeading1, heading2:vHeading2, heading3:vHeading3, text:vText, kpi:vKpi, table:vTable, chart:vChart, funnel:vFunnel, line:vLine, radar:vRadar, bubble:vBubble, comparison:vComparison, quadrant:vQuadrant, list:vList, pie:vPie, ordered:vOrdered, unordered:vUnordered, barline:vBarline, progress:vProgress };

  // ─── EDIT PANEL ───
  const F = ({label,children}) => <div className="mb-4"><label className="block text-xs font-medium text-zinc-400 mb-1">{label}</label>{children}</div>;
  const AddBtn = ({onClick,label}) => <button onClick={onClick} className="text-xs text-blue-700 hover:text-blue-900 font-medium flex items-center gap-1 mt-2"><Plus size={11}/>{label}</button>;
  const DelBtn = ({onClick}) => <button onClick={onClick} className="p-0.5 text-zinc-300 hover:text-red-500 flex-shrink-0"><Trash2 size={12}/></button>;

  const editContent = (m) => {
    if (!m) return null;
    switch(m.type) {
      case 'heading1': return <F label="标题内容"><input className={I} value={m.data.content} onChange={e => up(m.id, o => { o.data.content = e.target.value; return o; })} /></F>;
      case 'heading2': return <F label="标题内容"><input className={I} value={m.data.content} onChange={e => up(m.id, o => { o.data.content = e.target.value; return o; })} /></F>;
      case 'heading3': return <F label="标题内容"><input className={I} value={m.data.content} onChange={e => up(m.id, o => { o.data.content = e.target.value; return o; })} /></F>;
      case 'text': return <F label="内容"><textarea 
        className={`${I}`} 
        style={{minHeight:'100px', resize: 'none'}}
        value={m.data.content} 
        onChange={(e) => {
          up(m.id, o => {
            o.data.content = e.target.value;
            return o;
          });
        }}
      /></F>;
      case 'kpi': return <>
        <F label="列数"><div className="flex gap-1.5">{[2,3,4].map(n=><button key={n} onClick={()=>up(m.id,o=>{o.config.cols=n;return o;})} className={`px-3 py-1 rounded text-xs font-medium ${m.config?.cols===n?'bg-zinc-800 text-white':'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'}`}>{n}列</button>)}</div></F>
        {m.data.items.map((it,i)=><div key={it.id} className="flex gap-1.5 mb-2 flex-wrap items-end"><div className="flex-1" style={{minWidth:'50px'}}><span className="text-xs text-zinc-300">标签</span><input className={ISmall+' w-full'} value={it.label} onChange={e=>up(m.id,o=>{o.data.items[i].label=e.target.value;return o;})}/></div><div className="w-16"><span className="text-xs text-zinc-300">值</span><input className={ISmall+' w-full'} value={it.value} onChange={e=>up(m.id,o=>{o.data.items[i].value=e.target.value;return o;})}/></div><div className="w-14"><span className="text-xs text-zinc-300">%</span><input className={ISmall+' w-full'} type="number" value={it.change} onChange={e=>up(m.id,o=>{o.data.items[i].change=parseFloat(e.target.value)||0;return o;})}/></div><DelBtn onClick={()=>up(m.id,o=>{o.data.items.splice(i,1);return o;})}/></div>)}
        <AddBtn onClick={()=>up(m.id,o=>{o.data.items.push({id:uid(),label:'',value:'',change:0,unit:''});return o;})} label="添加指标"/>
      </>;
      case 'table': return <>
        <F label="表头">{m.data.headers.map((h,i)=><div key={i} className="flex items-center gap-1.5 mb-1"><input className={ISmall+' flex-1'} value={h} onChange={e=>up(m.id,o=>{o.data.headers[i]=e.target.value;return o;})}/>{m.data.headers.length>1&&<DelBtn onClick={()=>up(m.id,o=>{o.data.headers.splice(i,1);o.data.rows.forEach(r=>r.cells.splice(i,1));return o;})}/>}</div>)}<AddBtn onClick={()=>up(m.id,o=>{o.data.headers.push(`列${o.data.headers.length+1}`);o.data.rows.forEach(r=>r.cells.push(''));return o;})} label="添加列"/></F>
        <F label="行数据">{m.data.rows.map((r,ri)=><div key={r.id} className="flex gap-1 mb-1 items-center">{r.cells.map((c,ci)=><input key={ci} className={ISmall+' flex-1'} value={c} onChange={e=>up(m.id,o=>{o.data.rows[ri].cells[ci]=e.target.value;return o;})}/>)}<DelBtn onClick={()=>up(m.id,o=>{o.data.rows.splice(ri,1);return o;})}/></div>)}<AddBtn onClick={()=>up(m.id,o=>{o.data.rows.push({id:uid(),cells:o.data.headers.map(()=>'')});return o;})} label="添加行"/></F>
      </>;
      case 'chart': return <>
        <F label="系列">{m.data.series.map((s,i)=><div key={i} className="flex items-center gap-1.5 mb-1"><input type="color" value={s.color} className="w-5 h-5 rounded cursor-pointer border-0 flex-shrink-0" onChange={e=>up(m.id,o=>{o.data.series[i].color=e.target.value;return o;})}/><input className={ISmall+' flex-1'} value={s.name} onChange={e=>up(m.id,o=>{o.data.series[i].name=e.target.value;return o;})}/>{m.data.series.length>1&&<DelBtn onClick={()=>up(m.id,o=>{o.data.series.splice(i,1);o.data.items.forEach(it=>it.values.splice(i,1));return o;})}/>}</div>)}<AddBtn onClick={()=>up(m.id,o=>{const ci=o.data.series.length;o.data.series.push({name:`系列${ci+1}`,color:P[ci%P.length]});o.data.items.forEach(it=>it.values.push(0));return o;})} label="添加系列"/></F>
        <F label="数据">{m.data.items.map((it,i)=><div key={it.id} className="flex gap-1 mb-1 items-center flex-wrap"><input className={ISmall+' w-16'} value={it.label} placeholder="类别" onChange={e=>up(m.id,o=>{o.data.items[i].label=e.target.value;return o;})}/>{it.values.map((v,vi)=><input key={vi} className={ISmall+' w-14'} type="number" value={v} onChange={e=>up(m.id,o=>{o.data.items[i].values[vi]=parseFloat(e.target.value)||0;return o;})}/>)}<DelBtn onClick={()=>up(m.id,o=>{o.data.items.splice(i,1);return o;})}/></div>)}<AddBtn onClick={()=>up(m.id,o=>{o.data.items.push({id:uid(),label:'',values:o.data.series.map(()=>0)});return o;})} label="添加数据"/></F>
      </>;
      case 'funnel': return <>
        <F label="阶段">{m.data.items.map((it,i)=><div key={it.id} className="flex gap-1.5 mb-2 items-center flex-wrap"><input className={ISmall+' flex-1'} style={{minWidth:'50px'}} value={it.stage} placeholder="阶段" onChange={e=>up(m.id,o=>{o.data.items[i].stage=e.target.value;return o;})}/><div className="text-xs text-zinc-300">本</div><input className={ISmall+' w-16'} type="number" value={it.cur} onChange={e=>up(m.id,o=>{o.data.items[i].cur=parseFloat(e.target.value)||0;return o;})}/><div className="text-xs text-zinc-300">上</div><input className={ISmall+' w-16'} type="number" value={it.prev} onChange={e=>up(m.id,o=>{o.data.items[i].prev=parseFloat(e.target.value)||0;return o;})}/><DelBtn onClick={()=>up(m.id,o=>{o.data.items.splice(i,1);return o;})}/></div>)}<AddBtn onClick={()=>up(m.id,o=>{o.data.items.push({id:uid(),stage:'',cur:0,prev:0});return o;})} label="添加阶段"/></F>
      </>;
      case 'line': return <>
        <div className="flex gap-2 mb-3"><div className="flex-1"><span className="text-xs text-zinc-300">左轴</span><input className={ISmall+' w-full'} value={m.config.left} onChange={e=>up(m.id,o=>{o.config.left=e.target.value;return o;})}/></div><div className="flex-1"><span className="text-xs text-zinc-300">右轴</span><input className={ISmall+' w-full'} value={m.config.right} onChange={e=>up(m.id,o=>{o.config.right=e.target.value;return o;})}/></div></div>
        <F label="系列">{m.data.series.map((s,i)=><div key={i} className="flex items-center gap-1.5 mb-1"><input type="color" value={s.color} className="w-5 h-5 rounded cursor-pointer border-0 flex-shrink-0" onChange={e=>up(m.id,o=>{o.data.series[i].color=e.target.value;return o;})}/><input className={ISmall+' flex-1'} value={s.name} onChange={e=>up(m.id,o=>{o.data.series[i].name=e.target.value;return o;})}/><button onClick={()=>up(m.id,o=>{o.data.series[i].axis=o.data.series[i].axis==='left'?'right':'left';return o;})} className={`text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${s.axis==='left'?'bg-zinc-800 text-white':'bg-zinc-100 text-zinc-500'}`}>{s.axis==='left'?'L':'R'}</button>{m.data.series.length>1&&<DelBtn onClick={()=>up(m.id,o=>{o.data.series.splice(i,1);o.data.points.forEach(p=>p.values.splice(i,1));return o;})}/>}</div>)}<AddBtn onClick={()=>up(m.id,o=>{const ci=o.data.series.length;o.data.series.push({name:`系列${ci+1}`,color:P[ci%P.length],axis:'right'});o.data.points.forEach(p=>p.values.push(0));return o;})} label="添加系列"/></F>
        <F label="数据">{m.data.points.map((pt,i)=><div key={pt.id} className="flex gap-1 mb-1 items-center flex-wrap"><input className={ISmall+' w-14'} value={pt.x} placeholder="X" onChange={e=>up(m.id,o=>{o.data.points[i].x=e.target.value;return o;})}/>{pt.values.map((v,vi)=><input key={vi} className={ISmall+' w-12'} type="number" value={v} onChange={e=>up(m.id,o=>{o.data.points[i].values[vi]=parseFloat(e.target.value)||0;return o;})}/>)}<DelBtn onClick={()=>up(m.id,o=>{o.data.points.splice(i,1);return o;})}/></div>)}<AddBtn onClick={()=>up(m.id,o=>{o.data.points.push({id:uid(),x:'',values:o.data.series.map(()=>0)});return o;})} label="添加点"/></F>
      </>;
      case 'radar': return <>
        <F label="维度"><div className="flex flex-wrap gap-1">{m.data.dims.map((d,i)=><div key={i} className="flex items-center gap-0.5 bg-zinc-50 rounded px-1.5 py-0.5"><input className="bg-transparent text-xs outline-none w-12" value={d} onChange={e=>up(m.id,o=>{o.data.dims[i]=e.target.value;return o;})}/>{m.data.dims.length>2&&<button onClick={()=>up(m.id,o=>{o.data.dims.splice(i,1);o.data.series.forEach(s=>s.values.splice(i,1));return o;})} className="text-zinc-300 hover:text-red-500"><X size={10}/></button>}</div>)}<button onClick={()=>up(m.id,o=>{o.data.dims.push('新');o.data.series.forEach(s=>s.values.push(50));return o;})} className="text-blue-700"><Plus size={13}/></button></div></F>
        {m.data.series.map((s,si)=><div key={si} className="mb-3 p-2 bg-zinc-50 rounded"><div className="flex items-center gap-1.5 mb-2"><input type="color" value={s.color} className="w-5 h-5 rounded cursor-pointer border-0" onChange={e=>up(m.id,o=>{o.data.series[si].color=e.target.value;return o;})}/><input className={ISmall+' flex-1'} value={s.name} onChange={e=>up(m.id,o=>{o.data.series[si].name=e.target.value;return o;})}/>{m.data.series.length>1&&<DelBtn onClick={()=>up(m.id,o=>{o.data.series.splice(si,1);return o;})}/>}</div><div className="flex flex-wrap gap-1.5">{s.values.map((v,vi)=><div key={vi} className="text-center"><span className="text-xs text-zinc-300 block truncate w-10">{m.data.dims[vi]}</span><input className={ISmall+' w-10 text-center'} type="number" value={v} onChange={e=>up(m.id,o=>{o.data.series[si].values[vi]=parseFloat(e.target.value)||0;return o;})}/></div>)}</div></div>)}
        <AddBtn onClick={()=>up(m.id,o=>{o.data.series.push({name:'新系列',color:P[o.data.series.length%P.length],values:o.data.dims.map(()=>50)});return o;})} label="添加系列"/>
      </>;
      case 'bubble': return <>
        <div className="flex gap-1.5 mb-3 flex-wrap">{[['x','X轴'],['y','Y轴'],['z','气泡']].map(([k,l])=><div key={k} className="flex-1" style={{minWidth:'50px'}}><span className="text-xs text-zinc-300">{l}</span><input className={ISmall+' w-full'} value={m.config?.[k]||''} onChange={e=>up(m.id,o=>{o.config[k]=e.target.value;return o;})}/></div>)}</div>
        {m.data.groups.map((g,gi)=><div key={g.id} className="mb-3 p-2 bg-zinc-50 rounded"><div className="flex items-center gap-1.5 mb-2"><input type="color" value={g.color} className="w-5 h-5 rounded cursor-pointer border-0" onChange={e=>up(m.id,o=>{o.data.groups[gi].color=e.target.value;return o;})}/><input className={ISmall+' flex-1'} value={g.name} onChange={e=>up(m.id,o=>{o.data.groups[gi].name=e.target.value;return o;})}/>{m.data.groups.length>1&&<DelBtn onClick={()=>up(m.id,o=>{o.data.groups.splice(gi,1);return o;})}/>}</div>{g.pts.map((p,pi)=><div key={p.id} className="flex gap-1 mb-1 items-center"><input className={ISmall+' w-12'} placeholder="标签" value={p.label} onChange={e=>up(m.id,o=>{o.data.groups[gi].pts[pi].label=e.target.value;return o;})}/>{['x','y','z'].map(k=><input key={k} className={ISmall+' w-10'} type="number" value={p[k]} onChange={e=>up(m.id,o=>{o.data.groups[gi].pts[pi][k]=parseFloat(e.target.value)||0;return o;})}/>)}<DelBtn onClick={()=>up(m.id,o=>{o.data.groups[gi].pts.splice(pi,1);return o;})}/></div>)}<AddBtn onClick={()=>up(m.id,o=>{o.data.groups[gi].pts.push({id:uid(),x:0,y:0,z:50,label:''});return o;})} label="点"/></div>)}
        <AddBtn onClick={()=>up(m.id,o=>{o.data.groups.push({id:uid(),name:'新组',color:P[o.data.groups.length%P.length],pts:[{id:uid(),x:0,y:0,z:50,label:''}]});return o;})} label="添加组"/>
      </>;
      case 'comparison': return <>
        <F label="对比项">{m.data.items.map((it,i)=><div key={it.id} className="flex gap-1 mb-2 items-center flex-wrap"><input className={ISmall+' flex-1'} style={{minWidth:'40px'}} placeholder="指标" value={it.name} onChange={e=>up(m.id,o=>{o.data.items[i].name=e.target.value;return o;})}/><input className={ISmall+' flex-1'} style={{minWidth:'40px'}} placeholder="措施" value={it.action} onChange={e=>up(m.id,o=>{o.data.items[i].action=e.target.value;return o;})}/><input className={ISmall+' w-14'} type="number" placeholder="前" value={it.before} onChange={e=>up(m.id,o=>{o.data.items[i].before=parseFloat(e.target.value)||0;return o;})}/><input className={ISmall+' w-14'} type="number" placeholder="后" value={it.after} onChange={e=>up(m.id,o=>{o.data.items[i].after=parseFloat(e.target.value)||0;return o;})}/><DelBtn onClick={()=>up(m.id,o=>{o.data.items.splice(i,1);return o;})}/></div>)}<AddBtn onClick={()=>up(m.id,o=>{o.data.items.push({id:uid(),name:'',action:'',before:0,after:0});return o;})} label="添加项"/></F>
      </>;
      case 'quadrant': return <>
        <F label="坐标轴设置">
          <div className="flex gap-2 mb-2">
            <div className="flex-1"><span className="text-xs text-zinc-400">X轴</span><input className={ISmall+' w-full'} value={m.config?.x||''} onChange={e=>up(m.id,o=>{o.config.x=e.target.value;return o;})}/></div>
            <div className="flex-1"><span className="text-xs text-zinc-400">Y轴</span><input className={ISmall+' w-full'} value={m.config?.y||''} onChange={e=>up(m.id,o=>{o.config.y=e.target.value;return o;})}/></div>
          </div>
        </F>
        <F label="数据点">
          {m.data.points.map((p,i)=><div key={p.id} className="flex gap-1.5 mb-2 items-center flex-wrap">
            <input type="color" value={p.color||P[i%P.length]} className="w-6 h-6 rounded cursor-pointer border-0 flex-shrink-0" onChange={e=>up(m.id,o=>{o.data.points[i].color=e.target.value;return o;})}/>
            <input className={ISmall+' w-16'} placeholder="名称" value={p.name} onChange={e=>up(m.id,o=>{o.data.points[i].name=e.target.value;return o;})}/>
            <input className={ISmall+' w-14'} type="number" placeholder="X" value={p.x} onChange={e=>up(m.id,o=>{o.data.points[i].x=parseFloat(e.target.value)||0;return o;})}/>
            <input className={ISmall+' w-14'} type="number" placeholder="Y" value={p.y} onChange={e=>up(m.id,o=>{o.data.points[i].y=parseFloat(e.target.value)||0;return o;})}/>
            <DelBtn onClick={()=>up(m.id,o=>{o.data.points.splice(i,1);return o;})}/>
          </div>)}
          <AddBtn onClick={()=>up(m.id,o=>{o.data.points.push({id:uid(),name:'',x:50,y:50,color:P[o.data.points.length%P.length]});return o;})} label="添加点"/>
        </F>
      </>;
      case 'list': return <>
        <F label="要点">{m.data.items.map((it,i)=><div key={it.id} className="flex gap-1.5 mb-2 items-center"><input className={ISmall+' w-20'} placeholder="加粗" value={it.bold} onChange={e=>up(m.id,o=>{o.data.items[i].bold=e.target.value;return o;})}/><input className={ISmall+' flex-1'} placeholder="内容" value={it.text} onChange={e=>up(m.id,o=>{o.data.items[i].text=e.target.value;return o;})}/><DelBtn onClick={()=>up(m.id,o=>{o.data.items.splice(i,1);return o;})}/></div>)}<AddBtn onClick={()=>up(m.id,o=>{o.data.items.push({id:uid(),bold:'',text:''});return o;})} label="添加要点"/></F>
      </>;
      case 'pie': return <>
        <F label="饼图数据">{m.data.items.map((it,i)=><div key={it.id} className="flex gap-1.5 mb-2 items-center"><input className={ISmall+' w-24'} placeholder="名称" value={it.label} onChange={e=>up(m.id,o=>{o.data.items[i].label=e.target.value;return o;})}/><input className={ISmall+' w-16'} placeholder="数值" type="number" value={it.value} onChange={e=>up(m.id,o=>{o.data.items[i].value=parseFloat(e.target.value)||0;return o;})}/><select className={ISmall+' w-16'} value={it.color} onChange={e=>up(m.id,o=>{o.data.items[i].color=e.target.value;return o;})}><option value="P[0]">P[0]</option><option value="P[1]">P[1]</option><option value="P[2]">P[2]</option><option value="P[3]">P[3]</option><option value="P[4]">P[4]</option><option value="P[5]">P[5]</option></select><DelBtn onClick={()=>up(m.id,o=>{o.data.items.splice(i,1);return o;})}/></div>)}<AddBtn onClick={()=>up(m.id,o=>{o.data.items.push({id:uid(),label:'',value:0,color:'P['+o.data.items.length%P.length+']'});return o;})} label="添加分类"/></F>
      </>;
      case 'ordered': return <>
        <F label="有序列表">{m.data.items.map((it,i)=><div key={it.id} className="flex gap-1.5 mb-2 items-center"><span className="text-xs text-zinc-400 w-4">{i+1}.</span><input className={ISmall+' flex-1'} placeholder="内容" value={it.text} onChange={e=>up(m.id,o=>{o.data.items[i].text=e.target.value;return o;})}/><DelBtn onClick={()=>up(m.id,o=>{o.data.items.splice(i,1);return o;})}/></div>)}<AddBtn onClick={()=>up(m.id,o=>{o.data.items.push({id:uid(),text:''});return o;})} label="添加步骤"/></F>
      </>;
      case 'unordered': return <>
        <F label="无序列表">{m.data.items.map((it,i)=><div key={it.id} className="flex gap-1.5 mb-2 items-center"><span className="text-zinc-400">•</span><input className={ISmall+' flex-1'} placeholder="内容" value={it.text} onChange={e=>up(m.id,o=>{o.data.items[i].text=e.target.value;return o;})}/><DelBtn onClick={()=>up(m.id,o=>{o.data.items.splice(i,1);return o;})}/></div>)}<AddBtn onClick={()=>up(m.id,o=>{o.data.items.push({id:uid(),text:''});return o;})} label="添加项目"/></F>
      </>;
      case 'barline': return <>
        <div className="flex gap-2 mb-2"><input className={ISmall+' flex-1'} placeholder="柱状图系列名" value={m.data.barSeries?.[0]||''} onChange={e=>up(m.id,o=>{o.data.barSeries=[e.target.value];return o;})}/><input className={ISmall+' flex-1'} placeholder="折线图系列名" value={m.data.lineSeries?.[0]||''} onChange={e=>up(m.id,o=>{o.data.lineSeries=[e.target.value];return o;})}/></div>
        <F label="组合图数据">{m.data.items.map((it,i)=><div key={it.id} className="flex gap-1.5 mb-2 items-center"><input className={ISmall+' w-16'} placeholder="标签" value={it.label} onChange={e=>up(m.id,o=>{o.data.items[i].label=e.target.value;return o;})}/><input className={ISmall+' w-16'} placeholder="柱值" type="number" value={it.barValues?.[0]||0} onChange={e=>up(m.id,o=>{o.data.items[i].barValues=[parseFloat(e.target.value)||0];return o;})}/><input className={ISmall+' w-16'} placeholder="折线值" type="number" value={it.lineValues?.[0]||0} onChange={e=>up(m.id,o=>{o.data.items[i].lineValues=[parseFloat(e.target.value)||0];return o;})}/><DelBtn onClick={()=>up(m.id,o=>{o.data.items.splice(i,1);return o;})}/></div>)}<AddBtn onClick={()=>up(m.id,o=>{o.data.items.push({id:uid(),label:'',barValues:[0],lineValues:[0]});return o;})} label="添加数据"/></F>
      </>;
      case 'progress': return <>
        <F label="进度条">{m.data.items.map((it,i)=><div key={it.id} className="flex gap-1.5 mb-2 items-center"><input className={ISmall+' w-24'} placeholder="名称" value={it.label} onChange={e=>up(m.id,o=>{o.data.items[i].label=e.target.value;return o;})}/><input className={ISmall+' w-16'} placeholder="当前" type="number" value={it.current} onChange={e=>up(m.id,o=>{o.data.items[i].current=parseFloat(e.target.value)||0;return o;})}/><input className={ISmall+' w-16'} placeholder="目标" type="number" value={it.total} onChange={e=>up(m.id,o=>{o.data.items[i].total=parseFloat(e.target.value)||0;return o;})}/><input className={ISmall+' w-14'} placeholder="单位" value={it.unit||''} onChange={e=>up(m.id,o=>{o.data.items[i].unit=e.target.value;return o;})}/><DelBtn onClick={()=>up(m.id,o=>{o.data.items.splice(i,1);return o;})}/></div>)}<AddBtn onClick={()=>up(m.id,o=>{o.data.items.push({id:uid(),label:'',current:0,total:100,unit:''});return o;})} label="添加进度"/></F>
      </>;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      {/* Toast */}
      <AnimatePresence>{toast && <motion.div initial={{opacity:0,y:-20}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-20}} className="fixed top-4 left-1/2 z-50 bg-zinc-800 text-white text-sm px-5 py-2.5 rounded shadow-lg" style={{transform:'translateX(-50%)'}}>{toast}</motion.div>}</AnimatePresence>

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
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newFolderName.trim()) {
                      const newFolderId = 'folder_' + Date.now();
                      const data = loadAllReportsFromStorage();
                      data.folders[newFolderId] = { id: newFolderId, name: newFolderName.trim(), createdAt: Date.now() };
                      saveAllReportsToStorage(data);
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
                  onClick={() => {
                    if (newFolderName.trim()) {
                      const newFolderId = 'folder_' + Date.now();
                      const data = loadAllReportsFromStorage();
                      data.folders[newFolderId] = { id: newFolderId, name: newFolderName.trim(), createdAt: Date.now() };
                      saveAllReportsToStorage(data);
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
                            onDrop={(e) => {
                              e.preventDefault();
                              const reportId = e.dataTransfer.getData('reportId');
                              if (reportId) {
                                const data = loadAllReportsFromStorage();
                                if (data.reports[reportId]) {
                                  data.reports[reportId].folderId = folderId;
                                  saveAllReportsToStorage(data);
                                  setReportsData(data);
                                  flash('文件已移动到文件夹');
                                }
                              }
                              setFolderDragOver(null);
                            }}
                          >
                            {editingFolderId === folderId ? (
                              <input 
                                autoFocus
                                className="flex-1 text-sm border border-blue-300 rounded px-1 py-0.5 outline-none"
                                defaultValue={folder.name}
                                onBlur={(e) => {
                                  const newName = e.target.value.trim();
                                  if (newName) {
                                    const data = loadAllReportsFromStorage();
                                    data.folders[folderId].name = newName;
                                    saveAllReportsToStorage(data);
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
                                  onClick={() => {
                                    if (window.confirm('确定要删除这个文件夹吗？文件夹内的文件将被移到根目录。')) {
                                      const data = loadAllReportsFromStorage();
                                      Object.values(data.reports).forEach(r => {
                                        if (r.folderId === folderId) {
                                          r.folderId = null;
                                        }
                                      });
                                      delete data.folders[folderId];
                                      saveAllReportsToStorage(data);
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
                                <FileItem key={id} id={id} report={report} setReportsData={setReportsData} flash={flash} />
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
                          <FileItem key={id} id={id} report={report} setReportsData={setReportsData} flash={flash} isRoot />
                        ))}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
            <div className="p-2 border-t border-zinc-200">
              <button 
                onClick={() => {
                  const newTitle = '新报告';
                  const newSubtitle = '';
                  const newModules = [];
                  const newId = 'report_' + Date.now();
                  const data = loadAllReportsFromStorage();
                  data.reports[newId] = { title: newTitle, subtitle: newSubtitle, modules: newModules, createdAt: Date.now() };
                  saveAllReportsToStorage(data);
                  setReportsData(data);
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
            <button onClick={() => {
              if (window.confirm('确定要新建报告吗？当前报告的更改会被保存。')) {
                saveCurrentReportToStorage({ title, subtitle, modules });
                const newTitle = '新报告';
                const newSubtitle = '';
                const newModules = [];
                const newReportId = `report_${Date.now()}`;
                const allReports = loadAllReportsFromStorage();
                allReports.reports[newReportId] = { title: newTitle, subtitle: newSubtitle, modules: newModules };
                saveAllReportsToStorage(allReports);
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
            <button onClick={dlHTML} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded transition-colors"><Download size={13}/>HTML</button>
            <button onClick={dlPDF} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-zinc-800 hover:bg-zinc-700 rounded transition-colors"><Download size={13}/>PDF</button>
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
                <span className="text-xs text-blue-600">(使用 qwen3-30b-a3b-instruct-2507 模型)</span>
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
                <span className="font-semibold">第一步：</span>描述你希望生成的报告风格和格式要求（如：正式商务风格、简洁数据导向、详细分析报告等）
              </p>
              <textarea
                value={aiStyleInput}
                onChange={(e) => setAiStyleInput(e.target.value)}
                placeholder="例如：正式商务风格，标题使用深色字体，数据突出显示，使用蓝色为主色调..."
                className="w-full h-20 px-3 py-2 text-sm border border-blue-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 bg-white resize-none mb-3"
              />
              
              <p className="text-xs text-blue-700 mb-2">
                <span className="font-semibold">第二步：</span>输入要分析的数据内容（支持Excel表格、CSV数据、描述性文本）
              </p>
              <textarea
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                placeholder="请输入数据内容，例如：
指标	数值	环比
总订单	12500	+15%
活跃用户	8200	+8%
转化率	3.2%	-2%

或输入描述：分析上月的销售数据，包含各产品线销量、同比变化..."
                className="w-full h-28 px-3 py-2 text-sm border border-blue-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 bg-white resize-none mb-3"
              />
              
              <p className="text-xs text-blue-700 mb-2">
                <span className="font-semibold">第三步：</span>输入分析要求，让AI分析图表及数据并得出结论（可选）
              </p>
              <textarea
                value={aiAnalysisInput}
                onChange={(e) => setAiAnalysisInput(e.target.value)}
                placeholder="例如：分析销售数据的增长趋势，找出表现最好的产品线，并给出下季度的建议..."
                className="w-full h-20 px-3 py-2 text-sm border border-blue-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 bg-white resize-none"
              />
              <div className="flex justify-end gap-2 mt-3">
                <button 
                  onClick={() => { setShowAiPanel(false); setAiInput(''); setAiStyleInput(''); setAiAnalysisInput(''); }}
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
            {(() => {
              const seenIds = new Set();
              const uniqueModules = modules.filter(m => {
                if (!m || !m.id) return false;
                if (seenIds.has(m.id)) {
                  console.warn('Duplicate module id found:', m.id);
                  return false;
                }
                seenIds.add(m.id);
                return true;
              });
              return uniqueModules.map((mod, idx) => {
                const isSelected = sel === mod.id;
                const uniqueKey = `mod_${mod.id}_${idx}`;
                if (!mod.type || !viewR[mod.type]) {
                  console.warn('Invalid module:', mod);
                  return null;
                }
                return (
                  <DraggableModule 
                    key={uniqueKey} 
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
                  onSelect={() => {
                    if (!isSelected) {
                      setSel(mod.id);
                      scrollToModule(mod.id);
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
                  viewR={viewR}
                />
              );
              });
            })()}

            {/* Add module */}
            <div className="relative mt-6 mb-20">
              <button onClick={() => setAddOpen(!addOpen)} className="w-full py-2.5 border border-dashed border-zinc-200 rounded text-zinc-300 hover:text-zinc-500 hover:border-zinc-400 transition-colors flex items-center justify-center gap-1.5 text-sm">
                {addOpen ? <X size={14}/> : <Plus size={14}/>}{addOpen ? '收起' : '添加模块'}
              </button>
              <AnimatePresence>
                {addOpen && (
                  <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} className="absolute top-full mt-1.5 left-0 right-0 bg-white border border-zinc-200 rounded shadow-lg z-30 py-1 grid grid-cols-2">
                    {TYPES.map(t => {
                      const Icon = t.icon;
                      return <button key={t.type} onClick={() => add(t.type)} className="px-3 py-2 text-left flex items-center gap-2.5 hover:bg-zinc-50 transition-colors"><Icon size={14} className="text-zinc-400"/><span className="text-xs font-medium text-zinc-700">{t.label}</span></button>;
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </main>

        {/* Editor sidebar */}
        <AnimatePresence>
          {sel && selMod && (
            <motion.aside
              key={sel}
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 340, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-white border-l border-zinc-200 overflow-hidden flex-shrink-0"
            >
              <div className="w-80 overflow-y-auto h-full p-4" style={{ maxHeight: 'calc(100vh - 57px)', overflowAnchor: 'none' }}>
                {/* Panel header */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2 text-xs text-zinc-400 uppercase tracking-wider font-semibold">
                    {(() => { const T = TYPES.find(t=>t.type===selMod.type); return T ? <T.icon size={13}/> : null; })()}
                    <span>{TYPES.find(t=>t.type===selMod.type)?.label}</span>
                  </div>
                  <button onClick={() => setSel(null)} className="p-1 text-zinc-300 hover:text-zinc-600 rounded"><X size={15}/></button>
                </div>

                {/* Title / subtitle */}
                <div className="mb-3">
                  <label className="block text-xs font-medium text-zinc-400 mb-1">标题</label>
                  <input className={I} value={selMod.title} onChange={e => up(sel, o => { o.title = e.target.value; return o; })} />
                </div>
                <div className="mb-5">
                  <label className="block text-xs font-medium text-zinc-400 mb-1">副标题</label>
                  <input className={I} value={selMod.subtitle} placeholder="可选" onChange={e => up(sel, o => { o.subtitle = e.target.value; return o; })} />
                </div>

                <div className="border-t border-zinc-100 pt-4">
                  {editContent(selMod)}
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
