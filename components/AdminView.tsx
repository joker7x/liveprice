
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Edit2, Trash2, Search, RefreshCw, LogOut, TrendingUp, Database, CheckSquare, Square, RefreshCcw, Activity, Play, Globe, Building2, BrainCircuit, Sparkles, ShoppingBag, Command, Target, Zap, ShieldAlert, BarChart3, CloudDownload } from 'lucide-react';
import { Drug, AdminStats, DrugFormData, FullDrug, DeepMarketAnalysis, LightDrug, CompanyStats } from '../types';
import { fetchDrugs, fetchAdminStats, insertDrug, updateDrug, deleteDrug, deleteDrugs, syncMarketData, searchFullArchive, fetchFullArchiveLight, getUniqueCompanies, fetchCompanyProducts, syncMedhomUpdatesToSupabase } from '../services/api';
import { analyzeFullMarketDeeply } from '../services/ai';
import { checkDrugAvailabilityDebug, DebugResult } from '../services/tawreed';
import { DrugIntelligenceModal } from './DrugIntelligenceModal';

const AdminToast = ({ message, type, onClose }: { message: string, type: 'success' | 'error' | 'info', onClose: () => void }) => (
    <motion.div initial={{ opacity: 0, y: -20, x: "-50%" }} animate={{ opacity: 1, y: 0, x: "-50%" }} exit={{ opacity: 0, y: -20, x: "-50%" }} className={`fixed top-6 left-1/2 z-[100] px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 backdrop-blur-md border ${type === 'success' ? 'bg-emerald-900/80 border-emerald-500/30 text-emerald-100' : type === 'error' ? 'bg-red-900/80 border-red-500/30 text-red-100' : 'bg-blue-900/80 border-blue-500/30 text-blue-100'}`}>
        <span className="text-sm font-bold">{message}</span>
    </motion.div>
);

const VolatilityGauge = ({ score }: { score: number }) => {
    const rotation = (score / 100) * 180 - 90;
    return (
        <div className="relative flex flex-col items-center">
            <div className="w-24 h-12 overflow-hidden relative"><div className="w-24 h-24 rounded-full border-[6px] border-slate-700/50 border-t-emerald-500 border-r-amber-500 border-l-emerald-500 border-b-transparent transform rotate-45" style={{background: 'conic-gradient(from 180deg, #10b981 0deg, #f59e0b 90deg, #ef4444 180deg)'}}></div><div className="absolute bottom-0 left-1/2 w-full h-full bg-slate-900 rounded-full" style={{width:'80%', height:'80%', left:'10%', top:'20%'}}></div></div>
            <div className="absolute bottom-0 left-1/2 w-1 h-12 bg-white origin-bottom rounded-full transition-transform duration-1000 ease-out z-10 shadow-lg" style={{ transform: `translateX(-50%) rotate(${rotation}deg)` }}></div>
            <span className="text-[10px] font-bold text-slate-400 mt-2">مؤشر المخاطرة</span>
        </div>
    )
}

