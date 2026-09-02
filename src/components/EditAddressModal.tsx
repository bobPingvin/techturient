import React, { useState, useEffect } from 'react';
import { Applicant } from '../types';
import { X, MapPin, Save, Loader2 } from 'lucide-react';
import { toast } from '../utils/toast';

interface EditAddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicant: Applicant;
  onSaveAddress: (updatedFields: Partial<Applicant>) => Promise<void>;
}

export function EditAddressModal({
  isOpen,
  onClose,
  applicant,
  onSaveAddress
}: EditAddressModalProps) {
  const [residence, setResidence] = useState(applicant.residence || '');
  const [locality, setLocality] = useState(applicant.locality || '');
  const [matchesResidence, setMatchesResidence] = useState(applicant.matchesResidence ?? true);
  const [registration, setRegistration] = useState(applicant.registration || '');
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
      setResidence(applicant.residence || '');
      setLocality(applicant.locality || '');
      setMatchesResidence(applicant.matchesResidence ?? true);
      setRegistration(applicant.registration || '');
    }
  }, [isOpen, applicant]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!residence.trim()) {
      toast.warning('Пожалуйста, укажите фактическое место жительства');
      return;
    }

    if (!matchesResidence && !registration.trim()) {
      toast.warning('Пожалуйста, укажите адрес прописки (регистрации)');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSaveAddress({
        residence: residence.trim(),
        locality: locality.trim(),
        matchesResidence,
        registration: matchesResidence ? residence.trim() : registration.trim()
      });
      toast.success('Адресные сведения абитуриента успешно обновлены!');
      onClose();
    } catch (err) {
      console.error('Error saving address:', err);
      toast.error('Ошибка при сохранении адреса');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white max-w-xl w-full rounded-2xl shadow-2xl border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-stone-900 text-white flex items-center justify-between border-b border-stone-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-900/80 border border-rose-700/50 flex items-center justify-center text-rose-300">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Изменение адреса абитуриента</h3>
              <p className="text-xs text-stone-400">{applicant.fullName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Фактическое место жительства <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              value={residence}
              onChange={(e) => {
                const val = e.target.value;
                setResidence(val);
                if (matchesResidence) {
                  setRegistration(val);
                }
              }}
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-800"
              placeholder="г. Москва, ул. Ленина, д. 10, кв. 5"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Населённый пункт
            </label>
            <input
              type="text"
              value={locality}
              onChange={(e) => setLocality(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-800"
              placeholder="г. Новосибирск"
            />
          </div>

          <div className="pt-2 border-t border-stone-200">
            <div className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                id="matchesResidenceEditAddress"
                checked={matchesResidence}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setMatchesResidence(checked);
                  if (checked) {
                    setRegistration(residence);
                  }
                }}
                className="w-4 h-4 text-rose-800 border-stone-300 rounded focus:ring-rose-800 cursor-pointer"
              />
              <label htmlFor="matchesResidenceEditAddress" className="text-xs text-stone-800 font-semibold cursor-pointer">
                Место прописки совпадает с фактическим адресом
              </label>
            </div>

            {!matchesResidence && (
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Место прописки (регистрации) <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={registration}
                  onChange={(e) => setRegistration(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-800"
                  placeholder="г. Новосибирск, ул. Кирова, д. 12"
                  required={!matchesResidence}
                />
              </div>
            )}
          </div>

          {/* Footer Buttons */}
          <div className="pt-4 border-t border-stone-200 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold rounded-xl text-sm transition-colors cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-rose-900 hover:bg-rose-950 text-white font-semibold rounded-xl text-sm transition-colors flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Сохранение...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Сохранить адрес</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
