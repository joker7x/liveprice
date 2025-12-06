
import React, { useMemo, memo, useState } from 'react';
import { Drug, TawreedProduct } from '../types';
import { Pill, Star, TrendingUp, Clock, ShoppingBag, Loader2, Store, AlertCircle, Percent, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { checkDrugAvailability } from '../services/tawreed';

interface DrugCardProps {
  drug: Drug;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onOpenInfo: (drug: Drug) => void;
  index: number;
}

export const DrugCard = memo(({ drug, isFavorite, onToggleFavorite, onOpenInfo, index }: DrugCardProps) => {
  const [checking, setChecking] = useState(false);
  const [availability, setAvailability] = useState<TawreedProduct | null>(null);
  const [checkStatus, setCheckStatus] = useState<'idle' | 'loading' | 'found' | 'not-found'>('idle');

  const percentChange = useMemo(() => {
    if (!drug.newPrice || !drug.oldPrice || drug.oldPrice === 0) return null;
    const diff = drug.newPrice - drug.oldPrice;
    return Math.round((diff / drug.oldPrice) * 100);
  }, [drug.newPrice, drug.oldPrice]);

  const hasChanged = percentChange !== null && percentChange !== 0;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    try {
        let val = parseFloat(dateString);
        if (isNaN(val)) {
            const d = new Date(dateString);
            if (!isNaN(d.getTime())) {
                 return new Intl.DateTimeFormat('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' }).format(d);
            }
            return '';
        }
        if (val < 10000000000) val *= 1000;
        const date = new Date(val);
        if (isNaN(date.getTime())) return '';
        return new Intl.DateTimeFormat('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' }).format(date);
    } catch (e) {
        return '';
    }
  };

  const handleCheckAvailability = async () => {
      if (checking) return;
      setChecking(true);
      setCheckStatus('loading');
      setAvailability(null);
      
      try {
          const results = await checkDrugAvailability(drug.nameEn);
          if (results.length > 0) {
              setAvailability(results[0]);
              setCheckStatus('found');
          } else {
              setCheckStatus('not-found');
          }
      } catch (e) {
          setCheckStatus('not-found');
      } finally {
          setChecking(false);
      }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.3,
        ease: "easeOut",
        delay: Math.min(index * 0.03, 0.2)
      }}
      className="relative mb-3 transform-gpu"
    >
      <div className="bg-white/95 dark:bg-slate-800/95 border border-white/60 dark:border-white/10 shadow-sm p-4 pb-3 rounded-[26px] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-400/10 to-transparent rounded-bl-[40px] pointer-events-none -mr-4 -mt-4 dark:from-blue-500/10" />

        <div className="flex items-start justify-between gap-3 relative z-10">
          <div className="flex gap-3.5 flex-1 min-w-0">
            <div 
                className="flex-shrink-0 w-[46px] h-[46px] mt-0.5 rounded-[16px] bg-gradient-to-br from-gray-50 to-blue-50/50 border border-white/60 dark:from-slate-700 dark:to-slate-700/50 dark:border-slate-600 flex items-center justify-center text-blue-500 dark:text-blue-400 cursor-pointer hover:scale-105 transition-transform"
                onClick={() => onOpenInfo(drug)}
            >
              <Pill size={22} strokeWidth={1.5} />
            </div>
            
            <div className="flex flex-col min-w-0">
              <h3 className="font-bold text-gray-800 dark:text-gray-100 text-[16px] leading-snug font-['Inter'] tracking-tight break-words">
                {drug.nameEn}
              </h3>
              <p className="text-[13px] text-gray-500 dark:text-gray-400 font-['Tajawal'] mt-1 font-medium leading-relaxed break-words">
                {drug.nameAr}
              </p>
              <div className="flex items-center gap-1.5 mt-2.5">
                <Clock size={11} className="text-gray-400 dark:text-gray-500" />
                <span className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">
                  {formatDate(drug.updatedAt)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end flex-shrink-0 pl-1">
            <div className="text-[18px] font-extrabold text-gray-800 dark:text-white font-['Inter'] tracking-tight leading-none">
              {drug.newPrice?.toFixed(2) ?? '--'} <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500">ج.م</span>
            </div>
            
            {drug.oldPrice && (
              <div className="text-[11px] text-gray-400/80 dark:text-gray-500 line-through font-medium mt-1">
                {drug.oldPrice.toFixed(2)}
              </div>
            )}

            {hasChanged ? (
              <div className="mt-2 px-2 py-0.5 bg-red-500/5 dark:bg-red-500/10 border border-red-500/10 dark:border-red-500/20 text-red-600 dark:text-red-400 text-[10px] font-bold rounded-full flex items-center gap-1">
                <TrendingUp size={10} />
                <span>{percentChange > 0 ? '+' : ''}{percentChange}%</span>
              </div>
            ) : (
               <div className="mt-2 px-2 py-0.5 bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/10 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold rounded-full">
                ثابت
              </div>
            )}
          </div>
        </div>

        {/* Availability Section */}
        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/50">
            {checkStatus === 'idle' && (
                <button 
                    onClick={handleCheckAvailability}
                    className="w-full py-2 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                >
                    <ShoppingBag size={14} /> فحص التوفر في السوق
                </button>
            )}

            {checkStatus === 'loading' && (
                <div className="flex items-center justify-center gap-2 py-2 text-xs text-gray-400">
                    <Loader2 size={14} className="animate-spin text-indigo-500" />
                    جاري البحث في السوق...
                </div>
            )}

            {checkStatus === 'not-found' && (
                 <div className="w-full py-2 bg-gray-50 dark:bg-gray-800 text-gray-400 rounded-xl text-xs font-bold flex items-center justify-center gap-2">
                    <Store size={14} /> غير متوفر حالياً
                 </div>
            )}

            {checkStatus === 'found' && availability && (
                <div className="bg-emerald-50/50 dark:bg-emerald-900/10 rounded-xl overflow-hidden border border-emerald-100 dark:border-emerald-500/20">
                     <div className="p-3 flex items-center justify-between">
                         <div className="flex items-center gap-2">
                             <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                 <Store size={16} />
                             </div>
                             <div>
                                 <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">متوفر في المخازن</div>
                                 <div className="text-xs font-black text-gray-800 dark:text-gray-100">
                                     {availability.bestSale} ج.م <span className="font-normal text-gray-400 text-[10px]">أفضل سعر</span>
                                 </div>
                             </div>
                         </div>
                         <div className="flex flex-col items-end">
                            {availability.avgDiscount && availability.avgDiscount > 0 && (
                                <div className="mb-1 px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-[9px] font-black rounded flex items-center gap-0.5">
                                    <Percent size={8} /> خصم {availability.avgDiscount}%
                                </div>
                            )}
                             <span className="text-[10px] text-gray-400 font-medium">الكمية: {availability.totalQty}</span>
                         </div>
                     </div>
                     
                     <div className="px-3 pb-2">
                        <div className="text-[10px] text-gray-400 bg-white/50 dark:bg-slate-900/50 rounded-lg p-2 border border-gray-100 dark:border-white/5">
                           <span className="font-bold">{availability.productName}</span>
                           <div className="mt-1 flex gap-1 text-[9px] text-gray-400">
                             <AlertCircle size={10} />
                             <span>تم العثور عليه كأقرب نتيجة مشابهة</span>
                           </div>
                        </div>
                     </div>
                </div>
            )}
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-gray-100 dark:border-gray-700/50 pt-2">
           <button 
             onClick={() => onToggleFavorite(drug.id)}
             className={`p-1.5 -ml-1.5 rounded-full active:scale-90 transition-transform ${isFavorite ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600'}`}
             aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
           >
             <Star size={18} fill={isFavorite ? "currentColor" : "none"} strokeWidth={2} />
           </button>
        </div>

      </div>
    </motion.div>
  );
});

DrugCard.displayName = 'DrugCard';
