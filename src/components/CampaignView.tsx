import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, doc, getDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Applicant, Campaign, ApplicantDocument } from '../types';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { logAction } from '../lib/logger';
import { DeleteCampaignModal } from './DeleteCampaignModal';
import { 
  Users, 
  Plus, 
  Search, 
  Loader2, 
  Award, 
  X, 
  MapPin, 
  School, 
  FileText, 
  Trash2, 
  User, 
  Shield, 
  Phone, 
  Briefcase, 
  Calendar, 
  CheckCircle2, 
  FolderOpen,
  Edit2,
  BookOpen,
  Download,
  ChevronDown,
  FileSpreadsheet,
  BarChart3,
  Clock,
  PhoneCall,
  Layers
} from 'lucide-react';
import { exportApplicantsToExcel, exportApplicantsToPDF } from '../utils/reportExporter';
import { ApplicantDocumentsModal } from './ApplicantDocumentsModal';
import { EditBenefitModal } from './EditBenefitModal';
import { EditCertificateModal } from './EditCertificateModal';
import { EditSpecialtyModal } from './EditSpecialtyModal';
import { DeleteApplicantModal } from './DeleteApplicantModal';
import { EditPersonalModal } from './EditPersonalModal';
import { EditAddressModal } from './EditAddressModal';
import { EditConsentsModal } from './EditConsentsModal';
import { ReportsModal } from './ReportsModal';
import { CommercialCallModal } from './CommercialCallModal';
import { displayRussianDate } from '../lib/validation';
import { cleanFirestoreData } from '../lib/utils';
import { toast } from '../utils/toast';
import { FileCheck2, Copy } from 'lucide-react';
import { 
  generateEnrollmentApp,
  generateDataProcessingConsent,
  generateParentalConsent,
  calculateAge
} from '../lib/documentGenerator';
import { formatSpecialtyDisplay } from '../lib/specialties';

