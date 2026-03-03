import React, { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, ScatterChart, Scatter, ZAxis, ComposedChart, Line,
  ReferenceLine, ReferenceArea, LabelList
} from 'recharts';
import {
  Download, Plus, Trash2, ChevronUp, ChevronDown, X, Pencil,
  FileText, BarChart3, Target, TrendingUp, LayoutGrid,
  ArrowLeftRight, List, Filter, Activity, Circle, Gauge
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

let _id = 0;
const uid = () => `_${++_id}`;
const P = ['#1d4ed8','#047857','#b45309','#b91c1c','#6d28d9','#0e7490','#c2410c','#be185d'];
const TYPES = [
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
];

function cMod(type) {
  const b = { id:uid(), type, title:TYPES.find(t=>t.type===type)?.label||'', subtitle:'' };
  switch(type) {
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
      case 'comparison': {
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
      // ========== 这里是关键改动 ==========
      default: {
        // 其他类型的模块处理
      }
      // ====================================
    }
    return `<section style="margin-bottom:48px;page-break-inside:avoid;"><div style="display:flex;align-items:baseline;gap:12px;margin-bottom:18px;"><span style="font-family:monospace;font-size:12px;color:#d4d4d8;">${String(i+1).padStart(2,'0')}</span><div><h2 style="font-size:17px;font-weight:600;color:#18181b;margin:0;">${esc(m.title)}</h2>${m.subtitle?`<p style="font-size:13px;color:#a1a1aa;margin:4px 0 0;">${esc(m.subtitle)}</p>`:''}</div></div><div style="padding-left:32px;">${c}</div></section>`;
  };
  return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,'Helvetica Neue','PingFang SC',sans-serif;color:#27272a;background:#fff;max-width:820px;margin:0 auto;padding:48px 40px}@media print{body{padding:20px}section{page-break-inside:avoid}}table{border-collapse:collapse;width:100%;margin-top:8px;font-size:13px}th,td{padding:10px 14px;text-align:left;border-bottom:1px solid #e4e4e7}th{font-weight:600;color:#52525b;font-size:11px;text-transform:uppercase;letter-spacing:0.3px;border-bottom:2px solid #d4d4d8}img{max-width:100%;height:auto}@media(max-width:600px){body{padding:20px 16px}}</style></head><body><header style="margin-bottom:48px;padding-bottom:28px;border-bottom:1px solid #e4e4e7;"><h1 style="font-size:24px;font-weight:700;color:#18181b;letter-spacing:-0.5px;">${esc(title)}</h1>${subtitle?`<p style="font-size:14px;color:#a1a1aa;margin-top:8px;">${esc(subtitle)}</p>`:''}<p style="font-size:11px;color:#d4d4d8;margin-top:14px;font-family:monospace;">${new Date().toLocaleDateString('zh-CN',{year:'numeric',month:'long',day:'numeric'})}</p></header>${modules.map((m,i)=>modHTML(m,i)).join('')}<footer style="margin-top:40px;padding-top:20px;border-top:1px solid #e4e4e7;text-align:center;font-size:11px;color:#d4d4d8;">Generated ${new Date().toLocaleString('zh-CN')}</footer></body></html>`;
}

const I = "w-full px-3 py-2 text-sm border border-zinc-200 rounded focus:outline-none focus:border-zinc-400 bg-white";
const ISmall = "px-2 py-1.5 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400 bg-white";

const BubbleTip = ({active,payload}) => {
  if(!active||!payload?.length) return null;
  const d = payload[0]?.payload;
  return d ? <div className="bg-white p-2 rounded shadow border border-zinc-100 text-xs"><div className="font-semibold">{d.label}</div><div className="text-zinc-400">X:{d.x} Y:{d.y} Z:{d.z}</div></div> : null;
};

export default function ReportBuilder() {
  // 防抖函数
  const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(null, args), delay);
    };
  };

  // 从本地存储读取所有报告
  const loadAllReports = () => {
    try {
      const savedData = localStorage.getItem('reportBuilderReports');
      if (savedData) {
        return JSON.parse(savedData);
      }
    } catch (error) {
      console.error('Failed to load reports from localStorage:', error);
    }
    return {};
  };

  // 保存所有报告到本地存储
  const saveAllReports = debounce((reports) => {
    try {
      localStorage.setItem('reportBuilderReports', JSON.stringify(reports));
    } catch (error) {
      console.error('Failed to save reports to localStorage:', error);
    }
  }, 300);

  // 从本地存储读取当前报告
  const loadCurrentReport = () => {
    try {
      const currentReportId = localStorage.getItem('reportBuilderCurrentReport');
      const reports = loadAllReports();
      if (currentReportId && reports[currentReportId]) {
        return reports[currentReportId];
      }
    } catch (error) {
      console.error('Failed to load current report from localStorage:', error);
    }
    return {
      title: '充电业务月度运营报告',
      subtitle: '数据驱动的体验优化与品牌提升专项分析',
      modules: initMods()
    };
  };

  // 保存当前报告
  const saveCurrentReport = debounce((report) => {
    try {
      const reports = loadAllReports();
      const currentReportId = localStorage.getItem('reportBuilderCurrentReport') || `report_${Date.now()}`;
      reports[currentReportId] = report;
      saveAllReports(reports);
      localStorage.setItem('reportBuilderCurrentReport', currentReportId);
    } catch (error) {
      console.error('Failed to save current report to localStorage:', error);
    }
  }, 300);

  const initialData = loadCurrentReport();
  const [title, setTitle] = useState(initialData.title);
  const [subtitle, setSubtitle] = useState(initialData.subtitle);
  const [modules, setModules] = useState(initialData.modules);
  const [reports, setReports] = useState(loadAllReports());
  const [showReportList, setShowReportList] = useState(false);
  const [sel, setSel] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [toast, setToast] = useState('');

  // 更新状态并保存到本地存储
  const updateAndSave = (newTitle = title, newSubtitle = subtitle, newModules = modules) => {
    setTitle(newTitle);
    setSubtitle(newSubtitle);
    setModules(newModules);
    saveCurrentReport({ title: newTitle, subtitle: newSubtitle, modules: newModules });
    setReports(loadAllReports());
  };

  // 滚动到指定模块
  const scrollToModule = (moduleId) => {
    const element = document.querySelector(`[data-module-id="${moduleId}"]`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const up = (id, fn) => {
    // 直接更新数据，不使用防抖
    setModules(p => {
      const newModules = p.map(m => m.id === id ? fn(JSON.parse(JSON.stringify(m))) : m);
      saveCurrentReport({ title, subtitle, modules: newModules });
      return newModules;
    });
  };
  const rm = id => {
    setModules(p => {
      const newModules = p.filter(m => m.id !== id);
      saveCurrentReport({ title, subtitle, modules: newModules });
      return newModules;
    });
    if (sel === id) setSel(null);
  };
  const mv = (id, d) => {
    setModules(p => {
      const i = p.findIndex(m => m.id === id);
      if ((d===-1&&i===0)||(d===1&&i===p.length-1)) return p;
      const n=[...p];
      [n[i],n[i+d]]=[n[i+d],n[i]];
      saveCurrentReport({ title, subtitle, modules: n });
      return n;
    });
  };
  const add = (type) => {
    const m = cMod(type);
    setModules(p => {
      const newModules = [...p, m];
      saveCurrentReport({ title, subtitle, modules: newModules });
      return newModules;
    });
    setAddOpen(false);
    setSel(m.id);
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
  const vText = m => <p className="text-sm leading-loose text-zinc-600">{m.data.content}</p>;

  const vKpi = m => {
    const gc = m.config?.cols===4?'grid-cols-2 sm:grid-cols-4':m.config?.cols===2?'grid-cols-2':'grid-cols-3';
    return <div className={`grid ${gc} gap-5`}>{m.data.items.map(it => (
      <div key={it.id} className="pt-3 border-t-2 border-zinc-200">
        <div className="text-xs text-zinc-400 uppercase tracking-wider mb-1">{it.label}</div>
        <div className="text-2xl font-bold text-zinc-900 tracking-tight">{it.value}</div>
        <div className={`text-xs mt-1 ${it.change>=0?'text-emerald-700':'text-red-700'}`}>{it.change>=0?'↑':'↓'} {Math.abs(it.change)}%</div>
      </div>
    ))}</div>;
  };

  const vTable = m => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm"><thead><tr className="border-b-2 border-zinc-300">{m.data.headers.map((h,i) => <th key={i} className="px-3 py-2 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">{h}</th>)}</tr></thead>
      <tbody>{m.data.rows.map(r => <tr key={r.id} className="border-b border-zinc-100">{r.cells.map((c,ci) => <td key={ci} className={`px-3 py-2 ${ci===0?'font-medium text-zinc-800':'text-zinc-500'}`}>{c}</td>)}</tr>)}</tbody></table>
    </div>
  );

  const vChart = m => {
    const cd = m.data.items.map(it => { const d = {name:it.label}; m.data.series.forEach((s,si) => { d[s.name]=it.values[si]||0; }); return d; });
    return <ResponsiveContainer width="100%" height={240}><BarChart data={cd} margin={{top:8,right:8,bottom:24,left:0}}><CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false}/><XAxis dataKey="name" tick={{fontSize:11,fill:'#71717a'}} axisLine={{stroke:'#d4d4d8'}}/><YAxis tick={{fontSize:11,fill:'#71717a'}} axisLine={false} tickLine={false}/><Tooltip {...chartTip}/>{m.data.series.length>1&&<Legend iconSize={8} verticalAlign="bottom" height={36}/>}{m.data.series.map((s,i) => <Bar key={i} dataKey={s.name} fill={s.color} radius={[2,2,0,0]} maxBarSize={40}/>)}</BarChart></ResponsiveContainer>;
  };

  const vFunnel = m => {
    const its = m.data.items;
    const mx = Math.max(...its.flatMap(i => [i.cur, i.prev]), 1);
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
                <span className="w-16 text-right text-xs text-zinc-500 font-medium flex-shrink-0">{it.stage}</span>
                <div className="flex-1 flex flex-col gap-0.5">
                  <div style={{width:`${cw}%`}} className="h-6 bg-blue-700 rounded-sm flex items-center justify-center transition-all duration-500"><span className="text-white text-xs font-semibold">{it.cur.toLocaleString()}</span></div>
                  <div style={{width:`${pw}%`}} className="h-4 bg-zinc-200 rounded-sm flex items-center justify-center transition-all duration-500"><span className="text-zinc-500 text-xs">{it.prev.toLocaleString()}</span></div>
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
    const cd = m.data.points.map(pt => { const d = {name:pt.x}; m.data.series.forEach((s,si) => { d[s.name]=pt.values[si]||0; }); return d; });
    const hL = m.data.series.some(s => s.axis==='left');
    const hR = m.data.series.some(s => s.axis==='right');
    return <ResponsiveContainer width="100%" height={260}><ComposedChart data={cd} margin={{top:8,right:8,bottom:24,left:0}}><CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false}/><XAxis dataKey="name" tick={{fontSize:10,fill:'#71717a'}} axisLine={{stroke:'#d4d4d8'}}/>{hL&&<YAxis yAxisId="left" tick={{fontSize:10,fill:'#71717a'}} axisLine={false} tickLine={false}/>}{hR&&<YAxis yAxisId="right" orientation="right" tick={{fontSize:10,fill:'#71717a'}} axisLine={false} tickLine={false}/>}<Tooltip {...chartTip}/><Legend iconSize={8} verticalAlign="bottom" height={36}/>{m.data.series.map((s,i) => <Line key={i} yAxisId={s.axis} type="monotone" dataKey={s.name} stroke={s.color} strokeWidth={2} dot={{r:2.5,fill:'#fff',stroke:s.color,strokeWidth:2}}/>)}</ComposedChart></ResponsiveContainer>;
  };

  const vRadar = m => {
    const rd = m.data.dims.map((d,i) => { const o = {dim:d}; m.data.series.forEach(s => { o[s.name]=s.values[i]||0; }); return o; });
    return <div className="flex justify-center"><ResponsiveContainer width="100%" height={300}><RadarChart data={rd} cx="50%" cy="50%" outerRadius="70%" margin={{top:8,right:8,bottom:24,left:0}}><PolarGrid stroke="#e4e4e7"/><PolarAngleAxis dataKey="dim" tick={{fontSize:11,fill:'#52525b'}}/><PolarRadiusAxis angle={90} tick={{fontSize:9,fill:'#a1a1aa'}} domain={[0,'auto']}/>{m.data.series.map((s,i) => <Radar key={i} name={s.name} dataKey={s.name} stroke={s.color} fill={s.color} fillOpacity={0.06} strokeWidth={2}/>)}<Legend iconSize={8} verticalAlign="bottom" height={36}/><Tooltip {...chartTip}/></RadarChart></ResponsiveContainer></div>;
  };

  const vBubble = m => (
    <ResponsiveContainer width="100%" height={300}><ScatterChart margin={{top:12,right:20,bottom:36,left:4}}><CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7"/><XAxis type="number" dataKey="x" name={m.config?.x} tick={{fontSize:10,fill:'#71717a'}} axisLine={{stroke:'#d4d4d8'}} label={{value:m.config?.x||'',position:'insideBottom',offset:-6,style:{fontSize:10,fill:'#a1a1aa'}}}/><YAxis type="number" dataKey="y" name={m.config?.y} tick={{fontSize:10,fill:'#71717a'}} axisLine={false} tickLine={false} label={{value:m.config?.y||'',angle:-90,position:'insideLeft',style:{fontSize:10,fill:'#a1a1aa'}}}/><ZAxis type="number" dataKey="z" range={[50,400]} name={m.config?.z}/><Tooltip content={<BubbleTip/>}/><Legend iconSize={8} verticalAlign="bottom" height={36}/>{m.data.groups.map(g => <Scatter key={g.id} name={g.name} data={g.pts} fill={g.color} fillOpacity={0.45} stroke={g.color} strokeWidth={1.5}/>)}</ScatterChart></ResponsiveContainer>
  );

  const vComparison = m => {
    const cd = m.data.items.map(it => ({name:it.name,'优化前':it.before,'优化后':it.after}));
    return (
      <div>
        <ResponsiveContainer width="100%" height={Math.max(m.data.items.length * 56, 120)}><BarChart data={cd} margin={{top:4,right:12,bottom:24,left:0}} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" horizontal={false}/><XAxis type="number" tick={{fontSize:10,fill:'#71717a'}} axisLine={{stroke:'#d4d4d8'}}/><YAxis dataKey="name" type="category" width={100} tick={{fontSize:11,fill:'#3f3f46'}} axisLine={false} tickLine={false}/><Tooltip {...chartTip}/><Legend iconSize={8} verticalAlign="bottom" height={36}/><Bar dataKey="优化前" fill="#fca5a5" radius={[0,2,2,0]} maxBarSize={16}/><Bar dataKey="优化后" fill="#047857" radius={[0,2,2,0]} maxBarSize={16}/></BarChart></ResponsiveContainer>
        <table className="w-full text-xs mt-3"><thead><tr className="border-b-2 border-zinc-300">{['指标','措施','前','后','改善'].map(h => <th key={h} className="px-2 py-1.5 text-left font-semibold text-zinc-500 uppercase">{h}</th>)}</tr></thead><tbody>{m.data.items.map(it => { const imp = it.before ? ((it.before-it.after)/it.before*100).toFixed(1) : '—'; return <tr key={it.id} className="border-b border-zinc-100"><td className="px-2 py-1.5 font-medium text-zinc-800">{it.name}</td><td className="px-2 py-1.5 text-zinc-500">{it.action}</td><td className="px-2 py-1.5 text-red-600">{it.before}</td><td className="px-2 py-1.5 text-emerald-700 font-semibold">{it.after}</td><td className="px-2 py-1.5 text-emerald-700">↓{imp}%</td></tr>; })}</tbody></table>
      </div>
    );
  };

  const vQuadrant = m => (
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
        {/* 象限背景 */}
        <ReferenceLine x={50} stroke="#d4d4d8" strokeDasharray="3 3"/>
        <ReferenceLine y={50} stroke="#d4d4d8" strokeDasharray="3 3"/>
        {/* 象限标签 */}
        <ReferenceArea x1={50} y1={50} x2={100} y2={100} fill="#dbeafe" fillOpacity={0.3}/>
        <ReferenceArea x1={0} y1={50} x2={50} y2={100} fill="#fef3c7" fillOpacity={0.3}/>
        <ReferenceArea x1={0} y1={0} x2={50} y2={50} fill="#fee2e2" fillOpacity={0.3}/>
        <ReferenceArea x1={50} y1={0} x2={100} y2={50} fill="#d1fae5" fillOpacity={0.3}/>
        {m.data.points.map((p, i) => (
          <Scatter key={p.id} data={[p]} fill={p.color || P[i % P.length]} fillOpacity={0.7} stroke={p.color || P[i % P.length]} strokeWidth={2}>
            <LabelList dataKey="name" position="top" offset={10} style={{fontSize:11,fill:'#3f3f46',fontWeight:500}}/>
          </Scatter>
        ))}
      </ScatterChart>
    </ResponsiveContainer>
  );

  const vList = m => <ul className="space-y-2.5">{m.data.items.map(it => <li key={it.id} className="flex items-baseline gap-3 text-sm leading-relaxed text-zinc-600"><span className="w-1 h-1 rounded-full bg-zinc-800 flex-shrink-0 mt-2"></span><span>{it.bold && <strong className="text-zinc-800">{it.bold}</strong>}{it.text}</span></li>)}</ul>;

  const viewR = { text:vText, kpi:vKpi, table:vTable, chart:vChart, funnel:vFunnel, line:vLine, radar:vRadar, bubble:vBubble, comparison:vComparison, quadrant:vQuadrant, list:vList };

  // ─── EDIT PANEL ───
  const F = ({label,children}) => <div className="mb-4"><label className="block text-xs font-medium text-zinc-400 mb-1">{label}</label>{children}</div>;
  const AddBtn = ({onClick,label}) => <button onClick={onClick} className="text-xs text-blue-700 hover:text-blue-900 font-medium flex items-center gap-1 mt-2"><Plus size={11}/>{label}</button>;
  const DelBtn = ({onClick}) => <button onClick={onClick} className="p-0.5 text-zinc-300 hover:text-red-500 flex-shrink-0"><Trash2 size={12}/></button>;

  const editContent = (m) => {
    if (!m) return null;
    switch(m.type) {
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
            <div className="p-3 border-b border-zinc-200 font-medium text-zinc-800">保存的报告</div>
            <div className="max-h-96 overflow-y-auto">
              {Object.entries(reports).length === 0 ? (
                <div className="p-4 text-center text-zinc-400 text-sm">暂无保存的报告</div>
              ) : (
                Object.entries(reports).map(([id, report]) => {
                  const currentReportId = localStorage.getItem('reportBuilderCurrentReport');
                  const isCurrent = currentReportId === id;
                  return (
                    <div key={id} className={`p-3 border-b border-zinc-100 hover:bg-zinc-50 ${isCurrent ? 'bg-blue-50' : ''}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-sm text-zinc-800 truncate">{report.title}</div>
                          <div className="text-xs text-zinc-400 truncate">{report.subtitle || '无副标题'}</div>
                        </div>
                        <div className="flex gap-1">
                          <button 
                            onClick={() => {
                              if (window.confirm('确定要打开这个报告吗？当前报告的更改会被保存。')) {
                                // 保存当前报告
                                saveCurrentReport({ title, subtitle, modules });
                                // 加载选中的报告
                                localStorage.setItem('reportBuilderCurrentReport', id);
                                setTitle(report.title);
                                setSubtitle(report.subtitle);
                                setModules(report.modules);
                                setSel(null);
                                setShowReportList(false);
                                flash('已打开报告');
                              }
                            }}
                            className="p-1 text-zinc-400 hover:text-zinc-700 rounded"
                            title="打开"
                          >
                            <FileText size={14} />
                          </button>
                          <button 
                            onClick={() => {
                              if (window.confirm('确定要删除这个报告吗？')) {
                                const allReports = loadAllReports();
                                delete allReports[id];
                                saveAllReports(allReports);
                                setReports(allReports);
                                // 如果删除的是当前报告，切换到第一个报告
                                const currentReportId = localStorage.getItem('reportBuilderCurrentReport');
                                if (currentReportId === id) {
                                  const remainingReports = Object.entries(allReports);
                                  if (remainingReports.length > 0) {
                                    const [firstId, firstReport] = remainingReports[0];
                                    localStorage.setItem('reportBuilderCurrentReport', firstId);
                                    setTitle(firstReport.title);
                                    setSubtitle(firstReport.subtitle);
                                    setModules(firstReport.modules);
                                    setSel(null);
                                  } else {
                                    // 如果没有报告了，创建一个新的
                                    const newTitle = '充电业务月度运营报告';
                                    const newSubtitle = '数据驱动的体验优化与品牌提升专项分析';
                                    const newModules = initMods();
                                    const newReportId = `report_${Date.now()}`;
                                    const newReports = {};
                                    newReports[newReportId] = { title: newTitle, subtitle: newSubtitle, modules: newModules };
                                    saveAllReports(newReports);
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
                      </div>
                    </div>
                  );
                })
              )}
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
                // 保存当前报告
                saveCurrentReport({ title, subtitle, modules });
                // 创建新报告
                const newTitle = '充电业务月度运营报告';
                const newSubtitle = '数据驱动的体验优化与品牌提升专项分析';
                const newModules = initMods();
                // 生成新的报告ID
                const newReportId = `report_${Date.now()}`;
                // 保存新报告
                const allReports = loadAllReports();
                allReports[newReportId] = { title: newTitle, subtitle: newSubtitle, modules: newModules };
                saveAllReports(allReports);
                // 设置当前报告ID
                localStorage.setItem('reportBuilderCurrentReport', newReportId);
                // 更新状态
                setTitle(newTitle);
                setSubtitle(newSubtitle);
                setModules(newModules);
                setSel(null);
                setReports(allReports);
                flash('已新建报告');
              }
            }} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded transition-colors"><FileText size={13}/>新建</button>
            <button onClick={() => setShowReportList(!showReportList)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded transition-colors"><List size={13}/>文件</button>
            <button onClick={dlHTML} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded transition-colors"><Download size={13}/>HTML</button>
            <button onClick={dlPDF} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-zinc-800 hover:bg-zinc-700 rounded transition-colors"><Download size={13}/>PDF</button>
          </div>
        </div>
      </header>

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
            {modules.map((mod, idx) => {
              const isSelected = sel === mod.id;
              return (
               <div
  key={mod.id}
  data-module-id={mod.id}                    // ← 加这一行
  className={`group relative mb-10 rounded transition-all ${isSelected ? 'ring-2 ring-blue-400 ring-offset-4' : ''}`}
>
                  {/* Toolbar */}
                  <div className={`absolute -top-3 right-0 flex items-center gap-0.5 bg-white border border-zinc-200 rounded shadow-sm px-1 py-0.5 transition-opacity z-10 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                    <button onClick={() => mv(mod.id, -1)} className="p-1 text-zinc-400 hover:text-zinc-700 rounded" title="上移"><ChevronUp size={14}/></button>
                    <button onClick={() => mv(mod.id, 1)} className="p-1 text-zinc-400 hover:text-zinc-700 rounded" title="下移"><ChevronDown size={14}/></button>
                    <button onClick={() => {
                      if (!isSelected) {
                        setSel(mod.id);
                        scrollToModule(mod.id);
                      } else {
                        setSel(null);
                      }
                    }} className={`p-1 rounded ${isSelected ? 'text-blue-600 bg-blue-50' : 'text-zinc-400 hover:text-zinc-700'}`} title="编辑"><Pencil size={13}/></button>
                    <button onClick={() => rm(mod.id)} className="p-1 text-zinc-400 hover:text-red-500 rounded" title="删除"><Trash2 size={13}/></button>
                  </div>

                  {/* Section header */}
                  <div className="flex items-baseline gap-3 mb-4 cursor-pointer" onClick={() => {
                    if (!isSelected) {
                      setSel(mod.id);
                      scrollToModule(mod.id);
                    } else {
                      setSel(null);
                    }
                  }}>
                    <span className="text-xs font-mono text-zinc-300 flex-shrink-0">{String(idx + 1).padStart(2, '0')}</span>
                    <div>
                      <h2 className="text-sm font-semibold text-zinc-800 tracking-tight">{mod.title}</h2>
                      {mod.subtitle && <p className="text-xs text-zinc-400 mt-0.5">{mod.subtitle}</p>}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="pl-7">{viewR[mod.type]?.(mod)}</div>
                </div>
              );
            })}

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