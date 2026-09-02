import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, LogOut, FolderOpen, UserCheck, Shield, FileText, Settings as SettingsIcon, Clock } from 'lucide-react';
import { cn } from '../lib/utils';
import { SettingsModal } from './SettingsModal';

export function DashboardLayout() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <div className="min-h-screen bg-stone-100/70 flex flex-col font-sans">
      <header className="bg-white border-b border-stone-200 sticky top-0 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link to="/" className="flex items-center gap-3 hover:opacity-95 transition-opacity">
              <div className="w-10 h-10 bg-gradient-to-br from-rose-900 to-rose-800 rounded-xl flex items-center justify-center shadow-sm">
                <GraduationCap className="text-white w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-rose-950 text-base leading-tight tracking-tight">Techturient</span>
                  <span className="text-[11px] bg-rose-100 text-rose-800 font-semibold px-2 py-0.5 rounded-full">НЭК</span>
                </div>
                <p className="text-xs text-stone-500 font-medium">Приёмная комиссия</p>
              </div>
            </Link>
            
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                to="/logs"
                className={cn(
                  "text-stone-700 hover:text-rose-700 hover:bg-rose-50 transition-colors px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-sm font-medium border border-stone-200 hover:border-rose-200 cursor-pointer shadow-2xs",
                  location.pathname === '/logs' && "bg-rose-50 border-rose-300 text-rose-900 font-bold"
                )}
                title="Журнал логов действий"
              >
                <Clock className="w-4 h-4 text-rose-800" />
                <span className="hidden md:inline">Логи</span>
              </Link>

              <button
                type="button"
                onClick={() => setIsSettingsOpen(true)}
                className="text-stone-700 hover:text-rose-700 hover:bg-rose-50 transition-colors px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-sm font-medium border border-stone-200 hover:border-rose-200 cursor-pointer shadow-2xs"
                title="Настройки и шаблоны документов"
              >
                <SettingsIcon className="w-4 h-4 text-rose-800" />
                <span className="hidden md:inline">Настройки</span>
              </button>

              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-rose-50/70 rounded-xl text-rose-900 text-xs font-medium border border-rose-200/60">
                <Shield className="w-3.5 h-3.5 text-rose-700" />
                <span>Сотрудник: <strong>{user?.username}</strong></span>
              </div>
              <button
                onClick={logout}
                className="text-stone-600 hover:text-rose-700 hover:bg-rose-50 transition-colors px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-sm font-medium border border-stone-200 hover:border-rose-200 cursor-pointer"
                title="Выйти из системы"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Выйти</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-6 flex-1 flex flex-col">
        <main className="flex-1">
          <Outlet />
        </main>
      </div>

      <footer className="bg-white border-t border-stone-200 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center text-xs text-stone-500 gap-2">
          <span>© ГБПОУ НСО «Новосибирский электромеханический колледж»</span>
          <span>Модуль приёмной комиссии и учёта абитуриентов</span>
        </div>
      </footer>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}

