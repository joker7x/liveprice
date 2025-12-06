
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Globe, ShoppingBag, Users, BrainCircuit, RefreshCw, AlertTriangle, CheckCircle, Building2, Beaker, ArrowRight, Activity, Percent } from 'lucide-react';
import { FullDrug, TawreedProduct } from '../types';
import { fetchAlternatives } from '../services/api';
import { checkDrugAvailability } from '../services/tawreed';
import { analyzeSingleDrugStrategy, DrugStrategyResult } from '../services/ai';

interface DrugIntelligenceModalProps {
    drug: any; // Accepts FullDrug or Drug (normalized)
    onClose: () => void;
    onEdit?: (drug: any) => void;
}

export const DrugIntelligenceModal: React.FC<DrugIntelligenceModalProps> = ({ drug, onClose, onEdit }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'market' | 'competition' | 'ai'>('overview');
    
    // State for Features
    const [alternatives, setAlternatives] = useState<FullDrug[]>([]);
    const [altLoading, setAltLoading] = useState(false);
    
    const [tawreedData, setTawreedData] = useState<TawreedProduct | null>(null);
    const [tawreedLoading, setTawreedLoading] = useState(false);
    const [tawreedStatus, setTawreedStatus] = useState<'idle' | 'loading' | 'found' | 'not-found'>('idle');

    const [aiStrategy, setAiStrategy] = useState<DrugStrategyResult | null>(null);
    const [aiLoading, setAiLoading] = useState(false);

    // Initial Data Normalization
    const drugName = drug.name_en || drug.nameEn || 'Unknown';
    const drugPrice = parseFloat(drug.price_new || drug.newPrice || '0');
    const drugCompany = drug.company || 'Unknown';
    const drugComposition = drug.composition || '';
    const drugId = Number(drug.id) || 0;

    // -- HANDLERS --

    const loadAlternatives = async () => {
        if(!drugComposition) return;
        setAltLoading(true);
        try {
            const alts = await fetchAlternatives(drugComposition, drugId);
            setAlternatives(alts);
        } catch(e) { console.error(e); }
        finally { setAltLoading(false); }
    };

    const checkMarket = async () => {
        setTawreedLoading(true);
        setTawreedStatus('loading');
        try {
            const results = await checkDrugAvailability(drugName);
            if(results.length > 0) {
                setTawreedData(results[0]);
                setTawreedStatus('found');
            } else {
                setTawreedStatus('not-found');
            }
        } catch(e) { setTawreedStatus('not-found'); }
        finally { setTawreedLoading(false); }
    };

    const runAiAnalysis = async () => {
        setAiLoading(true);
        try {
            const availabilityStr = tawreedStatus === 'found' ? `Available, Best Price: ${tawreedData?.bestSale}, Qty: ${tawreedData?.totalQty}` : "Market status unknown";
            const result = await analyzeSingleDrugStrategy(drugName, drugPrice, drugCompany, availabilityStr);
            setAiStrategy(result);
        } catch(e) { console.error(e); }
        finally { setAiLoading(false); }
    };

    // Auto-fetch on tab switch
    useEffect(() => {
        if(activeTab === 'competition' && alternatives.length === 0) loadAlternatives();
        if(activeTab === 'market' && tawreedStatus === 'idle') checkMarket();
        if(activeTab === 'ai' && !aiStrategy) runAiAnalysis();
    }, [activeTab]);

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center px-4 bg-slate-900/80 backdrop-blur-md font-['Tajawal']" dir="rtl">
            <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 20 }} 
                animate={{ scale: 1, opacity: 1, y: 0 }} 
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh] border border-white/10"
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-900 to-slate-900 p-6 flex justify-between items-start relative overflow-hidden shrink-0">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                    <div className="relative z-10 flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="bg-blue-500/20 text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border border-blue-500/20">Smart Profile</span>
                            <span className="text-gray-400 text-xs font-mono">#{String(drug.id).slice(0,6)}</span>
                        </div>
                        <h2 className="text-2xl font-black text-white leading-tight mb-1">{drugName}</h2>
                        <p className="text-slate-400 text-sm font-medium">{drug.name_ar || drug.nameAr || 'لا يوجد اسم عربي'}</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors relative z-10"><X size={20}/></button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100 dark:border-white/5 bg-slate-50 dark:bg-slate-800/50 shrink-0 overflow-x-auto">
                    {[
                        { id: 'overview', icon: Globe, label: 'نظرة عامة', color: 'blue' },
                        { id: 'market', icon: ShoppingBag, label: 'السوق', color: 'teal' },
                        { id: 'competition', icon: Users, label: 'المنافسون', color: 'purple' },
                        { id: 'ai', icon: BrainCircuit, label: 'المستشار', color: 'emerald' },
                    ].map(tab => (
                        <button 
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)} 
                            className={`flex-1 min-w-[90px] py-4 text-xs font-bold flex items-center justify-center gap-2 transition-all relative ${activeTab === tab.id ? `text-${tab.color}-600 dark:text-${tab.color}-400 bg-white dark:bg-slate-900` : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <tab.icon size={16} /> {tab.label}
                            {activeTab === tab.id && <div className={`absolute top-0 left-0 right-0 h-0.5 bg-${tab.color}-500`}></div>}
                        </button>
                    ))}
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-slate-900 min-h-[300px]">
                    
                    {/* OVERVIEW TAB */}
                    {activeTab === 'overview' && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-500/20">
                                    <div className="text-[10px] text-blue-500 font-bold uppercase mb-1">السعر الرسمي</div>
                                    <div className="text-3xl font-black text-blue-700 dark:text-blue-300 font-mono">{drugPrice || '--'} <span className="text-sm text-blue-400">EGP</span></div>
                                </div>
                                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-white/5">
                                    <div className="text-[10px] text-gray-500 font-bold uppercase mb-1">الشركة المنتجة</div>
                                    <div className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2 mt-1">
                                        <Building2 size={16} className="text-gray-400"/> {drugCompany}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-gray-100 dark:border-white/5">
                                <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2"><Beaker size={16} className="text-purple-500"/> التركيب (المادة الفعالة)</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-300 font-medium leading-relaxed font-mono">
                                    {drugComposition || 'غير مسجلة'}
                                </p>
                            </div>

                            {onEdit && (
                                <button onClick={() => onEdit(drug)} className="w-full py-4 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 font-bold rounded-2xl text-sm hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 border border-transparent hover:border-gray-300 dark:hover:border-white/10">
                                    تعديل البيانات يدوياً <ArrowRight size={16}/>
                                </button>
                            )}
                        </motion.div>
                    )}

                    {/* MARKET TAB */}
                    {activeTab === 'market' && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                            <div className="flex justify-between items-center bg-gray-50 dark:bg-slate-800 p-3 rounded-xl border border-gray-100 dark:border-white/5">
                                <h3 className="font-bold dark:text-white text-sm px-2">حالة التوفر (Tawreed)</h3>
                                <button onClick={checkMarket} disabled={tawreedLoading} className="px-3 py-1.5 bg-white dark:bg-slate-700 rounded-lg text-xs text-teal-600 dark:text-teal-400 font-bold flex items-center gap-2 shadow-sm hover:shadow-md transition-all">
                                    <RefreshCw size={12} className={tawreedLoading ? 'animate-spin' : ''}/> تحديث
                                </button>
                            </div>

                            {tawreedLoading ? (
                                <div className="py-16 text-center text-gray-400 flex flex-col items-center gap-4">
                                    <div className="relative">
                                        <div className="w-12 h-12 rounded-full border-4 border-teal-100 dark:border-teal-900"></div>
                                        <div className="w-12 h-12 rounded-full border-4 border-teal-500 border-t-transparent animate-spin absolute top-0 left-0"></div>
                                    </div>
                                    <span className="text-xs font-bold text-teal-600 dark:text-teal-400">جاري الاتصال بالسوق...</span>
                                </div>
                            ) : tawreedStatus === 'not-found' ? (
                                <div className="py-12 bg-red-50 dark:bg-red-900/10 rounded-[24px] border border-red-100 dark:border-red-500/20 text-center">
                                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle size={32} /></div>
                                    <h4 className="text-red-600 dark:text-red-400 font-bold text-lg">غير متوفر حالياً</h4>
                                    <p className="text-xs text-red-400 mt-2 opacity-80">لم يتم العثور على نتائج في المتاجر المرتبطة</p>
                                </div>
                            ) : tawreedData ? (
                                <div className="bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-slate-800 dark:to-slate-800 rounded-[28px] p-6 border border-teal-100 dark:border-teal-500/20 shadow-lg shadow-teal-500/5 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                                    
                                    <div className="flex items-center gap-4 mb-8 relative z-10">
                                        <div className="w-14 h-14 bg-white dark:bg-slate-700 rounded-2xl flex items-center justify-center text-teal-600 dark:text-teal-400 shadow-md">
                                            <ShoppingBag size={28} />
                                        </div>
                                        <div>
                                            <div className="text-base font-black text-gray-800 dark:text-white">{tawreedData.productName}</div>
                                            <div className="text-xs text-teal-600 dark:text-teal-400 font-bold flex items-center gap-1 mt-1">
                                                <CheckCircle size={12} /> متوفر للشراء
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {tawreedData.avgDiscount && tawreedData.avgDiscount > 0 && (
                                        <div className="relative z-10 mb-4 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-xl border border-red-200 dark:border-red-500/20 flex items-center justify-center gap-2">
                                            <Percent size={18} />
                                            <span className="font-black text-lg">خصم {tawreedData.avgDiscount}%</span>
                                        </div>
                                    )}
                                    
                                    <div className="grid grid-cols-2 gap-4 relative z-10">
                                        <div className="bg-white/80 dark:bg-black/20 p-4 rounded-2xl backdrop-blur-sm border border-teal-100 dark:border-white/5 text-center">
                                            <div className="text-[10px] text-gray-400 font-bold uppercase mb-1">أفضل سعر</div>
                                            <div className="text-2xl font-black text-teal-600 dark:text-teal-400">{tawreedData.bestSale} <span className="text-xs text-gray-400">EGP</span></div>
                                        </div>
                                        <div className="bg-white/80 dark:bg-black/20 p-4 rounded-2xl backdrop-blur-sm border border-teal-100 dark:border-white/5 text-center">
                                            <div className="text-[10px] text-gray-400 font-bold uppercase mb-1">الكمية</div>
                                            <div className="text-2xl font-black text-gray-800 dark:text-white">{tawreedData.totalQty}</div>
                                        </div>
                                    </div>
                                </div>
                            ) : null}
                        </motion.div>
                    )}

                    {/* COMPETITION TAB */}
                    {activeTab === 'competition' && (
                         <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                            {!drugComposition ? (
                                <div className="text-center py-16 text-gray-400 flex flex-col items-center gap-2">
                                    <Users size={32} className="opacity-20"/>
                                    <span className="text-xs">لا توجد بيانات عن المادة الفعالة</span>
                                </div>
                            ) : altLoading ? (
                                <div className="text-center py-16"><RefreshCw className="animate-spin mx-auto text-purple-500" size={32} /></div>
                            ) : alternatives.length === 0 ? (
                                <div className="text-center py-16 text-gray-400">لا توجد بدائل مسجلة</div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 mb-2 px-1"><Users size={14} className="text-purple-500"/><span className="text-xs font-bold text-gray-500">بدائل {drugComposition}</span></div>
                                    {alternatives.map(alt => {
                                        const altPrice = parseFloat(alt.price_new);
                                        const isCheaper = altPrice < drugPrice;
                                        return (
                                            <div key={alt.id} className="flex justify-between items-center p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-white/5">
                                                <div>
                                                    <div className="font-bold text-sm text-gray-800 dark:text-gray-200">{alt.name_en}</div>
                                                    <div className="text-[10px] text-gray-500 font-medium">{alt.company}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className={`text-sm font-black font-mono ${isCheaper ? 'text-green-600 dark:text-green-400' : 'text-purple-600 dark:text-purple-400'}`}>
                                                        {alt.price_new} <span className="text-[10px]">ج.م</span>
                                                    </div>
                                                    {isCheaper && <span className="text-[9px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded font-bold">أرخص</span>}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                         </motion.div>
                    )}

                    {/* AI STRATEGY TAB */}
                    {activeTab === 'ai' && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                            {!aiStrategy ? (
                                <div className="text-center py-10 bg-emerald-50/50 dark:bg-emerald-900/5 rounded-[32px] border border-emerald-100 dark:border-white/5">
                                    <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600 dark:text-emerald-400 shadow-xl shadow-emerald-500/10">
                                        <BrainCircuit size={40} />
                                    </div>
                                    <h3 className="font-black text-xl dark:text-white mb-2">المستشار الذكي</h3>
                                    <p className="text-xs text-gray-500 mb-8 max-w-xs mx-auto leading-relaxed">
                                        سيقوم Gemini 2.5 بتحليل وضع هذا الصنف في السوق، مقارنة سعره بالمنافسين، واقتراح استراتيجية البيع أو الشراء.
                                    </p>
                                    <button onClick={runAiAnalysis} disabled={aiLoading} className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold rounded-2xl shadow-xl shadow-emerald-500/30 flex items-center gap-3 mx-auto hover:scale-105 transition-transform">
                                        {aiLoading ? <RefreshCw className="animate-spin" /> : <Activity size={20} />}
                                        بدء التحليل الاستراتيجي
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className={`p-8 rounded-[32px] border-4 text-center relative overflow-hidden ${
                                        aiStrategy.advice === 'buy' ? 'bg-green-50 dark:bg-green-900/10 border-green-500 text-green-700 dark:text-green-400' :
                                        aiStrategy.advice === 'sell' ? 'bg-red-50 dark:bg-red-900/10 border-red-500 text-red-700 dark:text-red-400' :
                                        'bg-amber-50 dark:bg-amber-900/10 border-amber-500 text-amber-700 dark:text-amber-400'
                                    }`}>
                                        <div className="text-xs font-bold uppercase opacity-60 mb-2 tracking-widest">القرار المقترح</div>
                                        <div className="text-5xl font-black uppercase tracking-widest">{aiStrategy.advice}</div>
                                        <div className={`inline-block px-4 py-1 rounded-full text-xs font-black mt-4 bg-white/20`}>
                                            مخاطرة: {aiStrategy.riskLevel.toUpperCase()}
                                        </div>
                                    </div>

                                    <div className="bg-white dark:bg-slate-800 p-6 rounded-[24px] border border-gray-100 dark:border-white/5 shadow-sm">
                                        <h4 className="font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2 text-sm">
                                            <Activity size={16} className="text-blue-500" /> تحليل السبب
                                        </h4>
                                        <p className="text-sm text-gray-600 dark:text-gray-300 leading-loose font-medium">
                                            {aiStrategy.reason}
                                        </p>
                                    </div>

                                    <button onClick={runAiAnalysis} className="w-full py-4 text-xs font-bold text-gray-400 hover:text-gray-600 flex items-center justify-center gap-2">
                                        <RefreshCw size={14} /> تحديث التحليل
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    )}

                </div>
            </motion.div>
        </div>
    );
};
