import React, { useState, useEffect } from 'react';
import { Applicant } from '../types';
import { 
  X, 
  BookOpen, 
  Save, 
  CheckCircle2, 
  Search, 
  Layers, 
  Sparkles,
  Award,
  Wallet,
  Briefcase
} from 'lucide-react';
import { SPECIALTY_LIST, getSpecialtyByFullName } from '../lib/specialties';

interface EditSpecialtyModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicant: Applicant;
  onSaveSpecialty: (updatedFields: Partial<Applicant>) => Promise<void>;
}

export function EditSpecialtyModal({
  isOpen,
  onClose,
  applicant,
  onSaveSpecialty
}: EditSpecialtyModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const [selectedSpecialty, setSelectedSpecialty] = useState<string>(applicant.specialty || '');
  const [secondSpecialty, setSecondSpecialty] = useState<string>(applicant.alternativeSpecialties?.[0] || '');
  const [thirdSpecialty, setThirdSpecialty] = useState<string>(applicant.alternativeSpecialties?.[1] || '');
  const [commercialInterest, setCommercialInterest] = useState<boolean>(applicant.commercialInterest ?? false);
  const [filterFunding, setFilterFunding] = useState<'all' | 'Бюджет' | 'Платно'>('all');
  const [filterProgramType, setFilterProgramType] = useState<'all' | 'ППССЗ' | 'ППКРС'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedSpecialty(applicant.specialty || '');
      setSecondSpecialty(applicant.alternativeSpecialties?.[0] || '');
      setThirdSpecialty(applicant.alternativeSpecialties?.[1] || '');
      setCommercialInterest(applicant.commercialInterest ?? false);
      setSearchQuery('');
      setFilterFunding('all');
      setFilterProgramType('all');
    }
  }, [isOpen, applicant]);

  if (!isOpen) return null;

  const filteredSpecialties = SPECIALTY_LIST.filter(item => {
    if (filterFunding !== 'all' && item.funding !== filterFunding) return false;
    if (filterProgramType !== 'all' && item.programType !== filterProgramType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.fullName.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q) ||
        (item.code && item.code.includes(q)) ||
        item.programTypeName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSpecialty.trim()) {
      alert('Пожалуйста, выберите специальность или профессию из списка');
      return;
    }

    const specObj = getSpecialtyByFullName(selectedSpecialty);
    const fundingType = specObj?.funding || (selectedSpecialty.includes('Бюджет') ? 'Бюджет' : 'Платно');
    const programType = specObj?.programType || (
      selectedSpecialty.includes('ППКРС') || selectedSpecialty.toLowerCase().includes('электромонтер') ? 'ППКРС' : 'ППССЗ'
    );
    const specialtyName = specObj?.name || selectedSpecialty.replace(/\s*\((Бюджет|Платно)\)\s*$/i, '').trim();

    setIsSubmitting(true);

    const alternativeSpecialties = [secondSpecialty, thirdSpecialty].filter(
      (s) => s && s.trim() !== '' && s !== selectedSpecialty
    );

    try {
      await onSaveSpecialty({
        specialty: selectedSpecialty,
        specialtyName,
        fundingType,
        programType,
        alternativeSpecialties,
        commercialInterest
      });
      onClose();
    } catch (err) {
      console.error(err);
      alert('Ошибка при сохранении специальности');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh] overscroll-contain">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-100 text-rose-900 rounded-xl">
              <BookOpen className="w-5 h-5 text-rose-800" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-stone-900">
                Специальность / Программа обучения
              </h3>
              <p className="text-xs text-stone-500">
                Абитуриент: <span className="font-semibold text-stone-700">{applicant.fullName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {/* Filters & Search */}
          <div className="space-y-3 bg-stone-50 p-3.5 rounded-xl border border-stone-200">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по названию специальности, коду или ключевому слову..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-stone-300 rounded-xl bg-white focus:ring-2 focus:ring-rose-800 focus:outline-none"
              />
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            </div>

            <div className="flex flex-wrap gap-2 items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-stone-500 font-medium">Основа:</span>
                <button
                  type="button"
                  onClick={() => setFilterFunding('all')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    filterFunding === 'all'
                      ? 'bg-rose-900 text-white shadow-2xs'
                      : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  Все
                </button>
                <button
                  type="button"
                  onClick={() => setFilterFunding('Бюджет')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    filterFunding === 'Бюджет'
                      ? 'bg-emerald-700 text-white shadow-2xs'
                      : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  🟢 Бюджет
                </button>
                <button
                  type="button"
                  onClick={() => setFilterFunding('Платно')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    filterFunding === 'Платно'
                      ? 'bg-blue-700 text-white shadow-2xs'
                      : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  🔵 Платно
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-stone-500 font-medium">Тип программы:</span>
                <button
                  type="button"
                  onClick={() => setFilterProgramType('all')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    filterProgramType === 'all'
                      ? 'bg-stone-800 text-white shadow-2xs'
                      : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  Все
                </button>
                <button
                  type="button"
                  onClick={() => setFilterProgramType('ППССЗ')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    filterProgramType === 'ППССЗ'
                      ? 'bg-stone-800 text-white shadow-2xs'
                      : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  Специальности (ППССЗ)
                </button>
                <button
                  type="button"
                  onClick={() => setFilterProgramType('ППКРС')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    filterProgramType === 'ППКРС'
                      ? 'bg-purple-800 text-white shadow-2xs'
                      : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  Профессия (ППКРС)
                </button>
              </div>
            </div>
          </div>

          {/* List of Specialty Cards */}
          <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
            {filteredSpecialties.map((item) => {
              const isSelected = selectedSpecialty === item.fullName;
              const isPPKRS = item.programType === 'ППКРС';
              const isBudget = item.funding === 'Бюджет';

              return (
                <label
                  key={item.id}
                  onClick={() => setSelectedSpecialty(item.fullName)}
                  className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-rose-50/90 border-rose-600 ring-2 ring-rose-600/30 shadow-xs'
                      : 'bg-white border-stone-200 hover:border-stone-300 hover:bg-stone-50/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="modalSpecialty"
                    value={item.fullName}
                    checked={isSelected}
                    onChange={() => setSelectedSpecialty(item.fullName)}
                    className="mt-1 w-4 h-4 text-rose-800 focus:ring-rose-800 accent-rose-800 shrink-0"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-bold text-xs sm:text-sm text-stone-900">
                        {item.code ? `${item.code} ${item.name}` : item.name}
                      </span>

                      {/* Funding badge */}
                      <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                        isBudget
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                          : 'bg-blue-100 text-blue-900 border-blue-300'
                      }`}>
                        {item.funding}
                      </span>

                      {/* Program type badge */}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        isPPKRS
                          ? 'bg-purple-100 text-purple-950 border-purple-300'
                          : 'bg-stone-100 text-stone-700 border-stone-200'
                      }`}>
                        {isPPKRS ? '★ Программа рабочих (ППКРС)' : 'Специальность (ППССЗ)'}
                      </span>

                      {item.code && (
                        <span className="text-[10px] font-mono text-stone-400 font-medium">
                          код {item.code}
                        </span>
                      )}
                    </div>

                    {item.description && (
                      <p className="text-xs text-stone-500 line-clamp-2">
                        {item.description}
                      </p>
                    )}

                    {isPPKRS && (
                      <div className="mt-1.5 text-[11px] font-medium text-purple-900 bg-purple-50 p-1.5 rounded-md border border-purple-200">
                        ℹ️ <strong>Примечание:</strong> Электромонтер по ремонту и обслуживанию электрооборудования — это Программа подготовки квалифицированных рабочих, служащих (ППКРС).
                      </div>
                    )}
                  </div>
                </label>
              );
            })}

            {filteredSpecialties.length === 0 && (
              <div className="p-8 text-center bg-stone-50 rounded-xl border border-stone-200 text-stone-500 text-xs">
                По выбранным фильтрам специальностей не найдено
              </div>
            )}
          </div>

          {/* Альтернативные специальности (Пожелания / Приоритеты 2 и 3) */}
          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-3 text-xs">
            <div className="flex items-center gap-2 font-bold text-stone-900 text-sm pb-2 border-b border-stone-200">
              <Layers className="w-4 h-4 text-rose-800" />
              <span>Пожелания на другие специальности (Приоритеты 2 и 3) и коммерческий набор</span>
            </div>

            <label className="flex items-start gap-2.5 p-3 bg-white rounded-xl border border-stone-200 cursor-pointer select-none hover:bg-stone-50 transition-colors shadow-2xs">
              <input
                type="checkbox"
                checked={commercialInterest}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setCommercialInterest(checked);
                  if (!checked) {
                    setSecondSpecialty('');
                    setThirdSpecialty('');
                  }
                }}
                className="mt-0.5 w-4 h-4 text-rose-800 rounded border-stone-300 focus:ring-rose-800 accent-rose-800 cursor-pointer shrink-0"
              />
              <div>
                <span className="font-bold text-stone-800 text-xs block">
                  Рассматривать альтернативные специальности и платное (договорное) обучение
                </span>
                <span className="text-[11px] text-stone-500 font-normal block mt-0.5">
                  Включает абитуриента в ведомость обзвона и резерв, а также открывает выбор 2-го и 3-го приоритетов специальностей.
                </span>
              </div>
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">2-й приоритет (Запасная специальность):</label>
                <select
                  value={secondSpecialty}
                  onChange={(e) => setSecondSpecialty(e.target.value)}
                  disabled={!commercialInterest}
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl font-medium text-stone-900 focus:outline-none disabled:bg-stone-100 disabled:text-stone-400 disabled:cursor-not-allowed"
                >
                  <option value="">{commercialInterest ? '-- Не выбрано --' : '-- Отключено (включите галочку выше) --'}</option>
                  {SPECIALTY_LIST.filter(s => s.fullName !== selectedSpecialty).map(s => (
                    <option key={s.id} value={s.fullName}>
                      {s.fullName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">3-й приоритет (Запасная специальность):</label>
                <select
                  value={thirdSpecialty}
                  onChange={(e) => setThirdSpecialty(e.target.value)}
                  disabled={!commercialInterest}
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl font-medium text-stone-900 focus:outline-none disabled:bg-stone-100 disabled:text-stone-400 disabled:cursor-not-allowed"
                >
                  <option value="">{commercialInterest ? '-- Не выбрано --' : '-- Отключено (включите галочку выше) --'}</option>
                  {SPECIALTY_LIST.filter(s => s.fullName !== selectedSpecialty && s.fullName !== secondSpecialty).map(s => (
                    <option key={s.id} value={s.fullName}>
                      {s.fullName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {!commercialInterest && (
              <p className="text-[11px] text-amber-800 font-medium bg-amber-50 p-2 rounded-lg border border-amber-200">
                💡 Чтобы добавить 2-й и 3-й приоритеты, установите галочку разрешения выше.
              </p>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-stone-200 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-stone-300 text-stone-700 hover:bg-stone-100 rounded-xl text-sm font-medium transition-colors cursor-pointer"
            >
              Отмена
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !selectedSpecialty}
              className="bg-rose-900 hover:bg-rose-950 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Сохранение...' : 'Сохранить специальность'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
