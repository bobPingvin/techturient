import React from 'react';
import { Applicant } from '../types';
import { formatSpecialtyDisplay } from '../lib/specialties';
import { 
  AlertTriangle, 
  Trash2, 
  X, 
  User, 
  GraduationCap, 
  Phone, 
  FileText,
  Loader2
} from 'lucide-react';

interface DeleteApplicantModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicant: Applicant | null;
  onConfirmDelete: (applicantId: string) => Promise<void>;
  isDeleting: boolean;
}

export function DeleteApplicantModal({
  isOpen,
  onClose,
  applicant,
  onConfirmDelete,
  isDeleting
}: DeleteApplicantModalProps) {
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

  if (!isOpen || !applicant) return null;

  const handleConfirm = async () => {
    try {
      await onConfirmDelete(applicant.id);
      onClose();
    } catch (err) {
      console.error(err);
      // error handled in parent
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 overscroll-contain">
        
        {/* Header with warning styling */}
        <div className="px-6 pt-6 pb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-800 flex items-center justify-center shrink-0 border border-rose-200">
              <AlertTriangle className="w-6 h-6 text-rose-800" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-stone-900 leading-tight">
                Удаление абитуриента
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Требуется подтверждение действия
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body content */}
        <div className="px-6 py-2 space-y-4 text-stone-700 text-sm">
          <p className="text-stone-600 text-xs sm:text-sm leading-relaxed">
            Вы уверены, что хотите удалить данное личное дело? Все внесённые данные (паспортные данные, аттестат, оценки, родственники и документы) будут <strong className="text-rose-900">безвозвратно удалены</strong> из базы данных.
          </p>

          {/* Applicant Info Summary Card */}
          <div className="p-4 bg-rose-50/60 rounded-xl border border-rose-200/80 space-y-2.5">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-rose-800 shrink-0" />
              <span className="font-bold text-stone-900 text-sm">{applicant.fullName}</span>
            </div>

            {applicant.specialty && (
              <div className="flex items-center gap-2 text-xs text-stone-700">
                <GraduationCap className="w-4 h-4 text-stone-500 shrink-0" />
                <span className="font-medium text-stone-800 truncate">{formatSpecialtyDisplay(applicant.specialty, applicant.specialtyName)}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500 pt-1 border-t border-rose-200/60">
              {applicant.phone && (
                <div className="flex items-center gap-1">
                  <Phone className="w-3 h-3 text-stone-400" />
                  <span>{applicant.phone}</span>
                </div>
              )}
              {applicant.snils && (
                <div>
                  СНИЛС: <span className="font-mono text-stone-700">{applicant.snils}</span>
                </div>
              )}
              {applicant.averageScore !== undefined && (
                <div>
                  Балл: <span className="font-bold text-rose-900 font-mono">{applicant.averageScore.toFixed(3)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 pt-4 flex items-center justify-end gap-3 bg-stone-50/50 border-t border-stone-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2.5 border border-stone-300 text-stone-700 hover:bg-stone-100 rounded-xl text-sm font-medium transition-colors cursor-pointer disabled:opacity-50"
          >
            Отмена
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="bg-rose-800 hover:bg-rose-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Удаление...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Да, удалить абитуриента</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
