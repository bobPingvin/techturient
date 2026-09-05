import React, { useState, useEffect } from 'react';
import { X, FileText, Upload, Download, CheckCircle2, AlertCircle, Settings as SettingsIcon, RefreshCw, Shield, Users } from 'lucide-react';
import { doc as firestoreDoc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Document, Paragraph, TextRun, Packer, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TemplateState {
  hasCustom: boolean;
  updatedAt: string | null;
  fileName: string | null;
  isUploading: boolean;
  uploadSuccess: boolean;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'templates'>('templates');

  const [enrollAppStatus, setEnrollAppStatus] = useState<TemplateState>({
    hasCustom: false,
    updatedAt: null,
    fileName: null,
    isUploading: false,
    uploadSuccess: false,
  });

  const [consentStatus, setConsentStatus] = useState<TemplateState>({
    hasCustom: false,
    updatedAt: null,
    fileName: null,
    isUploading: false,
    uploadSuccess: false,
  });

  const [parentalConsentStatus, setParentalConsentStatus] = useState<TemplateState>({
    hasCustom: false,
    updatedAt: null,
    fileName: null,
    isUploading: false,
    uploadSuccess: false,
  });

  useEffect(() => {
    if (isOpen) {
      loadTemplateStatuses();
    }
  }, [isOpen]);

  const loadTemplateStatuses = async () => {
    // 1. Заявление на зачисление
    await loadSingleTemplateStatus(
      'enrollAppTemplate',
      setEnrollAppStatus
    );

    // 2. Согласие на обработку ПД
    await loadSingleTemplateStatus(
      'dataProcessingConsentTemplate',
      setConsentStatus
    );

    // 3. Заявление родителя
    await loadSingleTemplateStatus(
      'parentalConsentTemplate',
      setParentalConsentStatus
    );
  };

  const loadSingleTemplateStatus = async (
    key: string,
    setStatus: React.Dispatch<React.SetStateAction<TemplateState>>
  ) => {
    try {
      const localBase64 = localStorage.getItem(`${key}_base64`);
      const localTime = localStorage.getItem(`${key}_updatedAt`);
      const localFileName = localStorage.getItem(`${key}_fileName`);

      if (localBase64) {
        setStatus({
          hasCustom: true,
          updatedAt: localTime ? new Date(Number(localTime)).toLocaleString('ru-RU') : null,
          fileName: localFileName || 'custom_template.docx',
          isUploading: false,
          uploadSuccess: false,
        });
        return;
      }

      const templateDocRef = firestoreDoc(db, 'documentTemplates', key);
      const snap = await getDoc(templateDocRef);
      if (snap.exists()) {
        const data = snap.data() as any;
        if (data.base64Data) {
          localStorage.setItem(`${key}_base64`, data.base64Data);
          if (data.updatedAt) {
            localStorage.setItem(`${key}_updatedAt`, String(data.updatedAt));
          }
          if (data.fileName) {
            localStorage.setItem(`${key}_fileName`, data.fileName);
          }
          setStatus({
            hasCustom: true,
            updatedAt: data.updatedAt ? new Date(data.updatedAt).toLocaleString('ru-RU') : null,
            fileName: data.fileName || 'custom_template.docx',
            isUploading: false,
            uploadSuccess: false,
          });
          return;
        }
      }

      setStatus({
        hasCustom: false,
        updatedAt: null,
        fileName: null,
        isUploading: false,
        uploadSuccess: false,
      });
    } catch (e) {
      console.error(`Error loading status for ${key}:`, e);
    }
  };

  // =========================================================================
  // СКАЧИВАНИЕ И ЗАГРУЗКА: Заявление на зачисление
  // =========================================================================
  const handleDownloadActiveEnrollApp = async () => {
    try {
      const customBase64 = localStorage.getItem('enrollAppTemplate_base64');
      const customFileName = localStorage.getItem('enrollAppTemplate_fileName') || 'enrollApp_custom_template.docx';

      if (customBase64) {
        downloadBase64File(customBase64, customFileName);
        return;
      }
      await handleDownloadSampleEnrollApp();
    } catch (e) {
      console.error('Error downloading active enroll app template:', e);
      alert('Не удалось скачать шаблон заявления');
    }
  };

  const handleDownloadSampleEnrollApp = async () => {
    try {
      const doc = new Document({
        sections: [
          {
            properties: {},
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: 'ГОСУДАРСТВЕННОЕ БЮДЖЕТНОЕ ПРОФЕССИОНАЛЬНОЕ ОБРАЗОВАТЕЛЬНОЕ УЧРЕЖДЕНИЕ НОВОСИБИРСКОЙ ОБЛАСТИ "НОВОСИБИРСКИЙ ЭЛЕКТРОМЕХАНИЧЕСКИЙ КОЛЛЕДЖ" (ГБПОУ НСО "НЭК")',
                    bold: true,
                    size: 20,
                    font: 'Times New Roman',
                  }),
                ],
                spacing: { after: 300 },
              }),
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: 'Директору ГБПОУ НСО "НЭК" Дронь В.В.\n',
                    size: 22,
                    font: 'Times New Roman',
                  }),
                  new TextRun({
                    text: 'от {abiturFIOGen},\n',
                    bold: true,
                    size: 22,
                    font: 'Times New Roman',
                  }),
                  new TextRun({
                    text: 'окончивший {className} класс {school} города {city}.',
                    size: 22,
                    font: 'Times New Roman',
                  }),
                ],
                spacing: { after: 400 },
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: 'ЗАЯВЛЕНИЕ',
                    bold: true,
                    size: 28,
                    font: 'Times New Roman',
                  }),
                ],
                spacing: { after: 300 },
              }),
              new Paragraph({
                alignment: AlignmentType.LEFT,
                children: [
                  new TextRun({
                    text: 'Прошу зачислить меня по профессии / специальности: {profession} ({fundingType}).',
                    size: 24,
                    font: 'Times New Roman',
                  }),
                ],
                spacing: { after: 200 },
              }),
              new Paragraph({
                alignment: AlignmentType.LEFT,
                children: [
                  new TextRun({
                    text: 'Мои данные: ФИО: {abiturFIO}, Дата рождения: {birthDate}, СНИЛС: {snils}, Телефон: {phone}.',
                    size: 22,
                    font: 'Times New Roman',
                  }),
                ],
                spacing: { after: 400 },
              }),
              new Paragraph({
                alignment: AlignmentType.BOTH,
                children: [
                  new TextRun({
                    text: 'Дата: {currentDate}',
                    size: 22,
                    font: 'Times New Roman',
                  }),
                  new TextRun({
                    text: '                                   Подпись: ______________________',
                    size: 22,
                    font: 'Times New Roman',
                  }),
                ],
              }),
            ],
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, 'enrollApp_sample_template.docx');
    } catch (e) {
      console.error('Error creating sample template:', e);
      alert('Не удалось скачать образец шаблона');
    }
  };

  // =========================================================================
  // СКАЧИВАНИЕ И ЗАГРУЗКА: Согласие на обработку персональных данных
  // =========================================================================
  const handleDownloadActiveConsent = async () => {
    try {
      const customBase64 = localStorage.getItem('dataProcessingConsentTemplate_base64');
      const customFileName = localStorage.getItem('dataProcessingConsentTemplate_fileName') || 'consent_custom_template.docx';

      if (customBase64) {
        downloadBase64File(customBase64, customFileName);
        return;
      }
      await handleDownloadSampleConsent();
    } catch (e) {
      console.error('Error downloading active consent template:', e);
      alert('Не удалось скачать шаблон согласия');
    }
  };

  const handleDownloadSampleConsent = async () => {
    try {
      const doc = new Document({
        sections: [
          {
            properties: {},
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: 'СОГЛАСИЕ НА ОБРАБОТКУ И ХРАНЕНИЕ ПЕРСОНАЛЬНЫХ ДАННЫХ',
                    bold: true,
                    size: 26,
                    font: 'Times New Roman',
                  }),
                ],
                spacing: { after: 300 },
              }),
              new Paragraph({
                alignment: AlignmentType.BOTH,
                children: [
                  new TextRun({
                    text: 'Я, {abiturFIO}, {passportInfo}, проживающий(ая) по адресу: {address}, даю свое согласие ГБПОУ НСО "Новосибирский электромеханический колледж" ({collegeAddress}) на обработку и хранение моих персональных данных в целях организации приёмной кампании, зачисления и ведения образовательного процесса в соответствии с 152-ФЗ.',
                    size: 22,
                    font: 'Times New Roman',
                  }),
                ],
                spacing: { after: 200 },
              }),
              new Paragraph({
                alignment: AlignmentType.BOTH,
                children: [
                  new TextRun({
                    text: 'Перечень персональных данных: ФИО, дата рождения ({birthDate}), паспортные данные (серия {passportSeries} № {passportNumber}), СНИЛС ({snils}), контактный телефон ({phone}).',
                    size: 22,
                    font: 'Times New Roman',
                  }),
                ],
                spacing: { after: 300 },
              }),
              new Paragraph({
                alignment: AlignmentType.BOTH,
                children: [
                  new TextRun({
                    text: 'Дата: {currentDate}                                      Подпись субъекта ПД: _________________ ({lastName} {firstName})',
                    size: 22,
                    font: 'Times New Roman',
                  }),
                ],
                spacing: { after: 100 },
              }),
            ],
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, 'dataProcessingConsent_sample_template.docx');
    } catch (e) {
      console.error('Error creating sample consent template:', e);
      alert('Не удалось скачать образец согласия');
    }
  };

  // =========================================================================
  // СКАЧИВАНИЕ И ЗАГРУЗКА: Заявление родителя (законного представителя)
  // =========================================================================
  const handleDownloadActiveParentalConsent = async () => {
    try {
      const customBase64 = localStorage.getItem('parentalConsentTemplate_base64');
      const customFileName = localStorage.getItem('parentalConsentTemplate_fileName') || 'parentalConsent_custom_template.docx';

      if (customBase64) {
        downloadBase64File(customBase64, customFileName);
        return;
      }
      await handleDownloadSampleParentalConsent();
    } catch (e) {
      console.error('Error downloading active parental consent template:', e);
      alert('Не удалось скачать шаблон заявления родителя');
    }
  };

  const handleDownloadSampleParentalConsent = async () => {
    try {
      const doc = new Document({
        sections: [
          {
            properties: {},
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: 'Директору ГБПОУ НСО "НЭК" Дронь В.В.\n',
                    size: 22,
                    font: 'Times New Roman',
                  }),
                  new TextRun({
                    text: 'от родителя (законного представителя): ____________________________________________________\n',
                    bold: true,
                    size: 22,
                    font: 'Times New Roman',
                  }),
                  new TextRun({
                    text: 'паспортные данные родителя: ____________________________________________________\n',
                    size: 22,
                    font: 'Times New Roman',
                  }),
                  new TextRun({
                    text: 'в отношении несовершеннолетнего(ей) поступающего(ей): {abiturFIO}, {birthDate} г.р.',
                    size: 22,
                    font: 'Times New Roman',
                  }),
                ],
                spacing: { after: 400 },
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: 'ЗАЯВЛЕНИЕ РОДИТЕЛЯ (ЗАКОННОГО ПРЕДСТАВИТЕЛЯ)',
                    bold: true,
                    size: 26,
                    font: 'Times New Roman',
                  }),
                ],
                spacing: { after: 300 },
              }),
              new Paragraph({
                alignment: AlignmentType.BOTH,
                children: [
                  new TextRun({
                    text: 'Я, ____________________________________________________ (мать / отец / опекун), даю официальное согласие на поступление и обучение моего несовершеннолетнего ребенка ({abiturFIO}) в ГБПОУ НСО "Новосибирский электромеханический колледж" по выбранной специальности, а также на обработку и хранение персональных данных моего ребенка в соответствии с 152-ФЗ.',
                    size: 22,
                    font: 'Times New Roman',
                  }),
                ],
                spacing: { after: 300 },
              }),
              new Paragraph({
                alignment: AlignmentType.BOTH,
                children: [
                  new TextRun({
                    text: 'Дата: {currentDate}                                      Подпись родителя: _________________ / ________________________ /',
                    size: 22,
                    font: 'Times New Roman',
                  }),
                ],
                spacing: { after: 100 },
              }),
            ],
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, 'parentalConsent_sample_template.docx');
    } catch (e) {
      console.error('Error creating sample parental consent template:', e);
      alert('Не удалось скачать образец заявления родителя');
    }
  };

  // Helper для скачивания base64
  const downloadBase64File = (base64: string, fileName: string) => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes.buffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    saveAs(blob, fileName);
  };

  // УНИВЕРСАЛЬНАЯ ЗАГРУЗКА
  const handleUploadTemplate = (
    e: React.ChangeEvent<HTMLInputElement>,
    templateKey: 'enrollAppTemplate' | 'dataProcessingConsentTemplate' | 'parentalConsentTemplate',
    templateTitle: string,
    setStatus: React.Dispatch<React.SetStateAction<TemplateState>>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.docx')) {
      alert('Пожалуйста, загрузите файл в формате .docx');
      return;
    }

    setStatus((prev) => ({ ...prev, isUploading: true, uploadSuccess: false }));

    const reader = new FileReader();
    reader.onload = async (uploadEvent) => {
      try {
        const res = uploadEvent.target?.result as string;
        const base64Data = res.split(',')[1];
        const now = Date.now();

        localStorage.setItem(`${templateKey}_base64`, base64Data);
        localStorage.setItem(`${templateKey}_updatedAt`, String(now));
        localStorage.setItem(`${templateKey}_fileName`, file.name);

        const templateDocRef = firestoreDoc(db, 'documentTemplates', templateKey);
        await setDoc(templateDocRef, {
          id: templateKey,
          name: templateTitle,
          fileName: file.name,
          base64Data,
          updatedAt: now,
        });

        const formattedDate = new Date(now).toLocaleString('ru-RU');

        setStatus({
          hasCustom: true,
          updatedAt: formattedDate,
          fileName: file.name,
          isUploading: false,
          uploadSuccess: true,
        });

        setTimeout(() => {
          setStatus((prev) => ({ ...prev, uploadSuccess: false }));
        }, 4000);
      } catch (err) {
        console.error(`Error saving ${templateKey} to Firestore:`, err);
        alert('Ошибка при сохранении шаблона в базу данных.');
        setStatus((prev) => ({ ...prev, isUploading: false }));
      }
    };

    reader.onerror = () => {
      setStatus((prev) => ({ ...prev, isUploading: false }));
      alert('Ошибка чтения файла.');
    };

    reader.readAsDataURL(file);
  };

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white max-w-3xl w-full rounded-2xl shadow-2xl border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh] overscroll-contain">
        
        {/* Header */}
        <div className="p-6 bg-stone-900 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-600 rounded-xl flex items-center justify-center">
              <SettingsIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Настройки системы</h3>
              <p className="text-xs text-stone-400">Управление шаблонами документов и печатных бланков</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white p-1.5 rounded-xl hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-stone-200 bg-stone-50 px-6 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('templates')}
            className={`py-3 px-4 text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'templates'
                ? 'border-rose-600 text-rose-700 bg-white'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            Шаблоны печатных документов
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 text-stone-800">
          {activeTab === 'templates' && (
            <div className="space-y-6">
              
              {/* Поясняющая справка */}
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs text-rose-900 leading-relaxed">
                <p className="font-bold mb-1 flex items-center gap-1.5 text-rose-950 text-sm">
                  <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
                  Управление пользовательскими шаблонами MS Word (.docx):
                </p>
                Вы можете скачать образцы шаблонов с переменными в фигурных скобках (например, <code className="bg-white px-1 py-0.5 rounded font-mono text-rose-800 border border-rose-200">{`{abiturFIO}`}</code>, <code className="bg-white px-1 py-0.5 rounded font-mono text-rose-800 border border-rose-200">{`{passportSeries}`}</code>, <code className="bg-white px-1 py-0.5 rounded font-mono text-rose-800 border border-rose-200">{`{address}`}</code>), оформить их в фирменном стиле колледжа в Microsoft Word и загрузить обратно. Загруженные шаблоны сохраняются в центральной базе данных и используются для генерации всех документов.
              </div>

              {/* КАРТОЧКА 1: Заявление на зачисление */}
              <div className="border border-stone-200 rounded-2xl p-5 bg-white shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-stone-900 text-base flex items-center gap-2">
                      <FileText className="w-5 h-5 text-rose-700" />
                      1. Заявление на зачисление (enrollApp.docx)
                    </h4>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Основное заявление абитуриента о приёме на обучение в ГБПОУ НСО «НЭК»
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadActiveEnrollApp}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
                      title="Скачать текущий активный шаблон заявления"
                    >
                      <Download className="w-4 h-4 text-white" />
                      Скачать шаблон
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadSampleEnrollApp}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-stone-300"
                      title="Скачать чистый образец заявления с переменными"
                    >
                      Скачать образец
                    </button>
                  </div>
                </div>

                <div className="pt-3 border-t border-stone-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    {enrollAppStatus.hasCustom ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Пользовательский шаблон сохранён {enrollAppStatus.updatedAt ? `(${enrollAppStatus.updatedAt})` : ''}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-stone-600 font-medium bg-stone-100 px-2.5 py-1 rounded-full border border-stone-200">
                        Используется стандартный встроенный шаблон
                      </span>
                    )}
                  </div>

                  <label className="inline-flex items-center gap-2 px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl font-bold transition-colors cursor-pointer shadow-xs text-xs">
                    {enrollAppStatus.isUploading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Сохранение...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Загрузить свой шаблон (.docx)
                      </>
                    )}
                    <input
                      type="file"
                      accept=".docx"
                      onChange={(e) => handleUploadTemplate(e, 'enrollAppTemplate', 'Шаблон заявления на зачисление', setEnrollAppStatus)}
                      className="hidden"
                      disabled={enrollAppStatus.isUploading}
                    />
                  </label>
                </div>

                {enrollAppStatus.uploadSuccess && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Шаблон заявления успешно сохранен в базе данных и активен для всей системы!
                  </div>
                )}

                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-600 space-y-1">
                  <p className="font-bold text-stone-800 mb-1">Переменные для шаблона заявления:</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 font-mono text-[11px]">
                    <div>{`{abiturFIO}`} — ФИО</div>
                    <div>{`{abiturFIOGen}`} — ФИО (род. падеж)</div>
                    <div>{`{birthDate}`} — Дата рождения</div>
                    <div>{`{snils}`} — СНИЛС</div>
                    <div>{`{phone}`} — Телефон</div>
                    <div>{`{school}`} — Школа</div>
                    <div>{`{profession}`} — Специальность</div>
                    <div>{`{fundingType}`} — Источник фин.</div>
                    <div>{`{currentDate}`} — Дата печати</div>
                  </div>
                </div>
              </div>

              {/* КАРТОЧКА 2: Согласие на обработку персональных данных */}
              <div className="border border-stone-200 rounded-2xl p-5 bg-white shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-stone-900 text-base flex items-center gap-2">
                      <Shield className="w-5 h-5 text-rose-700" />
                      2. Согласие на обработку персональных данных (152-ФЗ)
                    </h4>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Официальный бланк согласия абитуриента на хранение и обработку ПД
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadActiveConsent}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
                      title="Скачать текущий активный шаблон согласия"
                    >
                      <Download className="w-4 h-4 text-white" />
                      Скачать шаблон
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadSampleConsent}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-stone-300"
                      title="Скачать чистый образец согласия с переменными"
                    >
                      Скачать образец
                    </button>
                  </div>
                </div>

                <div className="pt-3 border-t border-stone-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    {consentStatus.hasCustom ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Пользовательский шаблон сохранён {consentStatus.updatedAt ? `(${consentStatus.updatedAt})` : ''}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-stone-600 font-medium bg-stone-100 px-2.5 py-1 rounded-full border border-stone-200">
                        Используется стандартный встроенный шаблон
                      </span>
                    )}
                  </div>

                  <label className="inline-flex items-center gap-2 px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl font-bold transition-colors cursor-pointer shadow-xs text-xs">
                    {consentStatus.isUploading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Сохранение...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Загрузить свой шаблон (.docx)
                      </>
                    )}
                    <input
                      type="file"
                      accept=".docx"
                      onChange={(e) => handleUploadTemplate(e, 'dataProcessingConsentTemplate', 'Шаблон согласия на обработку ПД', setConsentStatus)}
                      className="hidden"
                      disabled={consentStatus.isUploading}
                    />
                  </label>
                </div>

                {consentStatus.uploadSuccess && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Шаблон согласия на обработку ПД успешно сохранен в базе данных и активен!
                  </div>
                )}

                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-600 space-y-1">
                  <p className="font-bold text-stone-800 mb-1">Переменные для шаблона согласия ПД:</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 font-mono text-[11px]">
                    <div>{`{abiturFIO}`} — ФИО абитуриента</div>
                    <div>{`{passportSeries}`} — Серия паспорта</div>
                    <div>{`{passportNumber}`} — Номер паспорта</div>
                    <div>{`{passportIssuedBy}`} — Кем выдан</div>
                    <div>{`{passportIssueDate}`} — Дата выдачи</div>
                    <div>{`{address}`} — Адрес проживания</div>
                    <div>{`{snils}`} — СНИЛС</div>
                    <div>{`{phone}`} — Телефон</div>
                    <div>{`{currentDate}`} — Дата оформления</div>
                  </div>
                </div>
              </div>

              {/* КАРТОЧКА 3: Заявление / Согласие родителя */}
              <div className="border border-stone-200 rounded-2xl p-5 bg-white shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-stone-900 text-base flex items-center gap-2">
                      <Users className="w-5 h-5 text-rose-700" />
                      3. Заявление родителя / законного представителя (parentalConsent.docx)
                    </h4>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Заявление родителей несовершеннолетнего абитуриента (&lt; 18 лет). Данные родителей пишутся строго от руки.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadActiveParentalConsent}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
                      title="Скачать текущий активный шаблон заявления родителя"
                    >
                      <Download className="w-4 h-4 text-white" />
                      Скачать шаблон
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadSampleParentalConsent}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-stone-300"
                      title="Скачать чистый образец заявления родителя с переменными"
                    >
                      Скачать образец
                    </button>
                  </div>
                </div>

                <div className="pt-3 border-t border-stone-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    {parentalConsentStatus.hasCustom ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Пользовательский шаблон сохранён {parentalConsentStatus.updatedAt ? `(${parentalConsentStatus.updatedAt})` : ''}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-stone-600 font-medium bg-stone-100 px-2.5 py-1 rounded-full border border-stone-200">
                        Используется стандартный встроенный шаблон
                      </span>
                    )}
                  </div>

                  <label className="inline-flex items-center gap-2 px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl font-bold transition-colors cursor-pointer shadow-xs text-xs">
                    {parentalConsentStatus.isUploading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Сохранение...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Загрузить свой шаблон (.docx)
                      </>
                    )}
                    <input
                      type="file"
                      accept=".docx"
                      onChange={(e) => handleUploadTemplate(e, 'parentalConsentTemplate', 'Шаблон заявления родителя', setParentalConsentStatus)}
                      className="hidden"
                      disabled={parentalConsentStatus.isUploading}
                    />
                  </label>
                </div>

                {parentalConsentStatus.uploadSuccess && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Шаблон заявления родителя успешно сохранен в базе данных и активен!
                  </div>
                )}

                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-600 space-y-1">
                  <p className="font-bold text-stone-800 mb-1">Переменные шаблона заявления родителя (только данные ребенка):</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 font-mono text-[11px] mb-1">
                    <div>{`{abiturFIO}`} — ФИО абитуриента</div>
                    <div>{`{abiturFIOGen}`} — ФИО абитуриента (род. пад.)</div>
                    <div>{`{birthDate}`} — Дата рождения ребенка</div>
                    <div>{`{currentDate}`} — Дата оформления</div>
                  </div>
                  <p className="text-[11px] text-amber-800 font-medium italic pt-1 border-t border-stone-200">
                    * Внимание: Переменные для данных родителей отсутствуют. Данные родителя (ФИО, паспорт) оформляются в шаблоне физическими линиями прочерков (______) для заполнения родителем исключительно от руки.
                  </p>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
          >
            Закрыть
          </button>
        </div>

      </div>
    </div>
  );
}
