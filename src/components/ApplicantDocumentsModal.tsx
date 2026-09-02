import React, { useState, useEffect } from 'react';
import { ApplicantDocument, DocumentCategory } from '../types';
import { 
  X, 
  FileText, 
  Plus, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  Shield, 
  Award, 
  GraduationCap, 
  Calendar,
  Save,
  ArrowLeft,
  Check,
  AlertCircle
} from 'lucide-react';
import { 
  displayRussianDate, 
  formatMaskDate, 
  isValidDateDDMMYYYY, 
  formatMaskPassportSeries, 
  formatMaskPassportNumber, 
  formatMaskSubdivisionCode 
} from '../lib/validation';
import { cleanFirestoreData } from '../lib/utils';
import { 
  BENEFIT_DEFINITIONS, 
  getBenefitDefinition, 
  getAllowedDocTypesForBenefit,
  isDocumentEligibleForBenefit 
} from '../lib/benefits';

interface ApplicantDocumentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: ApplicantDocument[];
  onUpdateDocuments: (updatedDocs: ApplicantDocument[]) => void;
  applicantName?: string;
  onSelectDocumentForBenefit?: (doc: ApplicantDocument) => void;
  targetBenefitCategory?: string;
  startInAddMode?: boolean;
}

export function ApplicantDocumentsModal({
  isOpen,
  onClose,
  documents,
  onUpdateDocuments,
  applicantName = 'Абитуриент',
  onSelectDocumentForBenefit,
  targetBenefitCategory,
  startInAddMode = false,
}: ApplicantDocumentsModalProps) {
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

  const [editingDoc, setEditingDoc] = useState<ApplicantDocument | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Core Form Fields
  const [category, setCategory] = useState<DocumentCategory>('benefit');
  const [title, setTitle] = useState('');
  const [type, setType] = useState('Справка');
  const [series, setSeries] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [subdivisionCode, setSubdivisionCode] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [issuedBy, setIssuedBy] = useState('');
  const [beneficiaryName, setBeneficiaryName] = useState(applicantName);
  const [note, setNote] = useState('');
  const [isVerified, setIsVerified] = useState(true);

  // Education specific fields
  const [school, setSchool] = useState('');
  const [threes, setThrees] = useState<number>(0);
  const [fours, setFours] = useState<number>(0);
  const [fives, setFives] = useState<number>(0);
  const [submissionType, setSubmissionType] = useState<'original' | 'copy'>('original');

  // Benefit specific fields
  const [benefitCategory, setBenefitCategory] = useState(targetBenefitCategory || 'Ребенок участника СВО');
  const [benefitEffect, setBenefitEffect] = useState('Первоочередное зачисление (в рамках отдельной квоты)');

  // Auto-calculated average score from grades
  const totalGrades = threes + fours + fives;
  const calculatedAverageScore = totalGrades > 0 
    ? ((threes * 3) + (fours * 4) + (fives * 5)) / totalGrades 
    : 0;

  // Initialize or reset when opened
  useEffect(() => {
    if (isOpen) {
      if (startInAddMode || (targetBenefitCategory && documents.filter(d => isDocumentEligibleForBenefit(d, targetBenefitCategory)).length === 0)) {
        startCreate(targetBenefitCategory);
      } else {
        setIsAddingNew(false);
        setEditingDoc(null);
      }
    }
  }, [isOpen, targetBenefitCategory, startInAddMode]);

  if (!isOpen) return null;

  const startCreate = (forBenefit?: string) => {
    const selectedBenefit = forBenefit || targetBenefitCategory || 'Ребенок участника СВО';
    const def = getBenefitDefinition(selectedBenefit);
    const allowedTypes = getAllowedDocTypesForBenefit(selectedBenefit);
    const initialType = allowedTypes[0] || 'Справка';

    setEditingDoc(null);
    setCategory('benefit');
    setBenefitCategory(selectedBenefit);
    setTitle(def?.exampleDocTitle || 'Справка, подтверждающая статус льготной категории');
    setType(initialType);
    setSeries('');
    setDocumentNumber('');
    setSubdivisionCode('');
    setIssueDate('');
    setIssuedBy('');
    setBeneficiaryName(applicantName);
    setSchool('');
    setThrees(0);
    setFours(0);
    setFives(0);
    setSubmissionType('original');
    setBenefitEffect(def?.defaultEffect || 'Первоочередное зачисление (в рамках отдельной квоты)');
    setNote('');
    setIsVerified(true);
    setIsAddingNew(true);
  };

  const startEdit = (doc: ApplicantDocument) => {
    setEditingDoc(doc);
    setCategory(doc.category || 'other');
    setTitle(doc.title || '');
    setType(doc.type || 'Документ');
    setSeries(doc.details?.series || '');
    setDocumentNumber(doc.documentNumber || '');
    setSubdivisionCode(doc.details?.subdivisionCode || '');
    setIssueDate(doc.issueDate || '');
    setIssuedBy(doc.issuedBy || '');
    setBeneficiaryName(doc.beneficiaryName || applicantName);
    setSchool(doc.details?.school || '');
    setThrees(doc.details?.grades?.threes ?? 0);
    setFours(doc.details?.grades?.fours ?? 0);
    setFives(doc.details?.grades?.fives ?? 0);
    setSubmissionType(doc.details?.submissionType || 'original');
    
    const docBenefit = doc.details?.benefitCategory || targetBenefitCategory || 'Ребенок участника СВО';
    setBenefitCategory(docBenefit);
    setBenefitEffect(doc.details?.benefitEffect || 'Первоочередное зачисление (в рамках отдельной квоты)');
    setNote(doc.details?.note || '');
    setIsVerified(doc.isVerified ?? true);
    setIsAddingNew(true);
  };

  const handleDelete = (docId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот документ из реестра?')) return;
    const nextDocs = documents.filter(d => d.id !== docId);
    onUpdateDocuments(nextDocs);
  };

  const handleBenefitCategoryChange = (newBenefitCategory: string) => {
    setBenefitCategory(newBenefitCategory);
    const def = getBenefitDefinition(newBenefitCategory);
    const allowed = getAllowedDocTypesForBenefit(newBenefitCategory);
    if (allowed.length > 0) {
      setType(allowed[0]);
    }
    if (def) {
      setTitle(def.exampleDocTitle);
      setBenefitEffect(def.defaultEffect);
    }
  };

  const handleCategoryChange = (newCat: DocumentCategory) => {
    setCategory(newCat);
    if (newCat === 'identity') {
      setType('Паспорт РФ');
      setTitle('Паспорт гражданина РФ');
    } else if (newCat === 'education') {
      setType('Аттестат об основном общем образовании (9 кл.)');
      setTitle('Аттестат об основном общем образовании');
    } else if (newCat === 'benefit') {
      const activeBenefit = benefitCategory || targetBenefitCategory || 'Ребенок участника СВО';
      setBenefitCategory(activeBenefit);
      const allowed = getAllowedDocTypesForBenefit(activeBenefit);
      setType(allowed[0] || 'Справка');
      const def = getBenefitDefinition(activeBenefit);
      setTitle(def?.exampleDocTitle || 'Документ, подтверждающий статус льготной категории');
    } else if (newCat === 'military') {
      setType('Удостоверение гражданина, подлежащего призыву');
      setTitle('Документ воинского учета');
    } else {
      setType('Иной документ');
      setTitle('Подтверждающий документ');
    }
  };

  const handleSaveDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!documentNumber.trim()) {
      alert('Пожалуйста, укажите номер документа');
      return;
    }
    if (!issueDate.trim()) {
      alert('Пожалуйста, укажите дату выдачи документа');
      return;
    }
    if (!isValidDateDDMMYYYY(issueDate) && !/^\d{4}-\d{2}-\d{2}$/.test(issueDate)) {
      alert('Ошибка в дате выдачи! Формат: ДД.ММ.ГГГГ (например: 12.05.2024)');
      return;
    }

    let finalIssuedBy = issuedBy.trim();
    let finalSchool = school.trim();

    if (category === 'education') {
      if (!finalIssuedBy && finalSchool) finalIssuedBy = finalSchool;
      if (!finalSchool && finalIssuedBy) finalSchool = finalIssuedBy;
    }

    if (!finalIssuedBy) {
      alert('Пожалуйста, укажите, кем выдан документ / образовательное учреждение');
      return;
    }

    if (category === 'benefit' && !isVerified) {
      alert('Невозможно сохранить документ льготы: необходимо подтвердить подлинность документа комиссией (установите соответствующую отметку).');
      return;
    }

    const detailsObj: Record<string, any> = {
      ...(editingDoc?.details || {}),
      series: series.trim(),
      subdivisionCode: subdivisionCode.trim(),
      note: note.trim(),
    };

    if (finalSchool) detailsObj.school = finalSchool;

    if (category === 'education') {
      detailsObj.grades = {
        threes: Math.max(0, Number(threes) || 0),
        fours: Math.max(0, Number(fours) || 0),
        fives: Math.max(0, Number(fives) || 0)
      };
      detailsObj.averageScore = calculatedAverageScore;
      detailsObj.submissionType = submissionType;
      detailsObj.school = finalSchool;
    }

    if (category === 'benefit') {
      detailsObj.benefitCategory = benefitCategory.trim() || 'Иная льготная категория';
      detailsObj.benefitEffect = benefitEffect.trim();
    }

    const docData: ApplicantDocument = cleanFirestoreData({
      id: editingDoc ? editingDoc.id : `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      category,
      title: title.trim() || type.trim(),
      type: type.trim(),
      documentNumber: documentNumber.trim(),
      issueDate: issueDate.trim(),
      issuedBy: finalIssuedBy,
      beneficiaryName: beneficiaryName.trim() || applicantName,
      isVerified,
      createdAt: editingDoc ? editingDoc.createdAt : Date.now(),
      details: cleanFirestoreData(detailsObj),
    });

    let nextDocs: ApplicantDocument[];
    if (editingDoc) {
      nextDocs = documents.map(d => (d.id === editingDoc.id ? docData : d));
    } else {
      nextDocs = [...documents, docData];
    }

    onUpdateDocuments(nextDocs);
    setIsAddingNew(false);
    setEditingDoc(null);

    // If this document was added as benefit doc and handler provided, auto-select it
    if (onSelectDocumentForBenefit && category === 'benefit') {
      onSelectDocumentForBenefit(docData);
    }
  };

  const getCategoryBadge = (cat: DocumentCategory) => {
    switch (cat) {
      case 'identity':
        return (
          <span className="px-2 py-0.5 bg-blue-100 text-blue-900 rounded-md text-[11px] font-semibold flex items-center gap-1">
            <FileText className="w-3 h-3" /> Паспорт / Личность
          </span>
        );
      case 'education':
        return (
          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 rounded-md text-[11px] font-semibold flex items-center gap-1">
            <GraduationCap className="w-3 h-3" /> Образование
          </span>
        );
      case 'benefit':
        return (
          <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded-md text-[11px] font-semibold flex items-center gap-1">
            <Award className="w-3 h-3" /> Льгота / СВО
          </span>
        );
      case 'military':
        return (
          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-900 rounded-md text-[11px] font-semibold flex items-center gap-1">
            <Shield className="w-3 h-3" /> Воинский учёт
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 bg-stone-100 text-stone-700 rounded-md text-[11px] font-semibold flex items-center gap-1">
            <FileText className="w-3 h-3" /> Прочий документ
          </span>
        );
    }
  };

  const currentBenefitDef = getBenefitDefinition(benefitCategory);
  const currentBenefitAllowedTypes = getAllowedDocTypesForBenefit(benefitCategory);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-stone-200 animate-in fade-in duration-200 overscroll-contain">
        
        {/* Header */}
        <div className="p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50/80 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-900 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">
                Индивидуальный реестр документов абитуриента
              </h3>
              <p className="text-xs text-stone-500 font-medium">
                {applicantName} &bull; Всего документов: {documents.length}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 p-2 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1 text-sm">
          {!isAddingNew ? (
            /* Documents List View */
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-2 border-b border-stone-200">
                <div>
                  <div className="font-bold text-stone-900">
                    Прикрепленные документы личного дела
                  </div>
                  <div className="text-xs text-stone-500">
                    Паспорт, аттестат, справки льготников, договоры и свидетельства
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {targetBenefitCategory && (
                    <button
                      type="button"
                      onClick={() => startCreate(targetBenefitCategory)}
                      className="bg-amber-600 hover:bg-amber-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                      Документ для льготы ({targetBenefitCategory})
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => startCreate()}
                    className="bg-rose-800 hover:bg-rose-900 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    Добавить документ
                  </button>
                </div>
              </div>

              {targetBenefitCategory && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-950 flex items-start gap-2.5">
                  <Award className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-bold">Выбор подтверждающего документа для льготы: </span>
                    <span className="font-semibold text-amber-900">{targetBenefitCategory}</span>.
                    <p className="text-amber-800 text-[11px] mt-0.5">
                      {getBenefitDefinition(targetBenefitCategory)?.description || 'Для подтверждения требуется соответствующий документ.'}
                    </p>
                  </div>
                </div>
              )}

              {documents.length === 0 ? (
                <div className="text-center py-10 px-4 bg-stone-50 rounded-2xl border border-dashed border-stone-200">
                  <FileText className="w-10 h-10 text-stone-400 mx-auto mb-2" />
                  <div className="text-sm font-bold text-stone-800">Документов в реестре нет</div>
                  <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
                    Нажмите «Добавить документ», чтобы внести паспорт, аттестат или справку об особом праве.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {documents.map((doc) => {
                    const isEligibleForTargetBenefit = targetBenefitCategory ? isDocumentEligibleForBenefit(doc, targetBenefitCategory) : false;
                    
                    return (
                      <div
                        key={doc.id}
                        className={`p-4 rounded-xl border transition-all flex flex-col gap-2.5 ${
                          isEligibleForTargetBenefit
                            ? 'border-amber-300 bg-amber-50/40 hover:border-amber-400 shadow-xs'
                            : 'border-stone-200 bg-white hover:border-rose-300 hover:shadow-xs'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-stone-900 text-sm">
                                {doc.title || doc.type}
                              </span>
                              {getCategoryBadge(doc.category)}
                              {isEligibleForTargetBenefit && (
                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 rounded-md text-[10px] font-bold">
                                  ✓ Подходит для льготы
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-stone-700 font-medium">
                              <span className="text-stone-500 font-semibold">{doc.type}:</span>{' '}
                              {doc.details?.series ? <span className="font-mono">{doc.details.series} </span> : ''}
                              <span className="font-mono font-bold text-stone-900">{doc.documentNumber}</span>
                              {doc.details?.subdivisionCode && (
                                <span className="text-stone-500 ml-2 font-mono">
                                  (код {doc.details.subdivisionCode})
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {onSelectDocumentForBenefit && isDocumentEligibleForBenefit(doc, targetBenefitCategory) && (
                              <button
                                type="button"
                                onClick={() => {
                                  onSelectDocumentForBenefit(doc);
                                  onClose();
                                }}
                                className="px-3 py-1 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                              >
                                <Check className="w-3.5 h-3.5" />
                                Выбрать для льготы
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => startEdit(doc)}
                              className="text-stone-600 hover:text-rose-900 p-1.5 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
                              title="Редактировать документ"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(doc.id)}
                              className="text-stone-400 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Удалить документ"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Details row */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 pt-2 border-t border-stone-100 text-xs text-stone-600">
                          <div>
                            <span className="text-stone-400">Дата выдачи: </span>
                            <span className="font-medium text-stone-800">
                              {displayRussianDate(doc.issueDate)}
                            </span>
                          </div>
                          <div className="truncate" title={doc.issuedBy}>
                            <span className="text-stone-400">Кем выдан: </span>
                            <span className="font-medium text-stone-800">{doc.issuedBy || '—'}</span>
                          </div>
                          {doc.details?.school && (
                            <div className="sm:col-span-2 truncate">
                              <span className="text-stone-400">Учебное заведение: </span>
                              <span className="font-medium text-stone-800">{doc.details.school}</span>
                            </div>
                          )}
                          {doc.category === 'education' && (
                            <div className="sm:col-span-2 flex flex-wrap items-center gap-2 pt-0.5">
                              {doc.details?.submissionType === 'copy' ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                                  📄 Копия аттестата
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-300">
                                  🟢 Оригинал аттестата
                                </span>
                              )}
                              {doc.details?.grades && (
                                <span className="text-[11px] text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200 font-mono">
                                  Оценки: 5: {doc.details.grades.fives || 0}, 4: {doc.details.grades.fours || 0}, 3: {doc.details.grades.threes || 0}
                                </span>
                              )}
                            </div>
                          )}
                          {doc.details?.averageScore !== undefined && !isNaN(doc.details.averageScore) && (
                            <div>
                              <span className="text-stone-400">Средний балл (расчетный): </span>
                              <span className="font-bold text-rose-900 font-mono">
                                {Number(doc.details.averageScore).toFixed(2)}
                              </span>
                            </div>
                          )}
                          {doc.details?.benefitCategory && (
                            <div className="sm:col-span-2">
                              <span className="text-stone-400">Категория льготы: </span>
                              <span className="font-semibold text-amber-900">{doc.details.benefitCategory}</span>
                            </div>
                          )}
                          {doc.details?.note && (
                            <div className="sm:col-span-2 italic text-stone-500">
                              {doc.details.note}
                            </div>
                          )}
                        </div>

                        {doc.isVerified && (
                          <div className="flex items-center gap-1.5 text-[11px] text-emerald-800 font-semibold pt-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Документ проверен и подтверждён</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* Complete & Flexible Document Edit Form */
            <form onSubmit={handleSaveDoc} className="space-y-4">
              
              {/* Category & Form Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                    Категория документа <span className="text-rose-700">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => handleCategoryChange(e.target.value as DocumentCategory)}
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl text-stone-900 bg-white text-xs font-medium"
                  >
                    <option value="benefit">Льгота / Особое право / Справка СВО</option>
                    <option value="identity">Удостоверение личности (Паспорт, Свидетельство)</option>
                    <option value="education">Образование (Аттестат, Диплом)</option>
                    <option value="military">Воинский учёт</option>
                    <option value="other">Иной подтверждающий документ</option>
                  </select>
                </div>

                {category === 'benefit' ? (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-amber-950 mb-1">
                      Категория льготы <span className="text-rose-700">*</span>
                    </label>
                    <select
                      value={benefitCategory}
                      onChange={(e) => handleBenefitCategoryChange(e.target.value)}
                      className="w-full px-3 py-2 border border-amber-300 rounded-xl text-stone-900 bg-white text-xs font-medium"
                    >
                      {BENEFIT_DEFINITIONS.map(def => (
                        <option key={def.id} value={def.name}>
                          {def.shortName}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                      Форма / Тип документа <span className="text-rose-700">*</span>
                    </label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      className="w-full px-3 py-2 border border-stone-300 rounded-xl text-stone-900 bg-white text-xs font-medium"
                    >
                      {category === 'identity' ? (
                        <>
                          <option value="Паспорт РФ">Паспорт РФ</option>
                          <option value="Свидетельство о рождении">Свидетельство о рождении</option>
                          <option value="Заграничный паспорт">Заграничный паспорт</option>
                          <option value="Временное удостоверение личности">Временное удостоверение личности</option>
                          <option value="Иной документ">Иной документ</option>
                        </>
                      ) : category === 'education' ? (
                        <>
                          <option value="Аттестат об основном общем образовании (9 кл.)">Аттестат об основном общем образовании (9 кл.)</option>
                          <option value="Аттестат о среднем общем образовании (11 кл.)">Аттестат о среднем общем образовании (11 кл.)</option>
                          <option value="Диплом о среднем профессиональном образовании (СПО)">Диплом СПО</option>
                          <option value="Диплом о высшем образовании (ВО)">Диплом ВО</option>
                          <option value="Иной документ об образовании">Иной документ об образовании</option>
                        </>
                      ) : category === 'military' ? (
                        <>
                          <option value="Удостоверение гражданина, подлежащего призыву">Приписное свидетельство</option>
                          <option value="Военный билет">Военный билет</option>
                          <option value="Справка взамен военного билета">Справка взамен военного билета</option>
                          <option value="Иной документ">Иной документ</option>
                        </>
                      ) : (
                        <>
                          <option value="Справка">Справка</option>
                          <option value="Свидетельство">Свидетельство</option>
                          <option value="Договор">Договор</option>
                          <option value="Сертификат">Сертификат</option>
                          <option value="Иной документ">Иной документ</option>
                        </>
                      )}
                    </select>
                  </div>
                )}
              </div>

              {/* For Benefit category: Document Type tailored specifically to the benefit */}
              {category === 'benefit' && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-amber-950 mb-1">
                    Тип подтверждающего документа для «{benefitCategory}» <span className="text-rose-700">*</span>
                  </label>
                  <select
                    value={type}
                    onChange={(e) => {
                      setType(e.target.value);
                      setTitle(e.target.value);
                    }}
                    className="w-full px-3 py-2 border border-amber-300 rounded-xl text-stone-900 bg-white text-xs font-medium"
                  >
                    {currentBenefitAllowedTypes.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  {currentBenefitDef?.description && (
                    <p className="text-[11px] text-amber-800 mt-1">
                      {currentBenefitDef.description}
                    </p>
                  )}
                </div>
              )}

              {/* Title / Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Наименование документа <span className="text-rose-700">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={currentBenefitDef?.exampleDocTitle || 'Например: Справка об участии родителя в СВО'}
                  className="w-full px-3.5 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-800 text-stone-900 bg-white text-xs"
                />
              </div>

              {/* Numbers, Series, Code, Date */}
              <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                      Серия {category === 'identity' ? '(4 цифры)' : '(если есть)'}
                    </label>
                    <input
                      type="text"
                      value={series}
                      onChange={(e) => {
                        if (category === 'identity' && type === 'Паспорт РФ') {
                          setSeries(formatMaskPassportSeries(e.target.value));
                        } else {
                          setSeries(e.target.value);
                        }
                      }}
                      placeholder={category === 'identity' ? '50 18' : 'Серия'}
                      className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-800 text-stone-900 bg-white text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                      Номер документа <span className="text-rose-700">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={documentNumber}
                      onChange={(e) => {
                        if (category === 'identity' && type === 'Паспорт РФ') {
                          setDocumentNumber(formatMaskPassportNumber(e.target.value));
                        } else {
                          setDocumentNumber(e.target.value);
                        }
                      }}
                      placeholder={
                        category === 'benefit' && currentBenefitDef 
                          ? currentBenefitDef.defaultNumberPlaceholder 
                          : category === 'identity' 
                            ? '123456' 
                            : '№ 142/СВО-26'
                      }
                      className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-800 text-stone-900 bg-white text-xs font-mono"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                        Дата выдачи <span className="text-rose-700">*</span>
                      </label>
                      <span className="text-[10px] text-stone-400 font-mono">ДД.ММ.ГГГГ</span>
                    </div>
                    <div className="relative">
                      <Calendar className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        required
                        maxLength={10}
                        value={issueDate}
                        onChange={(e) => setIssueDate(formatMaskDate(e.target.value))}
                        placeholder="12.05.2024"
                        className="w-full pl-8 pr-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-800 text-stone-900 bg-white text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                {category === 'identity' && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                        Код подразделения (для паспорта)
                      </label>
                      <span className="text-[10px] text-stone-400 font-mono">000-000</span>
                    </div>
                    <input
                      type="text"
                      value={subdivisionCode}
                      onChange={(e) => setSubdivisionCode(formatMaskSubdivisionCode(e.target.value))}
                      placeholder="540-012"
                      className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-800 text-stone-900 bg-white text-xs font-mono"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                    Кем выдан документ <span className="text-rose-700">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={issuedBy}
                    onChange={(e) => setIssuedBy(e.target.value)}
                    placeholder={
                      category === 'benefit' && currentBenefitDef
                        ? currentBenefitDef.defaultIssuerPlaceholder
                        : "ГУ МВД России по Новосибирской обл. / МБОУ СОШ №1 / Военный комиссариат"
                    }
                    className="w-full px-3.5 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-800 text-stone-900 bg-white text-xs"
                  />
                </div>
              </div>

              {/* Specific fields for Education */}
              {category === 'education' && (
                <div className="p-4 bg-emerald-50/80 rounded-xl border border-emerald-300 space-y-4">
                  <div className="font-bold text-xs uppercase tracking-wider text-emerald-950 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4 text-emerald-700" />
                      Параметры аттестата и оценки
                    </span>
                    <span className="text-[11px] font-normal text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded border border-emerald-200">
                      Средний балл считается автоматически
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        Образовательное учреждение / Школа
                      </label>
                      <input
                        type="text"
                        value={school}
                        onChange={(e) => setSchool(e.target.value)}
                        placeholder="МБОУ СОШ № 12 г. Новосибирска"
                        className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs text-stone-900 bg-white focus:ring-2 focus:ring-emerald-700 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        Предоставленный документ <span className="text-rose-700">*</span>
                      </label>
                      <select
                        value={submissionType}
                        onChange={(e) => setSubmissionType(e.target.value as 'original' | 'copy')}
                        className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs font-bold text-stone-900 bg-white focus:ring-2 focus:ring-emerald-700 focus:outline-none"
                      >
                        <option value="original">🟢 Оригинал аттестата</option>
                        <option value="copy">📄 Копия аттестата</option>
                      </select>
                    </div>
                  </div>

                  {/* Grades distribution */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-2">
                      Количество оценок в аттестате по предметам
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-white p-2.5 rounded-xl border border-stone-200 shadow-2xs">
                        <label className="block text-[11px] font-bold text-emerald-800 uppercase mb-1">
                          Пятёрок (5)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={fives === 0 ? '' : fives}
                          onChange={(e) => setFives(Math.max(0, parseInt(e.target.value) || 0))}
                          placeholder="0"
                          className="w-full px-2.5 py-1.5 border border-stone-300 rounded-lg text-sm font-bold text-stone-900 text-center focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                        />
                      </div>

                      <div className="bg-white p-2.5 rounded-xl border border-stone-200 shadow-2xs">
                        <label className="block text-[11px] font-bold text-blue-800 uppercase mb-1">
                          Четвёрок (4)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={fours === 0 ? '' : fours}
                          onChange={(e) => setFours(Math.max(0, parseInt(e.target.value) || 0))}
                          placeholder="0"
                          className="w-full px-2.5 py-1.5 border border-stone-300 rounded-lg text-sm font-bold text-stone-900 text-center focus:ring-2 focus:ring-blue-600 focus:outline-none"
                        />
                      </div>

                      <div className="bg-white p-2.5 rounded-xl border border-stone-200 shadow-2xs">
                        <label className="block text-[11px] font-bold text-amber-800 uppercase mb-1">
                          Троек (3)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={threes === 0 ? '' : threes}
                          onChange={(e) => setThrees(Math.max(0, parseInt(e.target.value) || 0))}
                          placeholder="0"
                          className="w-full px-2.5 py-1.5 border border-stone-300 rounded-lg text-sm font-bold text-stone-900 text-center focus:ring-2 focus:ring-amber-600 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Calculated score display */}
                  <div className="bg-white p-3 rounded-xl border border-emerald-300 flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-bold text-stone-900">
                        Итоговый средний балл аттестата:
                      </div>
                      <div className="text-[11px] text-stone-500">
                        {totalGrades > 0 ? `Всего предметов в расчёте: ${totalGrades}` : 'Укажите количество оценок выше для расчета'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-2xl font-black text-rose-900 font-mono tracking-tight bg-rose-50 px-3 py-1 rounded-lg border border-rose-200">
                        {calculatedAverageScore > 0 ? calculatedAverageScore.toFixed(2) : '—'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Specific fields for Benefits Effect */}
              {category === 'benefit' && (
                <div className="p-3.5 bg-amber-50/70 rounded-xl border border-amber-200 space-y-3">
                  <div className="font-bold text-xs uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-amber-700" />
                    Преимущество при зачислении
                  </div>
                  <div>
                    <select
                      value={benefitEffect}
                      onChange={(e) => setBenefitEffect(e.target.value)}
                      className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs text-stone-900 bg-white"
                    >
                      <option value="Первоочередное зачисление (в рамках отдельной квоты)">
                        Первоочередное зачисление (в рамках отдельной квоты)
                      </option>
                      <option value="Преимущественное право зачисления при равенстве баллов">
                        Преимущественное право зачисления при равенстве баллов
                      </option>
                      <option value="Целевое обучение (отдельный конкурс / квота целевого приёма)">
                        Целевое обучение (отдельный конкурс / квота целевого приёма)
                      </option>
                      <option value="Вне конкурса (особая квота)">
                        Вне конкурса (особая квота)
                      </option>
                      <option value="Дополнительные баллы к рейтингу">
                        Дополнительные баллы к рейтингу
                      </option>
                    </select>
                  </div>
                </div>
              )}

              {/* Beneficiary Name & Note */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                    Кому выдан документ (ФИО)
                  </label>
                  <input
                    type="text"
                    value={beneficiaryName}
                    onChange={(e) => setBeneficiaryName(e.target.value)}
                    placeholder="Иванов Иван Иванович"
                    className="w-full px-3.5 py-2 border border-stone-300 rounded-xl text-stone-900 bg-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                    Примечание / Основание
                  </label>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Оригинал приложен к личному делу"
                    className="w-full px-3.5 py-2 border border-stone-300 rounded-xl text-stone-900 bg-white text-xs"
                  />
                </div>
              </div>

              {/* Verification status */}
              <div className={`p-3.5 rounded-xl border transition-all ${
                isVerified 
                  ? 'bg-stone-50 border-stone-200' 
                  : category === 'benefit'
                    ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-200/50'
                    : 'bg-stone-50 border-stone-200'
              }`}>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="docVerifiedCheckbox"
                    checked={isVerified}
                    onChange={(e) => setIsVerified(e.target.checked)}
                    className="w-4 h-4 text-rose-800 rounded border-stone-300 focus:ring-rose-800 accent-rose-800 cursor-pointer"
                  />
                  <label 
                    htmlFor="docVerifiedCheckbox" 
                    className="text-xs font-bold uppercase tracking-wider text-stone-900 cursor-pointer"
                  >
                    Документ проверен и подтверждён приёмной комиссией {category === 'benefit' && <span className="text-rose-700">*</span>}
                  </label>
                </div>
                {category === 'benefit' && !isVerified && (
                  <div className="mt-2 text-xs text-rose-900 font-medium flex items-start gap-2 bg-rose-100/70 p-2 rounded-lg border border-rose-200">
                    <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Сохранение невозможно:</span> документ льготы не может быть сохранен без подтверждения проверки комиссией.
                    </div>
                  </div>
                )}
              </div>

              {/* Form Action Buttons */}
              <div className="pt-3 border-t border-stone-200 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingNew(false);
                    setEditingDoc(null);
                  }}
                  className="px-4 py-2 border border-stone-300 text-stone-700 hover:bg-stone-100 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Отмена
                </button>

                <button
                  type="submit"
                  disabled={category === 'benefit' && !isVerified}
                  className="bg-rose-900 hover:bg-rose-950 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-3.5 h-3.5" />
                  {editingDoc ? 'Сохранить изменения' : 'Добавить документ в реестр'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
