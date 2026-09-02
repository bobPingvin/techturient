import React, { useState, useEffect } from 'react';
import { Applicant, ApplicantDocument } from '../types';
import { 
  X, 
  GraduationCap, 
  Save, 
  FileText, 
  School, 
  Calendar, 
  Hash, 
  CheckCircle2, 
  AlertTriangle,
  FileCheck2,
  Copy
} from 'lucide-react';
import { formatMaskDate, isValidDateDDMMYYYY, displayRussianDate } from '../lib/validation';
import { cleanFirestoreData } from '../lib/utils';

interface EditCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicant: Applicant;
  onSaveCertificate: (updatedApplicantData: Partial<Applicant>, updatedDocs?: ApplicantDocument[]) => Promise<void>;
}

export function EditCertificateModal({
  isOpen,
  onClose,
  applicant,
  onSaveCertificate
}: EditCertificateModalProps) {
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

  const [school, setSchool] = useState(applicant.school || '');
  const [certificateType, setCertificateType] = useState(applicant.certificateType || 'Аттестат об основном общем образовании (9 кл.)');
  const [certificateNumber, setCertificateNumber] = useState(applicant.certificateNumber || '');
  const [issueDate, setIssueDate] = useState(applicant.issueDate || '');
  
  // Grades
  const [fives, setFives] = useState<number>(applicant.grades?.fives || 0);
  const [fours, setFours] = useState<number>(applicant.grades?.fours || 0);
  const [threes, setThrees] = useState<number>(applicant.grades?.threes || 0);
  
  // Submission Type: Original or Copy
  const [submissionType, setSubmissionType] = useState<'original' | 'copy'>(
    applicant.educationDocumentSubmissionType || 'original'
  );

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state when opened with applicant
  useEffect(() => {
    if (isOpen) {
      setSchool(applicant.school || '');
      setCertificateType(applicant.certificateType || 'Аттестат об основном общем образовании (9 кл.)');
      setCertificateNumber(applicant.certificateNumber || '');
      setIssueDate(applicant.issueDate || '');
      setFives(applicant.grades?.fives || 0);
      setFours(applicant.grades?.fours || 0);
      setThrees(applicant.grades?.threes || 0);
      setSubmissionType(applicant.educationDocumentSubmissionType || 'original');
    }
  }, [isOpen, applicant]);

  if (!isOpen) return null;

  // Auto-calculated average score from grades: STRICTLY READ-ONLY
  const totalGrades = fives + fours + threes;
  const calculatedAverageScore = totalGrades > 0 
    ? ((fives * 5) + (fours * 4) + (threes * 3)) / totalGrades 
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!school.trim()) {
      alert('Пожалуйста, укажите наименование учебного заведения / школы');
      return;
    }

    if (!certificateNumber.trim()) {
      alert('Пожалуйста, укажите номер документа об образовании');
      return;
    }

    if (!issueDate.trim()) {
      alert('Пожалуйста, укажите дату выдачи документа');
      return;
    }

    if (!isValidDateDDMMYYYY(issueDate) && !/^\d{4}-\d{2}-\d{2}$/.test(issueDate)) {
      alert('Ошибка в дате выдачи! Формат: ДД.ММ.ГГГГ (например: 25.06.2024)');
      return;
    }

    if (totalGrades === 0) {
      alert('Пожалуйста, укажите количество оценок в аттестате (хотя бы одну оценку) для автоматического расчета среднего балла.');
      return;
    }

    setIsSubmitting(true);

    try {
      const gradesObj = {
        fives: Math.max(0, Number(fives) || 0),
        fours: Math.max(0, Number(fours) || 0),
        threes: Math.max(0, Number(threes) || 0)
      };

      const updatedApplicantFields: Partial<Applicant> = {
        school: school.trim(),
        certificateType: certificateType.trim(),
        certificateNumber: certificateNumber.trim(),
        issueDate: issueDate.trim(),
        grades: gradesObj,
        averageScore: calculatedAverageScore,
        educationDocumentSubmissionType: submissionType
      };

      // Also synchronize registry document for education if exists or add one
      const currentDocs = applicant.documents || [];
      let nextDocs = [...currentDocs];
      const eduDocIndex = nextDocs.findIndex(d => d.category === 'education');

      if (eduDocIndex >= 0) {
        nextDocs[eduDocIndex] = cleanFirestoreData({
          ...nextDocs[eduDocIndex],
          type: certificateType.trim(),
          title: certificateType.trim(),
          documentNumber: certificateNumber.trim(),
          issueDate: issueDate.trim(),
          issuedBy: school.trim(),
          isVerified: true,
          details: cleanFirestoreData({
            ...(nextDocs[eduDocIndex].details || {}),
            school: school.trim(),
            grades: gradesObj,
            averageScore: calculatedAverageScore,
            submissionType: submissionType
          })
        });
      } else {
        nextDocs.push(cleanFirestoreData({
          id: `doc_edu_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          category: 'education',
          title: certificateType.trim(),
          type: certificateType.trim(),
          documentNumber: certificateNumber.trim(),
          issueDate: issueDate.trim(),
          issuedBy: school.trim(),
          beneficiaryName: applicant.fullName,
          isVerified: true,
          createdAt: Date.now(),
          details: cleanFirestoreData({
            school: school.trim(),
            grades: gradesObj,
            averageScore: calculatedAverageScore,
            submissionType: submissionType
          })
        }));
      }

      await onSaveCertificate(updatedApplicantFields, nextDocs);
      onClose();
    } catch (err) {
      console.error(err);
      alert('Ошибка при сохранении данных аттестата');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh] overscroll-contain">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100/70 text-emerald-900 rounded-xl">
              <GraduationCap className="w-5 h-5 text-emerald-800" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-stone-900">
                Настройки документа об образовании и оценок
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

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
          
          {/* 1. Status of submission (Original or Copy) */}
          <div className="p-4 rounded-xl border bg-stone-50/80 border-stone-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-900">
                1. Сданный документ (Оригинал / Копия) <span className="text-rose-700">*</span>
              </label>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                submissionType === 'original'
                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                  : 'bg-amber-100 text-amber-900 border-amber-300'
              }`}>
                {submissionType === 'original' ? '🟢 Оригинал в личном деле' : '📄 Копия (не подлежит зачислению)'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label 
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  submissionType === 'original'
                    ? 'bg-emerald-50/90 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'bg-white border-stone-200 hover:border-stone-300'
                }`}
              >
                <input
                  type="radio"
                  name="submissionType"
                  value="original"
                  checked={submissionType === 'original'}
                  onChange={() => setSubmissionType('original')}
                  className="mt-1 w-4 h-4 text-emerald-700 focus:ring-emerald-700 accent-emerald-700"
                />
                <div>
                  <div className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                    <FileCheck2 className="w-4 h-4 text-emerald-700" />
                    Оригинал аттестата
                  </div>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    Абитуриент сдал подлинник документа. Участвует в рейтинге на зачисление.
                  </p>
                </div>
              </label>

              <label 
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  submissionType === 'copy'
                    ? 'bg-amber-50/90 border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
                    : 'bg-white border-stone-200 hover:border-stone-300'
                }`}
              >
                <input
                  type="radio"
                  name="submissionType"
                  value="copy"
                  checked={submissionType === 'copy'}
                  onChange={() => setSubmissionType('copy')}
                  className="mt-1 w-4 h-4 text-amber-700 focus:ring-amber-700 accent-amber-700"
                />
                <div>
                  <div className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                    <Copy className="w-4 h-4 text-amber-700" />
                    Копия аттестата
                  </div>
                  <p className="text-[11px] text-amber-900/80 mt-0.5">
                    Забрал оригинал или предоставил только копию. <strong>Система не допустит ошибочного зачисления.</strong>
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* 2. Educational Institution & Certificate Details */}
          <div className="space-y-4">
            <div className="font-bold text-xs uppercase tracking-wider text-stone-900 flex items-center gap-1.5">
              <School className="w-4 h-4 text-stone-600" />
              2. Реквизиты документа об образовании
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Наименование образовательной организации (Школа / Лицей / Гимназия) <span className="text-rose-700">*</span>
              </label>
              <input
                type="text"
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                placeholder="МБОУ СОШ № 12 г. Новосибирска"
                className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-800 text-stone-900 bg-stone-50/50 text-sm focus:outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Вид документа <span className="text-rose-700">*</span>
                </label>
                <select
                  value={certificateType}
                  onChange={(e) => setCertificateType(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-800 text-stone-900 bg-white text-sm focus:outline-none"
                >
                  <option value="Аттестат об основном общем образовании (9 кл.)">
                    Аттестат об основном общем образовании (9 кл.)
                  </option>
                  <option value="Аттестат о среднем общем образовании (11 кл.)">
                    Аттестат о среднем общем образовании (11 кл.)
                  </option>
                  <option value="Диплом о среднем профессиональном образовании">
                    Диплом о среднем профессиональном образовании
                  </option>
                  <option value="Диплом о начальном профессиональном образовании">
                    Диплом о начальном профессиональном образовании
                  </option>
                  <option value="Иной документ об образовании">
                    Иной документ об образовании
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Номер документа (аттестата) <span className="text-rose-700">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={certificateNumber}
                    onChange={(e) => setCertificateNumber(e.target.value)}
                    placeholder="05404 0001234"
                    className="w-full pl-9 pr-3.5 py-2.5 border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-800 text-stone-900 bg-stone-50/50 text-sm font-mono focus:outline-none"
                    required
                  />
                  <Hash className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Дата выдачи документа <span className="text-rose-700">*</span>
              </label>
              <div className="relative max-w-xs">
                <input
                  type="text"
                  value={issueDate}
                  onChange={(e) => setIssueDate(formatMaskDate(e.target.value))}
                  placeholder="ДД.ММ.ГГГГ (25.06.2024)"
                  maxLength={10}
                  className="w-full pl-9 pr-3.5 py-2.5 border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-800 text-stone-900 bg-stone-50/50 text-sm font-mono focus:outline-none"
                  required
                />
                <Calendar className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
              </div>
            </div>
          </div>

          {/* 3. Grades & Automatic Average Score */}
          <div className="p-4 bg-stone-50 rounded-xl border border-stone-300 space-y-4">
            <div className="flex items-center justify-between">
              <div className="font-bold text-xs uppercase tracking-wider text-stone-900">
                3. Оценки в аттестате по предметам
              </div>
              <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200">
                Балл рассчитывается строго автоматически
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white p-3 rounded-xl border border-stone-200 shadow-2xs">
                <label className="block text-xs font-bold text-emerald-800 uppercase mb-1.5">
                  Пятёрок (5)
                </label>
                <input
                  type="number"
                  min="0"
                  value={fives === 0 ? '' : fives}
                  onChange={(e) => setFives(Math.max(0, parseInt(e.target.value) || 0))}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-base font-bold text-stone-900 text-center focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div className="bg-white p-3 rounded-xl border border-stone-200 shadow-2xs">
                <label className="block text-xs font-bold text-blue-800 uppercase mb-1.5">
                  Четвёрок (4)
                </label>
                <input
                  type="number"
                  min="0"
                  value={fours === 0 ? '' : fours}
                  onChange={(e) => setFours(Math.max(0, parseInt(e.target.value) || 0))}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-base font-bold text-stone-900 text-center focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div className="bg-white p-3 rounded-xl border border-stone-200 shadow-2xs">
                <label className="block text-xs font-bold text-amber-800 uppercase mb-1.5">
                  Троек (3)
                </label>
                <input
                  type="number"
                  min="0"
                  value={threes === 0 ? '' : threes}
                  onChange={(e) => setThrees(Math.max(0, parseInt(e.target.value) || 0))}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-base font-bold text-stone-900 text-center focus:ring-2 focus:ring-amber-600 focus:outline-none"
                />
              </div>
            </div>

            {/* Calculated Average Score Banner (Read-only) */}
            <div className="bg-white p-4 rounded-xl border-2 border-rose-300 flex items-center justify-between gap-4 shadow-2xs">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-rose-950">
                  Средний балл аттестата (автоматический расчет):
                </div>
                <div className="text-xs text-stone-500 mt-0.5">
                  {totalGrades > 0 
                    ? `Формула: (5×${fives} + 4×${fours} + 3×${threes}) / ${totalGrades} предм.`
                    : 'Заполните оценки выше'
                  }
                </div>
              </div>

              <div className="text-right">
                <div className="text-3xl font-black text-rose-900 font-mono tracking-tight bg-rose-50 px-4 py-1.5 rounded-xl border border-rose-200 inline-block">
                  {calculatedAverageScore > 0 ? calculatedAverageScore.toFixed(2) : '0.00'}
                </div>
              </div>
            </div>
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
              disabled={isSubmitting}
              className="bg-rose-900 hover:bg-rose-950 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Сохранение...' : 'Сохранить аттестат и оценки'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