export const AdminView: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<'hq' | 'companies' | 'database' | 'archive'>('hq');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [archiveSearch, setArchiveSearch] = useState('');
  const [archiveResults, setArchiveResults] = useState<FullDrug[]>([]);
  const [companies, setCompanies] = useState<CompanyStats[]>([]);
  const [companiesSearch, setCompaniesSearch] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [companyProducts, setCompanyProducts] = useState<FullDrug[]>([]);
  const [aiReport, setAiReport] = useState<(DeepMarketAnalysis & { volatilityScore?: number }) | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [scanStatus, setScanStatus] = useState('');
  const [fullCache, setFullCache] = useState<LightDrug[]>([]);
  const [tawreedQuery, setTawreedQuery] = useState('');
  const [tawreedResult, setTawreedResult] = useState<DebugResult | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDrug, setEditingDrug] = useState<Drug | null>(null);
  const [formData, setFormData] = useState<DrugFormData>({ nameEn: '', nameAr: '', newPrice: '', oldPrice: '' });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedIntelligenceDrug, setSelectedIntelligenceDrug] = useState<any | null>(null);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error' | 'info'} | null>(null);
  
  // NEW STATE FOR MEDHOME SYNC
  const [isSyncingMedhom, setIsSyncingMedhom] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  
  const showToast = (msg: string, type: 'success' | 'error' | 'info') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  useEffect(() => { loadStats(); if (activeTab === 'database') loadDrugs(true); if (activeTab === 'companies' && fullCache.length > 0 && companies.length === 0) setCompanies(getUniqueCompanies(fullCache)); }, [activeTab]);
  useEffect(() => { if (activeTab === 'database') { const timer = setTimeout(() => { loadDrugs(true); }, 600); return () => clearTimeout(timer); } }, [search]);
  useEffect(() => { if (activeTab === 'archive' && archiveSearch.length > 2) { const timer = setTimeout(async () => { try { setArchiveResults(await searchFullArchive(archiveSearch)); } catch(e) {} }, 600); return () => clearTimeout(timer); } }, [archiveSearch]);

  const loadStats = async () => { try { setStats(await fetchAdminStats()); } catch(e){} };
  const loadDrugs = async (reset = false) => { if (loading) return; setLoading(true); try { const res = await fetchDrugs(0, 50, search); setDrugs(res); } catch(e) { showToast('Error', 'error'); } finally { setLoading(false); } };
  const runDeepScan = async () => { setAiLoading(true); setScanStatus('Starting...'); try { const all = await fetchFullArchiveLight(() => {}); setFullCache(all); setCompanies(getUniqueCompanies(all)); setScanStatus('AI Processing...'); const report = await analyzeFullMarketDeeply(all, msg => setScanStatus(msg)); setAiReport(report); } catch(e) { showToast('Scan Failed', 'error'); } finally { setAiLoading(false); } };
  const runTawreedCheck = async () => { if(!tawreedQuery) return; try { setTawreedResult(await checkDrugAvailabilityDebug(tawreedQuery)); } catch(e){} };
  const handleSubmit = async (e: React.FormEvent) => { e.preventDefault(); try { editingDrug ? await updateDrug(editingDrug.id, formData) : await insertDrug(formData); showToast('Saved', 'success'); setIsModalOpen(false); loadDrugs(true); } catch(e) { showToast('Failed', 'error'); } };
  
  const handleCreateUpdate = (drug: any) => {
    const id = String(drug.id);
    setEditingDrug({ id: id, nameEn: drug.name_en || '', nameAr: drug.name_ar || '', newPrice: parseFloat(drug.price_new) || 0, oldPrice: parseFloat(drug.price_old) || 0, updatedAt: null });
    setFormData({ nameEn: drug.name_en || '', nameAr: drug.name_ar || '', newPrice: String(drug.price_new || ''), oldPrice: String(drug.price_old || ''), drugNo: id });
    setSelectedIntelligenceDrug(null);
    setIsModalOpen(true);
  };

  // --- MEDHOME BUTTON CLICK HANDLER ---
  const handleMedhomClick = async () => {
      setSyncError(null);
      setIsSyncingMedhom(true);
      try {
          await syncMedhomUpdatesToSupabase(100);
          showToast('تم جلب التحديثات بنجاح', 'success');
          await loadDrugs(true);
      } catch (e: any) {
          console.error(e);
          const msg = e.message ?? "حدث خطأ أثناء جلب تحديثات ميدهوم";
          setSyncError(msg);
          showToast(msg, 'error');
      } finally {
          setIsSyncingMedhom(false);
      }
  };

  const filteredCompanies = useMemo(() => companies.filter(c => c.name.toLowerCase().includes(companiesSearch.toLowerCase())), [companies, companiesSearch]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#020617] pb-24 font-['Tajawal'] text-right" dir="rtl">
        <AnimatePresence>{toast && <AdminToast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}</AnimatePresence>
        <div className="bg-slate-900 pt-8 pb-16 px-6 rounded-b-[40px] shadow-2xl relative overflow-hidden">
            <div className="relative z-10 flex justify-between items-center mb-6"><div><h1 className="text-2xl font-black text-white">غرفة العمليات</h1></div><button onClick={onLogout} className="p-2.5 bg-white/10 rounded-xl text-white"><LogOut size={18} /></button></div>
            <div className="flex bg-slate-800/50 p-1.5 rounded-2xl border border-white/5 relative z-10 overflow-x-auto"><button onClick={() => setActiveTab('hq')} className={`flex-1 min-w-[80px] py-2.5 rounded-xl text-xs font-bold ${activeTab === 'hq' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>HQ</button><button onClick={() => setActiveTab('companies')} className={`flex-1 min-w-[80px] py-2.5 rounded-xl text-xs font-bold ${activeTab === 'companies' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>الشركات</button><button onClick={() => setActiveTab('database')} className={`flex-1 min-w-[80px] py-2.5 rounded-xl text-xs font-bold ${activeTab === 'database' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>التحديثات</button><button onClick={() => setActiveTab('archive')} className={`flex-1 min-w-[80px] py-2.5 rounded-xl text-xs font-bold ${activeTab === 'archive' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>الأرشيف</button></div>
        </div>
        <div className="px-4 -mt-10 relative z-20">
            {activeTab === 'hq' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-10">
                    <div className="bg-slate-900 border border-slate-800 rounded-[28px] p-5 shadow-xl md:col-span-2 relative overflow-hidden min-h-[400px] flex flex-col">
                        <div className="flex justify-between items-start mb-4 relative z-10">
                            <div><h3 className="text-white font-bold flex items-center gap-2"><BrainCircuit className="text-emerald-500"/> رادار السوق</h3></div>
                            {!aiReport && !aiLoading && <button onClick={runDeepScan} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2"><Play size={12}/> تشغيل</button>}
                        </div>
                        {aiLoading ? <div className="text-emerald-400 text-center py-10">{scanStatus}</div> : aiReport ? <div className="text-white text-xs">{aiReport.executiveSummary}</div> : <div className="text-slate-600 text-center py-10">جاهز للتحليل</div>}
                    </div>
                    <div className="flex flex-col gap-4">
                        <div className="bg-blue-50 dark:bg-slate-800 border border-blue-200 dark:border-blue-500/10 rounded-[24px] p-4">
                            <h4 className="text-blue-700 dark:text-blue-400 font-bold text-xs mb-2 flex items-center gap-2"><RefreshCcw size={14}/> المزامنة</h4>
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => { setShowSyncModal(true); setSyncLogs([]); }} className="w-full py-2.5 bg-blue-600 text-white text-xs font-bold rounded-xl">مزامنة الأرشيف</button>
                                <button 
                                    onClick={handleMedhomClick} 
                                    disabled={isSyncingMedhom}
                                    className={`w-full py-2.5 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1 ${isSyncingMedhom ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                                >
                                    {isSyncingMedhom ? <RefreshCw className="animate-spin" size={14}/> : <CloudDownload size={14}/>}
                                    {isSyncingMedhom ? 'جاري الجلب...' : 'جلب ميدهوم'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {activeTab === 'companies' && (<div className="pb-20"><div className="bg-white dark:bg-slate-800 p-3 rounded-2xl mb-4"><input value={companiesSearch} onChange={e => setCompaniesSearch(e.target.value)} placeholder="بحث..." className="w-full bg-transparent outline-none text-sm dark:text-white" /></div><div className="grid grid-cols-2 gap-3">{filteredCompanies.map((c, i) => (<div key={i} onClick={() => { setSelectedCompany(c.name); fetchCompanyProducts(c.name).then(setCompanyProducts); }} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border dark:border-white/5 cursor-pointer"><h3 className="font-bold text-gray-800 dark:text-white text-xs">{c.name}</h3><span className="text-[10px] text-gray-400">{c.count} منتج</span></div>))}</div></div>)}
            
            {activeTab === 'database' && (
                <div className="pb-20 space-y-3">
                    <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl flex gap-2">
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث..." className="w-full bg-gray-50 dark:bg-slate-900 rounded-xl px-3 py-2 text-sm outline-none dark:text-white"/>
                        <button onClick={() => { setEditingDrug(null); setIsModalOpen(true); }} className="bg-blue-600 text-white w-10 rounded-xl flex items-center justify-center"><Plus size={20}/></button>
                    </div>
                    
                    <button 
                        onClick={handleMedhomClick} 
                        disabled={isSyncingMedhom}
                        className={`w-full text-white py-3 rounded-xl font-bold mb-3 flex items-center justify-center gap-2 ${isSyncingMedhom ? 'bg-indigo-400' : 'bg-indigo-600'}`}
                    >
                        {isSyncingMedhom ? <RefreshCw className="animate-spin" size={16}/> : <CloudDownload size={16}/>}
                        {isSyncingMedhom ? 'جاري الجلب...' : 'جلب تحديثات ميدهوم (Scrape)'}
                    </button>
                    {syncError && <p className="text-red-500 text-xs text-center">{syncError}</p>}

                    {drugs.map((d, i) => (<div key={d.id} onClick={() => setSelectedIntelligenceDrug(d)} className="bg-white dark:bg-slate-800 p-3 rounded-xl border flex justify-between items-center cursor-pointer"><div className="font-bold text-gray-800 dark:text-white text-sm">{d.nameEn}</div><div className="font-mono font-black text-blue-600 dark:text-blue-400">{d.newPrice}</div></div>))}
                </div>
            )}
            
            {activeTab === 'archive' && (<div className="pb-20 space-y-4"><input value={archiveSearch} onChange={e => setArchiveSearch(e.target.value)} placeholder="بحث في الأرشيف..." className="w-full bg-white dark:bg-slate-800 rounded-2xl px-4 py-3 outline-none dark:text-white"/>{archiveResults.map((d, i) => (<div key={d.id} onClick={() => setSelectedIntelligenceDrug(d)} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border cursor-pointer"><div className="flex justify-between"><div className="font-bold text-gray-800 dark:text-white text-sm">{d.name_en}</div><div className="font-black text-purple-600">{d.price_new}</div></div></div>))}</div>)}
        </div>
        <AnimatePresence>
            {selectedIntelligenceDrug && <DrugIntelligenceModal drug={selectedIntelligenceDrug} onClose={() => setSelectedIntelligenceDrug(null)} onEdit={handleCreateUpdate} />}
            {selectedCompany && (<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4"><div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl max-h-[80vh] flex flex-col overflow-hidden"><div className="p-4 border-b flex justify-between"><h3 className="font-bold dark:text-white">{selectedCompany}</h3><button onClick={() => setSelectedCompany(null)}><X className="dark:text-white"/></button></div><div className="flex-1 overflow-y-auto p-4 space-y-2">{companyProducts.map(p => (<div key={p.id} onClick={() => {setSelectedCompany(null); setSelectedIntelligenceDrug(p);}} className="flex justify-between p-3 border rounded-xl"><span className="text-sm font-bold dark:text-gray-200">{p.name_en}</span><span className="text-xs font-mono text-blue-500">{p.price_new}</span></div>))}</div></div></div>)}
            {isModalOpen && (<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4"><div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-6"><div className="flex justify-between mb-4"><h3 className="font-bold dark:text-white">Edit</h3><button onClick={()=>setIsModalOpen(false)}><X className="dark:text-white"/></button></div><form onSubmit={handleSubmit} className="space-y-3"><input value={formData.nameEn} onChange={e=>setFormData({...formData, nameEn:e.target.value})} className="w-full bg-gray-100 dark:bg-slate-800 p-3 rounded-xl dark:text-white" required /><input value={formData.newPrice} onChange={e=>setFormData({...formData, newPrice:e.target.value})} className="w-full bg-gray-100 dark:bg-slate-800 p-3 rounded-xl dark:text-white" required /><button className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl mt-2">Save</button></form></div></div>)}
            {showSyncModal && (<div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 px-4"><div className="bg-slate-900 w-full max-w-md rounded-3xl border border-white/10 overflow-hidden flex flex-col max-h-[80vh]"><div className="p-4 border-b border-white/5 flex justify-between"><h3 className="text-white font-bold">Sync</h3><button onClick={()=>{setShowSyncModal(false)}}><X className="text-gray-400"/></button></div><div className="p-6 flex-1 overflow-y-auto"><button onClick={syncMarketData.bind(null, (p,m)=>setSyncLogs(l=>[...l,m]), false)} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold">Start Sync</button><div className="bg-black rounded-xl p-3 font-mono text-[10px] text-green-500 h-64 overflow-y-auto mt-4">{syncLogs.map((l, i) => <div key={i}>{l}</div>)}</div></div></div></div>)}
        </AnimatePresence>
    </div>
  );
};
