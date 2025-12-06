import React from 'react';
import { Home, BarChart2, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import { AppView } from '../types';

interface BottomNavigationProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({ currentView, onNavigate }) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 pt-4 pointer-events-none flex justify-center">
      <motion.div 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, type: "spring", stiffness: 200, damping: 20 }}
        className="pointer-events-auto bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border border-white/50 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] rounded-full px-7 py-3.5 flex items-center gap-10 md:gap-14"
      >
        <NavButton 
          icon={<Home size={24} strokeWidth={2.5} />} 
          label="الرئيسية" 
          active={currentView === 'home'} 
          onClick={() => onNavigate('home')}
        />
        <NavButton 
          icon={<BarChart2 size={24} strokeWidth={2} />} 
          label="إحصائيات" 
          active={currentView === 'stats'} 
          onClick={() => onNavigate('stats')} // Placeholder for stats
        />
        <NavButton 
          icon={<Settings size={24} strokeWidth={2} />} 
          label="إعدادات" 
          active={currentView === 'settings'} 
          onClick={() => onNavigate('settings')}
        />
      </motion.div>
    </div>
  );
};

const NavButton = ({ icon, label, active = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick: () => void }) => (
  <motion.button 
    whileTap={{ scale: 0.9 }}
    onClick={onClick}
    className={`flex flex-col items-center gap-1 transition-colors ${active ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300'}`}
    aria-label={label}
  >
    {icon}
    <span className={`text-[10px] ${active ? 'font-bold' : 'font-medium'}`}>{label}</span>
  </motion.button>
);