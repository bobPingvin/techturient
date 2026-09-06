import React, { useState, useMemo } from 'react';
import { Campaign, Applicant } from '../types';
import { 
  exportApplicantsToExcel, 
  exportApplicantsToPDF, 
  exportEnrollmentOrderToPDF, 
  exportEnrollmentOrderToDocx,
  exportCallSheetToExcel,
  exportCallSheetToPDF
} from '../utils/reportExporter';
import { SPECIALTY_LIST, formatSpecialtyDisplay } from '../lib/specialties';
import { X, FileText, Printer, Download, BarChart3, Users, Award, Shield, CheckCircle2, Building, Calendar, Layers, Filter, FileCheck, PhoneCall } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'summary' | 'specialties' | 'benefits' | 'enrollment' | 'export'>('summary');
  const [isExporting, setIsExporting] = useState(false);

  // Фильтры экспорта
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedSpecialtyFilter, setSelectedSpecialtyFilter] = useState<string>('all');
  const [reportType, setReportType] = useState<'general' | 'enrollment_order'>('general');

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

  // Фильтрация абитуриентов по датам и специальности
  const filteredApplicants = useMemo(() => {
    return applicants.filter(a => {
      // 1. Фильтр по специальности
      if (selectedSpecialtyFilter !== 'all') {
        const matchesSpec = a.specialty === selectedSpecialtyFilter || a.specialtyName === selectedSpecialtyFilter;
        if (!matchesSpec) return false;
      }

      // 2. Фильтр по дате создания
      if (a.createdAt) {
        const appDate = new Date(a.createdAt);
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          if (appDate < start) return false;
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          if (appDate > end) return false;
        }
      }

      return true;
    });
  }, [applicants, selectedSpecialtyFilter, startDate, endDate]);

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
    const title = campaign?.name || 'Приёмная кампания';
    if (reportType === 'enrollment_order') {
      exportEnrollmentOrderToPDF(title, filteredApplicants, selectedSpecialtyFilter);
    } else {
      exportApplicantsToPDF(title, filteredApplicants);
    }
  };

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const title = campaign?.name || 'Приёмная кампания';
      await exportApplicantsToExcel(title, filteredApplicants);
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
            onClick={() => setActiveTab('enrollment')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer relative ${
              activeTab === 'enrollment'
                ? 'bg-rose-900 text-white shadow-sm'
                : 'bg-white text-stone-700 hover:bg-stone-200/60 border border-stone-200'
            }`}
          >
            <FileCheck className="w-4 h-4 text-emerald-600" />
            <span>Приказ на зачисление</span>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full border border-emerald-200">
              {applicants.filter(a => a.educationDocumentSubmissionType !== 'copy').length}
            </span>
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

          {/* TAB: ENROLLMENT ORDER */}
          {activeTab === 'enrollment' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-stone-100">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-widest text-emerald-700">Официальное зачисление</span>
                    <h4 className="text-xl font-bold text-stone-900 mt-0.5">Формирование приказа о зачислении</h4>
                    <p className="text-xs text-stone-500 mt-1 max-w-2xl">
                      В приказ включаются только абитуриенты, предоставившие <strong>оригинал документа об образовании</strong> и прошедшие конкурс аттестатов. Документ формируется с разбивкой по специальностям.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => exportEnrollmentOrderToPDF(campaign?.name || 'Приёмная кампания', filteredApplicants, selectedSpecialtyFilter)}
                      disabled={filteredApplicants.filter(a => a.educationDocumentSubmissionType !== 'copy').length === 0}
                      className="px-4 py-2.5 bg-rose-900 hover:bg-rose-950 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Печать / PDF Приказ</span>
                    </button>
                    <button
                      onClick={() => exportEnrollmentOrderToDocx(campaign?.name || 'Приёмная кампания', filteredApplicants, selectedSpecialtyFilter)}
                      disabled={filteredApplicants.filter(a => a.educationDocumentSubmissionType !== 'copy').length === 0}
                      className="px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                    >
                      <Download className="w-4 h-4" />
                      <span>Скачать Word (.docx)</span>
                    </button>
                  </div>
                </div>

                {/* Filter and stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-emerald-800">К зачислению (с оригиналами)</div>
                      <div className="text-2xl font-black text-emerald-950 mt-1">
                        {applicants.filter(a => a.educationDocumentSubmissionType !== 'copy').length} чел.
                      </div>
                    </div>
                    <CheckCircle2 className="w-8 h-8 text-emerald-600 opacity-80" />
                  </div>

                  <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-amber-800">Подано копий (в резерве)</div>
                      <div className="text-2xl font-black text-amber-950 mt-1">
                        {applicants.filter(a => a.educationDocumentSubmissionType === 'copy').length} чел.
                      </div>
                    </div>
                    <FileText className="w-8 h-8 text-amber-600 opacity-80" />
                  </div>

                  <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-stone-600">Всего абитуриентов в базе</div>
                      <div className="text-2xl font-black text-stone-900 mt-1">
                        {applicants.length} чел.
                      </div>
                    </div>
                    <Users className="w-8 h-8 text-stone-400 opacity-80" />
                  </div>
                </div>

                {/* Specialty Filter for Order */}
                <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between gap-4 text-xs">
                  <div className="flex items-center gap-2 font-bold text-stone-800">
                    <Filter className="w-4 h-4 text-rose-800" />
                    <span>Специальность для приказа:</span>
                  </div>
                  <select
                    value={selectedSpecialtyFilter}
                    onChange={(e) => setSelectedSpecialtyFilter(e.target.value)}
                    className="px-3 py-1.5 bg-white border border-stone-300 rounded-lg font-medium text-stone-900 focus:outline-none"
                  >
                    <option value="all">Все специальности (Полный приказ)</option>
                    {SPECIALTY_LIST.map(s => (
                      <option key={s.id} value={s.fullName}>
                        {s.fullName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Table of Enrolled Candidates */}
                <div>
                  <h5 className="font-bold text-stone-900 text-sm mb-3">
                    Список абитуриентов с оригиналами документов (Включаются в приказ):
                  </h5>
                  <div className="border border-stone-200 rounded-xl overflow-hidden bg-white max-h-80 overflow-y-auto">
                    <table className="w-full text-xs text-left text-stone-700">
                      <thead className="bg-stone-100 text-stone-800 font-bold border-b border-stone-200 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-center w-10">№</th>
                          <th className="px-3 py-2">ФИО Абитуриента</th>
                          <th className="px-3 py-2 text-center">СНИЛС</th>
                          <th className="px-3 py-2">Специальность</th>
                          <th className="px-3 py-2 text-center">Ср. балл</th>
                          <th className="px-3 py-2 text-center">Основание</th>
                          <th className="px-3 py-2 text-center">Документ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {filteredApplicants
                          .filter(a => a.educationDocumentSubmissionType !== 'copy')
                          .sort((a, b) => (b.averageScore || 0) - (a.averageScore || 0))
                          .map((a, idx) => (
                            <tr key={a.id || idx} className="hover:bg-stone-50">
                              <td className="px-3 py-2 text-center font-bold text-stone-900">{idx + 1}</td>
                              <td className="px-3 py-2 font-semibold text-stone-900">{a.fullName}</td>
                              <td className="px-3 py-2 text-center text-stone-600">{a.snils || '—'}</td>
                              <td className="px-3 py-2 font-medium">{formatSpecialtyDisplay(a.specialty, a.specialtyName)}</td>
                              <td className="px-3 py-2 text-center font-bold text-rose-900 bg-rose-50/50">{a.averageScore?.toFixed(2) || '0.00'}</td>
                              <td className="px-3 py-2 text-center">{a.fundingType || 'Бюджет'}</td>
                              <td className="px-3 py-2 text-center">
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  Оригинал
                                </span>
                              </td>
                            </tr>
                          ))}
                        {filteredApplicants.filter(a => a.educationDocumentSubmissionType !== 'copy').length === 0 && (
                          <tr>
                            <td colSpan={7} className="px-3 py-8 text-center text-stone-400">
                              Нет абитуриентов с оригиналами документов для включения в приказ
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: EXPORT */}
          {activeTab === 'export' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-6">
                <div>
                  <h4 className="font-bold text-stone-900 text-base">Конструктор и экспорт отчётной документации</h4>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Выберите тип отчёта, задайте период подачи и отфильтруйте базу по конкретной специальности при необходимости.
                  </p>
                </div>

                {/* 1. Настройка параметров отчета */}
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-4 text-xs">
                  <div className="flex items-center gap-2 font-bold text-stone-800 text-sm pb-2 border-b border-stone-200">
                    <Filter className="w-4 h-4 text-rose-800" />
                    <span>Параметры и фильтры выгрузки</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Вид отчета */}
                    <div>
                      <label className="block font-bold text-stone-700 mb-1">Вид формируемого отчёта / документа:</label>
                      <select
                        value={reportType}
                        onChange={(e) => setReportType(e.target.value as any)}
                        className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl font-medium text-stone-900 focus:outline-none focus:ring-2 focus:ring-rose-800/20"
                      >
                        <option value="general">Сводная база (Группировка по специальностям)</option>
                        <option value="enrollment_order">Приказ на зачисление (Только с оригиналами)</option>
                      </select>
                    </div>

                    {/* Фильтр по специальности */}
                    <div>
                      <label className="block font-bold text-stone-700 mb-1">Выбор специальности / базы:</label>
                      <select
                        value={selectedSpecialtyFilter}
                        onChange={(e) => setSelectedSpecialtyFilter(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl font-medium text-stone-900 focus:outline-none focus:ring-2 focus:ring-rose-800/20"
                      >
                        <option value="all">Все специальности (Общая база)</option>
                        {SPECIALTY_LIST.map(s => (
                          <option key={s.id} value={s.fullName}>
                            {s.fullName}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Период с */}
                    <div>
                      <label className="block font-bold text-stone-700 mb-1">Период подачи заявления — С:</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl font-medium text-stone-900 focus:outline-none focus:ring-2 focus:ring-rose-800/20"
                      />
                    </div>

                    {/* Период по */}
                    <div>
                      <label className="block font-bold text-stone-700 mb-1">Период подачи заявления — ПО:</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl font-medium text-stone-900 focus:outline-none focus:ring-2 focus:ring-rose-800/20"
                      />
                    </div>
                  </div>

                  {/* Инфо-панель о фильтрации */}
                  <div className="pt-2 flex items-center justify-between text-xs border-t border-stone-200/80">
                    <span className="text-stone-600 font-medium">
                      Результат фильтрации: <strong className="text-stone-900">{filteredApplicants.length} чел.</strong> из {applicants.length} в общей базе
                    </span>
                    {(startDate || endDate || selectedSpecialtyFilter !== 'all') && (
                      <button
                        type="button"
                        onClick={() => {
                          setStartDate('');
                          setEndDate('');
                          setSelectedSpecialtyFilter('all');
                        }}
                        className="text-rose-800 hover:text-rose-950 underline font-bold cursor-pointer"
                      >
                        Сбросить фильтры
                      </button>
                    )}
                  </div>
                </div>

                {/* 2. Кнопки действия */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                  <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 flex flex-col justify-between space-y-3">
                    <div>
                      <h5 className="font-bold text-emerald-950 text-sm">Таблица Excel (.xlsx)</h5>
                      <p className="text-xs text-emerald-800 mt-0.5">Группировка по специальностям, цветные шапки, подытоги и средние баллы</p>
                    </div>
                    <button
                      onClick={handleExportExcel}
                      disabled={isExporting || filteredApplicants.length === 0}
                      className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                    >
                      <Download className="w-4 h-4" />
                      <span>Скачать Excel (.xlsx)</span>
                    </button>
                  </div>

                  <div className="p-4 rounded-xl border border-stone-200 bg-stone-50 flex flex-col justify-between space-y-3">
                    <div>
                      <h5 className="font-bold text-stone-900 text-sm">
                        {reportType === 'enrollment_order' ? 'Приказ на зачисление (PDF)' : 'Сводный реестр (PDF)'}
                      </h5>
                      <p className="text-xs text-stone-500 mt-0.5">
                        {reportType === 'enrollment_order' ? 'Печатный бланка приказа с оригиналами' : 'Печатный бланк сводного реестра по специальностям'}
                      </p>
                    </div>
                    <button
                      onClick={handlePrint}
                      disabled={filteredApplicants.length === 0}
                      className="w-full py-2.5 bg-rose-900 hover:bg-rose-950 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                    >
                      <Printer className="w-4 h-4" />
                      <span>{reportType === 'enrollment_order' ? 'Сформировать приказ (PDF)' : 'Печать / PDF'}</span>
                    </button>
                  </div>

                  <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 flex flex-col justify-between space-y-3">
                    <div>
                      <h5 className="font-bold text-blue-950 text-sm">Приказ на зачисление (Word .docx)</h5>
                      <p className="text-xs text-blue-800 mt-0.5">Редактируемый документ Word с зачисленными абитуриентами (оригиналы)</p>
                    </div>
                    <button
                      onClick={() => exportEnrollmentOrderToDocx(campaign?.name || 'Приёмная кампания', filteredApplicants, selectedSpecialtyFilter)}
                      disabled={filteredApplicants.filter(a => a.educationDocumentSubmissionType !== 'copy').length === 0}
                      className="w-full py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                    >
                      <Download className="w-4 h-4" />
                      <span>Скачать Приказ (.docx)</span>
                    </button>
                  </div>

                  <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/50 flex flex-col justify-between space-y-3">
                    <div>
                      <h5 className="font-bold text-purple-950 text-sm">Ведомость обзвона и договорников</h5>
                      <p className="text-xs text-purple-900 mt-0.5">Список абитуриентов с телефонами, альтернативными пожеланиями и договором</p>
                    </div>
                    <button
                      onClick={() => exportCallSheetToExcel(campaign?.name || 'Приёмная кампания', filteredApplicants)}
                      disabled={filteredApplicants.length === 0}
                      className="w-full py-2.5 bg-purple-800 hover:bg-purple-900 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                    >
                      <PhoneCall className="w-4 h-4" />
                      <span>Ведомость с телефонами (Excel)</span>
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
