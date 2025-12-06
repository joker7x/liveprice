import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Search, Wifi, WifiOff, X, Megaphone, AlertCircle } from 'lucide-react';
import { fetchDrugs } from './services/api';
import { Drug, TabMode, AppView, BroadcastMessage } from './types';
import { PAGE_SIZE, ADMIN_ACCESS_CODE } from './constants';
import { DrugCard } from './components/DrugCard';
import { SkeletonLoader } from './components/SkeletonLoader';
import { TabFilter } from './components/TabFilter';
import { BottomNavigation } from './components/Navigation';
import { SettingsView } from './components/SettingsView';
import { AdminView } from './components/AdminView'; // Import AdminView
import { DrugIntelligenceModal } from './components/DrugIntelligenceModal'; // Import Modal
import { motion, AnimatePresence } from 'framer-motion';

const App: React.FC = () => {
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [offset, setOffset] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [mode, setMode] = useState<TabMode>('all');
  const [search, setSearch] = useState<string>('');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  // Guard navigator access: ensure code doesn't throw during SSR/build
  const [isOffline, setIsOffline] = useState<boolean>(typeof navigator !== 'undefined' ? !navigator.onLine : false);
  
  // Navigation State
  const [currentView, setCurrentView] = useState<AppView>('home');
  const [darkMode, setDarkMode] = useState<boolean>(false);

  // Broadcast System State
  const [broadcast, setBroadcast] = useState<BroadcastMessage | null>(null);

  // Selected Drug for Intelligence
  const [selectedDrug, setSelectedDrug] = useState<Drug | null>(null);

  // ADMIN ACCESS STATE
  const [tapCount, setTapCount] = useState(0);
  const [showAdminAuth, setShowAdminAuth] = useState(false);
  const [adminPin, setAdminPin] = useState('');
  const tapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Load favorites
    try {
      const storedFavs = localStorage.getItem('dwa_favs');
      if (storedFavs) {
        setFavorites(new Set(JSON.parse(storedFavs)));
      }
    } catch (e) {
      console.error("Failed to parse favorites", e);
    }

    // Load Dark Mode
    try {
      const storedDark = localStorage.getItem('dwa_dark_mode');
      if (storedDark === 'true') setDarkMode(true);
    } catch(e) {}

    // Load Broadcast Message (Simulated from LocalStorage for now)
    try {
       const storedBroadcast = localStorage.getItem('dwa_broadcast');
       if(storedBroadcast) setBroadcast(JSON.parse(storedBroadcast));
    } catch(e) {}

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [currentView]); // Reload broadcast when view changes (e.g. back from admin)

  // Effect to apply dark mode class (if using tailwind 'class' strategy)
  useEffect(() => {
    localStorage.setItem('dwa_dark_mode', String(darkMode));
    const metaThemeColor = document.querySelector('meta[name="theme-color"][media="(prefers-color-scheme: dark)"]');
    
    if (darkMode) {
      document.documentElement.classList.add('dark');
      if(metaThemeColor) metaThemeColor.setAttribute('content', '#020617');
    } else {
      document.documentElement.classList.remove('dark');
      if(metaThemeColor) metaThemeColor.setAttribute('content', '#f2f6fa');
    }
  }, [darkMode]);

  const loadData = useCallback(async (isInitial = false) => {
    if (loading) return;
    setLoading(true);
    try {
      // PAGE_SIZE is 50
      const currentOffset = isInitial ? 0 : offset;
      const newDrugs = await fetchDrugs(currentOffset, PAGE_SIZE);
      
      if (newDrugs.length < PAGE_SIZE) {
        setHasMore(false);
      }

      setDrugs(prev => isInitial ? newDrugs : [...prev, ...newDrugs]);
      setOffset(prev => isInitial ? PAGE_SIZE : prev + PAGE_SIZE);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [loading, offset]);

  useEffect(() => {
    loadData(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleFavorite = (id: string) => {
    const newFavs = new Set(favorites);
    if (newFavs.has(id)) {
      newFavs.delete(id);
    } else {
      newFavs.add(id);
    }
    setFavorites(newFavs);
    localStorage.setItem('dwa_favs', JSON.stringify(Array.from(newFavs)));
  };

  const clearFavorites = () => {
    setFavorites(new Set());
    localStorage.removeItem('dwa_favs');
  };

  // ADMIN LOGIC
  const handleLogoTap = () => {
    if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
    
    setTapCount(prev => {
      const next = prev + 1;
      if (next === 5) {
        setShowAdminAuth(true);
        return 0;
      }
      return next;
    });

    // Reset tap count if no tap for 1 second
    tapTimeoutRef.current = setTimeout(() => {
      setTapCount(0);
    }, 1000);
  };

  const handleAdminAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPin === ADMIN_ACCESS_CODE) {
      setCurrentView('admin');
      setShowAdminAuth(false);
      setAdminPin('');
    } else {
      alert('كود خاطئ');
      setAdminPin('');
    }
  };

  const filteredDrugs = useMemo(() => {
    const q = search.toLowerCase();
    return drugs.filter(drug => {
      if (mode === 'changed') {
        if (!drug.oldPrice || !drug.newPrice || drug.oldPrice === drug.newPrice) return false;
      }
      if (mode === 'fav') {
        if (!favorites.has(drug.id)) return false;
      }
      if (!q) return true;
      const text = `${drug.nameEn.toLowerCase()} ${drug.nameAr.toLowerCase()}`;
      return text.includes(q);
    });
  }, [drugs, mode, search, favorites]);

  // If Admin View is Active
  if (currentView === 'admin') {
    return <AdminView onLogout={() => setCurrentView('home')} />;
  }

  return (
    <div className={`min-h-screen pb-28 selection:bg-blue-100/50 transition-colors duration-500 ${darkMode ? 'bg-[#020617]' : 'bg-[#f2f6fa]'}`}>
      {/* Decorative ambient background - Adjusted for Dark Mode (Midnight) */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
         <div className={`absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[100px] transition-colors duration-700 ${darkMode ? 'bg-blue-900/10' : 'bg-blue-200/20'}`} />
         <div className={`absolute top-[20%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[100px] transition-colors duration-700 ${darkMode ? 'bg-indigo-900/10' : 'bg-purple-200/20'}`} />
         <div className={`absolute bottom-[-10%] left-[20%] w-[60%] h-[60%] rounded-full blur-[120px] transition-colors duration-700 ${darkMode ? 'bg-slate-800/20' : 'bg-indigo-200/10'}`} />
      </div>

      <AnimatePresence mode="wait">
        {currentView === 'home' && (
          <motion.div 
            key="home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Header */}
            <header className="sticky top-0 z-40">
              {/* Dynamic glass header background */}
              <div className={`absolute inset-0 backdrop-blur-xl border-b transition-colors duration-500 ${darkMode ? 'bg-[#020617]/80 border-white/5' : 'bg-[#f2f6fa]/80 border-white/50'}`} />
              
              <div className="relative max-w-md mx-auto px-5 pt-14 pb-4">
                <div className="flex items-center justify-between mb-5">
                  
                  {/* LOGO AREA - NOW CLICKABLE FOR ADMIN */}
                  <div 
                    onClick={handleLogoTap}
                    className="flex items-center gap-3.5 relative cursor-pointer select-none active:scale-95 transition-transform"
                    style={{ zIndex: 50 }} // High z-index to ensure clicks work
                  >
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                      <span className="text-xl">💊</span>
                    </div>
                    <div>
                      <h1 className={`text-[22px] font-black tracking-tight transition-colors duration-500 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                        DWA Prices Pro (Live)
                      </h1>
                      <p className={`text-[11px] font-bold tracking-wide uppercase transition-colors duration-500 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>Premium Tracker</p>
                    </div>
                  </div>
                  
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-1.5 border backdrop-blur-sm ${isOffline ? 'bg-red-50/80 text-red-600 border-red-200' : 'bg-eme`
                  >
                    {isOffline ? <WifiOff size={12} /> : <Wifi size={12} />}
                    {isOffline ? 'غير متصل' : 'متصل'}
                  </motion.div>
                </div>

                <motion.div 
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ delay: 0.1 }}
                   className="relative group"
                >
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors duration-300">
                    <Search size={18} strokeWidth={2.5} />
                  </div>
                  <input
                    type="text"
                    placeholder="ابحث عن دواء..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className={`w-full backdrop-blur-xl pl-4 pr-11 py-3.5 rounded-[20px] border shadow-[0_4px_20px_rgba(0,0,0,0.03)] focus:outline-none focus:ring-[2px] transition-all duration-30`
                      ${darkMode 
                        ? 'bg-slate-800/60 hover:bg-slate-800/80 focus:bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:ring-blue-500/20 focus:border-blue-500/50' 
                        : 'bg-white/70 hover:bg-white/90 focus:bg-white border-white text-gray-800 placeholder-gray-400 focus:ring-blue-500/10 focus:border-blue-500/50'
                      }`}
                  />
                </motion.div>
              </div>
            </header>

            {/* Broadcast Banner */}
            <AnimatePresence>
                {broadcast?.isActive && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        className="max-w-md mx-auto px-5 overflow-hidden"
                    >
                        <div className={`mt-2 p-3 rounded-2xl flex items-start gap-3 border ${broadcast.type === 'warning' ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-5'
                            <div className="mt-0.5"><Megaphone size={16} /></div>
                            <div className="flex-1 text-xs font-bold leading-relaxed">{broadcast.text}</div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main List Content */}
            <main className="max-w-md mx-auto pt-2 relative z-10">
              <TabFilter current={mode} onChange={setMode} />

              <div className="px-5 space-y-4 mt-2">
                {drugs.length === 0 && loading ? (
                   Array.from({ length: 4 }).map((_, i) => (
                     <motion.div
                       key={i}
                       initial={{ opacity: 0, y: 20 }}
                       animate={{ opacity: 1, y: 0 }}
                       transition={{ delay: i * 0.1 }}
                     >
                       <SkeletonLoader />
                     </motion.div>
                   ))
                ) : filteredDrugs.length > 0 ? (
                  <AnimatePresence mode='popLayout'>
                    {filteredDrugs.map((drug, index) => (
                      <DrugCard 
                        key={drug.id} 
                        drug={drug} 
                        isFavorite={favorites.has(drug.id)}
                        onToggleFavorite={toggleFavorite}
                        onOpenInfo={setSelectedDrug}
                        index={index % PAGE_SIZE}
                      />
                    ))}
                  </AnimatePresence>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }}
                    className="text-center py-24"
                  >
                    <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl shadow-sm border ${darkMode ? 'bg-slate-800/50 border-white/5' : 'bg-white/50 bo`
                      🔍
                    </div>
                    <h3 className={`font-bold text-lg mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>لا توجد نتائج</h3>
                    <p className={`font-medium text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>جرب البحث بكلمات مختلفة</p>
                  </motion.div>
                )}

                {hasMore && filteredDrugs.length > 0 && mode === 'all' && !search && (
                  <div className="pt-8 pb-20 flex justify-center">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => loadData(false)}
                      disabled={loading}
                      className={`group relative px-8 py-3.5 rounded-full shadow-[0_10px_30px_rgba(37,99,235,0.15)] text-sm font-bold border transition-all disabled:opacity-50 flex items-center g`
                    >
                      <span>{loading ? 'جاري التحميل...' : 'تحميل المزيد'}</span>
                      {!loading && <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />}
                    </motion.button>
                  </div>
                )}
              </div>
            </main>
          </motion.div>
        )}

        {currentView === 'settings' && (
          <SettingsView 
            key="settings"
            darkMode={darkMode}
            toggleDarkMode={() => setDarkMode(!darkMode)}
            onClearFavorites={clearFavorites}
            onBack={() => setCurrentView('home')}
          />
        )}
        
        {currentView === 'stats' && (
           <motion.div 
             key="stats"
             initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
             className="pt-32 text-center px-6"
           >
              <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl ${darkMode ? 'bg-slate-800/50 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                📊
              </div>
              <h2 className={`text-xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>الإحصائيات قادمة قريباً</h2>
              <p className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>نعمل على تجهيز رسوم بيانية توضح حركة أسعار الأدوية.</p>
           </motion.div>
        )}
      </AnimatePresence>
      
      {/* INTELLIGENCE MODAL FOR ALL USERS */}
      <AnimatePresence>
          {selectedDrug && (
              <DrugIntelligenceModal 
                  drug={selectedDrug} 
                  onClose={() => setSelectedDrug(null)} 
              />
          )}
      </AnimatePresence>

      <BottomNavigation currentView={currentView} onNavigate={setCurrentView} />

      {/* ADMIN AUTH MODAL */}
      <AnimatePresence>
        {showAdminAuth && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center px-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="bg-white dark:bg-slate-800 w-full max-w-xs p-6 rounded-[32px] shadow-2xl text-center relative"
            >
              <button 
                onClick={() => setShowAdminAuth(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
              <h3 className="text-lg font-bold mb-1 dark:text-white">الوصول للمسؤولين</h3>
              <p className="text-xs text-gray-500 mb-6">أدخل كود الوصول للمتابعة</p>
              
              <form onSubmit={handleAdminAuth}>
                <input 
                  type="password" 
                  autoFocus
                  maxLength={4}
                  value={adminPin}
                  onChange={e => setAdminPin(e.target.value)}
                  className="w-full text-center text-3xl font-mono tracking-[10px] bg-gray-100 dark:bg-slate-900 border-2 border-transparent focus:border-blue-500 rounded-2xl py-3 mb-6 outline-no"
                  placeholder="••••"
                />
                <button 
                  type="submit"
                  className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-500/30"
                >
                  دخول
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
