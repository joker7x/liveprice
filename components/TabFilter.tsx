import React from 'react';
import { TabMode } from '../types';
import { LayoutGrid, TrendingUp, Star } from 'lucide-react';
import { motion } from 'framer-motion';

interface TabFilterProps {
  current: TabMode;
  onChange: (mode: TabMode) => void;
}

export const TabFilter: React.FC<TabFilterProps> = ({ current, onChange }) => {
  const tabs: { id: TabMode; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: 'الكل', icon: <LayoutGrid size={18} /> },
    { id: 'changed', label: 'تغييرات', icon: <TrendingUp size={18} /> },
    { id: 'fav', label: 'المفضلة', icon: <Star size={18} /> },
  ];

  return (
    <div className="px-5 pb-3 pt-1">
      <div className="relative flex p-1.5 bg-gray-200/40 dark:bg-slate-800/50 backdrop-blur-xl rounded-[24px]">
        {tabs.map((tab) => {
          const isActive = current === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`
                relative flex-1 flex items-center justify-center gap-2 py-3 rounded-[20px] text-[13px] font-bold transition-colors duration-200 z-10
                ${isActive ? 'text-blue-600 dark:text-white' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'}
              `}
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-white dark:bg-slate-700 shadow-[0_2px_12px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.3)] rounded-[20px] border border-gray-100/50 dark:border-white/5"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  style={{ zIndex: -1 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                {tab.icon}
                <span>{tab.label}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};