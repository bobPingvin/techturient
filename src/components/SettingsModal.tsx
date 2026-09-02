import React, { useState, useEffect } from 'react';
import { X, FileText, Upload, Download, CheckCircle2, AlertCircle, Settings as SettingsIcon, RefreshCw } from 'lucide-react';
import { doc as firestoreDoc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Document, Paragraph, TextRun, Packer, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'templates'>('templates');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [hasCustomTemplate, setHasCustomTemplate] = useState(false);
  const [templateUpdatedAt, setTemplateUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadTemplateStatus();
    }
  }, [isOpen]);

  const loadTemplateStatus = async () => {
    try {
      const localBase64 = localStorage.getItem('enrollAppTemplate_base64');
      const localTime = localStorage.getItem('enrollAppTemplate_updatedAt');
      if (localBase64) {
        setHasCustomTemplate(true);
        if (localTime) {
          setTemplateUpdatedAt(new Date(Number(localTime)).toLocaleString('ru-RU'));
        }
        return;
      }

      const templateDocRef = firestoreDoc(db, 'documentTemplates', 'enrollAppTemplate');
      const snap = await getDoc(templateDocRef);
      if (snap.exists()) {
        const data = snap.data() as any;
        if (data.base64Data) {
          setHasCustomTemplate(true);
          localStorage.setItem('enrollAppTemplate_base64', data.base64Data);
          if (data.updatedAt) {
            localStorage.setItem('enrollAppTemplate_updatedAt', String(data.updatedAt));
            setTemplateUpdatedAt(new Date(data.updatedAt).toLocaleString('ru-RU'));
          }
        } else {
          setHasCustomTemplate(false);
        }
      } else {
        setHasCustomTemplate(false);
      }
    } catch (e) {
      console.error('Error loading template status:', e);
    }
  };

  const handleDownloadActiveTemplate = async () => {
    try {
      const customBase64 = localStorage.getItem('enrollAppTemplate_base64');
      const customFileName = localStorage.getItem('enrollAppTemplate_fileName') || 'enrollApp_custom_template.docx';

      if (customBase64) {
        const binaryString = atob(customBase64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes.buffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
        saveAs(blob, customFileName);
        return;
      }

      // Если пользовательский шаблон не загружен, скачиваем образец
      await handleDownloadSampleTemplate();
    } catch (e) {
      console.error('Error downloading active template:', e);
      alert('Не удалось скачать шаблон');
    }
  };

  const handleDownloadSampleTemplate = async () => {
    try {
      // Генерируем образец с переменными для удобства редактирования пользователем
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.docx')) {
      alert('Пожалуйста, загрузите файл в формате .docx');
      return;
    }

    setIsUploading(true);
    setUploadSuccess(false);

    const reader = new FileReader();
    reader.onload = async (uploadEvent) => {
      try {
        const res = uploadEvent.target?.result as string;
        // res is data:application/vnd...;base64,...
        const base64Data = res.split(',')[1];
        const now = Date.now();

        localStorage.setItem('enrollAppTemplate_base64', base64Data);
        localStorage.setItem('enrollAppTemplate_updatedAt', String(now));
        localStorage.setItem('enrollAppTemplate_fileName', file.name);

        const templateDocRef = firestoreDoc(db, 'documentTemplates', 'enrollAppTemplate');
        await setDoc(templateDocRef, {
          id: 'enrollAppTemplate',
          name: 'Шаблон заявления на зачисление',
          fileName: file.name,
          base64Data,
          updatedAt: now,
        });

        setHasCustomTemplate(true);
        setTemplateUpdatedAt(new Date(now).toLocaleString('ru-RU'));
        setUploadSuccess(true);
        setTimeout(() => setUploadSuccess(false), 4000);
      } catch (err) {
        console.error('Error saving template to Firestore:', err);
        alert('Ошибка при сохранении шаблона в базу данных.');
      } finally {
        setIsUploading(false);
      }
    };
    reader.onerror = () => {
      setIsUploading(false);
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
      <div className="bg-white max-w-2xl w-full rounded-2xl shadow-2xl border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] overscroll-contain">
        
        {/* Header */}
        <div className="p-6 bg-stone-900 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-600 rounded-xl flex items-center justify-center">
              <SettingsIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Настройки системы</h3>
              <p className="text-xs text-stone-400">Управление шаблонами документов и параметрами</p>
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
        <div className="flex border-b border-stone-200 bg-stone-50 px-6 gap-2">
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
            Шаблоны документов
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 text-stone-800">
          {activeTab === 'templates' && (
            <div className="space-y-4">
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-xs text-rose-900 leading-relaxed">
                <p className="font-bold mb-1 flex items-center gap-1.5 text-rose-950">
                  <AlertCircle className="w-4 h-4 text-rose-700" />
                  Как работают шаблоны документов:
                </p>
                Вы можете скачать образец шаблона заявления (`enrollApp_sample_template.docx`), отредактировать его в Microsoft Word, расставив нужные переменные в фигурных скобках (например, <code className="bg-white px-1 py-0.5 rounded font-mono text-rose-800 border border-rose-200">{`{abiturFIO}`}</code>, <code className="bg-white px-1 py-0.5 rounded font-mono text-rose-800 border border-rose-200">{`{school}`}</code>, <code className="bg-white px-1 py-0.5 rounded font-mono text-rose-800 border border-rose-200">{`{profession}`}</code>), а затем загрузить готовый `.docx` файл обратно. При скачивании заявления в карточке абитуриента все переменные автоматически заменятся на реальные данные.
              </div>

              <div className="border border-stone-200 rounded-xl p-5 bg-white shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-stone-900 text-base flex items-center gap-2">
                      <FileText className="w-5 h-5 text-rose-700" />
                      Заявление на зачисление (enrollApp.docx)
                    </h4>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Основной документ заявления абитуриента в приёмную комиссию ГБПОУ НСО «НЭК»
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadActiveTemplate}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-sm"
                      title="Скачать текущий активный шаблон"
                    >
                      <Download className="w-4 h-4 text-white" />
                      Скачать шаблон
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadSampleTemplate}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-stone-300"
                      title="Скачать чистый образец с переменными для редактирования"
                    >
                      Скачать образец
                    </button>
                  </div>
                </div>

                <div className="pt-3 border-t border-stone-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    {hasCustomTemplate ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Загружен пользовательский шаблон {templateUpdatedAt ? `(${templateUpdatedAt})` : ''}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-stone-600 font-medium bg-stone-100 px-2.5 py-1 rounded-full border border-stone-200">
                        Используется стандартный встроенный шаблон
                      </span>
                    )}
                  </div>

                  <label className="inline-flex items-center gap-2 px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl font-bold transition-colors cursor-pointer shadow-sm text-xs">
                    {isUploading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Загрузка...
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
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={isUploading}
                    />
                  </label>
                </div>

                {uploadSuccess && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Шаблон успешно загружен и сохранен в базе данных! Теперь он будет использоваться для всех абитуриентов.
                  </div>
                )}
              </div>

              <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                <p className="text-xs font-bold text-stone-700">Доступные переменные для шаблона:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-stone-600 font-mono">
                  <div>{`{abiturFIO}`} — ФИО абитуриента</div>
                  <div>{`{abiturFIOGen}`} — ФИО в род. падеже</div>
                  <div>{`{birthDate}`} — Дата рождения</div>
                  <div>{`{snils}`} — СНИЛС</div>
                  <div>{`{phone}`} — Телефон</div>
                  <div>{`{school}`} — Название школы</div>
                  <div>{`{className}`} — Номер класса</div>
                  <div>{`{city}`} — Город</div>
                  <div>{`{profession}`} — Профессия/Специальность</div>
                  <div>{`{fundingType}`} — Бюджет / Платно</div>
                  <div>{`{currentDate}`} — Дата формирования</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-sm"
          >
            Закрыть
          </button>
        </div>

      </div>
    </div>
  );
}
