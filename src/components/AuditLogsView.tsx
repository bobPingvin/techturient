import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AuditLog } from '../types';
import { Shield, Search, Calendar, User, FileText, Trash2, Loader2, Filter, RefreshCw, Clock, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { logAction } from '../lib/logger';
import { useAuth } from '../context/AuthContext';

export function AuditLogsView() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('ALL');
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      })) as AuditLog[];
      setLogs(data);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching audit logs:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const formatDate = (timestamp: number) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return '';
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'LOGIN':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">Вход в систему</span>;
      case 'CREATE_CAMPAIGN':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">Кампания</span>;
      case 'CREATE_APPLICANT':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Создание абитуриента</span>;
      case 'UPDATE_APPLICANT':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">Редактирование</span>;
      case 'DELETE_APPLICANT':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">Удаление</span>;
      case 'PRINT_DOCUMENT':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">Документ / Печать</span>;
      case 'VERIFY_DOCUMENTS':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">Проверка документов</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-stone-100 text-stone-700 border border-stone-200">{action}</span>;
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAction = selectedAction === 'ALL' || log.action === selectedAction;
    return matchesSearch && matchesAction;
  });

  const handleClearLogs = async () => {
    if (!window.confirm('Вы действительно хотите очистить весь журнал действий? Это действие нельзя отменить.')) {
      return;
    }
    setClearing(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'audit_logs'));
      const deletePromises = querySnapshot.docs.map(docSnap => deleteDoc(doc(db, 'audit_logs', docSnap.id)));
      await Promise.all(deletePromises);
      await logAction(user?.username || 'nekpriem', 'CLEAR_LOGS', 'Очистил журнал системных логов');
    } catch (err) {
      console.error('Failed to clear logs:', err);
      alert('Ошибка при очистке логов');
    } finally {
      setClearing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-rose-800" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-stone-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button
              onClick={() => navigate(-1)}
              className="text-stone-500 hover:text-stone-800 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer bg-transparent border-none p-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Назад
            </button>
          </div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-800 uppercase tracking-wider mb-1">
            <Clock className="w-3.5 h-3.5" />
            Аудит безопасности и действий
          </div>
          <h2 className="text-2xl font-bold text-stone-900 tracking-tight">Журнал логов (Кто, что, когда делал)</h2>
          <p className="text-stone-500 text-sm mt-0.5">Полная хронология событий и операций сотрудников в приёмной комиссии</p>
        </div>

        <div className="flex items-center gap-2">
          {logs.length > 0 && (
            <button
              onClick={handleClearLogs}
              disabled={clearing}
              className="px-4 py-2.5 bg-stone-100 hover:bg-rose-50 text-stone-700 hover:text-rose-800 rounded-xl font-medium text-sm transition-colors flex items-center gap-2 border border-stone-200 hover:border-rose-200 cursor-pointer disabled:opacity-50"
            >
              {clearing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 text-rose-700" />}
              <span>Очистить журнал</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Поиск по описанию или сотруднику..."
            className="w-full pl-10 pr-4 py-2.5 bg-stone-50/50 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-800 text-stone-900"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <Filter className="w-4 h-4 text-stone-500 shrink-0 ml-1" />
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 shrink-0">Действие:</span>
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-medium text-stone-800 focus:outline-none focus:ring-2 focus:ring-rose-800 cursor-pointer"
          >
            <option value="ALL">Все действия ({logs.length})</option>
            <option value="LOGIN">Вход в систему</option>
            <option value="CREATE_CAMPAIGN">Создание кампании</option>
            <option value="CREATE_APPLICANT">Создание абитуриента</option>
            <option value="UPDATE_APPLICANT">Редактирование абитуриента</option>
            <option value="DELETE_APPLICANT">Удаление абитуриента</option>
            <option value="PRINT_DOCUMENT">Печать / Документы</option>
            <option value="VERIFY_DOCUMENTS">Проверка документов</option>
          </select>
        </div>
      </div>

      {/* Logs Table / List */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 bg-stone-100 rounded-2xl flex items-center justify-center mx-auto mb-3 text-stone-400">
              <Clock className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-stone-800">Записи не найдены</h3>
            <p className="text-stone-500 text-sm mt-1">
              {searchTerm || selectedAction !== 'ALL' 
                ? 'По заданным фильтрам нет ни одной записи' 
                : 'Журнал действий пока пуст. Все действия сотрудников будут отображаться здесь.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 text-xs uppercase tracking-wider font-bold">
                  <th className="py-3.5 px-4">Дата и время</th>
                  <th className="py-3.5 px-4">Сотрудник</th>
                  <th className="py-3.5 px-4">Тип операции</th>
                  <th className="py-3.5 px-4">Описание события</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 text-sm">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-stone-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono text-xs text-stone-600 whitespace-nowrap">
                      {formatDate(log.timestamp)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-stone-100 rounded-lg text-stone-800 font-medium text-xs">
                        <User className="w-3.5 h-3.5 text-stone-500" />
                        <span>{log.username}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {getActionBadge(log.action)}
                    </td>
                    <td className="py-3 px-4 text-stone-800 font-medium">
                      {log.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="text-xs text-stone-500 text-center pb-4">
        Всего записей в журнале: <strong className="text-stone-800">{filteredLogs.length}</strong> {logs.length !== filteredLogs.length ? `(из ${logs.length})` : ''}
      </div>
    </div>
  );
}
