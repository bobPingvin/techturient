import React, { useState } from 'react';
import { Applicant } from '../types';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toast } from '../utils/toast';
import { SPECIALTY_LIST, formatSpecialtyDisplay } from '../lib/specialties';
import { 
  exportCallSheetToExcel, 
  exportCallSheetToPDF 
} from '../utils/reportExporter';
import { 
  X, 
  Phone, 
  PhoneCall, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  HelpCircle, 
  FileSpreadsheet, 
  Printer, 
  Filter, 
  Search, 
  Layers, 
  Copy, 
  Save, 
  UserCheck, 
  MessageSquare,
  Sparkles,
  Loader2
} from 'lucide-react';

interface CommercialCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignName: string;
  applicants: Applicant[];
  onApplicantUpdated?: () => void;
}

export function CommercialCallModal({
  isOpen,
  onClose,
  campaignName,
  applicants,
  onApplicantUpdated
}: CommercialCallModalProps) {
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [docFilter, setDocFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [isSavingAll, setIsSavingAll] = useState<boolean>(false);

  // Local state for editable notes and call statuses per applicant
  const [callStatuses, setCallStatuses] = useState<Record<string, string>>({});
  const [callNotes, setCallNotes] = useState<Record<string, string>>({});

  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Sync local state with incoming applicants
      const statuses: Record<string, string> = {};
      const notes: Record<string, string> = {};
      applicants.forEach(a => {
        statuses[a.id] = a.callStatus || 'not_called';
        notes[a.id] = a.callNote || '';
      });
      setCallStatuses(statuses);
      setCallNotes(notes);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, applicants]);

  if (!isOpen) return null;

  // Filter applicants
  const filteredApplicants = applicants.filter(a => {
    // Specialty filter
    if (selectedSpecialty !== 'all') {
      const isPrimary = a.specialty === selectedSpecialty || a.specialtyName === selectedSpecialty;
      const isAlt = a.alternativeSpecialties?.some(alt => alt.includes(selectedSpecialty));
      if (!isPrimary && !isAlt) return false;
    }

    // Status filter
    const currentStatus = callStatuses[a.id] || a.callStatus || 'not_called';
    if (statusFilter !== 'all' && currentStatus !== statusFilter) {
      return false;
    }

    // Doc submission filter
    if (docFilter === 'original' && a.educationDocumentSubmissionType === 'copy') return false;
    if (docFilter === 'copy' && a.educationDocumentSubmissionType !== 'copy') return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = a.fullName.toLowerCase().includes(q);
      const matchPhone = a.phone.toLowerCase().includes(q);
      const matchSnils = a.snils?.toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchSnils) return false;
    }

    return true;
  });

  // Handle saving status and note for a single applicant
  const handleSaveCallInfo = async (applicantId: string) => {
    setSavingId(applicantId);
    try {
      const status = callStatuses[applicantId] || 'not_called';
      const note = callNotes[applicantId] || '';

      await updateDoc(doc(db, 'applicants', applicantId), {
        callStatus: status,
        callNote: note,
        callUpdatedAt: Date.now()
      });

      toast.success('Результат звонка сохранён!');
      if (onApplicantUpdated) onApplicantUpdated();
    } catch (err) {
      console.error('Error saving call status:', err);
      toast.error('Не удалось сохранить статус звонка.');
    } finally {
      setSavingId(null);
    }
  };

  // Handle saving all displayed/modified applicants at once
  const handleSaveAllCallInfo = async () => {
    if (filteredApplicants.length === 0) return;
    setIsSavingAll(true);
    try {
      const changedApplicants = filteredApplicants.filter((a) => {
        const currentStatus = callStatuses[a.id] || 'not_called';
        const currentNote = callNotes[a.id] || '';
        const origStatus = a.callStatus || 'not_called';
        const origNote = a.callNote || '';
        return currentStatus !== origStatus || currentNote !== origNote;
      });

      const targetList = changedApplicants.length > 0 ? changedApplicants : filteredApplicants;

      await Promise.all(
        targetList.map((a) =>
          updateDoc(doc(db, 'applicants', a.id), {
            callStatus: callStatuses[a.id] || 'not_called',
            callNote: callNotes[a.id] || '',
            callUpdatedAt: Date.now()
          })
        )
      );

      toast.success(`Успешно сохранены результаты по ${targetList.length} абитуриентам!`);
      if (onApplicantUpdated) onApplicantUpdated();
    } catch (err) {
      console.error('Error saving all call info:', err);
      toast.error('Ошибка при массовом сохранении записей.');
    } finally {
      setIsSavingAll(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} скопирован в буфер обмена`);
  };

  // Metrics
  const totalCount = applicants.length;
  const agreedPaidCount = applicants.filter(a => (callStatuses[a.id] || a.callStatus) === 'agreed_paid').length;
  const thinkingCount = applicants.filter(a => (callStatuses[a.id] || a.callStatus) === 'thinking').length;
  const refusedCount = applicants.filter(a => (callStatuses[a.id] || a.callStatus) === 'refused').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-6xl rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[94vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-stone-900 text-white flex items-center justify-between border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-900/80 text-rose-300 rounded-xl border border-rose-800/50">
              <PhoneCall className="w-5 h-5 text-rose-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold">Лист обзвона и зачисление платников</h3>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30 uppercase tracking-wider">
                  Коммерция & Резерв
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                Модуль оперативной связи с абитуриентами, учета альтернативных пожеланий и зачисления по договору
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-white rounded-xl hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Metrics & Action Buttons */}
        <div className="p-5 bg-stone-100/80 border-b border-stone-200 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-white rounded-xl border border-stone-200 shadow-2xs flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Всего в списке</div>
                <div className="text-xl font-black text-stone-900 mt-0.5">{totalCount} чел.</div>
              </div>
              <UserCheck className="w-6 h-6 text-stone-400 opacity-70" />
            </div>

            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 shadow-2xs flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Согласны на договор</div>
                <div className="text-xl font-black text-emerald-950 mt-0.5">{agreedPaidCount} чел.</div>
              </div>
              <CheckCircle2 className="w-6 h-6 text-emerald-600 opacity-80" />
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 shadow-2xs flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">В раздумьях / Звонок</div>
                <div className="text-xl font-black text-amber-950 mt-0.5">{thinkingCount} чел.</div>
              </div>
              <Clock className="w-6 h-6 text-amber-600 opacity-80" />
            </div>

            <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 shadow-2xs flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">Отказ от поступления</div>
                <div className="text-xl font-black text-rose-950 mt-0.5">{refusedCount} чел.</div>
              </div>
              <XCircle className="w-6 h-6 text-rose-600 opacity-80" />
            </div>
          </div>

          {/* Export bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-stone-200/80">
            <div className="text-xs font-semibold text-stone-600">
              Показано абитуриентов: <strong className="text-stone-900">{filteredApplicants.length} чел.</strong>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleSaveAllCallInfo}
                disabled={isSavingAll || filteredApplicants.length === 0}
                className="px-4 py-2 bg-rose-900 hover:bg-rose-950 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50 ring-2 ring-rose-900/30"
                title="Сохранить изменённые статусы и заметки всех отображаемых абитуриентов"
              >
                {isSavingAll ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>
                  {isSavingAll ? 'Сохранение списка...' : 'Сохранить весь список сразу'}
                </span>
              </button>

              <button
                onClick={() => exportCallSheetToExcel(campaignName, filteredApplicants)}
                disabled={filteredApplicants.length === 0}
                className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Ведомость обзвона (Excel)</span>
              </button>

              <button
                onClick={() => exportCallSheetToPDF(campaignName, filteredApplicants)}
                disabled={filteredApplicants.length === 0}
                className="px-3.5 py-2 bg-stone-800 hover:bg-stone-900 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
              >
                <Printer className="w-4 h-4" />
                <span>Печать Бланка обзвона (PDF)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="p-4 bg-white border-b border-stone-200 space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск ФИО, телефону, СНИЛС..."
                className="w-full pl-8 pr-3 py-2 border border-stone-300 rounded-xl font-medium focus:ring-2 focus:ring-rose-800 focus:outline-none"
              />
              <Search className="w-4 h-4 text-stone-400 absolute left-2.5 top-2.5" />
            </div>

            {/* Specialty filter */}
            <div>
              <select
                value={selectedSpecialty}
                onChange={(e) => setSelectedSpecialty(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl font-semibold text-stone-800 focus:outline-none"
              >
                <option value="all">Все специальности и пожелания</option>
                {SPECIALTY_LIST.map(s => (
                  <option key={s.id} value={s.fullName}>{s.fullName}</option>
                ))}
              </select>
            </div>

            {/* Status filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl font-semibold text-stone-800 focus:outline-none"
              >
                <option value="all">Все статусы звонков</option>
                <option value="not_called">⚪ Не звонили</option>
                <option value="agreed_paid">🟢 Согласен на договор (Платно)</option>
                <option value="agreed_budget">🔵 Согласен на бюджет</option>
                <option value="thinking">🟡 В раздумьях / Перезвонить</option>
                <option value="refused">🔴 Отказ от поступления</option>
                <option value="unreachable">🟣 Не дозвонились</option>
              </select>
            </div>

            {/* Document filter */}
            <div>
              <select
                value={docFilter}
                onChange={(e) => setDocFilter(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl font-semibold text-stone-800 focus:outline-none"
              >
                <option value="all">Все типы документов</option>
                <option value="original">Только Оригиналы</option>
                <option value="copy">Только Копии (Резерв)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Applicants List Table */}
        <div className="overflow-y-auto flex-1 p-4 bg-stone-50/50">
          <div className="border border-stone-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
            <table className="w-full text-xs text-left text-stone-700">
              <thead className="bg-stone-100 text-stone-800 font-bold border-b border-stone-200 sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-3 text-center w-10">№</th>
                  <th className="px-4 py-3">Абитуриент и телефон</th>
                  <th className="px-3 py-3 text-center">Ср. балл</th>
                  <th className="px-4 py-3">Основная & Пожелания (Приоритеты)</th>
                  <th className="px-3 py-3 text-center">Договор</th>
                  <th className="px-3 py-3 text-center w-48">Статус звонка</th>
                  <th className="px-4 py-3">Заметка разговора</th>
                  <th className="px-3 py-3 text-center w-20">Действие</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredApplicants.map((a, idx) => {
                  const currentStatus = callStatuses[a.id] || 'not_called';
                  const currentNote = callNotes[a.id] || '';
                  const isSavingThis = savingId === a.id;

                  return (
                    <tr key={a.id || idx} className="hover:bg-stone-50/80 transition-colors">
                      <td className="px-3 py-3 text-center font-bold text-stone-900">{idx + 1}</td>
                      
                      {/* Name & Phone */}
                      <td className="px-4 py-3">
                        <div className="font-bold text-stone-900 text-sm">{a.fullName}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <a
                            href={`tel:${a.phone}`}
                            className="inline-flex items-center gap-1 font-mono text-rose-800 hover:text-rose-950 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200/80 font-bold"
                          >
                            <Phone className="w-3 h-3 text-rose-700" />
                            <span>{a.phone || 'Нет телефона'}</span>
                          </a>
                          {a.phone && (
                            <button
                              type="button"
                              onClick={() => copyToClipboard(a.phone, 'Телефон')}
                              className="p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded cursor-pointer"
                              title="Скопировать телефон"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Score */}
                      <td className="px-3 py-3 text-center">
                        <span className="font-extrabold text-rose-950 bg-rose-50 px-2 py-1 rounded-lg border border-rose-200/80">
                          {a.averageScore ? a.averageScore.toFixed(2) : '0.00'}
                        </span>
                      </td>

                      {/* Primary and Alternative Specialties */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-stone-900 mb-1">
                          1. {formatSpecialtyDisplay(a.specialty, a.specialtyName)}
                        </div>
                        {a.alternativeSpecialties && a.alternativeSpecialties.length > 0 ? (
                          <div className="space-y-0.5">
                            {a.alternativeSpecialties.map((alt, aIdx) => (
                              <div key={aIdx} className="text-[11px] text-stone-600 flex items-center gap-1">
                                <span className="font-bold text-stone-400">{aIdx + 2}.</span>
                                <span className="bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200/80 font-medium">
                                  {alt}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px] text-stone-400 italic">Альтернатив не указано</span>
                        )}
                      </td>

                      {/* Commercial Interest Badge */}
                      <td className="px-3 py-3 text-center">
                        {a.commercialInterest ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-950 rounded-lg text-[10px] font-extrabold border border-emerald-300">
                            <Sparkles className="w-3 h-3 text-emerald-700" />
                            Да (Договор)
                          </span>
                        ) : (
                          <span className="text-[10px] text-stone-400 font-medium">Только бюджет</span>
                        )}
                      </td>

                      {/* Status Selector */}
                      <td className="px-3 py-3 text-center">
                        <select
                          value={currentStatus}
                          onChange={(e) => setCallStatuses({ ...callStatuses, [a.id]: e.target.value })}
                          className={`w-full px-2 py-1.5 rounded-lg text-xs font-bold border focus:outline-none cursor-pointer ${
                            currentStatus === 'agreed_paid' ? 'bg-emerald-100 text-emerald-950 border-emerald-300' :
                            currentStatus === 'agreed_budget' ? 'bg-blue-100 text-blue-950 border-blue-300' :
                            currentStatus === 'thinking' ? 'bg-amber-100 text-amber-950 border-amber-300' :
                            currentStatus === 'refused' ? 'bg-rose-100 text-rose-950 border-rose-300' :
                            currentStatus === 'unreachable' ? 'bg-purple-100 text-purple-950 border-purple-300' :
                            'bg-stone-100 text-stone-700 border-stone-300'
                          }`}
                        >
                          <option value="not_called">⚪ Не звонили</option>
                          <option value="agreed_paid">🟢 Согласен на договор</option>
                          <option value="agreed_budget">🔵 Согласен на бюджет</option>
                          <option value="thinking">🟡 В раздумьях / Перезвонить</option>
                          <option value="refused">🔴 Отказ от поступления</option>
                          <option value="unreachable">🟣 Не дозвонились</option>
                        </select>
                      </td>

                      {/* Editable Note */}
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={currentNote}
                          onChange={(e) => setCallNotes({ ...callNotes, [a.id]: e.target.value })}
                          placeholder="Результат разговора..."
                          className="w-full px-2.5 py-1.5 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-rose-800"
                        />
                      </td>

                      {/* Save Button */}
                      <td className="px-3 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleSaveCallInfo(a.id)}
                          disabled={isSavingThis}
                          className="p-1.5 bg-rose-900 hover:bg-rose-950 text-white rounded-lg transition-all shadow-2xs cursor-pointer disabled:opacity-50"
                          title="Сохранить результат звонка"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {filteredApplicants.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-stone-400">
                      Абитуриентов по выбранным фильтрам не найдено
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-stone-200 bg-stone-100 flex justify-between items-center text-xs">
          <span className="text-stone-500">
            Система автоматизации приёмной комиссии • Модуль зачисления платников 2026
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveAllCallInfo}
              disabled={isSavingAll || filteredApplicants.length === 0}
              className="px-5 py-2 bg-rose-900 hover:bg-rose-950 text-white font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
            >
              {isSavingAll ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>Сохранить весь список</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-stone-800 hover:bg-stone-700 text-white font-bold rounded-xl transition-colors cursor-pointer"
            >
              Закрыть
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
