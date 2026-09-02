import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Campaign } from '../types';
import { displayRussianDate } from '../lib/validation';
import { Link } from 'react-router-dom';
import { FolderPlus, Calendar, ChevronRight, Loader2, Building2, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { logAction } from '../lib/logger';
import { DeleteCampaignModal } from './DeleteCampaignModal';

export function Campaigns() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isCreating, setIsCreating] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState('');
  const [creatingStatus, setCreatingStatus] = useState(false);

  const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'campaigns'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Campaign[];
      setCampaigns(data);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching campaigns:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampaignName.trim()) return;
    
    setCreatingStatus(true);
    try {
      const docRef = await addDoc(collection(db, 'campaigns'), {
        name: newCampaignName.trim(),
        createdAt: Date.now()
      });
      await logAction(
        user?.username || 'nekpriem',
        'CREATE_CAMPAIGN',
        `Создал приёмную кампанию: "${newCampaignName.trim()}"`,
        { campaignId: docRef.id }
      );
      setNewCampaignName('');
      setIsCreating(false);
    } catch (err) {
      console.error(err);
      alert('Ошибка при создании кампании');
    } finally {
      setCreatingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-rose-800" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-stone-200 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-800 uppercase tracking-wider mb-1">
            <Building2 className="w-3.5 h-3.5" />
            Периоды набора
          </div>
          <h2 className="text-2xl font-bold text-stone-900 tracking-tight">Приёмные кампании НЭК</h2>
          <p className="text-stone-500 text-sm mt-0.5">Выберите кампанию для работы с базой абитуриентов или создайте новую</p>
        </div>
        
        {!isCreating && (
          <button 
            onClick={() => setIsCreating(true)}
            className="bg-rose-800 hover:bg-rose-900 active:bg-rose-950 text-white px-4 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <FolderPlus className="w-4 h-4" />
            Создать период
          </button>
        )}
      </div>

      {isCreating && (
        <form onSubmit={handleCreate} className="bg-white p-6 rounded-2xl border-2 border-rose-200 shadow-md flex flex-col sm:flex-row gap-4 items-end animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex-1 w-full">
            <label className="block text-xs font-bold uppercase tracking-wider text-rose-950 mb-1.5">
              Название приёмной кампании
            </label>
            <input
              type="text"
              value={newCampaignName}
              onChange={(e) => setNewCampaignName(e.target.value)}
              placeholder="Например: 2026-2027 Приёмная кампания"
              className="w-full px-4 py-2.5 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-800 text-stone-900 bg-stone-50/50"
              autoFocus
              required
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button 
              type="button" 
              onClick={() => setIsCreating(false)}
              className="px-4 py-2.5 text-stone-600 hover:bg-stone-100 rounded-xl font-medium transition-colors flex-1 sm:flex-none cursor-pointer"
            >
              Отмена
            </button>
            <button 
              type="submit" 
              disabled={creatingStatus}
              className="bg-rose-800 hover:bg-rose-900 text-white px-6 py-2.5 rounded-xl font-medium transition-all flex-1 sm:flex-none flex justify-center items-center cursor-pointer shadow-sm"
            >
              {creatingStatus ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Сохранить'}
            </button>
          </div>
        </form>
      )}

      {campaigns.length === 0 && !isCreating ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-stone-300">
          <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-3 text-rose-800">
            <Calendar className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-stone-900">Нет активных кампаний</h3>
          <p className="text-stone-500 mt-1 max-w-sm mx-auto text-sm">
            Создайте первый период приёмной кампании (например: 2026-2027 Приёмная кампания), чтобы приступить к регистрации абитуриентов.
          </p>
          <button
            onClick={() => setIsCreating(true)}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-rose-800 text-white rounded-xl text-sm font-medium hover:bg-rose-900 transition-colors"
          >
            <FolderPlus className="w-4 h-4" />
            Создать первую кампанию
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {campaigns.map(campaign => (
            <Link 
              key={campaign.id} 
              to={`/campaign/${campaign.id}`}
              className="group bg-white p-6 rounded-2xl border border-stone-200 shadow-xs hover:shadow-md hover:border-rose-300 transition-all flex flex-col relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-800 to-rose-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-rose-50 text-rose-800 rounded-xl group-hover:bg-rose-800 group-hover:text-white transition-colors">
                  <Calendar className="w-6 h-6" />
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setCampaignToDelete(campaign);
                      setIsDeleteModalOpen(true);
                    }}
                    className="p-2 text-stone-400 hover:text-rose-800 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                    title="Удалить приёмную кампанию"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <ChevronRight className="text-stone-300 group-hover:text-rose-700 transition-colors" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-stone-900 mb-1 group-hover:text-rose-900 transition-colors">
                {campaign.name}
              </h3>
              <p className="text-xs text-stone-500 mt-auto pt-4 border-t border-stone-100 flex items-center justify-between">
                <span>Дата создания:</span>
                <span className="font-medium text-stone-700">{displayRussianDate(campaign.createdAt)}</span>
              </p>
            </Link>
          ))}
        </div>
      )}

      {/* Delete Campaign Double Confirmation Modal */}
      <DeleteCampaignModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setCampaignToDelete(null);
        }}
        campaign={campaignToDelete}
      />
    </div>
  );
}
