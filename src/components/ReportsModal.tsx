import React, { useState } from 'react';
import { Campaign, Applicant } from '../types';
import { exportApplicantsToExcel, exportApplicantsToPDF } from '../utils/reportExporter';
import { formatSpecialtyDisplay } from '../lib/specialties';
import { X, FileText, Printer, Download, BarChart3, Users, Award, Shield, CheckCircle2, Building, Calendar, Layers } from 'lucide-react';

interface ReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: Campaign | null;
  applicants: Applicant[];
}

export function ReportsModal({
  isOpen,
  onClose,
  campaign,
  applicants
}: ReportsModalProps) {
  const [activeTab, setActiveTab] = useState<'summary' | 'specialties' | 'benefits' | 'export'>('summary');
  const [isExporting, setIsExporting] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Calculate statistics
  const totalApplicants = applicants.length;
  const originalDocsCount = applicants.filter(a => a.educationDocumentSubmissionType !== 'copy').length;
  const copyDocsCount = applicants.filter(a => a.educationDocumentSubmissionType === 'copy').length;
  const averageScoreOverall = totalApplicants > 0 
    ? (applicants.reduce((acc, curr) => acc + (curr.averageScore || 0), 0) / totalApplicants).toFixed(2)
    : '0.00';

  // Specialty breakdown
  const specialtyMap: { [key: string]: { count: number; original: number; budget: number; paid: number; sumScore: number } } = {};
  applicants.forEach(a => {
    const spec = a.specialty ? formatSpecialtyDisplay(a.specialty, a.specialtyName) : 'Не указана';
    if (!specialtyMap[spec]) {
      specialtyMap[spec] = { count: 0, original: 0, budget: 0, paid: 0, sumScore: 0 };
    }
    specialtyMap[spec].count += 1;
    if (a.educationDocumentSubmissionType !== 'copy') {
      specialtyMap[spec].original += 1;
    }
    if (a.fundingType === 'Бюджет') {
      specialtyMap[spec].budget += 1;
    } else {
      specialtyMap[spec].paid += 1;
    }
    specialtyMap[spec].sumScore += (a.averageScore || 0);
  });

  // Benefit breakdown
  const benefitMap: { [key: string]: number } = {};
  applicants.forEach(a => {
    if (a.hasBenefit && a.benefit && a.benefit !== 'Нет льгот') {
      benefitMap[a.benefit] = (benefitMap[a.benefit] || 0) + 1;
    }
  });

  const handlePrint = () => {
    exportApplicantsToPDF(campaign?.name || 'Приёмная кампания', applicants);
  };

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      await exportApplicantsToExcel(campaign?.name || 'Приёмная кампания', applicants);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-stone-200 animate-in fade-in duration-200 overscroll-contain">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-900 text-white rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-900 text-white rounded-xl">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Официальная отчётность и аналитика</h3>
              <p className="text-xs text-stone-300">
                Приёмная кампания: <span className="text-white font-medium">{campaign?.name}</span> • Для производственной практики
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Печать отчёта / Сохранить в PDF"
            >
              <Printer className="w-4 h-4 text-stone-300" />
              <span>Печать / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-white rounded-xl hover:bg-stone-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 py-2.5 bg-stone-100 border-b border-stone-200 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('summary')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'summary'
                ? 'bg-rose-900 text-white shadow-sm'
                : 'bg-white text-stone-700 hover:bg-stone-200/60 border border-stone-200'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Сводная справка</span>
          </button>
          <button
            onClick={() => setActiveTab('specialties')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'specialties'
                ? 'bg-rose-900 text-white shadow-sm'
                : 'bg-white text-stone-700 hover:bg-stone-200/60 border border-stone-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>По специальностям</span>
          </button>
          <button
            onClick={() => setActiveTab('benefits')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'benefits'
                ? 'bg-rose-900 text-white shadow-sm'
                : 'bg-white text-stone-700 hover:bg-stone-200/60 border border-stone-200'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Льготы и квоты</span>
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'export'
                ? 'bg-rose-900 text-white shadow-sm'
                : 'bg-white text-stone-700 hover:bg-stone-200/60 border border-stone-200'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Экспорт данных</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-stone-50/50">
          
          {/* TAB 1: SUMMARY */}
          {activeTab === 'summary' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs">
                <div className="text-center max-w-xl mx-auto mb-6">
                  <span className="text-xs font-bold uppercase tracking-widest text-rose-800">Официальный документ практики</span>
                  <h4 className="text-xl font-bold text-stone-900 mt-1">Сводный отчёт о результатах приёма документов</h4>
                  <p className="text-xs text-stone-500 mt-1">
                    Дата формирования: {new Date().toLocaleDateString('ru-RU')} г. • Образовательная организация / Приемная комиссия
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                  <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 text-center">
                    <span className="text-xs text-stone-500 uppercase font-semibold block mb-1">Всего заявлений</span>
                    <span className="text-2xl font-black text-rose-950">{totalApplicants}</span>
                  </div>
                  <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 text-center">
                    <span className="text-xs text-stone-500 uppercase font-semibold block mb-1">Оригиналов аттестатов</span>
                    <span className="text-2xl font-black text-emerald-800">{originalDocsCount}</span>
                  </div>
                  <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 text-center">
                    <span className="text-xs text-stone-500 uppercase font-semibold block mb-1">Копий документов</span>
                    <span className="text-2xl font-black text-amber-800">{copyDocsCount}</span>
                  </div>
                  <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 text-center">
                    <span className="text-xs text-stone-500 uppercase font-semibold block mb-1">Средний балл аттестата</span>
                    <span className="text-2xl font-black text-stone-900">{averageScoreOverall}</span>
                  </div>
                </div>

                <div className="border-t border-stone-200 pt-5 space-y-3">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-stone-700">Краткая аналитическая справка</h5>
                  <p className="text-sm text-stone-600 leading-relaxed">
                    В рамках данной приёмной кампании по состоянию на {new Date().toLocaleDateString('ru-RU')} зарегистрировано <strong>{totalApplicants}</strong> заявлений от абитуриентов. 
                    Из них предоставили оригиналы документов об образовании <strong>{originalDocsCount}</strong> человек ({totalApplicants > 0 ? ((originalDocsCount / totalApplicants) * 100).toFixed(1) : 0}%). 
                    Средний балл успеваемости по поданным заявлениям составляет <strong>{averageScoreOverall}</strong>. Все личные дела прошли проверку в автоматизированной информационной системе приёмной комиссии.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SPECIALTIES */}
          {activeTab === 'specialties' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-stone-900">Распределение по специальностям и профессиям</h4>
                  <p className="text-xs text-stone-500">Сведения о конкурсной ситуации и поданных заявлениях</p>
                </div>
                <span className="text-xs bg-rose-100 text-rose-900 font-bold px-3 py-1 rounded-full">
                  Всего специальностей: {Object.keys(specialtyMap).length}
                </span>
              </div>

              <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
                <table className="min-w-full divide-y divide-stone-200 text-sm">
                  <thead className="bg-stone-50">
                    <tr>
                      <th className="px-5 py-3 text-left font-bold text-stone-700 uppercase text-xs">Специальность / Профессия</th>
                      <th className="px-5 py-3 text-center font-bold text-stone-700 uppercase text-xs">Заявлений</th>
                      <th className="px-5 py-3 text-center font-bold text-stone-700 uppercase text-xs">Оригиналы</th>
                      <th className="px-5 py-3 text-center font-bold text-stone-700 uppercase text-xs">Бюджет / Платно</th>
                      <th className="px-5 py-3 text-center font-bold text-stone-700 uppercase text-xs">Ср. балл</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 bg-white">
                    {Object.keys(specialtyMap).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-stone-400 text-sm">
                          Нет данных по специальностям
                        </td>
                      </tr>
                    ) : (
                      Object.entries(specialtyMap).map(([spec, data], idx) => {
                        const avgSpecScore = data.count > 0 ? (data.sumScore / data.count).toFixed(2) : '0.00';
                        return (
                          <tr key={idx} className="hover:bg-stone-50 transition-colors">
                            <td className="px-5 py-3.5 font-semibold text-stone-900">{spec}</td>
                            <td className="px-5 py-3.5 text-center font-bold text-rose-950">{data.count}</td>
                            <td className="px-5 py-3.5 text-center text-emerald-800 font-medium">{data.original}</td>
                            <td className="px-5 py-3.5 text-center text-stone-600 font-mono text-xs">
                              <span className="text-blue-800 font-bold">{data.budget}</span> / <span className="text-amber-800 font-bold">{data.paid}</span>
                            </td>
                            <td className="px-5 py-3.5 text-center font-bold font-mono text-stone-800">{avgSpecScore}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: BENEFITS */}
          {activeTab === 'benefits' && (
            <div className="space-y-4">
              <div>
                <h4 className="font-bold text-stone-900">Учёт льготных категорий, квот и целевого обучения</h4>
                <p className="text-xs text-stone-500">Сводные данные по абитуриентам, имеющим особые права при поступлении</p>
              </div>

              <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
                <table className="min-w-full divide-y divide-stone-200 text-sm">
                  <thead className="bg-stone-50">
                    <tr>
                      <th className="px-5 py-3 text-left font-bold text-stone-700 uppercase text-xs">Категория льготы / Основания</th>
                      <th className="px-5 py-3 text-center font-bold text-stone-700 uppercase text-xs">Количество абитуриентов</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 bg-white">
                    {Object.keys(benefitMap).length === 0 ? (
                      <tr>
                        <td colSpan={2} className="py-12 text-center text-stone-400 text-sm">
                          В данной кампании нет абитуриентов с льготными категориями
                        </td>
                      </tr>
                    ) : (
                      Object.entries(benefitMap).map(([benefitName, count], idx) => (
                        <tr key={idx} className="hover:bg-stone-50">
                          <td className="px-5 py-3.5 font-medium text-stone-900 flex items-center gap-2">
                            <Award className="w-4 h-4 text-amber-700" />
                            <span>{benefitName}</span>
                          </td>
                          <td className="px-5 py-3.5 text-center font-bold text-rose-950">{count} чел.</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: EXPORT */}
          {activeTab === 'export' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
                <div>
                  <h4 className="font-bold text-stone-900">Выгрузка и экспорт отчётной документации</h4>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Скачайте официальный табличный отчёт в формате Microsoft Excel (.xlsx) с оформленными цветными шапками и автоподбором колонок, либо сохраните печатную PDF-версию.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 flex flex-col justify-between space-y-3">
                    <div>
                      <h5 className="font-bold text-emerald-950 text-sm">Таблица Excel (.xlsx)</h5>
                      <p className="text-xs text-emerald-800 mt-0.5">Красивое форматирование, цветные заголовки, точно настроенные колонки</p>
                    </div>
                    <button
                      onClick={handleExportExcel}
                      disabled={isExporting}
                      className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                    >
                      <Download className="w-4 h-4" />
                      <span>Скачать Excel (.xlsx)</span>
                    </button>
                  </div>

                  <div className="p-4 rounded-xl border border-stone-200 bg-stone-50 flex flex-col justify-between space-y-3">
                    <div>
                      <h5 className="font-bold text-stone-900 text-sm">Печать / Сохранение PDF</h5>
                      <p className="text-xs text-stone-500 mt-0.5">Форматированная печать официального бланка реестра</p>
                    </div>
                    <button
                      onClick={handlePrint}
                      className="w-full py-2.5 bg-rose-900 hover:bg-rose-950 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Печать / PDF</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-stone-200 bg-stone-100/70 flex justify-between items-center rounded-b-2xl">
          <span className="text-xs text-stone-500">
            Система автоматизации приёмной комиссии • Производственная практика 2026
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-stone-800 hover:bg-stone-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Закрыть отчёт
          </button>
        </div>

      </div>
    </div>
  );
}
