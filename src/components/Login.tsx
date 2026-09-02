import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Loader2, Lock, User as UserIcon, ShieldAlert, GraduationCap, HelpCircle } from 'lucide-react';

export function Login() {
  const [loginInput, setLoginInput] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const success = await login(loginInput, password);
      if (!success) {
        setError('Неверный логин или пароль. Доступ разрешён только сотрудникам приёмной комиссии НЭК.');
      }
    } catch (err: any) {
      console.error(err);
      setError('Произошла ошибка при входе. Попробуйте еще раз.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
      <div className="bg-white max-w-md w-full rounded-2xl shadow-xl border border-stone-200 overflow-hidden">
        {/* Header - White and Burgundy theme */}
        <div className="p-8 text-center bg-gradient-to-br from-rose-950 via-rose-900 to-rose-800 text-white relative">
          <div className="w-16 h-16 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20 shadow-inner">
            <GraduationCap className="w-9 h-9 text-white" />
          </div>
          <div className="inline-block px-3.5 py-1 rounded-full bg-white/15 text-rose-100 text-xs font-bold uppercase tracking-wider mb-2">
            TECHTURIENT • ПРИЁМНАЯ КОМИССИЯ
          </div>
          <h1 className="text-xl font-bold tracking-tight">Новосибирский электромеханический колледж</h1>
          <p className="text-rose-200 mt-1 text-xs">Автоматизированная система учёта абитуриентов</p>
        </div>
        
        <div className="p-8">
          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-xl text-sm flex items-start gap-2.5">
                <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-700" />
                <span>{error}</span>
              </div>
            )}
            
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Логин сотрудника
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={loginInput}
                  onChange={(e) => setLoginInput(e.target.value)}
                  placeholder="Введите логин"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-rose-800 focus:border-transparent transition-all text-stone-900 bg-stone-50/50"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Пароль
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-rose-800 focus:border-transparent transition-all text-stone-900 bg-stone-50/50"
                  required
                />
              </div>
            </div>

            <div className="pt-2 space-y-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-rose-800 hover:bg-rose-900 active:bg-rose-950 text-white font-medium py-3 rounded-xl transition-all shadow-md hover:shadow-lg flex justify-center items-center gap-2 cursor-pointer disabled:opacity-70"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Войти в личный кабинет'}
              </button>

              <div className="text-center">
                <div className="relative group inline-block">
                  <button
                    type="button"
                    className="text-xs text-stone-500 hover:text-stone-700 transition-colors inline-flex items-center gap-1 cursor-help"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-stone-400" />
                    <span>Как получить учетную запись?</span>
                  </button>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-64 p-2.5 bg-stone-900 text-white text-xs rounded-xl shadow-xl z-20 leading-relaxed text-center pointer-events-none">
                    Данные для входа в систему выдаются администрацией колледжа
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-stone-900" />
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
