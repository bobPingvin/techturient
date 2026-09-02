import React, { useState, useEffect } from 'react';
import { Applicant } from '../types';
import { X, User, Save, Loader2, Phone, Calendar, FileText } from 'lucide-react';

interface EditPersonalModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicant: Applicant;
  onSavePersonal: (updatedFields: Partial<Applicant>) => Promise<void>;
}

export function EditPersonalModal({
  isOpen,
  onClose,
  applicant,
  onSavePersonal
}: EditPersonalModalProps) {
  const [lastName, setLastName] = useState(applicant.lastName || '');
  const [firstName, setFirstName] = useState(applicant.firstName || '');
  const [middleName, setMiddleName] = useState(applicant.middleName || '');
  const [phone, setPhone] = useState(applicant.phone || '');
  const [birthDate, setBirthDate] = useState(applicant.birthDate || '');
  const [gender, setGender] = useState(applicant.gender || 'Мужской');
  const [snils, setSnils] = useState(applicant.snils || '');

  const [passportSeries, setPassportSeries] = useState(applicant.passportSeries || '');
  const [passportNumber, setPassportNumber] = useState(applicant.passportNumber || '');
  const [passportSubdivisionCode, setPassportSubdivisionCode] = useState(applicant.passportSubdivisionCode || '');
  const [passportIssueDate, setPassportIssueDate] = useState(applicant.passportIssueDate || '');
  const [passportIssuedBy, setPassportIssuedBy] = useState(applicant.passportIssuedBy || applicant.passport || '');

  const [isSubmitting, setIsSubmitting] = useState(false);

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
      setLastName(applicant.lastName || '');
      setFirstName(applicant.firstName || '');
      setMiddleName(applicant.middleName || '');
      setPhone(applicant.phone || '');
      setBirthDate(applicant.birthDate || '');
      setGender(applicant.gender || 'Мужской');
      setSnils(applicant.snils || '');
      setPassportSeries(applicant.passportSeries || '');
      setPassportNumber(applicant.passportNumber || '');
      setPassportSubdivisionCode(applicant.passportSubdivisionCode || '');
      setPassportIssueDate(applicant.passportIssueDate || '');
      setPassportIssuedBy(applicant.passportIssuedBy || applicant.passport || '');
    }
  }, [isOpen, applicant]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lastName.trim() || !firstName.trim()) {
      alert('Пожалуйста, заполните Фамилию и Имя абитуриента');
      return;
    }

    const fullFio = `${lastName.trim()} ${firstName.trim()}${middleName.trim() ? ' ' + middleName.trim() : ''}`.trim();

    setIsSubmitting(true);
    try {
      await onSavePersonal({
        lastName: lastName.trim(),
        firstName: firstName.trim(),
        middleName: middleName.trim(),
        fullName: fullFio,
        phone: phone.trim(),
        birthDate: birthDate.trim(),
        gender,
        snils: snils.trim(),
        passportSeries: passportSeries.trim(),
        passportNumber: passportNumber.trim(),
        passportSubdivisionCode: passportSubdivisionCode.trim(),
        passportIssueDate: passportIssueDate.trim(),
        passportIssuedBy: passportIssuedBy.trim(),
        passport: passportIssuedBy.trim()
      });
      onClose();
    } catch (err) {
      console.error('Error saving personal data:', err);
      alert('Ошибка при сохранении персональных данных');
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
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-stone-900">Изменение персональных данных</h3>
              <p className="text-xs text-stone-500">Редактирование ФИО, паспорта, телефона и контактов</p>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 overscroll-contain">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Фамилия *
              </label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-800 text-stone-900 font-medium"
                placeholder="Иванов"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Имя *
              </label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-800 text-stone-900 font-medium"
                placeholder="Иван"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Отчество
              </label>
              <input
                type="text"
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-800 text-stone-900 font-medium"
                placeholder="Иванович"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Телефон
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-800 text-stone-900 font-medium font-mono"
                placeholder="+7 (999) 000-00-00"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Дата рождения
              </label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-800 text-stone-900 font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Пол
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-800 text-stone-900 font-medium cursor-pointer"
              >
                <option value="Мужской">Мужской</option>
                <option value="Женский">Женский</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              СНИЛС
            </label>
            <input
              type="text"
              value={snils}
              onChange={(e) => setSnils(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-800 text-stone-900 font-medium font-mono"
              placeholder="000-000-000 00"
            />
          </div>

          <div className="pt-3 border-t border-stone-200">
            <h4 className="text-xs font-bold uppercase tracking-wider text-rose-900 mb-3">
              Паспортные данные
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Серия</label>
                <input
                  type="text"
                  value={passportSeries}
                  onChange={(e) => setPassportSeries(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-sm font-mono font-medium focus:outline-none focus:ring-2 focus:ring-rose-800"
                  placeholder="0000"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Номер</label>
                <input
                  type="text"
                  value={passportNumber}
                  onChange={(e) => setPassportNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-sm font-mono font-medium focus:outline-none focus:ring-2 focus:ring-rose-800"
                  placeholder="000000"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Код подразд.</label>
                <input
                  type="text"
                  value={passportSubdivisionCode}
                  onChange={(e) => setPassportSubdivisionCode(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-sm font-mono font-medium focus:outline-none focus:ring-2 focus:ring-rose-800"
                  placeholder="000-000"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Дата выдачи</label>
                <input
                  type="date"
                  value={passportIssueDate}
                  onChange={(e) => setPassportIssueDate(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-800"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Кем выдан паспорт</label>
              <input
                type="text"
                value={passportIssuedBy}
                onChange={(e) => setPassportIssuedBy(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-800"
                placeholder="Отделением УФМС..."
              />
            </div>
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
                  <span>Сохранить изменения</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
