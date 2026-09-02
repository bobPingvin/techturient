import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Campaign } from '../types';
import { displayRussianDate } from '../lib/validation';
import { useAuth } from '../context/AuthContext';
import { logAction } from '../lib/logger';
import { toast } from '../utils/toast';
import { 
  AlertTriangle, 
  Trash2, 
  X, 
  Users, 
  Calendar, 
  Loader2, 
  ArrowLeft,
  ShieldAlert,
  Building2
} from 'lucide-react';

interface DeleteCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: Campaign | null;
  onDeleteSuccess?: () => void;
}

export function DeleteCampaignModal({
  isOpen,
  onClose,
  campaign,
  onDeleteSuccess
}: DeleteCampaignModalProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [confirmInput, setConfirmInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [applicantsCount, setApplicantsCount] = useState<number | null>(null);
  const [isLoadingCount, setIsLoadingCount] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setStep(1);
      setConfirmInput('');
      
      if (campaign) {
        setIsLoadingCount(true);
        const q = query(
          collection(db, 'applicants'),
          where('campaignId', '==', campaign.id)
        );
        getDocs(q)
          .then((snap) => {
            setApplicantsCount(snap.size);
          })
          .catch((err) => {
            console.error('Error fetching applicants count:', err);
            setApplicantsCount(0);
          })
          .finally(() => {
            setIsLoadingCount(false);
          });
      }
    } else {
      document.body.style.overflow = '';
      setStep(1);
      setConfirmInput('');
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, campaign]);

  if (!isOpen || !campaign) return null;

  const isConfirmValid = 
    confirmInput.trim().toUpperCase() === 'УДАЛИТЬ' || 
    confirmInput.trim().toLowerCase() === campaign.name.trim().toLowerCase();

  const handleDelete = async () => {
    if (!isConfirmValid || isDeleting) return;

    setIsDeleting(true);
    try {
      // 1. Fetch all applicants associated with this campaign
      const applicantsQuery = query(
        collection(db, 'applicants'),
        where('campaignId', '==', campaign.id)
      );
      const applicantsSnap = await getDocs(applicantsQuery);

      // 2. Delete all applicants in batches (Firestore batch size max 500)
      const batchSize = 400;
      let batch = writeBatch(db);
      let count = 0;

      for (const applicantDoc of applicantsSnap.docs) {
        batch.delete(applicantDoc.ref);
        count++;
        if (count % batchSize === 0) {
          await batch.commit();
          batch = writeBatch(db);
        }
      }
      if (count % batchSize !== 0) {
        await batch.commit();
      }

      // 3. Delete the campaign document itself
      await deleteDoc(doc(db, 'campaigns', campaign.id));

      // 4. Log audit action
      await logAction(
        user?.username || 'nekpriem',
        'DELETE_CAMPAIGN',
        `Удалил приёмную кампанию "${campaign.name}" и всех её абитуриентов (${applicantsSnap.size} чел.)`,
        { campaignId: campaign.id }
      );

      toast.success(`Приёмная кампания «${campaign.name}» и ${applicantsSnap.size} абитуриент(ов) успешно удалены`);

      if (onDeleteSuccess) {
        onDeleteSuccess();
      }
      onClose();
    } catch (err) {
      console.error('Error deleting campaign:', err);
      toast.error('Произошла ошибка при удалении приёмной кампании');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 overscroll-contain">
        
        {/* Header */}
        <div className={`px-6 py-4 flex items-center justify-between border-b transition-colors ${
          step === 1 ? 'bg-amber-500/10 border-amber-200' : 'bg-rose-900 text-white border-rose-950'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
              step === 1 
                ? 'bg-amber-100 text-amber-800 border-amber-300' 
                : 'bg-rose-800 text-rose-200 border-rose-700'
            }`}>
              {step === 1 ? <AlertTriangle className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5 text-rose-200" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`font-bold text-base ${step === 1 ? 'text-stone-900' : 'text-white'}`}>
                  Удаление приёмной кампании
                </h3>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                  step === 1 ? 'bg-amber-200/70 text-amber-900' : 'bg-rose-800 text-rose-100 border border-rose-700'
                }`}>
                  Шаг {step} из 2
                </span>
              </div>
              <p className={`text-xs ${step === 1 ? 'text-stone-500' : 'text-rose-200'}`}>
                {step === 1 ? 'Первое подтверждение действия' : 'Окончательное необратимое подтверждение'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isDeleting}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50 ${
              step === 1 
                ? 'text-stone-400 hover:text-stone-700 hover:bg-stone-100' 
                : 'text-rose-300 hover:text-white hover:bg-rose-800'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">

          {step === 1 ? (
            <>
              <p className="text-stone-700 text-sm leading-relaxed">
                Вы действительно хотите удалить приёмную кампанию <strong className="text-stone-900">«{campaign.name}»</strong>?
              </p>

              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 space-y-3">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-900 space-y-1">
                    <p className="font-bold text-amber-950">
                      Внимание: вместе с кампанией будут удалены все зарегистрированные в ней абитуриенты!
                    </p>
                    <p>
                      Все личные дела, паспортные данные, аттестаты, льготные документы и записи воинского учёта будут безвозвратно удалены.
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-amber-200/70 grid grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center gap-1.5 text-amber-950 font-medium">
                    <Building2 className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                    <span className="truncate">{campaign.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-amber-950 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                    <span>{displayRussianDate(campaign.createdAt)}</span>
                  </div>
                  <div className="col-span-2 flex items-center gap-1.5 text-amber-950 font-bold bg-amber-100/70 p-2 rounded-lg border border-amber-200">
                    <Users className="w-4 h-4 text-rose-800 shrink-0" />
                    <span>
                      Абитуриентов в кампании:{' '}
                      {isLoadingCount ? (
                        <Loader2 className="w-3 h-3 animate-spin inline ml-1" />
                      ) : (
                        <strong className="text-rose-900">{applicantsCount ?? 0} чел.</strong>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="p-4 bg-rose-50 rounded-xl border border-rose-200 space-y-2">
                <div className="flex items-center gap-2 text-rose-900 font-bold text-sm">
                  <ShieldAlert className="w-5 h-5 text-rose-800 shrink-0" />
                  <span>Повторное (окончательное) подтверждение</span>
                </div>
                <p className="text-xs text-rose-800 leading-relaxed">
                  Это действие <strong className="underline">НЕОБРАТИМО</strong>. База данных кампании «{campaign.name}» и <strong>{applicantsCount ?? 0} личных дел абитуриентов</strong> будут сразу и навсегда удалены.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-stone-800">
                  Для подтверждения введите слово <span className="text-rose-800 font-mono uppercase bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">УДАЛИТЬ</span> или название кампании:
                </label>
                <input
                  type="text"
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  placeholder="Введите УДАЛИТЬ"
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-800"
                  autoFocus
                />
                <p className="text-[11px] text-stone-500">
                  Введите <code className="font-bold text-rose-800">УДАЛИТЬ</code> для активации кнопки окончательного удаления
                </p>
              </div>
            </>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-6 pt-3 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-3">
          {step === 1 ? (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={isDeleting}
                className="px-4 py-2.5 border border-stone-300 text-stone-700 hover:bg-stone-100 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
              >
                Отмена
              </button>
              
              <button
                type="button"
                onClick={() => setStep(2)}
                className="bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-xs flex items-center gap-2 cursor-pointer"
              >
                <span>Далее (Шаг 1 из 2)</span>
                <span className="text-amber-200">→</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={isDeleting}
                className="px-3.5 py-2.5 border border-stone-300 text-stone-700 hover:bg-stone-100 rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Назад</span>
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={!isConfirmValid || isDeleting}
                className="bg-rose-900 hover:bg-rose-950 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Удаление кампании...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Удалить кампанию навсегда</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
