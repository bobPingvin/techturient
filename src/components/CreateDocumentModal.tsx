import React, { useState, useEffect } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { BenefitDocument } from '../types';
import { X, FileText, Loader2, Check } from 'lucide-react';

interface CreateDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (doc: BenefitDocument) => void;
  initialBeneficiaryName?: string;
  initialBenefitCategory?: string;
}

export function CreateDocumentModal({
  isOpen,
  onClose,
  onCreated,
  initialBeneficiaryName = '',
  initialBenefitCategory = '',
}: CreateDocumentModalProps) {
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

  const [type, setType] = useState('Справка');
  const [documentNumber, setDocumentNumber] = useState('');
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [benefitCategory, setBenefitCategory] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [issuedBy, setIssuedBy] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setBeneficiaryName(initialBeneficiaryName);
      setBenefitCategory(initialBenefitCategory || 'Ребенок участника СВО');
      if (!issueDate) {
        setIssueDate(new Date().toISOString().split('T')[0]);
      }
    }
  }, [isOpen, initialBeneficiaryName, initialBenefitCategory]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!documentNumber.trim() || !issueDate || !issuedBy.trim()) {
      alert('Пожалуйста, заполните все обязательные поля (Номер, Дата выдачи, Кем выдано)');
      return;
    }

    setSaving(true);
    try {
      const docData = {
        type,
        documentNumber: documentNumber.trim(),
        beneficiaryName: beneficiaryName.trim(),
        benefitCategory: benefitCategory.trim(),
        issueDate,
        issuedBy: issuedBy.trim(),
        note: note.trim(),
        createdAt: Date.now(),
      };

      const docRef = await addDoc(collection(db, 'benefitDocuments'), docData);
      const createdDoc: BenefitDocument = {
        id: docRef.id,
        ...docData,
      };

      onCreated(createdDoc);
      onClose();
    } catch (err) {
      console.error(err);
      alert('Ошибка при сохранении документа в реестр');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white max-w-lg w-full rounded-2xl shadow-2xl border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 overscroll-contain">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-rose-950 via-rose-900 to-rose-800 text-white flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center text-white">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-tight">Создание подтверждающего документа</h3>
              <p className="text-xs text-rose-200">Внесение справки / выписки в реестр документов</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-xl hover:bg-white/15 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                Тип документа <span className="text-rose-700">*</span>
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-800 text-stone-900 bg-white text-sm"
              >
                <option value="Справка">Справка</option>
                <option value="Выписка">Выписка</option>
                <option value="Удостоверение">Удостоверение</option>
                <option value="Свидетельство">Свидетельство</option>
                <option value="Иной документ">Иной документ</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                Номер документа <span className="text-rose-700">*</span>
              </label>
              <input
                type="text"
                required
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                placeholder="№ 142/СВО-24"
                className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-800 text-stone-900 bg-stone-50/40 text-sm font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
              Кому выдан (ФИО абитуриента / лица)
            </label>
            <input
              type="text"
              value={beneficiaryName}
              onChange={(e) => setBeneficiaryName(e.target.value)}
              placeholder="Иванов Иван Иванович"
              className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-800 text-stone-900 bg-stone-50/40 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                Категория льготы
              </label>
              <select
                value={benefitCategory}
                onChange={(e) => setBenefitCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-800 text-stone-900 bg-white text-sm"
              >
                <option value="Ребенок участника СВО">Ребёнок участника СВО</option>
                <option value="Участник СВО">Участник СВО</option>
                <option value="Ветеран боевых действий">Ветеран боевых действий</option>
                <option value="Дети-сироты и дети без попечения">Дети-сироты / без попечения</option>
                <option value="Инвалид I или II группы">Инвалид I или II группы</option>
                <option value="Иная льгота">Иная льгота</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                Дата выдачи <span className="text-rose-700">*</span>
              </label>
              <input
                type="date"
                required
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-800 text-stone-900 bg-white text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
              Кем выдан документ <span className="text-rose-700">*</span>
            </label>
            <input
              type="text"
              required
              value={issuedBy}
              onChange={(e) => setIssuedBy(e.target.value)}
              placeholder="Военный комиссариат Октябрьского района г. Новосибирска"
              className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-800 text-stone-900 bg-stone-50/40 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
              Основание / Примечание
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Справка подтверждает статус члена семьи участника СВО"
              className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-800 text-stone-900 bg-stone-50/40 text-sm"
            />
          </div>

          <div className="pt-3 border-t border-stone-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-stone-300 text-stone-700 hover:bg-stone-100 rounded-xl text-sm font-medium transition-colors cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-rose-800 hover:bg-rose-900 active:bg-rose-950 text-white px-5 py-2 rounded-xl text-sm font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Сохранить в реестр
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
