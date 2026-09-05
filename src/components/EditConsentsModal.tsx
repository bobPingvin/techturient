import React, { useState, useEffect } from 'react';
import { Applicant } from '../types';
import { X, Save, Loader2, FileText, Download, CheckCircle2, Clock, Shield, Users } from 'lucide-react';
import { calculateAge, generateDataProcessingConsent, generateParentalConsent } from '../lib/documentGenerator';

interface EditConsentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicant: Applicant;
  onSaveConsents: (updatedFields: Partial<Applicant>) => Promise<void>;
}

export function EditConsentsModal({
  isOpen,
  onClose,
  applicant,
  onSaveConsents
}: EditConsentsModalProps) {
  const [dataProcessingConsentSigned, setDataProcessingConsentSigned] = useState(
    applicant.dataProcessingConsentSigned || false
  );
  const [parentalConsentSigned, setParentalConsentSigned] = useState(
    applicant.parentalConsentSigned || false
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const age = calculateAge(applicant.birthDate);
  const isMinor = age < 18;

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

  useEffect(() => {
    if (isOpen && applicant) {
      setDataProcessingConsentSigned(applicant.dataProcessingConsentSigned || false);
      setParentalConsentSigned(applicant.parentalConsentSigned || false);
    }
  }, [isOpen, applicant]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSaveConsents({
        dataProcessingConsentSigned,
        parentalConsentSigned: isMinor ? parentalConsentSigned : true,
      });
      onClose();
    } catch (err) {
      console.error('Error saving consents status:', err);
      alert('Ошибка при сохранении статусов согласий');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh] overscroll-contain">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-100 text-rose-900 rounded-xl">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-stone-900">Управление согласиями и заявлениями</h3>
              <p className="text-xs text-stone-500">
                {applicant.fullName} | Возраст: {age > 0 ? `${age} лет` : 'Не указан'} {isMinor ? '(Несовершеннолетний)' : '(Совершеннолетний)'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1 overscroll-contain">
          
          {/* 1. Согласие на обработку персональных данных (152-ФЗ) */}
          <div className={`p-5 rounded-2xl border transition-all space-y-4 ${
            dataProcessingConsentSigned
              ? 'bg-emerald-50/60 border-emerald-300'
              : 'bg-stone-50 border-stone-200'
          }`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-stone-200 text-stone-800 rounded-md">
                  ФЗ №152-ФЗ
                </span>
                <h4 className="font-bold text-stone-900 text-sm mt-1.5">
                  1. Согласие на обработку и хранение персональных данных
                </h4>
                <p className="text-xs text-stone-500 mt-0.5">
                  Обязательный документ при приёме документов в ГБПОУ НСО «НЭК».
                </p>
              </div>

              {dataProcessingConsentSigned ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 bg-emerald-100 text-emerald-900 rounded-lg shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                  Оригинал сдан
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 bg-amber-100 text-amber-900 rounded-lg shrink-0">
                  <Clock className="w-3.5 h-3.5 text-amber-700" />
                  Ожидает сдачи
                </span>
              )}
            </div>

            <div className="pt-2 border-t border-stone-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => generateDataProcessingConsent(applicant)}
                className="py-2 px-3.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <Download className="w-4 h-4 text-stone-300" />
                <span>Скачать бланк согласия (.docx)</span>
              </button>

              <label className="flex items-center gap-3 p-2.5 bg-white rounded-xl border border-stone-300 cursor-pointer hover:bg-stone-100/70 transition-colors">
                <input
                  type="checkbox"
                  checked={dataProcessingConsentSigned}
                  onChange={(e) => setDataProcessingConsentSigned(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-stone-300 focus:ring-emerald-600 accent-emerald-600"
                />
                <span className="text-xs font-bold text-stone-900">
                  Оригинал согласия сдан абитуриентом
                </span>
              </label>
            </div>
          </div>

          {/* 2. Заявление / Согласие родителя (законного представителя) */}
          <div className={`p-5 rounded-2xl border transition-all space-y-4 ${
            !isMinor
              ? 'bg-stone-100/80 border-stone-200 opacity-80'
              : parentalConsentSigned
              ? 'bg-emerald-50/60 border-emerald-300'
              : 'bg-amber-50/40 border-amber-200'
          }`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                  isMinor ? 'bg-rose-100 text-rose-900' : 'bg-stone-200 text-stone-700'
                }`}>
                  {isMinor ? 'Для несовершеннолетних (< 18 лет)' : 'Совершеннолетний (>= 18 лет)'}
                </span>
                <h4 className="font-bold text-stone-900 text-sm mt-1.5 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-stone-600" />
                  2. Заявление / согласие родителя (законного представителя)
                </h4>
                <p className="text-xs text-stone-500 mt-0.5">
                  {isMinor
                    ? 'Официальное согласие родителей / опекунов на поступление ребенка в колледж.'
                    : 'Не требуется, так как абитуриент достиг 18-летнего возраста.'}
                </p>
              </div>

              {isMinor ? (
                parentalConsentSigned ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 bg-emerald-100 text-emerald-900 rounded-lg shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                    Оригинал сдан
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 bg-amber-100 text-amber-900 rounded-lg shrink-0">
                    <Clock className="w-3.5 h-3.5 text-amber-700" />
                    Ожидает сдачи
                  </span>
                )
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 bg-stone-200 text-stone-600 rounded-lg shrink-0">
                  Не требуется
                </span>
              )}
            </div>

            {isMinor ? (
              <div className="pt-2 border-t border-stone-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => generateParentalConsent(applicant)}
                  className="py-2 px-3.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <Download className="w-4 h-4 text-stone-300" />
                  <span>Скачать согласие родителя (.docx)</span>
                </button>

                <label className="flex items-center gap-3 p-2.5 bg-white rounded-xl border border-stone-300 cursor-pointer hover:bg-stone-100/70 transition-colors">
                  <input
                    type="checkbox"
                    checked={parentalConsentSigned}
                    onChange={(e) => setParentalConsentSigned(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded border-stone-300 focus:ring-emerald-600 accent-emerald-600"
                  />
                  <span className="text-xs font-bold text-stone-900">
                    Оригинал согласия родителя сдан
                  </span>
                </label>
              </div>
            ) : (
              <div className="pt-2 border-t border-stone-200 text-xs text-stone-500">
                Абитуриент совершеннолетний, отметка родителя не требуется.
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-stone-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold rounded-xl text-sm transition-colors cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-rose-900 hover:bg-rose-950 text-white font-bold rounded-xl text-sm transition-colors flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Сохранение...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Сохранить статусы</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