export function CampaignView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [applicantToDelete, setApplicantToDelete] = useState<Applicant | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleteCampaignModalOpen, setIsDeleteCampaignModalOpen] = useState(false);

  // Docs registry and modal states for selected applicant
  const [isApplicantDocsModalOpen, setIsApplicantDocsModalOpen] = useState(false);
  const [isEditBenefitModalOpen, setIsEditBenefitModalOpen] = useState(false);
  const [isEditCertificateModalOpen, setIsEditCertificateModalOpen] = useState(false);
  const [isEditSpecialtyModalOpen, setIsEditSpecialtyModalOpen] = useState(false);
  const [isEditPersonalModalOpen, setIsEditPersonalModalOpen] = useState(false);
  const [isEditAddressModalOpen, setIsEditAddressModalOpen] = useState(false);
  const [isEditConsentsModalOpen, setIsEditConsentsModalOpen] = useState(false);
  const [isReportsModalOpen, setIsReportsModalOpen] = useState(false);
  const [isCommercialCallModalOpen, setIsCommercialCallModalOpen] = useState(false);
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);

  useEffect(() => {
    if (selectedApplicant) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedApplicant]);

  useEffect(() => {
    if (!id) return;
    
    // Fetch campaign details
    getDoc(doc(db, 'campaigns', id)).then((docSnap) => {
      if (docSnap.exists()) {
        setCampaign({ id: docSnap.id, ...docSnap.data() } as Campaign);
      }
    });

    // Real-time snapshot of applicants in campaign
    const q = query(
      collection(db, 'applicants'),
      where('campaignId', '==', id)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Applicant[];
      // Client-side sort by createdAt descending (avoids requiring a composite index in Firestore)
      data.sort((a, b) => {
        const timeA = typeof a.createdAt === 'number' ? a.createdAt : 0;
        const timeB = typeof b.createdAt === 'number' ? b.createdAt : 0;
        return timeB - timeA;
      });
      setApplicants(data);
      setLoading(false);
      
      // Update selected applicant if currently open using functional state
      setSelectedApplicant(prev => {
        if (!prev) return null;
        const updated = data.find(a => a.id === prev.id);
        return updated || prev;
      });
    }, (error) => {
      console.error('Snapshot error:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [id]);

  const handleOpenDeleteModal = (applicant: Applicant, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setApplicantToDelete(applicant);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDeleteApplicant = async (applicantId: string) => {
    setDeletingId(applicantId);
    try {
      const appToDelete = applicants.find(a => a.id === applicantId);
      await deleteDoc(doc(db, 'applicants', applicantId));
      await logAction(
        user?.username || 'nekpriem',
        'DELETE_APPLICANT',
        `Удалил личное дело абитуриента: ${appToDelete?.fullName || applicantId}`,
        { campaignId: id, applicantId }
      );
      if (selectedApplicant?.id === applicantId) {
        setSelectedApplicant(null);
      }
      toast.success(`Личное дело абитуриента ${appToDelete?.fullName || ''} успешно удалено`);
    } catch (err) {
      console.error('Error deleting applicant:', err);
      alert('Ошибка при удалении абитуриента из базы данных');
      throw err;
    } finally {
      setDeletingId(null);
    }
  };

  const handleUpdateApplicantDocs = async (updatedDocs: ApplicantDocument[]) => {
    if (!selectedApplicant) return;
    try {
      const payload: Partial<Applicant> = {
        documents: cleanFirestoreData(updatedDocs)
      };

      // Synchronize top-level fields from specific document updates
      const identityDoc = updatedDocs.find(d => d.category === 'identity');
      if (identityDoc) {
        if (identityDoc.details?.series) payload.passportSeries = identityDoc.details.series;
        if (identityDoc.documentNumber) payload.passportNumber = identityDoc.documentNumber;
        if (identityDoc.issueDate) payload.passportIssueDate = identityDoc.issueDate;
        if (identityDoc.issuedBy) payload.passportIssuedBy = identityDoc.issuedBy;
        if (identityDoc.details?.subdivisionCode) payload.passportSubdivisionCode = identityDoc.details.subdivisionCode;
        if (identityDoc.details?.snils) payload.snils = identityDoc.details.snils;
        if (identityDoc.details?.birthDate) payload.birthDate = identityDoc.details.birthDate;
        
        if (identityDoc.beneficiaryName) {
          const parts = identityDoc.beneficiaryName.trim().split(/\s+/);
          if (parts.length >= 2) {
            payload.lastName = parts[0];
            payload.firstName = parts[1];
            payload.middleName = parts.slice(2).join(' ');
            payload.fullName = identityDoc.beneficiaryName.trim();
          } else if (parts.length === 1) {
            payload.lastName = parts[0];
            payload.fullName = parts[0];
          }
        }
      }

      const educationDoc = updatedDocs.find(d => d.category === 'education');
      if (educationDoc) {
        if (educationDoc.type) payload.certificateType = educationDoc.type;
        if (educationDoc.documentNumber) payload.certificateNumber = educationDoc.documentNumber;
        if (educationDoc.issueDate) payload.issueDate = educationDoc.issueDate;
        const schoolVal = educationDoc.details?.school || educationDoc.issuedBy;
        if (schoolVal) payload.school = schoolVal;

        if (educationDoc.details?.averageScore !== undefined && !isNaN(educationDoc.details.averageScore)) {
          payload.averageScore = educationDoc.details.averageScore;
        }

        if (educationDoc.details?.grades) {
          payload.grades = educationDoc.details.grades;
        }

        if (educationDoc.details?.submissionType) {
          payload.educationDocumentSubmissionType = educationDoc.details.submissionType;
        }
      }

      const benefitDoc = updatedDocs.find(d => d.category === 'benefit');
      if (benefitDoc) {
        payload.hasBenefit = true;
        if (benefitDoc.details?.benefitCategory) payload.benefit = benefitDoc.details.benefitCategory;
        if (benefitDoc.details?.benefitEffect) payload.benefitEffect = benefitDoc.details.benefitEffect;
        if (benefitDoc.type) payload.benefitDocumentType = benefitDoc.type;
        if (benefitDoc.documentNumber) payload.benefitDocumentNumber = benefitDoc.documentNumber;
        if (benefitDoc.issueDate) payload.benefitDocumentIssueDate = benefitDoc.issueDate;
        if (benefitDoc.issuedBy) payload.benefitDocumentIssuedBy = benefitDoc.issuedBy;
        if (benefitDoc.isVerified !== undefined) payload.documentsVerified = benefitDoc.isVerified;
        payload.benefitDocumentId = benefitDoc.id;
      } else {
        payload.hasBenefit = false;
        payload.benefit = '';
        payload.benefitEffect = '';
        payload.benefitDocumentId = '';
        payload.benefitDocumentType = '';
        payload.benefitDocumentNumber = '';
        payload.benefitDocumentIssuedBy = '';
        payload.benefitDocumentIssueDate = '';
        payload.documentsVerified = false;
      }

      const cleanedPayload = cleanFirestoreData(payload);
      const targetId = selectedApplicant.id;
      setApplicants(prev => prev.map(a => a.id === targetId ? { ...a, ...cleanedPayload } : a));
      setSelectedApplicant(prev => prev && prev.id === targetId ? { ...prev, ...cleanedPayload } : prev);
      await updateDoc(doc(db, 'applicants', targetId), cleanedPayload as any);
      await logAction(
        user?.username || 'nekpriem',
        'UPDATE_APPLICANT',
        `Обновил реестр документов / паспортные данные абитуриента: ${payload.fullName || selectedApplicant.fullName}`,
        { campaignId: id, applicantId: targetId }
      );
    } catch (e) {
      console.error('Error updating applicant documents:', e);
      alert('Ошибка при сохранении изменений в реестре документов');
    }
  };

  const handleSaveBenefit = async (updatedData: Partial<Applicant>, updatedDocs?: ApplicantDocument[]) => {
    if (!selectedApplicant) return;
    const targetId = selectedApplicant.id;
    try {
      const payload: any = { ...updatedData };
      if (updatedDocs) {
        payload.documents = cleanFirestoreData(updatedDocs);
      }
      const cleanedPayload = cleanFirestoreData(payload);
      setApplicants(prev => prev.map(a => a.id === targetId ? { ...a, ...cleanedPayload } : a));
      setSelectedApplicant(prev => prev && prev.id === targetId ? { ...prev, ...cleanedPayload } : prev);
      await updateDoc(doc(db, 'applicants', targetId), cleanedPayload);
    } catch (e) {
      console.error('Error updating applicant benefit:', e);
      throw e;
    }
  };

  const handleSaveCertificate = async (updatedData: Partial<Applicant>, updatedDocs?: ApplicantDocument[]) => {
    if (!selectedApplicant) return;
    const targetId = selectedApplicant.id;
    try {
      const payload: any = { ...updatedData };
      if (updatedDocs) {
        payload.documents = cleanFirestoreData(updatedDocs);
      }
      const cleanedPayload = cleanFirestoreData(payload);
      setApplicants(prev => prev.map(a => a.id === targetId ? { ...a, ...cleanedPayload } : a));
      setSelectedApplicant(prev => prev && prev.id === targetId ? { ...prev, ...cleanedPayload } : prev);
      await updateDoc(doc(db, 'applicants', targetId), cleanedPayload);
    } catch (e) {
      console.error('Error updating applicant certificate:', e);
      throw e;
    }
  };

  const handleSaveSpecialty = async (updatedFields: Partial<Applicant>) => {
    if (!selectedApplicant) return;
    const targetId = selectedApplicant.id;
    try {
      const cleanedPayload = cleanFirestoreData(updatedFields);
      setApplicants(prev => prev.map(a => a.id === targetId ? { ...a, ...cleanedPayload } : a));
      setSelectedApplicant(prev => prev && prev.id === targetId ? { ...prev, ...cleanedPayload } : prev);
      await updateDoc(doc(db, 'applicants', targetId), cleanedPayload);
    } catch (e) {
      console.error('Error updating applicant specialty:', e);
      throw e;
    }
  };

  const handleSavePersonal = async (updatedFields: Partial<Applicant>) => {
    if (!selectedApplicant) return;
    const targetId = selectedApplicant.id;
    try {
      let currentDocs = selectedApplicant.documents || [];
      const identityIndex = currentDocs.findIndex(d => d.category === 'identity');
      const identityDocData: ApplicantDocument = {
        id: identityIndex >= 0 ? currentDocs[identityIndex].id : `doc_${Date.now()}_id`,
        category: 'identity',
        title: 'Паспорт гражданина РФ',
        type: 'Паспорт РФ',
        documentNumber: updatedFields.passportNumber || selectedApplicant.passportNumber || '',
        issueDate: updatedFields.passportIssueDate || selectedApplicant.passportIssueDate || '',
        issuedBy: updatedFields.passportIssuedBy || selectedApplicant.passportIssuedBy || '',
        beneficiaryName: updatedFields.fullName || selectedApplicant.fullName || '',
        isVerified: true,
        createdAt: identityIndex >= 0 ? currentDocs[identityIndex].createdAt : Date.now(),
        details: {
          series: updatedFields.passportSeries || selectedApplicant.passportSeries || '',
          subdivisionCode: updatedFields.passportSubdivisionCode || selectedApplicant.passportSubdivisionCode || '',
          snils: updatedFields.snils || selectedApplicant.snils || '',
          birthDate: updatedFields.birthDate || selectedApplicant.birthDate || '',
        }
      };

      if (identityIndex >= 0) {
        currentDocs = currentDocs.map((d, i) => i === identityIndex ? identityDocData : d);
      } else {
        currentDocs = [...currentDocs, identityDocData];
      }

      const payload = {
        ...updatedFields,
        documents: cleanFirestoreData(currentDocs)
      };

      const cleanedPayload = cleanFirestoreData(payload);
      setApplicants(prev => prev.map(a => a.id === targetId ? { ...a, ...cleanedPayload } : a));
      setSelectedApplicant(prev => prev && prev.id === targetId ? { ...prev, ...cleanedPayload } : prev);
      await updateDoc(doc(db, 'applicants', targetId), cleanedPayload);
      await logAction(
        user?.username || 'nekpriem',
        'UPDATE_APPLICANT',
        `Обновил персональные данные и ФИО абитуриента: ${updatedFields.fullName || selectedApplicant.fullName}`,
        { campaignId: id, applicantId: targetId }
      );
    } catch (e) {
      console.error('Error updating applicant personal data:', e);
      throw e;
    }
  };

  const handleSaveAddress = async (updatedFields: Partial<Applicant>) => {
    if (!selectedApplicant) return;
    const targetId = selectedApplicant.id;
    try {
      const cleanedPayload = cleanFirestoreData(updatedFields);
      setApplicants(prev => prev.map(a => a.id === targetId ? { ...a, ...cleanedPayload } : a));
      setSelectedApplicant(prev => prev && prev.id === targetId ? { ...prev, ...cleanedPayload } : prev);
      await updateDoc(doc(db, 'applicants', targetId), cleanedPayload);
      await logAction(
        user?.username || 'nekpriem',
        'UPDATE_APPLICANT',
        `Обновил адресные данные абитуриента: ${selectedApplicant.fullName}`,
        { campaignId: id, applicantId: targetId }
      );
    } catch (e) {
      console.error('Error updating applicant address:', e);
      throw e;
    }
  };

  const handleSaveConsents = async (updatedFields: Partial<Applicant>) => {
    if (!selectedApplicant) return;
    const targetId = selectedApplicant.id;
    try {
      const cleanedPayload = cleanFirestoreData(updatedFields);
      setApplicants(prev => prev.map(a => a.id === targetId ? { ...a, ...cleanedPayload } : a));
      setSelectedApplicant(prev => prev && prev.id === targetId ? { ...prev, ...cleanedPayload } : prev);
      await updateDoc(doc(db, 'applicants', targetId), cleanedPayload);
      await logAction(
        user?.username || 'nekpriem',
        'UPDATE_APPLICANT',
        `Обновил статусы сдачи согласий (152-ФЗ и согласие родителя) абитуриента: ${selectedApplicant.fullName}`,
        { campaignId: id, applicantId: targetId }
      );
      toast.success('Статусы согласий и заявлений успешно обновлены');
    } catch (e) {
      console.error('Error updating applicant consents:', e);
      toast.error('Не удалось обновить статусы согласий');
      throw e;
    }
  };

  const filteredApplicants = applicants.filter(a => {
    const q = searchQuery.toLowerCase();
    return (
      (a.fullName && a.fullName.toLowerCase().includes(q)) ||
      (a.lastName && a.lastName.toLowerCase().includes(q)) ||
      (a.phone && a.phone.toLowerCase().includes(q)) ||
      (a.locality && a.locality.toLowerCase().includes(q)) ||
      (a.snils && a.snils.toLowerCase().includes(q)) ||
      (a.benefit && a.benefit.toLowerCase().includes(q)) ||
      (a.specialty && a.specialty.toLowerCase().includes(q)) ||
      (a.specialtyName && a.specialtyName.toLowerCase().includes(q))
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-rose-800" />
      </div>
    );
  }

  // Synthesize documents list if not explicitly stored
  const currentApplicantDocs: ApplicantDocument[] = selectedApplicant?.documents || [
    ...(selectedApplicant?.passportNumber ? [{
      id: 'doc_identity_passport',
      category: 'identity' as const,
      title: 'Документ, подтверждающий личность',
      type: 'Паспорт гражданина РФ',
      documentNumber: selectedApplicant.passportNumber,
      issueDate: selectedApplicant.passportIssueDate || '',
      issuedBy: selectedApplicant.passportIssuedBy || selectedApplicant.passport || '',
      beneficiaryName: selectedApplicant.fullName,
      details: {
        series: selectedApplicant.passportSeries,
        subdivisionCode: selectedApplicant.passportSubdivisionCode,
        snils: selectedApplicant.snils,
        birthDate: selectedApplicant.birthDate,
      },
      isVerified: true,
      createdAt: selectedApplicant.createdAt || Date.now(),
    }] : []),
    ...(selectedApplicant?.certificateNumber ? [{
      id: 'doc_education_certificate',
      category: 'education' as const,
      title: 'Документ об образовании',
      type: selectedApplicant.certificateType || 'Аттестат',
      documentNumber: selectedApplicant.certificateNumber,
      issueDate: selectedApplicant.issueDate || '',
      issuedBy: selectedApplicant.school || '',
      beneficiaryName: selectedApplicant.fullName,
      details: {
        school: selectedApplicant.school,
        averageScore: selectedApplicant.averageScore,
        grades: selectedApplicant.grades,
        submissionType: selectedApplicant.educationDocumentSubmissionType || 'original',
      },
      isVerified: true,
      createdAt: selectedApplicant.createdAt || Date.now(),
    }] : []),
    ...(selectedApplicant?.benefitDocumentNumber ? [{
      id: 'doc_benefit_main',
      category: 'benefit' as const,
      title: `Документ: ${selectedApplicant.benefit}`,
      type: selectedApplicant.benefitDocumentType || 'Справка',
      documentNumber: selectedApplicant.benefitDocumentNumber,
      issueDate: selectedApplicant.benefitDocumentIssueDate || '',
      issuedBy: selectedApplicant.benefitDocumentIssuedBy || '',
      beneficiaryName: selectedApplicant.fullName,
      details: {
        benefitCategory: selectedApplicant.benefit,
        benefitEffect: selectedApplicant.benefitEffect,
      },
      isVerified: selectedApplicant.documentsVerified,
      createdAt: selectedApplicant.createdAt || Date.now(),
    }] : [])
  ];

  return (
    <div className="space-y-6">
      {/* Top Bar with Campaign info */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-stone-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-rose-800 uppercase tracking-wider mb-1">
            <Link to="/" className="hover:underline">Кампании</Link>
            <span>/</span>
            <span className="text-stone-700">{campaign?.name}</span>
          </div>
          <h2 className="text-2xl font-bold text-stone-900 tracking-tight">Журнал приёма абитуриентов</h2>
          <p className="text-stone-500 text-sm mt-0.5">
            Всего подано заявлений: <span className="font-bold text-rose-950">{applicants.length}</span>
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Download Report Dropdown Menu */}
          <div className="relative">
            <button
              onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
              className="bg-stone-900 hover:bg-stone-800 text-white px-4 py-2.5 rounded-xl font-semibold transition-all flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <Download className="w-4 h-4 text-rose-400" />
              <span>Скачать отчёт</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${isExportDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isExportDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setIsExportDropdownOpen(false)} 
                />
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-stone-200 py-2 z-20 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-4 py-2 border-b border-stone-100">
                    <p className="text-xs font-bold text-stone-900">Формирование отчёта</p>
                    <p className="text-[11px] text-stone-500">Заявления ({applicants.length} шт.)</p>
                  </div>

                  <button
                    onClick={() => {
                      setIsExportDropdownOpen(false);
                      exportApplicantsToExcel(campaign?.name || 'Приёмная кампания', applicants);
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs font-semibold text-stone-800 hover:bg-stone-50 hover:text-emerald-900 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <div>
                      <div className="font-bold text-emerald-950">Скачать в Excel (.xlsx)</div>
                      <div className="text-[10px] text-stone-500 font-normal">С цветными шапками и авто-шириной</div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setIsExportDropdownOpen(false);
                      exportApplicantsToPDF(campaign?.name || 'Приёмная кампания', applicants);
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs font-semibold text-stone-800 hover:bg-stone-50 hover:text-rose-900 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-rose-800" />
                    <div>
                      <div>Скачать отчёт в PDF</div>
                      <div className="text-[10px] text-stone-400 font-normal">Для печати и сохранения бланка</div>
                    </div>
                  </button>

                  <div className="my-1 border-t border-stone-100" />

                  <button
                    onClick={() => {
                      setIsExportDropdownOpen(false);
                      setIsReportsModalOpen(true);
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-50 hover:text-stone-900 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <BarChart3 className="w-4 h-4 text-stone-500" />
                    <span>Аналитика и предпросмотр</span>
                  </button>
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsCommercialCallModalOpen(true)}
            className="bg-emerald-800 hover:bg-emerald-900 text-white px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 shadow-xs cursor-pointer"
            title="Открыть ведомость обзвона и управления коммерческим набором"
          >
            <PhoneCall className="w-4 h-4 text-emerald-300" />
            <span>Обзвон платников и резерва</span>
          </button>

          <Link 
            to={`/campaign/${id}/add`}
            className="bg-rose-900 hover:bg-rose-950 active:bg-rose-950 text-white px-4 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Добавить абитуриента
          </Link>

          <button
            type="button"
            onClick={() => setIsDeleteCampaignModalOpen(true)}
            className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-200 rounded-xl font-medium transition-colors flex items-center gap-2 cursor-pointer"
            title="Удалить приёмную кампанию целиком"
          >
            <Trash2 className="w-4 h-4 text-rose-800" />
            <span className="hidden sm:inline">Удалить кампанию</span>
          </button>
        </div>
      </div>

      {/* Main Table / Search Card */}
      <div className="bg-white rounded-2xl shadow-xs border border-stone-200 overflow-hidden flex flex-col min-h-[500px]">
        <div className="p-4 border-b border-stone-200 bg-stone-50/70 flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text"
              placeholder="Поиск по ФИО, телефону, СНИЛС, городу или льготе..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-4 py-2 border border-stone-300 rounded-xl leading-5 bg-white placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-rose-800 text-sm transition-all"
            />
          </div>
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="text-xs text-rose-800 hover:text-rose-950 font-medium underline cursor-pointer"
            >
              Сбросить поиск
            </button>
          )}
        </div>
        
        <div className="overflow-x-auto flex-1">
          {applicants.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-20 text-center px-4">
               <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mb-3 text-rose-800">
                 <Users className="w-8 h-8" />
               </div>
               <h3 className="text-lg font-bold text-stone-900">Список абитуриентов пуст</h3>
               <p className="text-stone-500 mt-1 max-w-sm text-sm">
                 В этой кампании ещё нет зарегистрированных заявлений. Нажмите кнопку «Добавить абитуриента», чтобы внести первого абитуриента.
               </p>
               <Link
                 to={`/campaign/${id}/add`}
                 className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-rose-900 text-white text-sm font-medium rounded-xl hover:bg-rose-950 transition-colors shadow-sm"
               >
                 <Plus className="w-4 h-4" />
                 Зарегистрировать абитуриента
               </Link>
             </div>
          ) : filteredApplicants.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
               <p className="text-stone-500 text-sm">По запросу «{searchQuery}» ничего не найдено.</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-stone-200">
              <thead className="bg-stone-50">
                <tr>
                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-stone-700 uppercase tracking-wider">ФИО и контакты</th>
                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-stone-700 uppercase tracking-wider">Специальность</th>
                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-stone-700 uppercase tracking-wider">Ср. балл</th>
                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-stone-700 uppercase tracking-wider">Оценки (3/4/5)</th>
                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-stone-700 uppercase tracking-wider">Аттестат</th>
                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-stone-700 uppercase tracking-wider">Документы</th>
                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-stone-700 uppercase tracking-wider">Льгота / Квота</th>
                  <th scope="col" className="px-6 py-3.5 text-right text-xs font-bold text-stone-700 uppercase tracking-wider">Действия</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-stone-100">
                {filteredApplicants.map((applicant) => (
                  <tr 
                    key={applicant.id} 
                    onClick={() => setSelectedApplicant(applicant)}
                    className="hover:bg-rose-50/40 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 flex-shrink-0 rounded-xl bg-rose-100/90 flex items-center justify-center text-rose-900 font-bold text-sm">
                          {applicant.lastName ? applicant.lastName.charAt(0) : applicant.fullName.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-stone-900 flex items-center gap-2">
                            <span>{applicant.fullName}</span>
                            <span className="text-[11px] font-mono font-semibold px-2 py-0.5 bg-rose-50 text-rose-900 rounded-md border border-rose-200">
                              № {applicant.applicationNumber || String(applicant.createdAt || '').slice(-4) || '0001'}
                            </span>
                          </div>
                          <div className="text-xs text-stone-500 flex flex-wrap items-center gap-2 mt-0.5">
                            {applicant.phone && (
                              <span className="font-mono text-stone-700 font-medium">{applicant.phone}</span>
                            )}
                            {applicant.birthDate && (
                              <span>• {displayRussianDate(applicant.birthDate)} ({applicant.gender || '—'})</span>
                            )}
                            {applicant.locality && (
                              <span className="flex items-center gap-0.5 text-stone-600 font-medium">
                                • {applicant.locality}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      {applicant.specialty ? (
                        <div className="space-y-1 max-w-[220px]">
                          <div className="text-xs font-bold text-stone-900 truncate" title={applicant.specialty}>
                            {formatSpecialtyDisplay(applicant.specialty, applicant.specialtyName)}
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded border ${
                              applicant.fundingType === 'Бюджет' || applicant.specialty.includes('Бюджет')
                                ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                : 'bg-blue-100 text-blue-900 border-blue-300'
                            }`}>
                              {applicant.fundingType || (applicant.specialty.includes('Бюджет') ? 'Бюджет' : 'Платно')}
                            </span>
                            <span className="text-[10px] font-medium text-stone-500">
                              {applicant.programType === 'ППКРС' ? 'ППКРС' : 'ППССЗ'}
                            </span>
                          </div>
                          {applicant.alternativeSpecialties && applicant.alternativeSpecialties.length > 0 && (
                            <div className="text-[10px] text-stone-500 flex items-center gap-1 truncate" title={`Запасные специальности: ${applicant.alternativeSpecialties.join(', ')}`}>
                              <Layers className="w-3 h-3 text-stone-400 shrink-0" />
                              <span className="truncate">Запас: {applicant.alternativeSpecialties.join('; ')}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-stone-400">Не указана</span>
                      )}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-sm font-black bg-rose-50 text-rose-900 border border-rose-200">
                        {applicant.averageScore ? applicant.averageScore.toFixed(3) : '0.000'}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-xs font-semibold flex gap-1.5">
                        <span className="text-stone-800 bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200">3: {applicant.grades?.threes ?? 0}</span>
                        <span className="text-stone-800 bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200">4: {applicant.grades?.fours ?? 0}</span>
                        <span className="text-rose-900 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 font-bold">5: {applicant.grades?.fives ?? 0}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-xs font-semibold text-stone-800">{applicant.certificateType}</div>
                      <div className="text-[11px] text-stone-500 font-mono">№ {applicant.certificateNumber}</div>
                      <div className="mt-1">
                        {applicant.educationDocumentSubmissionType === 'copy' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300" title="Копия аттестата (не подлежит зачислению)">
                            <Copy className="w-3 h-3 text-amber-700" />
                            Копия
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300" title="Оригинал аттестата в личном деле">
                            <FileCheck2 className="w-3 h-3 text-emerald-700" />
                            Оригинал
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-stone-100 text-stone-800 border border-stone-200">
                          <FileText className="w-3 h-3 text-stone-600" />
                          {applicant.documents?.length || (applicant.passportNumber ? 2 : 1)} док.
                        </span>
                        <div className="flex items-center gap-1 flex-wrap">
                          {applicant.dataProcessingConsentSigned ? (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300" title="Согласие на обработку персональных данных (152-ФЗ) сдано">
                              <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                              ПД
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300" title="Согласие на обработку персональных данных (152-ФЗ) НЕ сдано">
                              <Clock className="w-3 h-3 text-amber-700" />
                              ПД?
                            </span>
                          )}

                          {(() => {
                            const age = calculateAge(applicant.birthDate);
                            if (age > 0 && age < 18) {
                              return applicant.parentalConsentSigned ? (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300" title="Согласие родителя сдано">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                                  Род.
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300" title="Согласие родителя НЕ сдано">
                                  <Clock className="w-3 h-3 text-amber-700" />
                                  Род.?
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      {applicant.benefit ? (
                        <div className="space-y-1">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200">
                            <Award className="w-3 h-3 mr-1 text-amber-700" />
                            {applicant.benefit}
                          </span>
                          {applicant.documentsVerified ? (
                            <div className="text-[11px] text-emerald-700 flex items-center gap-1 font-medium">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span>{applicant.benefitEffect || 'Подтверждено'}</span>
                            </div>
                          ) : (
                            <div className="text-[11px] text-stone-500 font-normal">
                              {applicant.benefitEffect}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-stone-400 font-normal">Без льгот</span>
                      )}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                      <button
                        type="button"
                        onClick={(e) => handleOpenDeleteModal(applicant, e)}
                        disabled={deletingId === applicant.id}
                        className="text-stone-400 hover:text-rose-700 p-2 rounded-xl hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Удалить абитуриента"
                      >
                        {deletingId === applicant.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-rose-700" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal with Complete Full Applicant Dossier */}
      {selectedApplicant && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white max-w-3xl w-full rounded-2xl shadow-2xl border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col overscroll-contain">
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-rose-950 via-rose-900 to-rose-800 text-white flex justify-between items-start">
              <div>
                <span className="text-[11px] font-bold bg-white/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Личное дело абитуриента • Заявление № {selectedApplicant.applicationNumber || String(selectedApplicant.createdAt || '').slice(-4) || '0001'}
                </span>
                <h3 className="text-xl font-bold mt-1.5 text-white">{selectedApplicant.fullName}</h3>
                <p className="text-rose-200 text-xs mt-0.5">
                  Подано: {displayRussianDate(selectedApplicant.createdAt)} • СНИЛС: {selectedApplicant.snils || 'Не указан'} {selectedApplicant.phone ? `• Тел: ${selectedApplicant.phone}` : ''}
                </p>
              </div>
              <button 
                onClick={() => setSelectedApplicant(null)}
                className="text-white/80 hover:text-white p-1.5 rounded-xl hover:bg-white/15 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Action Toolbar */}
            <div className="px-6 py-2.5 bg-stone-100 border-b border-stone-200 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-stone-600">Быстрые действия:</span>
                <button
                  type="button"
                  onClick={() => generateEnrollmentApp(selectedApplicant)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-700 hover:bg-rose-800 text-white rounded-lg font-bold transition-colors cursor-pointer shadow-2xs"
                  title="Скачать заявление на зачисление (enrollApp.docx)"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Скачать заявление (enrollApp.docx)
                </button>

                <button
                  type="button"
                  onClick={() => setIsEditConsentsModalOpen(true)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer border ${
                    selectedApplicant.dataProcessingConsentSigned
                      ? 'bg-emerald-50 text-emerald-950 border-emerald-300 hover:bg-emerald-100'
                      : 'bg-amber-50 text-amber-950 border-amber-300 hover:bg-amber-100'
                  }`}
                  title="Управление согласиями 152-ФЗ и родителя"
                >
                  <Shield className="w-3.5 h-3.5 text-stone-700" />
                  <span>Согласие 152-ФЗ: {selectedApplicant.dataProcessingConsentSigned ? 'Сдано' : 'Ожидает'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditSpecialtyModalOpen(true)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer border ${
                    selectedApplicant.specialty
                      ? 'bg-rose-50 text-rose-950 border-rose-300 hover:bg-rose-100'
                      : 'bg-white text-stone-700 border-stone-300 hover:border-rose-300 hover:text-rose-900'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5 text-rose-800" />
                  {selectedApplicant.specialty ? `Специальность: ${formatSpecialtyDisplay(selectedApplicant.specialty, selectedApplicant.specialtyName)}` : '+ Выбрать специальность'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsApplicantDocsModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-stone-300 hover:border-rose-300 hover:text-rose-900 rounded-lg text-stone-700 font-medium transition-colors cursor-pointer"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-rose-800" />
                  Реестр документов ({currentApplicantDocs.length})
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditBenefitModalOpen(true)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer border ${
                    selectedApplicant.benefit
                      ? 'bg-amber-50 text-amber-950 border-amber-300 hover:bg-amber-100'
                      : 'bg-white text-stone-700 border-stone-300 hover:border-amber-400 hover:text-amber-900'
                  }`}
                >
                  <Award className="w-3.5 h-3.5 text-amber-700" />
                  {selectedApplicant.benefit ? `Льгота: ${selectedApplicant.benefit}` : '+ Добавить льготу'}
                </button>
              </div>

              {selectedApplicant.benefit && (
                <span className="text-[11px] text-emerald-800 font-semibold bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Льготная категория активна
                </span>
              )}
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1 text-stone-800">
              
              {/* 1. Выбранная специальность / программа обучения */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-rose-900 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-rose-800" />
                    Выбранная образовательная программа
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsEditSpecialtyModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-950 border border-rose-300 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-rose-800" />
                    Изменить специальность
                  </button>
                </div>
                <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 text-sm space-y-2">
                  {selectedApplicant.specialty ? (
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="text-base font-bold text-stone-900">
                          {formatSpecialtyDisplay(selectedApplicant.specialty, selectedApplicant.specialtyName)}
                        </span>
                        <span className={`text-xs font-extrabold uppercase px-2.5 py-0.5 rounded-md border ${
                          selectedApplicant.fundingType === 'Бюджет' || selectedApplicant.specialty.includes('Бюджет')
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                            : 'bg-blue-100 text-blue-900 border-blue-300'
                        }`}>
                          {selectedApplicant.fundingType || (selectedApplicant.specialty.includes('Бюджет') ? 'Бюджет' : 'Платно')}
                        </span>
                        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-md border ${
                          selectedApplicant.programType === 'ППКРС'
                            ? 'bg-purple-100 text-purple-950 border-purple-300'
                            : 'bg-stone-100 text-stone-700 border-stone-200'
                        }`}>
                          {selectedApplicant.programType === 'ППКРС' ? '★ Программа рабочих (ППКРС)' : 'Специальность (ППССЗ)'}
                        </span>
                      </div>
                      {selectedApplicant.programType === 'ППКРС' && (
                        <p className="text-xs text-purple-900 font-medium">
                          * Электромонтер по ремонту и обслуживанию электрооборудования относится к программе подготовки квалифицированных рабочих, служащих (ППКРС).
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-stone-500 text-xs">Специальность ещё не выбрана</span>
                      <button
                        type="button"
                        onClick={() => setIsEditSpecialtyModalOpen(true)}
                        className="px-3 py-1 bg-rose-900 text-white rounded-lg text-xs font-bold hover:bg-rose-950 transition-colors"
                      >
                        + Выбрать
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* 2. Персональные данные & Паспорт & Телефон */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-rose-900 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-rose-800" />
                    Персональные и контактные данные
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsEditPersonalModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-950 border border-rose-300 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-rose-800" />
                    Изменить данные / ФИО
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm bg-stone-50 p-4 rounded-xl border border-stone-200">
                  <div>
                    <span className="text-xs text-stone-500 block">Фамилия:</span>
                    <span className="font-bold text-stone-900">{selectedApplicant.lastName || selectedApplicant.fullName.split(' ')[0]}</span>
                  </div>
                  <div>
                    <span className="text-xs text-stone-500 block">Имя:</span>
                    <span className="font-bold text-stone-900">{selectedApplicant.firstName || selectedApplicant.fullName.split(' ')[1]}</span>
                  </div>
                  <div>
                    <span className="text-xs text-stone-500 block">Отчество:</span>
                    <span className="font-bold text-stone-900">{selectedApplicant.middleName || selectedApplicant.fullName.split(' ')[2] || '—'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-stone-500 block">Телефон:</span>
                    <span className="font-mono font-bold text-stone-900">{selectedApplicant.phone || '—'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-stone-500 block">Дата рождения:</span>
                    <span className="font-medium text-stone-900">{displayRussianDate(selectedApplicant.birthDate)}</span>
                  </div>
                  <div>
                    <span className="text-xs text-stone-500 block">Пол:</span>
                    <span className="font-medium text-stone-900">{selectedApplicant.gender || '—'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-stone-500 block">СНИЛС:</span>
                    <span className="font-mono font-medium text-stone-900">{selectedApplicant.snils || '—'}</span>
                  </div>

                  {/* Паспортная строка */}
                  <div className="sm:col-span-3 pt-3 border-t border-stone-200/80 grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <span className="text-xs text-stone-500 block">Серия паспорта:</span>
                      <span className="font-mono font-bold text-stone-900">{selectedApplicant.passportSeries || '—'}</span>
                    </div>
                    <div>
                      <span className="text-xs text-stone-500 block">Номер паспорта:</span>
                      <span className="font-mono font-bold text-stone-900">{selectedApplicant.passportNumber || '—'}</span>
                    </div>
                    <div>
                      <span className="text-xs text-stone-500 block">Код подразделения:</span>
                      <span className="font-mono font-medium text-stone-900">{selectedApplicant.passportSubdivisionCode || '—'}</span>
                    </div>
                    <div>
                      <span className="text-xs text-stone-500 block">Дата выдачи паспорта:</span>
                      <span className="font-medium text-stone-900">{displayRussianDate(selectedApplicant.passportIssueDate)}</span>
                    </div>
                    <div className="sm:col-span-4">
                      <span className="text-xs text-stone-500 block">Кем выдан паспорт:</span>
                      <span className="font-medium text-stone-900">{selectedApplicant.passportIssuedBy || selectedApplicant.passport}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Индивидуальный реестр документов абитуриента */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-rose-900 flex items-center gap-1.5">
                    <FolderOpen className="w-4 h-4 text-rose-800" />
                    Индивидуальный реестр документов абитуриента
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsApplicantDocsModalOpen(true)}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-rose-50 text-rose-900 border border-rose-200 rounded-lg text-xs font-bold hover:bg-rose-100 transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-rose-800" />
                    Управление документами ({currentApplicantDocs.length})
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {currentApplicantDocs.map((docItem) => (
                    <div
                      key={docItem.id}
                      className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 text-xs space-y-1.5 hover:border-rose-300 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className="font-bold text-stone-900 truncate">
                          {docItem.title}
                        </span>
                        {docItem.isVerified && (
                          <span title="Подтверждён" className="inline-flex">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          </span>
                        )}
                      </div>
                      <div className="text-stone-600">
                        <span className="font-semibold text-stone-800">{docItem.type}:</span> {docItem.details?.series ? `${docItem.details.series} ` : ''}{docItem.documentNumber}
                      </div>
                      <div className="text-stone-500 flex justify-between pt-1 border-t border-stone-200/60">
                        <span>Дата: {displayRussianDate(docItem.issueDate)}</span>
                        <span className="truncate max-w-[140px]" title={docItem.issuedBy}>Кем: {docItem.issuedBy}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Адрес и проживание */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-rose-900 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-rose-800" />
                    Адресные сведения
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsEditAddressModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-950 border border-rose-300 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-rose-800" />
                    Изменить адрес
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm bg-stone-50 p-4 rounded-xl border border-stone-200">
                  <div className="sm:col-span-2">
                    <span className="text-xs text-stone-500 block">Фактическое место жительства:</span>
                    <span className="font-medium text-stone-900">{selectedApplicant.residence}</span>
                  </div>
                  <div>
                    <span className="text-xs text-stone-500 block">Населённый пункт:</span>
                    <span className="font-medium text-stone-900">{selectedApplicant.locality || '—'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-stone-500 block">Место прописки:</span>
                    <span className="font-medium text-stone-900">
                      {selectedApplicant.matchesResidence ? 'Совпадает с фактическим адресом' : selectedApplicant.registration}
                    </span>
                  </div>
                </div>
              </div>

              {/* 4. Образование и аттестат */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-rose-900 flex items-center gap-1.5">
                    <School className="w-4 h-4 text-rose-800" />
                    Данные аттестата и средний балл
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsEditCertificateModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border border-emerald-300 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-emerald-800" />
                    Редактировать аттестат и оценки
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm bg-stone-50 p-4 rounded-xl border border-stone-200">
                  <div className="sm:col-span-2">
                    <span className="text-xs text-stone-500 block">Учебное заведение:</span>
                    <span className="font-medium text-stone-900">{selectedApplicant.school}</span>
                  </div>
                  <div>
                    <span className="text-xs text-stone-500 block">Статус сдачи:</span>
                    {selectedApplicant.educationDocumentSubmissionType === 'copy' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-100 text-amber-950 border border-amber-300 mt-0.5">
                        <Copy className="w-3.5 h-3.5 text-amber-700" />
                        Копия аттестата (не подлежит зачислению)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-100 text-emerald-950 border border-emerald-300 mt-0.5">
                        <FileCheck2 className="w-3.5 h-3.5 text-emerald-700" />
                        Оригинал аттестата в личном деле
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-xs text-stone-500 block">Вид документа:</span>
                    <span className="font-medium text-stone-900">{selectedApplicant.certificateType}</span>
                  </div>
                  <div>
                    <span className="text-xs text-stone-500 block">Номер аттестата:</span>
                    <span className="font-mono font-medium text-stone-900">{selectedApplicant.certificateNumber}</span>
                  </div>
                  <div>
                    <span className="text-xs text-stone-500 block">Дата выдачи:</span>
                    <span className="font-medium text-stone-900">{displayRussianDate(selectedApplicant.issueDate)}</span>
                  </div>

                  <div className="sm:col-span-3 pt-3 border-t border-stone-200/80 flex flex-wrap items-center justify-between gap-4 bg-white p-3 rounded-lg border border-rose-100">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-stone-600">Оценки в аттестате:</span>
                      <span className="text-xs font-semibold text-stone-800 bg-stone-100 px-2 py-0.5 rounded">Тройки: {selectedApplicant.grades?.threes ?? 0}</span>
                      <span className="text-xs font-semibold text-stone-800 bg-stone-100 px-2 py-0.5 rounded">Четвёрки: {selectedApplicant.grades?.fours ?? 0}</span>
                      <span className="text-xs font-bold text-rose-900 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">Пятёрки: {selectedApplicant.grades?.fives ?? 0}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-stone-500 font-medium">Средний балл:</span>
                      <span className="text-xl font-black text-rose-900 font-mono">{selectedApplicant.averageScore.toFixed(3)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 5. Родственники */}
              {selectedApplicant.relatives && selectedApplicant.relatives.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-rose-900 mb-2.5 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-rose-800" />
                    Сведения о родителях и законных представителях
                  </h4>
                  <div className="space-y-2.5">
                    {selectedApplicant.relatives.map((rel, idx) => (
                      <div key={idx} className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 text-sm grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div>
                          <span className="text-xs text-stone-500 block">Статус:</span>
                          <span className="font-bold text-rose-950">{rel.relation}</span>
                        </div>
                        <div>
                          <span className="text-xs text-stone-500 block">ФИО:</span>
                          <span className="font-medium text-stone-900">{rel.fullName || '—'}</span>
                        </div>
                        <div>
                          <span className="text-xs text-stone-500 block">Телефон:</span>
                          <span className="font-mono text-stone-900">{rel.phone || '—'}</span>
                        </div>
                        {rel.workplace && (
                          <div className="sm:col-span-3 text-xs text-stone-600 pt-1 border-t border-stone-200/60">
                            Место работы: <span className="font-medium text-stone-800">{rel.workplace}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 6. Воинский учёт */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-900 mb-2.5 flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-rose-800" />
                  Сведения о воинском учёте
                </h4>
                <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 text-sm">
                  {selectedApplicant.militaryRecord?.isRegistered ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <span className="text-xs text-stone-500 block">Отношение к воинской обязанности:</span>
                        <span className="font-medium text-stone-900">{selectedApplicant.militaryRecord.status}</span>
                      </div>
                      <div>
                        <span className="text-xs text-stone-500 block">Категория годности:</span>
                        <span className="font-bold text-rose-900">Категория {selectedApplicant.militaryRecord.fitnessCategory}</span>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-xs text-stone-500 block">Военный комиссариат (военкомат):</span>
                        <span className="font-medium text-stone-900">{selectedApplicant.militaryRecord.commissariat || 'Не указан'}</span>
                      </div>
                      <div>
                        <span className="text-xs text-stone-500 block">Документ воинского учёта:</span>
                        <span className="font-medium text-stone-900">{selectedApplicant.militaryRecord.documentType}</span>
                      </div>
                      <div>
                        <span className="text-xs text-stone-500 block">Серия и номер документа:</span>
                        <span className="font-mono font-medium text-stone-900">{selectedApplicant.militaryRecord.documentNumber || '—'}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-stone-500 text-xs font-medium">Не состоит на воинском учёте</p>
                  )}
                </div>
              </div>

              {/* 7. Льготы и подтверждающие документы */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-amber-700" />
                    Льготы и особое право при поступлении
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsEditBenefitModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100/80 hover:bg-amber-200 text-amber-950 border border-amber-300 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    {selectedApplicant.benefit ? (
                      <>
                        <Edit2 className="w-3.5 h-3.5 text-amber-800" />
                        Редактировать льготу
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5 text-amber-800" />
                        Добавить льготу
                      </>
                    )}
                  </button>
                </div>

                {selectedApplicant.benefit ? (
                  <div className="bg-amber-50/90 p-4 rounded-xl border border-amber-200 text-sm space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <span className="font-bold text-amber-950 text-base">{selectedApplicant.benefit}</span>
                      <span className="text-xs bg-amber-200/80 text-amber-900 font-semibold px-2.5 py-0.5 rounded-full w-fit">
                        {selectedApplicant.benefitEffect || 'Целевое обучение'}
                      </span>
                    </div>

                    {/* Данные документа */}
                    {(selectedApplicant.benefitDocumentType || selectedApplicant.benefitDocumentNumber) && (
                      <div className="p-3 bg-white rounded-lg border border-amber-200/80 text-xs space-y-1">
                        <div className="font-bold text-stone-900 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-amber-800" />
                          Подтверждающий документ: {selectedApplicant.benefitDocumentType} {selectedApplicant.benefitDocumentNumber}
                        </div>
                        {selectedApplicant.benefitDocumentIssueDate && (
                          <div className="text-stone-600">
                            Дата выдачи: {displayRussianDate(selectedApplicant.benefitDocumentIssueDate)}
                          </div>
                        )}
                        {selectedApplicant.benefitDocumentIssuedBy && (
                          <div className="text-stone-600">
                            Кем выдано: {selectedApplicant.benefitDocumentIssuedBy}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Статус верификации */}
                    <div className="pt-1 flex items-center gap-2">
                      {selectedApplicant.documentsVerified ? (
                        <div className="inline-flex items-center gap-1.5 text-xs text-emerald-800 font-semibold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                          <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                          Документы проверены и подтверждены приёмной комиссией
                        </div>
                      ) : (
                        <div className="text-xs text-amber-800 font-medium">
                          Документы ожидают подтверждения
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-amber-50/40 rounded-xl border border-dashed border-amber-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                    <div className="text-stone-600">
                      <span className="font-bold text-stone-800 block mb-0.5">Льготы не указаны (общий конкурс)</span>
                      Если при заполнении анкеты льгота была пропущена, вы можете внести её прямо сейчас.
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsEditBenefitModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs shadow-xs transition-colors cursor-pointer shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      + Добавить льготу
                    </button>
                  </div>
                )}
              </div>

              {/* 8. Согласия на обработку персональных данных и заявления родителя */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-rose-900 flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-rose-800" />
                    Статусы сдачи обязательных согласий (152-ФЗ и согласие родителя)
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsEditConsentsModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-stone-100 hover:bg-stone-200 text-stone-900 border border-stone-300 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-stone-700" />
                    Редактировать согласия
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm bg-stone-50 p-4 rounded-xl border border-stone-200">
                  {/* Согласие 152-ФЗ */}
                  <div className={`p-3.5 rounded-xl border space-y-2 ${
                    selectedApplicant.dataProcessingConsentSigned
                      ? 'bg-emerald-50/70 border-emerald-300'
                      : 'bg-amber-50/50 border-amber-200'
                  }`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-stone-900 text-xs">
                        1. Согласие на обработку ПД (152-ФЗ)
                      </span>
                      {selectedApplicant.dataProcessingConsentSigned ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-900 rounded-md">
                          <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                          Сдано
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 bg-amber-100 text-amber-900 rounded-md">
                          <Clock className="w-3 h-3 text-amber-700" />
                          Ожидает
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => generateDataProcessingConsent(selectedApplicant)}
                        className="px-2.5 py-1 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                        title="Скачать бланк согласия 152-ФЗ (.docx)"
                      >
                        <Download className="w-3 h-3 text-stone-300" />
                        <span>Скачать (.docx)</span>
                      </button>

                      <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-stone-800">
                        <input
                          type="checkbox"
                          checked={selectedApplicant.dataProcessingConsentSigned || false}
                          onChange={(e) => handleSaveConsents({ dataProcessingConsentSigned: e.target.checked })}
                          className="w-4 h-4 text-emerald-600 rounded border-stone-300 focus:ring-emerald-600 accent-emerald-600"
                        />
                        <span>Сдано</span>
                      </label>
                    </div>
                  </div>

                  {/* Согласие родителя */}
                  {(() => {
                    const age = calculateAge(selectedApplicant.birthDate);
                    const isMinor = age < 18;

                    return (
                      <div className={`p-3.5 rounded-xl border space-y-2 ${
                        !isMinor
                          ? 'bg-stone-100/70 border-stone-200'
                          : selectedApplicant.parentalConsentSigned
                          ? 'bg-emerald-50/70 border-emerald-300'
                          : 'bg-amber-50/50 border-amber-200'
                      }`}>
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <span className="font-bold text-stone-900 text-xs block">
                              2. Согласие родителя
                            </span>
                            <span className="text-[10px] text-stone-500 font-medium">
                              Возраст: {age > 0 ? `${age} лет` : '—'} {isMinor ? '(< 18 лет)' : '(>= 18 лет)'}
                            </span>
                          </div>

                          {isMinor ? (
                            selectedApplicant.parentalConsentSigned ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-900 rounded-md">
                                <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                                Сдано
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 bg-amber-100 text-amber-900 rounded-md">
                                <Clock className="w-3 h-3 text-amber-700" />
                                Ожидает
                              </span>
                            )
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 bg-stone-200 text-stone-600 rounded-md">
                              Не треб.
                            </span>
                          )}
                        </div>

                        {isMinor ? (
                          <div className="flex items-center justify-between gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => generateParentalConsent(selectedApplicant)}
                              className="px-2.5 py-1 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                              title="Скачать согласие родителя (.docx)"
                            >
                              <Download className="w-3 h-3 text-stone-300" />
                              <span>Скачать (.docx)</span>
                            </button>

                            <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-stone-800">
                              <input
                                type="checkbox"
                                checked={selectedApplicant.parentalConsentSigned || false}
                                onChange={(e) => handleSaveConsents({ parentalConsentSigned: e.target.checked })}
                                className="w-4 h-4 text-emerald-600 rounded border-stone-300 focus:ring-emerald-600 accent-emerald-600"
                              />
                              <span>Сдано</span>
                            </label>
                          </div>
                        ) : (
                          <div className="text-[11px] text-stone-500 pt-1">
                            Совершеннолетний абитуриент.
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleOpenDeleteModal(selectedApplicant)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-rose-800 hover:text-rose-950 hover:bg-rose-100/70 border border-rose-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-700" />
                <span>Удалить абитуриента</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedApplicant(null)}
                className="px-6 py-2 bg-rose-900 hover:bg-rose-950 text-white rounded-xl text-sm font-medium transition-colors cursor-pointer"
              >
                Закрыть карточку
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Applicant Documents Modal */}
      {selectedApplicant && (
        <ApplicantDocumentsModal
          isOpen={isApplicantDocsModalOpen}
          onClose={() => setIsApplicantDocsModalOpen(false)}
          documents={currentApplicantDocs}
          onUpdateDocuments={handleUpdateApplicantDocs}
          applicantName={selectedApplicant.fullName}
        />
      )}

      {/* Edit Benefit Modal */}
      {selectedApplicant && (
        <EditBenefitModal
          isOpen={isEditBenefitModalOpen}
          onClose={() => setIsEditBenefitModalOpen(false)}
          applicant={selectedApplicant}
          onSaveBenefit={handleSaveBenefit}
        />
      )}

      {/* Edit Certificate and Grades Modal */}
      {selectedApplicant && (
        <EditCertificateModal
          isOpen={isEditCertificateModalOpen}
          onClose={() => setIsEditCertificateModalOpen(false)}
          applicant={selectedApplicant}
          onSaveCertificate={handleSaveCertificate}
        />
      )}

      {/* Edit Specialty Modal */}
      {selectedApplicant && (
        <EditSpecialtyModal
          isOpen={isEditSpecialtyModalOpen}
          onClose={() => setIsEditSpecialtyModalOpen(false)}
          applicant={selectedApplicant}
          onSaveSpecialty={handleSaveSpecialty}
        />
      )}

      {/* Edit Personal Data Modal */}
      {selectedApplicant && (
        <EditPersonalModal
          isOpen={isEditPersonalModalOpen}
          onClose={() => setIsEditPersonalModalOpen(false)}
          applicant={selectedApplicant}
          onSavePersonal={handleSavePersonal}
        />
      )}

      {/* Edit Address Modal */}
      {selectedApplicant && (
        <EditAddressModal
          isOpen={isEditAddressModalOpen}
          onClose={() => setIsEditAddressModalOpen(false)}
          applicant={selectedApplicant}
          onSaveAddress={handleSaveAddress}
        />
      )}

      {/* Edit Consents Modal */}
      {selectedApplicant && (
        <EditConsentsModal
          isOpen={isEditConsentsModalOpen}
          onClose={() => setIsEditConsentsModalOpen(false)}
          applicant={selectedApplicant}
          onSaveConsents={handleSaveConsents}
        />
      )}

      {/* Delete Confirmation Modal */}
      <DeleteApplicantModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setApplicantToDelete(null);
        }}
        applicant={applicantToDelete}
        onConfirmDelete={handleConfirmDeleteApplicant}
        isDeleting={Boolean(deletingId)}
      />

      {/* Reports & Analytics Modal */}
      <ReportsModal
        isOpen={isReportsModalOpen}
        onClose={() => setIsReportsModalOpen(false)}
        campaign={campaign}
        applicants={applicants}
      />

      {/* Commercial Call & Reserves Modal */}
      <CommercialCallModal
        isOpen={isCommercialCallModalOpen}
        onClose={() => setIsCommercialCallModalOpen(false)}
        campaignName={campaign?.name || 'Приёмная кампания'}
        applicants={applicants}
      />

      {/* Delete Campaign Double Confirmation Modal */}
      <DeleteCampaignModal
        isOpen={isDeleteCampaignModalOpen}
        onClose={() => setIsDeleteCampaignModalOpen(false)}
        campaign={campaign}
        onDeleteSuccess={() => {
          navigate('/');
        }}
      />
    </div>
  );
}

