import React, { useState, useEffect } from 'react';
import { Applicant, ApplicantDocument } from '../types';
import { 
  X, 
  Award, 
  FileText, 
  CheckCircle2, 
  Plus, 
  AlertCircle, 
  Calendar, 
  Save, 
  Check, 
  Info 
} from 'lucide-react';
import { formatMaskDate, isValidDateDDMMYYYY, displayRussianDate } from '../lib/validation';
import { cleanFirestoreData } from '../lib/utils';
import { 
  BENEFIT_DEFINITIONS, 
  getBenefitDefinition, 
  getAllowedDocTypesForBenefit, 
  isDocumentEligibleForBenefit 
} from '../lib/benefits';

interface EditBenefitModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicant: Applicant;
  onSaveBenefit: (updatedData: Partial<Applicant>, updatedDocs?: ApplicantDocument[]) => Promise<void>;
}

export function EditBenefitModal({
  isOpen,
  onClose,
  applicant,
  onSaveBenefit
}: EditBenefitModalProps) {
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

  const [hasBenefit, setHasBenefit] = useState(false);
  const [benefit, setBenefit] = useState('');
  const [benefitEffect, setBenefitEffect] = useState('Первоочередное зачисление (в рамках отдельной квоты)');
  const [documentsVerified, setDocumentsVerified] = useState(false);
  
  // Document selection or manual entry
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [docType, setDocType] = useState('Справка');
  const [docNumber, setDocNumber] = useState('');
  const [docIssueDate, setDocIssueDate] = useState('');
  const [docIssuedBy, setDocIssuedBy] = useState('');
  const [docNote, setDocNote] = useState('');

  // Mode: select from registry OR new document
  const [isCreatingNewDoc, setIsCreatingNewDoc] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize state from current applicant
  useEffect(() => {
    if (!isOpen) return;

    const applicantHasBenefit = Boolean(applicant.benefit && applicant.benefit.trim() !== '');
    setHasBenefit(applicantHasBenefit);
    const initialBenefit = applicant.benefit || 'Ребенок участника СВО';
    setBenefit(initialBenefit);
    
    const benefitDef = getBenefitDefinition(initialBenefit);
    setBenefitEffect(applicant.benefitEffect || benefitDef?.defaultEffect || 'Первоочередное зачисление (в рамках отдельной квоты)');
    setDocumentsVerified(applicant.documentsVerified ?? false);

    // Document info
    const allowedTypes = getAllowedDocTypesForBenefit(initialBenefit);
    setDocType(applicant.benefitDocumentType || allowedTypes[0] || 'Справка');
    setDocNumber(applicant.benefitDocumentNumber || '');
    setDocIssueDate(applicant.benefitDocumentIssueDate || '');
    setDocIssuedBy(applicant.benefitDocumentIssuedBy || '');

    // Check if doc matches any eligible benefit doc in registry
    const docs = applicant.documents || [];
    const matchedDoc = docs.find(d => 
      isDocumentEligibleForBenefit(d, initialBenefit) &&
      (d.id === applicant.benefitDocumentId || 
       d.documentNumber === applicant.benefitDocumentNumber)
    );

    if (matchedDoc) {
      setSelectedDocId(matchedDoc.id);
      setIsCreatingNewDoc(false);
      setDocType(matchedDoc.type || allowedTypes[0] || 'Справка');
      setDocNumber(matchedDoc.documentNumber || '');
      setDocIssueDate(matchedDoc.issueDate || '');
      setDocIssuedBy(matchedDoc.issuedBy || '');
      setDocNote(matchedDoc.details?.note || '');
    } else if (applicantHasBenefit && (applicant.benefitDocumentNumber || applicant.benefitDocumentIssuedBy)) {
      setSelectedDocId('manual');
      setIsCreatingNewDoc(true);
    } else {
      setSelectedDocId('');
      setIsCreatingNewDoc(false);
    }
  }, [isOpen, applicant]);

  if (!isOpen) return null;

  const currentDocs = applicant.documents || [];
  // Filter registry: only show documents categorized as 'benefit' and legally eligible for benefits
  const eligibleBenefitDocs = currentDocs.filter(d => isDocumentEligibleForBenefit(d, benefit));

  const handleBenefitCategoryChange = (newBenefit: string) => {
    setBenefit(newBenefit);
    const def = getBenefitDefinition(newBenefit);
    if (def) {
      setBenefitEffect(def.defaultEffect);
    }

    const allowed = getAllowedDocTypesForBenefit(newBenefit);
    if (allowed.length > 0 && !allowed.includes(docType)) {
      setDocType(allowed[0]);
    }

    // Check if current selected document is eligible for the new benefit
    if (selectedDocId && selectedDocId !== 'new' && selectedDocId !== 'manual') {
      const currentSelected = currentDocs.find(d => d.id === selectedDocId);
      if (!currentSelected || !isDocumentEligibleForBenefit(currentSelected, newBenefit)) {
        // Reset selection because previous doc doesn't match new benefit category
        setSelectedDocId('');
        setIsCreatingNewDoc(false);
        setDocNumber('');
        setDocIssuedBy('');
        setDocIssueDate('');
      }
    }
  };

  const handleDocSelect = (docId: string) => {
    setSelectedDocId(docId);
    if (docId === 'new') {
      setIsCreatingNewDoc(true);
      const allowed = getAllowedDocTypesForBenefit(benefit);
      setDocType(allowed[0] || 'Справка');
      setDocNumber('');
      setDocIssueDate('');
      setDocIssuedBy('');
      setDocNote('');
    } else if (docId === '') {
      setIsCreatingNewDoc(false);
      setDocNumber('');
      setDocIssuedBy('');
      setDocIssueDate('');
    } else {
      setIsCreatingNewDoc(false);
      const found = currentDocs.find(d => d.id === docId);
      if (found) {
        setDocType(found.type || 'Справка');
        setDocNumber(found.documentNumber || '');
        setDocIssueDate(found.issueDate || '');
        setDocIssuedBy(found.issuedBy || '');
        setDocNote(found.details?.note || '');
      }
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hasBenefit) {
      // Remove / clear benefit from applicant
      if (confirm('Вы уверены, что хотите снять льготу с данного абитуриента?')) {
        setIsSubmitting(true);
        try {
          await onSaveBenefit({
            hasBenefit: false,
            benefit: '',
            benefitEffect: '',
            benefitDocumentId: '',
            benefitDocumentType: '',
            benefitDocumentNumber: '',
            benefitDocumentIssuedBy: '',
            benefitDocumentIssueDate: '',
            documentsVerified: false
          });
          onClose();
        } catch (err) {
          console.error(err);
          alert('Ошибка при сохранении данных');
        } finally {
          setIsSubmitting(false);
        }
      }
      return;
    }

    // Validation when benefit is active
    if (!benefit.trim()) {
      alert('Пожалуйста, выберите категорию льготы / особого права');
      return;
    }

    if (!documentsVerified) {
      alert('Невозможно сохранить льготу: необходимо подтвердить подлинность документов (установите отметку «Документы подтверждены приёмной комиссией»).');
      return;
    }

    if (!docNumber.trim()) {
      alert('Пожалуйста, укажите номер подтверждающего документа');
      return;
    }

    if (!docIssuedBy.trim()) {
      alert('Пожалуйста, укажите, кем выдан подтверждающий документ');
      return;
    }

    if (!docIssueDate.trim()) {
      alert('Пожалуйста, укажите дату выдачи подтверждающего документа');
      return;
    }

    if (!isValidDateDDMMYYYY(docIssueDate) && !/^\d{4}-\d{2}-\d{2}$/.test(docIssueDate)) {
      alert('Ошибка в дате выдачи! Формат: ДД.ММ.ГГГГ (например: 12.05.2024)');
      return;
    }

    setIsSubmitting(true);

    try {
      let docId = selectedDocId;
      let updatedDocs = [...currentDocs];

      if (isCreatingNewDoc || selectedDocId === 'new' || selectedDocId === 'manual' || !selectedDocId) {
        docId = `doc_benefit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const newDoc: ApplicantDocument = cleanFirestoreData({
          id: docId,
          category: 'benefit',
          title: `Документ, подтверждающий статус (${benefit})`,
          type: docType.trim(),
          documentNumber: docNumber.trim(),
          issueDate: docIssueDate.trim(),
          issuedBy: docIssuedBy.trim(),
          beneficiaryName: applicant.fullName,
          details: cleanFirestoreData({
            benefitCategory: benefit,
            benefitEffect: benefitEffect,
            note: docNote.trim()
          }),
          isVerified: documentsVerified,
          createdAt: Date.now()
        });
        updatedDocs.push(newDoc);
      } else {
        // Update existing document in registry if user changed fields
        updatedDocs = updatedDocs.map(d => {
          if (d.id === docId) {
            return cleanFirestoreData({
              ...d,
              type: docType.trim(),
              documentNumber: docNumber.trim(),
              issueDate: docIssueDate.trim(),
              issuedBy: docIssuedBy.trim(),
              isVerified: documentsVerified,
              details: cleanFirestoreData({
                ...(d.details || {}),
                benefitCategory: benefit,
                benefitEffect: benefitEffect,
                note: docNote.trim()
              })
            });
          }
          return d;
        });
      }

      await onSaveBenefit(
        cleanFirestoreData({
          hasBenefit: true,
          benefit: benefit.trim(),
          benefitEffect: benefitEffect.trim(),
          benefitDocumentId: docId,
          benefitDocumentType: docType.trim(),
          benefitDocumentNumber: docNumber.trim(),
          benefitDocumentIssuedBy: docIssuedBy.trim(),
          benefitDocumentIssueDate: docIssueDate.trim(),
          documentsVerified: documentsVerified,
          documents: cleanFirestoreData(updatedDocs)
        }),
        cleanFirestoreData(updatedDocs)
      );

      onClose();
    } catch (err) {
      console.error('Error saving benefit:', err);
      alert('Ошибка при сохранении льготы');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentBenefitDef = getBenefitDefinition(benefit);
  const allowedDocTypes = getAllowedDocTypesForBenefit(benefit);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-stone-200 animate-in fade-in duration-200 overscroll-contain">
        
        {/* Header */}
        <div className="p-5 border-b border-stone-200 flex items-center justify-between bg-amber-50/50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">
                Управление льготами абитуриента
              </h3>
              <p className="text-xs text-stone-500 font-medium truncate max-w-md">
                {applicant.fullName} ({applicant.phone || 'без телефона'})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 p-2 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleFormSubmit} className="p-6 overflow-y-auto flex-1 space-y-5 text-sm">
          
          {/* Main switch */}
          <div className="flex items-center justify-between p-4 bg-stone-50 rounded-xl border border-stone-200">
            <div>
              <span className="font-bold text-stone-900 block">
                Наличие льготы / особого права
              </span>
              <span className="text-xs text-stone-500">
                Установите переключатель, если у абитуриента есть подтверждённая льгота
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={hasBenefit} 
                onChange={(e) => setHasBenefit(e.target.checked)}
                className="sr-only peer" 
              />
              <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
            </label>
          </div>

          {hasBenefit ? (
            <div className="space-y-5 animate-in fade-in duration-200">
              
              {/* 1. Category */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-amber-950 mb-1.5">
                  1. Категория льготы / особого права <span className="text-rose-700">*</span>
                </label>
                <select
                  value={benefit}
                  onChange={(e) => handleBenefitCategoryChange(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 border border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-600 text-stone-900 bg-white text-sm font-medium"
                >
                  <option value="">-- Выберите категорию льготы / права --</option>
                  {BENEFIT_DEFINITIONS.map(def => (
                    <option key={def.id} value={def.name}>
                      {def.name} ({def.shortName})
                    </option>
                  ))}
                </select>
                {currentBenefitDef?.description && (
                  <p className="text-xs text-amber-800 mt-1.5 flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 shrink-0" />
                    <span>{currentBenefitDef.description}</span>
                  </p>
                )}
              </div>

              {/* 2. Confirming document section */}
              <div className="p-4 bg-amber-50/70 rounded-xl border border-amber-200/90 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-900 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-amber-800" />
                    2. Подтверждающий документ для льготы
                  </label>
                  {eligibleBenefitDocs.length > 0 ? (
                    <span className="text-[11px] bg-amber-200/80 text-amber-950 px-2 py-0.5 rounded-full font-bold">
                      В реестре найдено подходящих: {eligibleBenefitDocs.length}
                    </span>
                  ) : (
                    <span className="text-[11px] text-stone-500 font-medium">
                      В реестре нет документа для данной льготы
                    </span>
                  )}
                </div>

                {/* Source selector */}
                <div>
                  <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                    Выберите документ из реестра или создайте новый:
                  </label>
                  <select
                    value={selectedDocId}
                    onChange={(e) => handleDocSelect(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl text-stone-900 bg-white text-xs"
                  >
                    {eligibleBenefitDocs.length > 0 ? (
                      <>
                        <option value="">-- Выберите подтверждающий документ из реестра --</option>
                        {eligibleBenefitDocs.map(d => (
                          <option key={d.id} value={d.id}>
                            [{d.title || d.type}] {d.type} {d.documentNumber} (выдан {displayRussianDate(d.issueDate)})
                          </option>
                        ))}
                      </>
                    ) : (
                      <option value="">-- В реестре нет подходящих документов льготы --</option>
                    )}
                    <option value="new">+ Внести новый подтверждающий документ</option>
                  </select>
                </div>

                {/* Document input fields */}
                <div className="bg-white p-3.5 rounded-xl border border-amber-200 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        Тип документа <span className="text-rose-700">*</span>
                      </label>
                      <select
                        value={docType}
                        onChange={(e) => setDocType(e.target.value)}
                        className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs text-stone-900 bg-white"
                      >
                        {allowedDocTypes.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        Номер документа / выписки <span className="text-rose-700">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={docNumber}
                        onChange={(e) => setDocNumber(e.target.value)}
                        placeholder={currentBenefitDef?.defaultNumberPlaceholder || "123/СВО-2024"}
                        className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs text-stone-900 bg-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        Кем выдан <span className="text-rose-700">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={docIssuedBy}
                        onChange={(e) => setDocIssuedBy(e.target.value)}
                        placeholder={currentBenefitDef?.defaultIssuerPlaceholder || "Военный комиссариат / Госпиталь / Орган опеки"}
                        className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs text-stone-900 bg-white"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-stone-700">
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
                          value={docIssueDate}
                          onChange={(e) => setDocIssueDate(formatMaskDate(e.target.value))}
                          placeholder="12.05.2024"
                          className="w-full pl-8 pr-3 py-2 border border-stone-300 rounded-xl text-xs text-stone-900 bg-white font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Примечание / Описание (опционально)
                    </label>
                    <input
                      type="text"
                      value={docNote}
                      onChange={(e) => setDocNote(e.target.value)}
                      placeholder="Оригинал справки приложен к личному делу"
                      className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs text-stone-900 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Verification checkbox */}
              <div className={`p-4 rounded-xl border transition-all ${
                documentsVerified 
                  ? 'bg-white border-stone-200' 
                  : 'bg-rose-50/80 border-rose-300 ring-2 ring-rose-200/50'
              }`}>
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    id="editDocumentsVerified"
                    checked={documentsVerified}
                    onChange={(e) => setDocumentsVerified(e.target.checked)}
                    className="w-4 h-4 text-rose-800 rounded border-stone-300 focus:ring-rose-800 accent-rose-800 cursor-pointer"
                  />
                  <label 
                    htmlFor="editDocumentsVerified" 
                    className="text-xs font-bold uppercase tracking-wider text-stone-900 cursor-pointer"
                  >
                    3. Документы подтверждены приёмной комиссией <span className="text-rose-700">*</span>
                  </label>
                </div>
                {documentsVerified ? (
                  <div className="mt-2 text-xs text-emerald-800 font-semibold flex items-center gap-1.5 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    Подлинность подтверждающего документа проверена
                  </div>
                ) : (
                  <div className="mt-2 text-xs text-rose-900 font-medium flex items-start gap-2 bg-rose-100/70 p-2.5 rounded-lg border border-rose-200">
                    <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Сохранение заблокировано:</span> без подтверждения подлинности документов приёмной комиссией льгота не может быть сохранена. Пожалуйста, проверьте документ и установите отметку.
                    </div>
                  </div>
                )}
              </div>

              {/* 4. Benefit Effect */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-amber-950 mb-1.5">
                  4. Что даёт льгота (Преимущество при зачислении) <span className="text-rose-700">*</span>
                </label>
                <select
                  value={benefitEffect}
                  onChange={(e) => setBenefitEffect(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-600 text-stone-900 bg-white text-sm"
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
          ) : (
            <div className="p-6 bg-stone-50 rounded-xl border border-stone-200 text-center space-y-2">
              <Award className="w-8 h-8 text-stone-400 mx-auto" />
              <p className="font-semibold text-stone-700">У абитуриента нет льгот</p>
              <p className="text-xs text-stone-500">
                Включите переключатель выше, чтобы указать категорию льготы, реквизиты подтверждающего документа и статус проверки.
              </p>
            </div>
          )}

          {/* Footer actions */}
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
              disabled={isSubmitting || (hasBenefit && !documentsVerified)}
              title={hasBenefit && !documentsVerified ? "Подтвердите проверку документов для сохранения" : ""}
              className="bg-rose-900 hover:bg-rose-950 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Сохранение...' : (hasBenefit && !documentsVerified) ? 'Требуется подтверждение' : 'Сохранить изменения'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
