import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { collection, addDoc, doc, getDoc, getDocs, query, where, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { logAction } from '../lib/logger';
import { 
  Loader2, 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle2, 
  User, 
  MapPin, 
  GraduationCap, 
  Users, 
  Shield, 
  Award, 
  Plus, 
  Trash2, 
  FileText, 
  Check, 
  AlertCircle, 
  Lock, 
  FolderOpen,
  Phone,
  Calendar,
  BookOpen,
  Search,
  Sparkles,
  Download,
  ExternalLink,
  Share2,
  FileCheck2,
  Building2,
  Clock,
  Layers
} from 'lucide-react';
import { Campaign, Relative, MilitaryRecord, ApplicantDocument, Applicant } from '../types';
import { ApplicantDocumentsModal } from './ApplicantDocumentsModal';
import { cleanFirestoreData } from '../lib/utils';
import { toast } from '../utils/toast';
import { SPECIALTY_LIST, getSpecialtyByFullName } from '../lib/specialties';
import { 
  BENEFIT_DEFINITIONS, 
  getBenefitDefinition, 
  isDocumentEligibleForBenefit 
} from '../lib/benefits';
import {
  generateDataProcessingConsent,
  generateParentalConsent,
  calculateAge
} from '../lib/documentGenerator';
import {
  sanitizeSingleWord,
  isSingleWord,
  sanitizePhone,
  isValidPhone,
  formatMaskDate,
  isValidDateDDMMYYYY,
  formatMaskSnils,
  isValidSnils,
  formatMaskPassportSeries,
  isValidPassportSeries,
  formatMaskPassportNumber,
  isValidPassportNumber,
  formatMaskSubdivisionCode,
  isValidSubdivisionCode,
  displayRussianDate,
} from '../lib/validation';

export function AddApplicant() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8>(1);
  const [createdApplicant, setCreatedApplicant] = useState<Applicant | null>(null);

  // === ШАГ 1: Паспортные данные и номер телефона ===
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<'Мужской' | 'Женский'>('Мужской');
  const [snils, setSnils] = useState('');
  const [passportSeries, setPassportSeries] = useState('');
  const [passportNumber, setPassportNumber] = useState('');
  const [passportIssuedBy, setPassportIssuedBy] = useState('');
  const [passportIssueDate, setPassportIssueDate] = useState('');
  const [passportSubdivisionCode, setPassportSubdivisionCode] = useState('');

  // === ШАГ 2: Адресные данные ===
  const [residence, setResidence] = useState('');
  const [registration, setRegistration] = useState('');
  const [matchesResidence, setMatchesResidence] = useState(true);
  const [locality, setLocality] = useState('');

  // === ШАГ 3: Аттестат (только номер) ===
  const [school, setSchool] = useState('');
  const [certificateType, setCertificateType] = useState('Аттестат за 9 классов');
  const [certificateNumber, setCertificateNumber] = useState('');
  const [certificateIssueDate, setCertificateIssueDate] = useState('');
  const [threes, setThrees] = useState(0);
  const [fours, setFours] = useState(0);
  const [fives, setFives] = useState(0);
  const [averageScore, setAverageScore] = useState(0);
  const [educationDocumentSubmissionType, setEducationDocumentSubmissionType] = useState<'original' | 'copy'>('original');

  // === ШАГ 4: Сведения о родственниках (опционально) ===
  const [relatives, setRelatives] = useState<Relative[]>([
    { relation: 'Мать', fullName: '', phone: '', workplace: '' }
  ]);

  // === ШАГ 5: Воинский учёт (опционально) ===
  const [isRegistered, setIsRegistered] = useState(false);
  const [militaryStatus, setMilitaryStatus] = useState('Подлежит призыву (призывник)');
  const [commissariat, setCommissariat] = useState('');
  const [militaryDocType, setMilitaryDocType] = useState('Удостоверение гражданина подлежащего призыву (приписное)');
  const [militaryDocNumber, setMilitaryDocNumber] = useState('');
  const [fitnessCategory, setFitnessCategory] = useState('А');

  // === ШАГ 6: Выбор специальности / профессии (образовательной программы) ===
  const [selectedSpecialty, setSelectedSpecialty] = useState('Электроснабжение (Бюджет)');
  const [secondChoiceSpecialty, setSecondChoiceSpecialty] = useState('');
  const [thirdChoiceSpecialty, setThirdChoiceSpecialty] = useState('');
  const [commercialInterest, setCommercialInterest] = useState(false);
  const [specialtyFundingFilter, setSpecialtyFundingFilter] = useState<'all' | 'Бюджет' | 'Платно'>('all');
  const [specialtyTypeFilter, setSpecialtyTypeFilter] = useState<'all' | 'ППССЗ' | 'ППКРС'>('all');
  const [specialtySearch, setSpecialtySearch] = useState('');

  // === ШАГ 7: Льготы при поступлении ===
  const [hasBenefit, setHasBenefit] = useState(false);
  const [benefit, setBenefit] = useState('');
  const [selectedDocumentId, setSelectedDocumentId] = useState('');
  const [documentsVerified, setDocumentsVerified] = useState(false);
  const [benefitEffect, setBenefitEffect] = useState('Целевое обучение');

  // === Индивидуальный реестр документов абитуриента ===
  const [applicantDocuments, setApplicantDocuments] = useState<ApplicantDocument[]>([]);
  const [isDocsModalOpen, setIsDocsModalOpen] = useState(false);

  // Загрузка кампании
  useEffect(() => {
    if (!id) return;
    getDoc(doc(db, 'campaigns', id)).then((docSnap) => {
      if (docSnap.exists()) {
        setCampaign({ id: docSnap.id, ...docSnap.data() } as Campaign);
      }
    });
  }, [id]);

  // Автоматический подсчёт среднего балла
  useEffect(() => {
    const totalGrades = threes + fours + fives;
    if (totalGrades > 0) {
      const sum = (threes * 3) + (fours * 4) + (fives * 5);
      setAverageScore(sum / totalGrades);
    } else {
      setAverageScore(0);
    }
  }, [threes, fours, fives]);

  // Синхронизация прописки с фактическим местом жительства
  useEffect(() => {
    if (matchesResidence) {
      setRegistration(residence);
    }
  }, [matchesResidence, residence]);

  // Сброс подтверждения льготы при сбросе выбранного документа
  useEffect(() => {
    if (!selectedDocumentId) {
      setDocumentsVerified(false);
    }
  }, [selectedDocumentId]);

  const applicantFullName = `${lastName.trim()} ${firstName.trim()}${middleName.trim() ? ' ' + middleName.trim() : ''}`.trim();

  // Helper to sync or create identity document
  const syncIdentityDocument = () => {
    const docId = 'doc_identity_passport';
    const updatedDoc: ApplicantDocument = cleanFirestoreData({
      id: docId,
      category: 'identity',
      title: 'Паспорт гражданина РФ',
      type: 'Паспорт РФ',
      documentNumber: passportNumber.trim(),
      issueDate: passportIssueDate,
      issuedBy: passportIssuedBy.trim(),
      beneficiaryName: applicantFullName,
      isVerified: true,
      createdAt: Date.now(),
      details: cleanFirestoreData({
        series: passportSeries.trim(),
        subdivisionCode: passportSubdivisionCode.trim(),
        snils: snils.trim(),
        birthDate: birthDate,
      }),
    });

    setApplicantDocuments((prev) => {
      const exists = prev.some((d) => d.id === docId || d.category === 'identity');
      if (exists) {
        return prev.map((d) => (d.id === docId || d.category === 'identity' ? updatedDoc : d));
      }
      return [updatedDoc, ...prev];
    });
  };

  // Helper to sync or create education document
  const syncEducationDocument = () => {
    const docId = 'doc_education_certificate';
    const updatedDoc: ApplicantDocument = cleanFirestoreData({
      id: docId,
      category: 'education',
      title: 'Документ об образовании',
      type: certificateType,
      documentNumber: certificateNumber.trim(),
      issueDate: certificateIssueDate,
      issuedBy: school.trim(),
      beneficiaryName: applicantFullName,
      isVerified: true,
      createdAt: Date.now(),
      details: cleanFirestoreData({
        school: school.trim(),
        grades: { threes, fours, fives },
        averageScore,
        submissionType: educationDocumentSubmissionType,
      }),
    });

    setApplicantDocuments((prev) => {
      const exists = prev.some((d) => d.id === docId || d.category === 'education');
      if (exists) {
        return prev.map((d) => (d.id === docId || d.category === 'education' ? updatedDoc : d));
      }
      return [...prev, updatedDoc];
    });
  };

  // Валидаторы шагов
  const validateStep1 = () => {
    // 1. ФИО (только одно слово в каждом поле)
    if (!lastName.trim()) {
      alert('Пожалуйста, укажите фамилию абитуриента');
      return false;
    }
    if (!isSingleWord(lastName)) {
      alert('Ошибка в поле «Фамилия»: разрешено только одно слово (без пробелов)');
      return false;
    }
    if (!firstName.trim()) {
      alert('Пожалуйста, укажите имя абитуриента');
      return false;
    }
    if (!isSingleWord(firstName)) {
      alert('Ошибка в поле «Имя»: разрешено только одно слово (без пробелов)');
      return false;
    }
    if (middleName.trim() && !isSingleWord(middleName)) {
      alert('Ошибка в поле «Отчество»: разрешено только одно слово (без пробелов)');
      return false;
    }

    // 2. Номер телефона (11 цифр или + и 11 цифр)
    if (!phone.trim()) {
      alert('Пожалуйста, укажите контактный номер телефона абитуриента');
      return false;
    }
    if (!isValidPhone(phone)) {
      alert('Ошибка в номере телефона! Допустимо: 11 цифр (например, 89231231234) или 12 символов (+79231231234). Буквы запрещены.');
      return false;
    }

    // 3. Дата рождения (ДД.ММ.ГГГГ или ISO)
    if (!birthDate.trim()) {
      alert('Пожалуйста, укажите дату рождения');
      return false;
    }
    if (!isValidDateDDMMYYYY(birthDate) && !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
      alert('Ошибка в дате рождения! Формат: день 2 цифры, месяц 2 цифры, год 4 цифры (например: 15.08.2007)');
      return false;
    }

    // 4. СНИЛС (3 цифры - 3 цифры - 3 цифры space 2 цифры)
    if (snils.trim() && !isValidSnils(snils)) {
      alert('Ошибка в СНИЛС! Формат должен быть строго: 000-000-000 00 (3 цифры - 3 цифры - 3 цифры пробел 2 цифры)');
      return false;
    }

    // 5. Серия паспорта (4 цифры)
    if (!passportSeries.trim()) {
      alert('Пожалуйста, укажите серию паспорта (4 цифры)');
      return false;
    }
    if (!isValidPassportSeries(passportSeries)) {
      alert('Ошибка в серии паспорта: должно быть ровно 4 цифры (например: 5018)');
      return false;
    }

    // 6. Номер паспорта (6 цифр)
    if (!passportNumber.trim()) {
      alert('Пожалуйста, укажите номер паспорта (6 цифр)');
      return false;
    }
    if (!isValidPassportNumber(passportNumber)) {
      alert('Ошибка в номере паспорта: должно быть ровно 6 цифр (например: 123456)');
      return false;
    }

    // 7. Код подразделения (3 цифры - 3 цифры)
    if (!passportSubdivisionCode.trim()) {
      alert('Пожалуйста, укажите код подразделения (3 цифры - 3 цифры)');
      return false;
    }
    if (!isValidSubdivisionCode(passportSubdivisionCode)) {
      alert('Ошибка в коде подразделения: формат должен быть 000-000 (3 цифры, тире, 3 цифры)');
      return false;
    }

    // 8. Кем выдан (любой текст)
    if (!passportIssuedBy.trim()) {
      alert('Пожалуйста, укажите, кем выдан паспорт');
      return false;
    }

    // 9. Дата выдачи паспорта (ДД.ММ.ГГГГ)
    if (!passportIssueDate.trim()) {
      alert('Пожалуйста, укажите дату выдачи паспорта');
      return false;
    }
    if (!isValidDateDDMMYYYY(passportIssueDate) && !/^\d{4}-\d{2}-\d{2}$/.test(passportIssueDate)) {
      alert('Ошибка в дате выдачи паспорта! Формат: день 2 цифры, месяц 2 цифры, год 4 цифры (например: 20.08.2021)');
      return false;
    }

    return true;
  };

  const validateStep2 = () => {
    if (!residence.trim()) {
      alert('Пожалуйста, укажите фактическое место жительства');
      return false;
    }
    if (!registration.trim()) {
      alert('Пожалуйста, укажите место регистрации (прописки)');
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (!school.trim()) {
      alert('Пожалуйста, укажите наименование школы / оконченного учебного заведения');
      return false;
    }
    if (!certificateNumber.trim()) {
      alert('Пожалуйста, укажите номер аттестата');
      return false;
    }
    if (!certificateIssueDate.trim()) {
      alert('Пожалуйста, укажите дату выдачи аттестата');
      return false;
    }
    if (!isValidDateDDMMYYYY(certificateIssueDate) && !/^\d{4}-\d{2}-\d{2}$/.test(certificateIssueDate)) {
      alert('Ошибка в дате выдачи аттестата! Формат: день 2 цифры, месяц 2 цифры, год 4 цифры (например: 25.06.2024)');
      return false;
    }
    const totalGrades = threes + fours + fives;
    if (totalGrades === 0) {
      alert('Пожалуйста, введите количество оценок в аттестате для подсчёта среднего балла');
      return false;
    }
    return true;
  };

  const validateStep6 = () => {
    if (!selectedSpecialty.trim()) {
      alert('Пожалуйста, выберите специальность или профессию для абитуриента');
      return false;
    }
    return true;
  };

  const validateStep7 = () => {
    if (hasBenefit) {
      if (!benefit.trim()) {
        alert('Пожалуйста, выберите категорию льготы');
        return false;
      }
      if (!selectedDocumentId) {
        alert('Пожалуйста, выберите подтверждающий документ из реестра документов абитуриента');
        return false;
      }
      if (!documentsVerified) {
        alert('Пожалуйста, подтвердите проверку документа (отметка «Документы подтверждены»)');
        return false;
      }
      if (!benefitEffect.trim()) {
        alert('Пожалуйста, выберите предоставляемое преимущество (например: Целевое обучение)');
        return false;
      }
    }
    return true;
  };

  // Переходы между шагами
  const handleNextFromStep1 = () => {
    if (!validateStep1()) return;
    syncIdentityDocument();
    setCurrentStep(2);
  };

  const handleNextFromStep2 = () => {
    if (!validateStep2()) return;
    setCurrentStep(3);
  };

  const handleNextFromStep3 = () => {
    if (!validateStep3()) return;
    syncEducationDocument();
    setCurrentStep(4);
  };

  const handleNextFromStep4 = () => {
    setCurrentStep(5);
  };

  const handleNextFromStep5 = () => {
    setCurrentStep(6);
  };

  const handleNextFromStep6 = () => {
    if (!validateStep6()) return;
    setCurrentStep(7);
  };

  // Управление родственниками
  const handleAddRelative = () => {
    setRelatives([
      ...relatives,
      { relation: 'Отец', fullName: '', phone: '', workplace: '' }
    ]);
  };

  const handleRemoveRelative = (index: number) => {
    setRelatives(relatives.filter((_, i) => i !== index));
  };

  const handleRelativeChange = (index: number, field: keyof Relative, val: string) => {
    const updated = [...relatives];
    updated[index] = { ...updated[index], [field]: val };
    setRelatives(updated);
  };

  // Финальное сохранение
  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    if (!validateStep7()) return;

    setSaving(true);
    const cleanedRelatives = relatives.filter((r) => r.fullName.trim() !== '');

    const militaryRecord: MilitaryRecord = {
      isRegistered,
      status: isRegistered ? militaryStatus : 'Не состоит на воинском учёте',
      commissariat: isRegistered ? commissariat.trim() : '',
      documentType: isRegistered ? militaryDocType : '',
      documentNumber: isRegistered ? militaryDocNumber.trim() : '',
      fitnessCategory: isRegistered ? fitnessCategory : 'Не установлена',
    };

    const selectedBenefitDoc = applicantDocuments.find((d) => d.id === selectedDocumentId);
    const specObj = getSpecialtyByFullName(selectedSpecialty);

    try {
      const applicantPayload = cleanFirestoreData({
        campaignId: id,
        
        // ФИО и контакты
        lastName: lastName.trim(),
        firstName: firstName.trim(),
        middleName: middleName.trim(),
        fullName: applicantFullName,
        phone: phone.trim(),
        birthDate,
        gender,
        snils: snils.trim(),

        // Паспортные данные
        passportSeries: passportSeries.trim(),
        passportNumber: passportNumber.trim(),
        passportIssuedBy: passportIssuedBy.trim(),
        passportIssueDate,
        passportSubdivisionCode: passportSubdivisionCode.trim(),
        passport: `${passportSeries.trim()} ${passportNumber.trim()}`.trim(),

        // Адрес
        residence: residence.trim(),
        registration: registration.trim(),
        matchesResidence,
        locality: locality.trim(),

        // Аттестат
        school: school.trim(),
        certificateType,
        certificateNumber: certificateNumber.trim(),
        issueDate: certificateIssueDate,
        grades: { threes, fours, fives },
        averageScore,
        educationDocumentSubmissionType: educationDocumentSubmissionType || 'original',

        // Выбранная специальность / профессия (образовательная программа)
        specialty: selectedSpecialty,
        specialtyName: specObj?.name || selectedSpecialty,
        fundingType: specObj?.funding || 'Бюджет',
        programType: specObj?.programType || 'ППССЗ',

        // Пожелания на альтернативные специальности и коммерция
        alternativeSpecialties: [secondChoiceSpecialty, thirdChoiceSpecialty].filter(
          (s) => s && s.trim() !== '' && s !== selectedSpecialty
        ),
        commercialInterest,
        callStatus: 'not_called',
        callNote: '',

        // Льготы
        hasBenefit,
        benefit: hasBenefit ? benefit : '',
        benefitDocumentId: hasBenefit ? (selectedDocumentId || '') : '',
        benefitDocumentType: hasBenefit ? (selectedBenefitDoc?.type || '') : '',
        benefitDocumentNumber: hasBenefit ? (selectedBenefitDoc?.documentNumber || '') : '',
        benefitDocumentIssuedBy: hasBenefit ? (selectedBenefitDoc?.issuedBy || '') : '',
        benefitDocumentIssueDate: hasBenefit ? (selectedBenefitDoc?.issueDate || '') : '',
        documentsVerified: hasBenefit ? documentsVerified : false,
        benefitEffect: hasBenefit ? benefitEffect : '',

        // Индивидуальный реестр документов абитуриента
        documents: cleanFirestoreData(applicantDocuments),

        // Родственники
        relatives: cleanedRelatives,

        // Воинский учёт
        militaryRecord,

        // Индивидуальный код и подпись согласий
        applicantCode: `REG-2026-${String(Math.floor(1000 + Math.random() * 9000))}`,
        dataProcessingConsentSigned: false,
        parentalConsentSigned: false,

        createdAt: Date.now(),
        applicationNumber: String(Math.floor(1000 + Math.random() * 9000)),
      });

      const fullFio = `${lastName.trim()} ${firstName.trim()} ${middleName.trim()}`.trim();

      // 1. Если абитуриент УЖЕ был создан в текущей сессии формы (например, пользователь перешёл на Шаг 8, затем вернулся назад изменить данные)
      if (createdApplicant?.id) {
        const updatePayload = cleanFirestoreData({
          ...applicantPayload,
          applicationNumber: createdApplicant.applicationNumber,
          applicantCode: createdApplicant.applicantCode,
          dataProcessingConsentSigned: createdApplicant.dataProcessingConsentSigned || false,
          parentalConsentSigned: createdApplicant.parentalConsentSigned || false,
          createdAt: createdApplicant.createdAt || Date.now(),
        });

        await updateDoc(doc(db, 'applicants', createdApplicant.id), updatePayload);
        await logAction(
          user?.username || 'nekpriem',
          'UPDATE_APPLICANT',
          `Обновил данные абитуриента: ${fullFio} (Заявление № ${createdApplicant.applicationNumber})`,
          { campaignId: id, applicantId: createdApplicant.id }
        );

        toast.success(`Данные абитуриента ${fullFio} обновлены!`);
        const updatedObj = { id: createdApplicant.id, ...updatePayload } as Applicant;
        setCreatedApplicant(updatedObj);
        setCurrentStep(8);
        setSaving(false);
        return;
      }

      // 2. Проверка на дубликаты в базе по Паспорту (серия + номер) или СНИЛС в рамках этой кампании
      const pSeries = passportSeries.trim();
      const pNum = passportNumber.trim();
      const qPassport = query(
        collection(db, 'applicants'),
        where('campaignId', '==', id),
        where('passportSeries', '==', pSeries),
        where('passportNumber', '==', pNum)
      );
      const passportSnap = await getDocs(qPassport);

      let existingDocId: string | null = null;
      let existingData: any = null;

      if (!passportSnap.empty) {
        existingDocId = passportSnap.docs[0].id;
        existingData = passportSnap.docs[0].data();
      } else if (snils.trim()) {
        const qSnils = query(
          collection(db, 'applicants'),
          where('campaignId', '==', id),
          where('snils', '==', snils.trim())
        );
        const snilsSnap = await getDocs(qSnils);
        if (!snilsSnap.empty) {
          existingDocId = snilsSnap.docs[0].id;
          existingData = snilsSnap.docs[0].data();
        }
      }

      if (existingDocId && existingData) {
        const confirmUpdate = window.confirm(
          `Внимание! Абитуриент с данными паспорта (${pSeries} ${pNum}) или СНИЛС уже зарегистрирован в этой приёмной кампании:\n` +
          `• ФИО: ${existingData.fullName}\n` +
          `• № Заявления: ${existingData.applicationNumber}\n\n` +
          `Обновить данные существующего заявления вместо создания повторного дубликата?`
        );

        if (!confirmUpdate) {
          setSaving(false);
          return;
        }

        const updatePayload = cleanFirestoreData({
          ...applicantPayload,
          applicationNumber: existingData.applicationNumber,
          applicantCode: existingData.applicantCode,
          dataProcessingConsentSigned: existingData.dataProcessingConsentSigned || false,
          parentalConsentSigned: existingData.parentalConsentSigned || false,
          createdAt: existingData.createdAt || Date.now(),
        });

        await updateDoc(doc(db, 'applicants', existingDocId), updatePayload);
        await logAction(
          user?.username || 'nekpriem',
          'UPDATE_APPLICANT',
          `Обновил существующее заявление (дубликат предотвращён): ${fullFio} (Заявление № ${existingData.applicationNumber})`,
          { campaignId: id, applicantId: existingDocId }
        );

        toast.success(`Заявление абитуриента ${fullFio} обновлено!`);
        const updatedObj = { id: existingDocId, ...updatePayload } as Applicant;
        setCreatedApplicant(updatedObj);
        setCurrentStep(8);
        setSaving(false);
        return;
      }

      // 3. Создание нового абитуриента в базе
      const docRef = await addDoc(collection(db, 'applicants'), applicantPayload);
      await logAction(
        user?.username || 'nekpriem',
        'CREATE_APPLICANT',
        `Зарегистрировал абитуриента: ${fullFio} (Заявление № ${applicantPayload.applicationNumber}, Код: ${applicantPayload.applicantCode})`,
        { campaignId: id, applicantId: docRef.id }
      );

      toast.success(`Абитуриент ${fullFio} успешно зарегистрирован!`);
      
      const createdObj = { id: docRef.id, ...applicantPayload } as Applicant;
      setCreatedApplicant(createdObj);
      setCurrentStep(8);
      setSaving(false);
    } catch (err) {
      console.error('Error adding applicant:', err);
      alert('Ошибка при сохранении абитуриента в базу');
      setSaving(false);
    }
  };

  // Toggle handlers for consents in Step 8
  const handleToggleDataProcessingConsent = async (signed: boolean) => {
    if (!createdApplicant?.id) return;
    try {
      await updateDoc(doc(db, 'applicants', createdApplicant.id), {
        dataProcessingConsentSigned: signed,
      });
      setCreatedApplicant((prev) => prev ? { ...prev, dataProcessingConsentSigned: signed } : null);
      toast.success(signed ? 'Согласие на обработку данных отмечено как подписанное' : 'Отметка о подписании согласия снята');
    } catch (err) {
      console.error('Error updating consent:', err);
      toast.error('Не удалось обновить статус согласия');
    }
  };

  const handleToggleParentalConsent = async (signed: boolean) => {
    if (!createdApplicant?.id) return;
    try {
      await updateDoc(doc(db, 'applicants', createdApplicant.id), {
        parentalConsentSigned: signed,
      });
      setCreatedApplicant((prev) => prev ? { ...prev, parentalConsentSigned: signed } : null);
      toast.success(signed ? 'Заявление родителя отмечено как подписанное' : 'Отметка о подписании заявления родителя снята');
    } catch (err) {
      console.error('Error updating parental consent:', err);
      toast.error('Не удалось обновить статус заявления родителя');
    }
  };

  const selectedBenefitDoc = applicantDocuments.find((d) => d.id === selectedDocumentId);

  const stepsList = [
    { number: 1, title: 'Паспорт и телефон', icon: User },
    { number: 2, title: 'Адрес и прописка', icon: MapPin },
    { number: 3, title: 'Аттестат и баллы', icon: GraduationCap },
    { number: 4, title: 'Родственники', icon: Users, optional: true },
    { number: 5, title: 'Воинский учёт', icon: Shield, optional: true },
    { number: 6, title: 'Специальность', icon: BookOpen },
    { number: 7, title: 'Льготы и документы', icon: Award },
    { number: 8, title: 'Код и подпись', icon: FileCheck2 },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Breadcrumbs & Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-stone-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-rose-800 uppercase tracking-wider mb-1">
            <Link to={`/campaign/${id}`} className="hover:underline flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              {campaign?.name || 'Назад к приёмной кампании'}
            </Link>
          </div>
          <h2 className="text-2xl font-bold text-stone-900 tracking-tight">Регистрация абитуриента</h2>
          <p className="text-stone-500 text-xs mt-0.5">
            {applicantFullName ? `Заполнение личного дела: ${applicantFullName}` : 'Пошаговый мастер внесения в базу приёмной комиссии'}
          </p>
        </div>

        {/* Кнопка быстрого доступа к индивидуальному реестру документов */}
        <button
          type="button"
          onClick={() => setIsDocsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-rose-50 text-rose-950 border border-rose-200 rounded-xl text-xs font-bold hover:bg-rose-100 transition-colors shadow-xs cursor-pointer"
        >
          <FolderOpen className="w-4 h-4 text-rose-800" />
          <span>Реестр документов ({applicantDocuments.length})</span>
        </button>
      </div>

      {/* Progress Stepper */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs overflow-x-auto">
        <div className="flex items-center justify-between min-w-[640px] px-2">
          {stepsList.map((st, idx) => {
            const isCompleted = currentStep > st.number;
            const isCurrent = currentStep === st.number;
            const Icon = st.icon;

            return (
              <React.Fragment key={st.number}>
                <div 
                  onClick={() => {
                    if (isCompleted) setCurrentStep(st.number as any);
                  }}
                  className={`flex flex-col items-center gap-1.5 transition-all ${
                    isCompleted ? 'cursor-pointer hover:opacity-80' : ''
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs transition-all shadow-xs ${
                      isCurrent
                        ? 'bg-rose-900 text-white ring-4 ring-rose-100 scale-105'
                        : isCompleted
                        ? 'bg-emerald-600 text-white'
                        : 'bg-stone-100 text-stone-400 border border-stone-200'
                    }`}
                  >
                    {isCompleted ? <Check className="w-5 h-5 stroke-[2.5]" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <div className="text-center">
                    <span
                      className={`block text-xs font-bold leading-tight ${
                        isCurrent
                          ? 'text-rose-950'
                          : isCompleted
                          ? 'text-stone-900'
                          : 'text-stone-400'
                      }`}
                    >
                      {st.title}
                    </span>
                    {st.optional && (
                      <span className="text-[10px] text-stone-400 font-normal">опционально</span>
                    )}
                  </div>
                </div>
                {idx < stepsList.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 transition-colors ${
                      currentStep > idx + 1 ? 'bg-emerald-500' : 'bg-stone-200'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Main Step Cards */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        
        {/* ========================================================================= */}
        {/* ШАГ 1: Паспортные данные и номер телефона */}
        {/* ========================================================================= */}
        {currentStep === 1 && (
          <div className="p-6 md:p-8 space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-stone-200 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-900 flex items-center justify-center font-bold">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-stone-900">Шаг 1. Паспортные данные и телефон</h3>
                  <p className="text-xs text-stone-500">
                    ФИО из этих данных будет использовано для отображения абитуриента в списках
                  </p>
                </div>
              </div>

              <span className="text-xs font-semibold px-2.5 py-1 bg-stone-100 text-stone-700 rounded-lg">
                Шаг 1 из 6
              </span>
            </div>

            {/* ФИО */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <div className="mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                    Фамилия <span className="text-rose-700">*</span>
                  </label>
                </div>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(sanitizeSingleWord(e.target.value))}
                  placeholder="Иванов"
                  className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-800 text-stone-900 bg-white"
                  autoFocus
                />
              </div>
              <div>
                <div className="mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                    Имя <span className="text-rose-700">*</span>
                  </label>
                </div>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(sanitizeSingleWord(e.target.value))}
                  placeholder="Иван"
                  className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-800 text-stone-900 bg-white"
                />
              </div>
              <div>
                <div className="mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                    Отчество (при наличии)
                  </label>
                </div>
                <input
                  type="text"
                  value={middleName}
                  onChange={(e) => setMiddleName(sanitizeSingleWord(e.target.value))}
                  placeholder="Иванович"
                  className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-800 text-stone-900 bg-white"
                />
              </div>
            </div>

            {/* Телефон, Дата рождения, Пол, СНИЛС */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="sm:col-span-1">
                <div className="mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                    Номер телефона <span className="text-rose-700">*</span>
                  </label>
                </div>
                <div className="relative">
                  <Phone className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(sanitizePhone(e.target.value))}
                    placeholder="+79231231234"
                    className="w-full pl-10 pr-3.5 py-2.5 border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-800 text-stone-900 bg-white font-mono text-sm"
                  />
                </div>
              </div>

              <div>
                <div className="mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                    Дата рождения <span className="text-rose-700">*</span>
                  </label>
                </div>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={birthDate}
                    onChange={(e) => setBirthDate(formatMaskDate(e.target.value))}
                    placeholder="15.08.2007"
                    className="w-full pl-10 pr-3.5 py-2.5 border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-800 text-stone-900 bg-white text-sm font-mono"
                  />
                </div>
              </div>

              <div>
                <div className="mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                    Пол <span className="text-rose-700">*</span>
                  </label>
                </div>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as 'Мужской' | 'Женский')}
                  className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-800 text-stone-900 bg-white text-sm"
                >
                  <option value="Мужской">Мужской</option>
                  <option value="Женский">Женский</option>
                </select>
              </div>

              <div>
                <div className="mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                    СНИЛС
                  </label>
                </div>
                <input
                  type="text"
                  maxLength={14}
                  value={snils}
                  onChange={(e) => setSnils(formatMaskSnils(e.target.value))}
                  placeholder="123-456-789 01"
                  className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-800 text-stone-900 bg-white font-mono text-sm"
                />
              </div>
            </div>

            {/* Реквизиты паспорта */}
            <div className="p-5 bg-stone-50/70 rounded-2xl border border-stone-200 space-y-4">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-rose-800" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-900">
                  Паспорт гражданина РФ (Документ, подтверждающий личность)
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <div className="mb-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                      Серия паспорта <span className="text-rose-700">*</span>
                    </label>
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={4}
                    value={passportSeries}
                    onChange={(e) => setPassportSeries(formatMaskPassportSeries(e.target.value))}
                    placeholder="5018"
                    className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-800 text-stone-900 bg-white font-mono"
                  />
                </div>
                <div>
                  <div className="mb-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                      Номер паспорта <span className="text-rose-700">*</span>
                    </label>
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={passportNumber}
                    onChange={(e) => setPassportNumber(formatMaskPassportNumber(e.target.value))}
                    placeholder="123456"
                    className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-800 text-stone-900 bg-white font-mono"
                  />
                </div>
                <div>
                  <div className="mb-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                      Код подразделения <span className="text-rose-700">*</span>
                    </label>
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={7}
                    value={passportSubdivisionCode}
                    onChange={(e) => setPassportSubdivisionCode(formatMaskSubdivisionCode(e.target.value))}
                    placeholder="540-001"
                    className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-800 text-stone-900 bg-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <div className="mb-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                      Кем выдан <span className="text-rose-700">*</span>
                    </label>
                  </div>
                  <input
                    type="text"
                    required
                    value={passportIssuedBy}
                    onChange={(e) => setPassportIssuedBy(e.target.value)}
                    placeholder="ГУ МВД России по Новосибирской области"
                    className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-800 text-stone-900 bg-white"
                  />
                </div>
                <div>
                  <div className="mb-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                      Дата выдачи <span className="text-rose-700">*</span>
                    </label>
                  </div>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      required
                      maxLength={10}
                      value={passportIssueDate}
                      onChange={(e) => setPassportIssueDate(formatMaskDate(e.target.value))}
                      placeholder="20.08.2021"
                      className="w-full pl-10 pr-3.5 py-2.5 border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-800 text-stone-900 bg-white text-sm font-mono"
                    />
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-stone-500 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                При нажатии кнопки «Далее» в индивидуальном реестре документов абитуриента автоматически сформируется документ «Документ, подтверждающий личность».
              </p>
            </div>

            {/* Navigation buttons */}
            <div className="flex justify-between items-center pt-4 border-t border-stone-200">
              <Link
                to={`/campaign/${id}`}
                className="px-5 py-2.5 border border-stone-300 text-stone-700 hover:bg-stone-100 rounded-xl font-medium text-sm transition-colors"
              >
                Отмена
              </Link>

              <button
                type="button"
                onClick={handleNextFromStep1}
                className="bg-rose-900 hover:bg-rose-950 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-xs flex items-center gap-2 cursor-pointer"
              >
                <span>Далее: Адрес и прописка</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ШАГ 2: Адресные данные */}
        {/* ========================================================================= */}
        {currentStep === 2 && (
          <div className="p-6 md:p-8 space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-stone-200 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-900 flex items-center justify-center font-bold">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-stone-900">Шаг 2. Адрес и место регистрации</h3>
                  <p className="text-xs text-stone-500">Укажите место фактического проживания и регистрацию по паспорту</p>
                </div>
              </div>

              <span className="text-xs font-semibold px-2.5 py-1 bg-stone-100 text-stone-700 rounded-lg">
                Шаг 2 из 6
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                  Фактическое место жительства <span className="text-rose-700">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={residence}
                  onChange={(e) => setResidence(e.target.value)}
                  placeholder="г. Новосибирск, ул. Ленина, д. 10, кв. 25"
                  className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-800 text-stone-900 bg-white"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                  Населённый пункт
                </label>
                <input
                  type="text"
                  value={locality}
                  onChange={(e) => setLocality(e.target.value)}
                  placeholder="г. Новосибирск"
                  className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-800 text-stone-900 bg-white"
                />
              </div>

              <div className="flex items-center pt-6">
                <label className="flex items-center gap-2.5 text-sm font-semibold text-stone-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={matchesResidence}
                    onChange={(e) => setMatchesResidence(e.target.checked)}
                    className="w-4 h-4 text-rose-800 rounded border-stone-300 focus:ring-rose-800 accent-rose-800"
                  />
                  <span>Место жительства совпадает с местом прописки</span>
                </label>
              </div>

              {!matchesResidence && (
                <div className="sm:col-span-2 animate-in fade-in duration-150">
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                    Адрес регистрации (по паспорту) <span className="text-rose-700">*</span>
                  </label>
                  <input
                    type="text"
                    required={!matchesResidence}
                    value={registration}
                    onChange={(e) => setRegistration(e.target.value)}
                    placeholder="г. Новосибирск, ул. Советская, д. 4, кв. 12"
                    className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-800 text-stone-900 bg-white"
                  />
                </div>
              )}
            </div>

            {/* Navigation buttons */}
            <div className="flex justify-between items-center pt-4 border-t border-stone-200">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-5 py-2.5 border border-stone-300 text-stone-700 hover:bg-stone-100 rounded-xl font-medium text-sm transition-colors flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Назад</span>
              </button>

              <button
                type="button"
                onClick={handleNextFromStep2}
                className="bg-rose-900 hover:bg-rose-950 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-xs flex items-center gap-2 cursor-pointer"
              >
                <span>Далее: Аттестат и баллы</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ШАГ 3: Аттестат и оценки */}
        {/* ========================================================================= */}
        {currentStep === 3 && (
          <div className="p-6 md:p-8 space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-stone-200 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-900 flex items-center justify-center font-bold">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-stone-900">Шаг 3. Данные об образовании и аттестат</h3>
                  <p className="text-xs text-stone-500">Укажите оконченную школу, номер аттестата и оценки для среднего балла</p>
                </div>
              </div>

              <span className="text-xs font-semibold px-2.5 py-1 bg-stone-100 text-stone-700 rounded-lg">
                Шаг 3 из 6
              </span>
            </div>

            {/* Предоставленный документ (Оригинал / Копия) */}
            <div className="p-4 rounded-xl border bg-stone-50/80 border-stone-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-900">
                  Предоставленный документ об образовании <span className="text-rose-700">*</span>
                </label>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                  educationDocumentSubmissionType === 'original'
                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                    : 'bg-amber-100 text-amber-900 border-amber-300'
                }`}>
                  {educationDocumentSubmissionType === 'original' ? '🟢 Оригинал аттестата' : '📄 Копия аттестата'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <label 
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    educationDocumentSubmissionType === 'original'
                      ? 'bg-emerald-50/90 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                      : 'bg-white border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="eduSubmissionType"
                    value="original"
                    checked={educationDocumentSubmissionType === 'original'}
                    onChange={() => setEducationDocumentSubmissionType('original')}
                    className="mt-1 w-4 h-4 text-emerald-700 focus:ring-emerald-700 accent-emerald-700"
                  />
                  <div>
                    <div className="text-xs font-bold text-stone-900">
                      🟢 Оригинал аттестата (по умолчанию)
                    </div>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      Сдан подлинник. Абитуриент допускается к зачислению в колледж.
                    </p>
                  </div>
                </label>

                <label 
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    educationDocumentSubmissionType === 'copy'
                      ? 'bg-amber-50/90 border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
                      : 'bg-white border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="eduSubmissionType"
                    value="copy"
                    checked={educationDocumentSubmissionType === 'copy'}
                    onChange={() => setEducationDocumentSubmissionType('copy')}
                    className="mt-1 w-4 h-4 text-amber-700 focus:ring-amber-700 accent-amber-700"
                  />
                  <div>
                    <div className="text-xs font-bold text-stone-900">
                      📄 Копия аттестата
                    </div>
                    <p className="text-[11px] text-amber-900/80 mt-0.5">
                      Только копия. Без оригинала зачисление в приказ будет невозможно.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                  Оконченное образовательное учреждение <span className="text-rose-700">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  placeholder="МБОУ СОШ № 12 г. Новосибирска"
                  className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-800 text-stone-900 bg-white"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                  Вид документа <span className="text-rose-700">*</span>
                </label>
                <select
                  value={certificateType}
                  onChange={(e) => setCertificateType(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-800 text-stone-900 bg-white text-sm"
                >
                  <option value="Аттестат за 9 классов">Аттестат за 9 классов</option>
                  <option value="Аттестат за 11 классов">Аттестат за 11 классов</option>
                  <option value="Диплом СПО">Диплом СПО</option>
                  <option value="Диплом НПО">Диплом НПО</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                  Номер аттестата <span className="text-rose-700">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={certificateNumber}
                  onChange={(e) => setCertificateNumber(e.target.value)}
                  placeholder="054240019283"
                  className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-800 text-stone-900 bg-white font-mono"
                />
              </div>

              <div>
                <div className="mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                    Дата выдачи аттестата <span className="text-rose-700">*</span>
                  </label>
                </div>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={certificateIssueDate}
                    onChange={(e) => setCertificateIssueDate(formatMaskDate(e.target.value))}
                    placeholder="25.06.2024"
                    className="w-full pl-10 pr-3.5 py-2.5 border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-800 text-stone-900 bg-white text-sm font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Оценки и средний балл */}
            <div className="p-5 bg-rose-50/50 rounded-2xl border border-rose-100 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-rose-950">
                Количество оценок в приложении к аттестату
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Троек («3»)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={threes}
                    onChange={(e) => setThrees(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-800 text-stone-900 bg-white font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Четвёрок («4»)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={fours}
                    onChange={(e) => setFours(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-800 text-stone-900 bg-white font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Пятёрок («5»)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={fives}
                    onChange={(e) => setFives(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-800 text-stone-900 bg-white font-semibold"
                  />
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-rose-200 text-center shadow-xs">
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-500">
                    Средний балл
                  </span>
                  <span className="text-2xl font-black text-rose-900 font-mono">
                    {averageScore.toFixed(2)}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-stone-500 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                При нажатии кнопки «Далее» в реестре документов появится документ «Документ об образовании».
              </p>
            </div>

            {/* Navigation buttons */}
            <div className="flex justify-between items-center pt-4 border-t border-stone-200">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-5 py-2.5 border border-stone-300 text-stone-700 hover:bg-stone-100 rounded-xl font-medium text-sm transition-colors flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Назад</span>
              </button>

              <button
                type="button"
                onClick={handleNextFromStep3}
                className="bg-rose-900 hover:bg-rose-950 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-xs flex items-center gap-2 cursor-pointer"
              >
                <span>Далее: Родственники</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ШАГ 4: Родственники (опционально) */}
        {/* ========================================================================= */}
        {currentStep === 4 && (
          <div className="p-6 md:p-8 space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-stone-200 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-900 flex items-center justify-center font-bold">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-stone-900">Шаг 4. Сведения о родителях / законных представителях</h3>
                  <p className="text-xs text-stone-500">Заполняется опционально для личного дела студента</p>
                </div>
              </div>

              <span className="text-xs font-semibold px-2.5 py-1 bg-stone-100 text-stone-700 rounded-lg">
                Шаг 4 из 6 (опционально)
              </span>
            </div>

            <div className="space-y-4">
              {relatives.map((rel, index) => (
                <div key={index} className="p-4 bg-stone-50 rounded-xl border border-stone-200 relative group space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-stone-700 uppercase">
                      Представитель #{index + 1}
                    </span>
                    {relatives.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveRelative(index)}
                        className="text-stone-400 hover:text-rose-700 p-1 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">Степень родства</label>
                      <select
                        value={rel.relation}
                        onChange={(e) => handleRelativeChange(index, 'relation', e.target.value)}
                        className="w-full px-3 py-2 border border-stone-300 rounded-xl text-stone-900 bg-white text-xs"
                      >
                        <option value="Мать">Мать</option>
                        <option value="Отец">Отец</option>
                        <option value="Опекун / Попечитель">Опекун / Попечитель</option>
                        <option value="Бабушка">Бабушка</option>
                        <option value="Дедушка">Дедушка</option>
                        <option value="Другой">Другой</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">ФИО представителя</label>
                      <input
                        type="text"
                        value={rel.fullName}
                        onChange={(e) => handleRelativeChange(index, 'fullName', e.target.value)}
                        placeholder="Иванова Анна Сергеевна"
                        className="w-full px-3 py-2 border border-stone-300 rounded-xl text-stone-900 bg-white text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">Контактный телефон</label>
                      <input
                        type="tel"
                        value={rel.phone}
                        onChange={(e) => handleRelativeChange(index, 'phone', e.target.value)}
                        placeholder="+7 (999) 111-22-33"
                        className="w-full px-3 py-2 border border-stone-300 rounded-xl text-stone-900 bg-white text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">Место работы / должность</label>
                      <input
                        type="text"
                        value={rel.workplace}
                        onChange={(e) => handleRelativeChange(index, 'workplace', e.target.value)}
                        placeholder="ООО НЭК, бухгалтер"
                        className="w-full px-3 py-2 border border-stone-300 rounded-xl text-stone-900 bg-white text-xs"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddRelative}
                className="inline-flex items-center gap-1.5 px-4 py-2 border border-dashed border-stone-300 hover:border-rose-700 text-stone-700 hover:text-rose-900 rounded-xl text-xs font-bold transition-all bg-white cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Добавить ещё одного представителя
              </button>
            </div>

            {/* Navigation buttons */}
            <div className="flex justify-between items-center pt-4 border-t border-stone-200">
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="px-5 py-2.5 border border-stone-300 text-stone-700 hover:bg-stone-100 rounded-xl font-medium text-sm transition-colors flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Назад</span>
              </button>

              <button
                type="button"
                onClick={handleNextFromStep4}
                className="bg-rose-900 hover:bg-rose-950 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-xs flex items-center gap-2 cursor-pointer"
              >
                <span>Далее: Воинский учёт</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ШАГ 5: Воинский учёт (опционально) */}
        {/* ========================================================================= */}
        {currentStep === 5 && (
          <div className="p-6 md:p-8 space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-stone-200 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-900 flex items-center justify-center font-bold">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-stone-900">Шаг 5. Воинский учёт</h3>
                  <p className="text-xs text-stone-500">Заполняется при наличии удостоверения призывника или военного билета</p>
                </div>
              </div>

              <span className="text-xs font-semibold px-2.5 py-1 bg-stone-100 text-stone-700 rounded-lg">
                Шаг 5 из 6 (опционально)
              </span>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  id="isRegistered"
                  checked={isRegistered}
                  onChange={(e) => setIsRegistered(e.target.checked)}
                  className="w-4 h-4 text-rose-800 rounded border-stone-300 focus:ring-rose-800 accent-rose-800 cursor-pointer"
                />
                <label htmlFor="isRegistered" className="text-sm font-bold text-stone-900 cursor-pointer">
                  Абитуриент состоит на воинском учёте
                </label>
              </div>

              {isRegistered && (
                <div className="p-5 bg-stone-50 rounded-2xl border border-stone-200 space-y-4 animate-in fade-in duration-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                        Статус воинского учёта
                      </label>
                      <select
                        value={militaryStatus}
                        onChange={(e) => setMilitaryStatus(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl text-stone-900 bg-white text-xs"
                      >
                        <option value="Подлежит призыву (призывник)">Подлежит призыву (призывник)</option>
                        <option value="Военнообязанный (в запасе)">Военнообязанный (в запасе)</option>
                        <option value="Не военнообязанный">Не военнообязанный</option>
                        <option value="Освобожден от воинской обязанности">Освобожден от воинской обязанности</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                        Военный комиссариат
                      </label>
                      <input
                        type="text"
                        value={commissariat}
                        onChange={(e) => setCommissariat(e.target.value)}
                        placeholder="Военный комиссариат Октябрьского района г. Новосибирска"
                        className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl text-stone-900 bg-white text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                        Документ воинского учёта
                      </label>
                      <select
                        value={militaryDocType}
                        onChange={(e) => setMilitaryDocType(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl text-stone-900 bg-white text-xs"
                      >
                        <option value="Удостоверение гражданина подлежащего призыву (приписное)">Приписное удостоверение</option>
                        <option value="Военный билет">Военный билет</option>
                        <option value="Справка взамен военного билета">Справка взамен военного билета</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                        Серия и номер документа
                      </label>
                      <input
                        type="text"
                        value={militaryDocNumber}
                        onChange={(e) => setMilitaryDocNumber(e.target.value)}
                        placeholder="АН № 1234567"
                        className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl text-stone-900 bg-white text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                        Категория годности
                      </label>
                      <select
                        value={fitnessCategory}
                        onChange={(e) => setFitnessCategory(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl text-stone-900 bg-white text-xs"
                      >
                        <option value="А">А — годен к военной службе</option>
                        <option value="Б">Б — годен с незначительными ограничениями</option>
                        <option value="В">В — ограниченно годен</option>
                        <option value="Г">Г — временно не годен</option>
                        <option value="Д">Д — не годен к военной службе</option>
                        <option value="Не установлена">Не установлена</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation buttons */}
            <div className="flex justify-between items-center pt-4 border-t border-stone-200">
              <button
                type="button"
                onClick={() => setCurrentStep(4)}
                className="px-5 py-2.5 border border-stone-300 text-stone-700 hover:bg-stone-100 rounded-xl font-medium text-sm transition-colors flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Назад</span>
              </button>

              <button
                type="button"
                onClick={handleNextFromStep5}
                className="bg-rose-900 hover:bg-rose-950 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-xs flex items-center gap-2 cursor-pointer"
              >
                <span>Далее: Выбор специальности</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ШАГ 6: Выбор специальности / профессии (образовательной программы) */}
        {/* ========================================================================= */}
        {currentStep === 6 && (() => {
          const filteredSpecialties = SPECIALTY_LIST.filter(item => {
            if (specialtyFundingFilter !== 'all' && item.funding !== specialtyFundingFilter) return false;
            if (specialtyTypeFilter !== 'all' && item.programType !== specialtyTypeFilter) return false;
            if (specialtySearch.trim()) {
              const q = specialtySearch.toLowerCase();
              return (
                item.fullName.toLowerCase().includes(q) ||
                item.name.toLowerCase().includes(q) ||
                (item.code && item.code.includes(q)) ||
                item.programTypeName.toLowerCase().includes(q)
              );
            }
            return true;
          });

          return (
            <div className="p-6 md:p-8 space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-stone-200 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-900 flex items-center justify-center font-bold">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-stone-900">Шаг 6. Выбор специальности / профессии</h3>
                    <p className="text-xs text-stone-500">
                      Укажите образовательную программу и основу обучения (бюджет / платная основа)
                    </p>
                  </div>
                </div>

                <span className="text-xs font-semibold px-2.5 py-1 bg-stone-100 text-stone-700 rounded-lg">
                  Шаг 6 из 7
                </span>
              </div>

              {/* Filters and search */}
              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-3">
                <div className="relative">
                  <input
                    type="text"
                    value={specialtySearch}
                    onChange={(e) => setSpecialtySearch(e.target.value)}
                    placeholder="Быстрый поиск по названию специальности, коду или ключевому слову..."
                    className="w-full pl-9 pr-3.5 py-2.5 text-xs sm:text-sm border border-stone-300 rounded-xl bg-white focus:ring-2 focus:ring-rose-800 focus:outline-none"
                  />
                  <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2.5 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-stone-500 font-semibold">Основа:</span>
                    <button
                      type="button"
                      onClick={() => setSpecialtyFundingFilter('all')}
                      className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        specialtyFundingFilter === 'all'
                          ? 'bg-rose-900 text-white shadow-2xs'
                          : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      Все ({SPECIALTY_LIST.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSpecialtyFundingFilter('Бюджет')}
                      className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        specialtyFundingFilter === 'Бюджет'
                          ? 'bg-emerald-700 text-white shadow-2xs'
                          : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      🟢 Бюджет (7)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSpecialtyFundingFilter('Платно')}
                      className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        specialtyFundingFilter === 'Платно'
                          ? 'bg-blue-700 text-white shadow-2xs'
                          : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      🔵 Платно (6)
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-stone-500 font-semibold">Тип программы:</span>
                    <button
                      type="button"
                      onClick={() => setSpecialtyTypeFilter('all')}
                      className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        specialtyTypeFilter === 'all'
                          ? 'bg-stone-800 text-white shadow-2xs'
                          : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      Все
                    </button>
                    <button
                      type="button"
                      onClick={() => setSpecialtyTypeFilter('ППССЗ')}
                      className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        specialtyTypeFilter === 'ППССЗ'
                          ? 'bg-stone-800 text-white shadow-2xs'
                          : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      Специальности (12)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSpecialtyTypeFilter('ППКРС')}
                      className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        specialtyTypeFilter === 'ППКРС'
                          ? 'bg-purple-800 text-white shadow-2xs'
                          : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      Профессия (1)
                    </button>
                  </div>
                </div>
              </div>

              {/* Cards List */}
              <div className="space-y-3 max-h-[52vh] overflow-y-auto pr-1">
                {filteredSpecialties.map((item) => {
                  const isSelected = selectedSpecialty === item.fullName;
                  const isPPKRS = item.programType === 'ППКРС';
                  const isBudget = item.funding === 'Бюджет';

                  return (
                    <label
                      key={item.id}
                      className={`flex items-start gap-3.5 p-4 rounded-2xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-rose-50/90 border-rose-600 ring-2 ring-rose-600/30 shadow-xs'
                          : 'bg-white border-stone-200 hover:border-stone-300 hover:bg-stone-50/60'
                      }`}
                    >
                      <input
                        type="radio"
                        name="specialtySelection"
                        value={item.fullName}
                        checked={isSelected}
                        onChange={() => setSelectedSpecialty(item.fullName)}
                        className="mt-1 w-4 h-4 text-rose-800 focus:ring-rose-800 accent-rose-800 shrink-0 cursor-pointer"
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <span className="font-bold text-sm text-stone-900">
                            {item.code ? `${item.code} ${item.name}` : item.name}
                          </span>

                          <span className={`text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-md border ${
                            isBudget
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              : 'bg-blue-100 text-blue-900 border-blue-300'
                          }`}>
                            {item.funding}
                          </span>

                          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md border ${
                            isPPKRS
                              ? 'bg-purple-100 text-purple-950 border-purple-300'
                              : 'bg-stone-100 text-stone-700 border-stone-200'
                          }`}>
                            {isPPKRS ? '★ Программа рабочих (ППКРС)' : 'Специальность (ППССЗ)'}
                          </span>

                          {item.code && (
                            <span className="text-[11px] font-mono text-stone-500 font-medium bg-stone-100 px-2 py-0.5 rounded">
                              код {item.code}
                            </span>
                          )}
                        </div>

                        {item.description && (
                          <p className="text-xs text-stone-600 leading-relaxed">
                            {item.description}
                          </p>
                        )}

                        {isPPKRS && (
                          <div className="mt-2 text-xs font-medium text-purple-950 bg-purple-50/90 p-2 rounded-xl border border-purple-200 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                            <span>
                              <strong>Пояснение:</strong> Электромонтер по ремонту и обслуживанию электрооборудования — это Программа подготовки квалифицированных рабочих, служащих (ППКРС).
                            </span>
                          </div>
                        )}
                      </div>
                    </label>
                  );
                })}

                {filteredSpecialties.length === 0 && (
                  <div className="p-8 text-center bg-stone-50 rounded-2xl border border-stone-200 text-stone-500 text-sm">
                    По заданным критериям специальности не найдены
                  </div>
                )}
              </div>

              {/* Альтернативные пожелания по специальностям */}
              <div className="p-5 bg-stone-50 rounded-2xl border border-stone-200 space-y-4">
                <div className="flex items-center gap-2 font-bold text-stone-900 text-sm pb-2 border-b border-stone-200">
                  <Layers className="w-4 h-4 text-rose-800" />
                  <span>Пожелания на другие специальности (Приоритеты 2 и 3) и коммерческий набор</span>
                </div>

                <label className="flex items-start gap-3 p-3.5 bg-white rounded-xl border border-stone-200 cursor-pointer select-none hover:bg-stone-50 transition-colors shadow-2xs">
                  <input
                    type="checkbox"
                    checked={commercialInterest}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setCommercialInterest(checked);
                      if (!checked) {
                        setSecondChoiceSpecialty('');
                        setThirdChoiceSpecialty('');
                      }
                    }}
                    className="mt-0.5 w-4 h-4 text-rose-800 rounded border-stone-300 focus:ring-rose-800 accent-rose-800 cursor-pointer shrink-0"
                  />
                  <div>
                    <span className="font-bold text-xs text-stone-900 block">
                      Рассматривать альтернативные специальности и платное (договорное) обучение
                    </span>
                    <span className="text-[11px] text-stone-500 font-normal leading-relaxed block mt-0.5">
                      Включает абитуриента в ведомость обзвона и резерв, а также открывает доступ к выбору 2-го и 3-го приоритетов специальностей.
                    </span>
                  </div>
                </label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">
                      2-й приоритет (Альтернативная специальность):
                    </label>
                    <select
                      value={secondChoiceSpecialty}
                      onChange={(e) => setSecondChoiceSpecialty(e.target.value)}
                      disabled={!commercialInterest}
                      className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl font-medium text-stone-900 focus:outline-none disabled:bg-stone-100 disabled:text-stone-400 disabled:cursor-not-allowed"
                    >
                      <option value="">{commercialInterest ? '-- Не выбрано --' : '-- Отключено (включите галочку выше) --'}</option>
                      {SPECIALTY_LIST.filter(s => s.fullName !== selectedSpecialty).map(s => (
                        <option key={s.id} value={s.fullName}>
                          {s.fullName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 mb-1">
                      3-й приоритет (Альтернативная специальность):
                    </label>
                    <select
                      value={thirdChoiceSpecialty}
                      onChange={(e) => setThirdChoiceSpecialty(e.target.value)}
                      disabled={!commercialInterest}
                      className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl font-medium text-stone-900 focus:outline-none disabled:bg-stone-100 disabled:text-stone-400 disabled:cursor-not-allowed"
                    >
                      <option value="">{commercialInterest ? '-- Не выбрано --' : '-- Отключено (включите галочку выше) --'}</option>
                      {SPECIALTY_LIST.filter(s => s.fullName !== selectedSpecialty && s.fullName !== secondChoiceSpecialty).map(s => (
                        <option key={s.id} value={s.fullName}>
                          {s.fullName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {!commercialInterest && (
                  <p className="text-[11px] text-amber-800 font-medium bg-amber-50 p-2.5 rounded-xl border border-amber-200/80">
                    💡 Чтобы указать 2-й и 3-й приоритеты специальностей, установите галочку разрешения выше.
                  </p>
                )}
              </div>

              {/* Navigation buttons */}
              <div className="flex justify-between items-center pt-4 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setCurrentStep(5)}
                  className="px-5 py-2.5 border border-stone-300 text-stone-700 hover:bg-stone-100 rounded-xl font-medium text-sm transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Назад к воинскому учёту</span>
                </button>

                <button
                  type="button"
                  onClick={handleNextFromStep6}
                  className="bg-rose-900 hover:bg-rose-950 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  <span>Далее: Льготы и документы</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })()}

        {/* ========================================================================= */}
        {/* ШАГ 7: Льготы при поступлении */}
        {/* ========================================================================= */}
        {currentStep === 7 && (
          <form onSubmit={handleFinalSubmit} className="p-6 md:p-8 space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-stone-200 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-stone-900">Шаг 7. Льготы при поступлении и подтверждающие документы</h3>
                  <p className="text-xs text-stone-500">Учёт участников СВО, детей участников СВО, сирот, целевого обучения и подтверждение права</p>
                </div>
              </div>

              <span className="text-xs font-semibold px-2.5 py-1 bg-stone-100 text-stone-700 rounded-lg">
                Шаг 7 из 7
              </span>
            </div>

            <div className="space-y-5">
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  id="hasBenefit"
                  checked={hasBenefit}
                  onChange={(e) => {
                    setHasBenefit(e.target.checked);
                    if (!e.target.checked) {
                      setSelectedDocumentId('');
                      setDocumentsVerified(false);
                    }
                  }}
                  className="w-4 h-4 text-rose-800 rounded border-stone-300 focus:ring-rose-800 accent-rose-800 cursor-pointer"
                />
                <label htmlFor="hasBenefit" className="text-sm font-bold text-stone-900 cursor-pointer">
                  Имеются льготы / особое право / целевое обучение при поступлении
                </label>
              </div>

              {hasBenefit && (() => {
                const eligibleBenefitDocs = applicantDocuments.filter(d => isDocumentEligibleForBenefit(d, benefit));
                const currentBenefitDef = getBenefitDefinition(benefit);

                return (
                <div className="p-5 bg-amber-50/70 rounded-2xl border border-amber-200/90 space-y-5 animate-in fade-in duration-200">
                  
                  {/* Шаг A: Категория льготы */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-amber-950 mb-1.5">
                      1. Категория льготы / особого права <span className="text-rose-700">*</span>
                    </label>
                    <select
                      value={benefit}
                      onChange={(e) => {
                        const newBenefit = e.target.value;
                        setBenefit(newBenefit);
                        const def = getBenefitDefinition(newBenefit);
                        if (def) {
                          setBenefitEffect(def.defaultEffect);
                        }
                        if (selectedDocumentId) {
                          const currentDoc = applicantDocuments.find(d => d.id === selectedDocumentId);
                          if (!currentDoc || !isDocumentEligibleForBenefit(currentDoc, newBenefit)) {
                            setSelectedDocumentId('');
                            setDocumentsVerified(false);
                          }
                        }
                      }}
                      required={hasBenefit}
                      className="w-full px-3.5 py-2.5 border border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-600 text-stone-900 bg-white text-sm font-medium"
                    >
                      <option value="">-- Выберите категорию льготы / права --</option>
                      {BENEFIT_DEFINITIONS.map(def => (
                        <option key={def.id} value={def.name}>
                          {def.name} ({def.shortName})
                        </option>
                      ))}
                    </select>
                    {currentBenefitDef?.description && (
                      <p className="text-xs text-amber-900/80 mt-1.5 flex items-center gap-1 font-medium">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                        <span>{currentBenefitDef.description}</span>
                      </p>
                    )}
                  </div>

                  {/* Шаг B: Выбор подтверждающего документа из реестра абитуриента */}
                  <div className="p-4 bg-white rounded-xl border border-amber-200/80 space-y-3">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-stone-800">
                          2. Подтверждающий документ из реестра абитуриента <span className="text-rose-700">*</span>
                        </label>
                        <p className="text-xs text-stone-500">
                          Для каждой льготы принимаются только специализированные справки, выписки или свидетельства
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsDocsModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-900 border border-rose-200 rounded-xl text-xs font-bold hover:bg-rose-100 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 text-rose-800" />
                        {eligibleBenefitDocs.length > 0 ? 'Открыть реестр документов' : '+ Добавить документ льготы'}
                      </button>
                    </div>

                    <select
                      value={selectedDocumentId}
                      onChange={(e) => setSelectedDocumentId(e.target.value)}
                      required={hasBenefit}
                      className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-800 text-stone-900 bg-white text-sm"
                    >
                      {eligibleBenefitDocs.length > 0 ? (
                        <>
                          <option value="">-- Выберите подходящий документ льготы из реестра --</option>
                          {eligibleBenefitDocs.map((docItem) => (
                            <option key={docItem.id} value={docItem.id}>
                              [{docItem.title || docItem.type}] {docItem.type} {docItem.documentNumber} от {displayRussianDate(docItem.issueDate)} (выдан: {docItem.issuedBy})
                            </option>
                          ))}
                        </>
                      ) : (
                        <option value="">-- В реестре нет подходящего документа для выбранной льготы --</option>
                      )}
                    </select>

                    {/* Если выбран документ — карточка */}
                    {selectedBenefitDoc ? (
                      <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs space-y-1.5 animate-in fade-in duration-150">
                        <div className="flex items-center justify-between font-bold text-amber-950">
                          <span className="flex items-center gap-1.5 text-sm">
                            <FileText className="w-4 h-4 text-amber-800" />
                            {selectedBenefitDoc.title}: {selectedBenefitDoc.type} {selectedBenefitDoc.documentNumber}
                          </span>
                          <span className="text-stone-500 font-normal">
                            Дата выдачи: {displayRussianDate(selectedBenefitDoc.issueDate)}
                          </span>
                        </div>
                        <div className="text-stone-700">
                          <span className="font-semibold text-stone-900">Кем выдано:</span> {selectedBenefitDoc.issuedBy}
                        </div>
                        {selectedBenefitDoc.details?.note && (
                          <div className="text-stone-600 italic">
                            Примечание: {selectedBenefitDoc.details.note}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-3 bg-stone-50 rounded-xl border border-dashed border-stone-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-stone-600">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                          <span>
                            {eligibleBenefitDocs.length === 0
                              ? `Для льготы «${benefit || '...'}» требуется внести подтверждающий документ (справку/удостоверение/выписку).`
                              : 'Выберите подходящую справку/выписку из списка или добавьте новую через кнопку.'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsDocsModalOpen(true)}
                          className="px-3 py-1 bg-amber-600 text-white font-bold rounded-lg text-xs hover:bg-amber-700 shrink-0 transition-colors cursor-pointer"
                        >
                          + Создать справку
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Шаг C: Чекбокс подтверждения */}
                  <div className={`p-4 rounded-xl border transition-all ${
                    selectedDocumentId 
                      ? 'bg-white border-amber-200/90' 
                      : 'bg-stone-100/70 border-stone-200 opacity-70'
                  }`}>
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        id="documentsVerified"
                        checked={documentsVerified}
                        disabled={!selectedDocumentId}
                        onChange={(e) => setDocumentsVerified(e.target.checked)}
                        className="w-4 h-4 text-rose-800 rounded border-stone-300 focus:ring-rose-800 accent-rose-800 cursor-pointer disabled:cursor-not-allowed"
                      />
                      <label 
                        htmlFor="documentsVerified" 
                        className={`text-xs font-bold uppercase tracking-wider cursor-pointer ${
                          selectedDocumentId ? 'text-stone-900' : 'text-stone-400 cursor-not-allowed'
                        }`}
                      >
                        3. Документы подтверждены <span className="text-rose-700">*</span>
                      </label>
                    </div>

                    {documentsVerified ? (
                      <div className="mt-2 text-xs text-emerald-800 font-semibold flex items-center gap-1.5 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                        <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                        Подлинность подтверждающего документа проверена приёмной комиссией
                      </div>
                    ) : (
                      <p className="mt-1.5 text-xs text-stone-500">
                        {selectedDocumentId 
                          ? 'Поставьте галочку после сверки оригиналов/копий справок и выписок'
                          : 'Сначала выберите подтверждающий документ из реестра для активации проверки'}
                      </p>
                    )}
                  </div>

                  {/* Шаг D: Что даёт льгота (включая Целевое обучение) */}
                  <div className={`p-4 rounded-xl border transition-all ${
                    selectedDocumentId && documentsVerified
                      ? 'bg-white border-amber-300'
                      : 'bg-stone-100/70 border-stone-200 opacity-60'
                  }`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold uppercase tracking-wider text-amber-950">
                        4. Что даёт льгота (Преимущество при зачислении) <span className="text-rose-700">*</span>
                      </label>
                      {!documentsVerified && (
                        <span className="text-[11px] text-amber-800 flex items-center gap-1 font-medium">
                          <Lock className="w-3 h-3" />
                          Заблокировано до подтверждения документов
                        </span>
                      )}
                    </div>

                    <select
                      value={benefitEffect}
                      onChange={(e) => setBenefitEffect(e.target.value)}
                      disabled={!selectedDocumentId || !documentsVerified}
                      required={hasBenefit}
                      className="w-full px-3.5 py-2.5 border border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-600 text-stone-900 bg-white text-sm disabled:bg-stone-100 disabled:cursor-not-allowed"
                    >
                      <option value="Целевое обучение">Целевое обучение (зачисление по квоте целевого приёма)</option>
                      <option value="Первоочередное зачисление">Первоочередное зачисление</option>
                      <option value="Преимущественное право зачисления">Преимущественное право зачисления при равных баллах</option>
                      <option value="Приём в пределах особой квоты">Приём в пределах особой квоты</option>
                      <option value="Приём в пределах отдельной квоты">Приём в пределах отдельной квоты (СВО)</option>
                      <option value="Иное преимущество">Иное преимущество</option>
                    </select>

                    {(!selectedDocumentId || !documentsVerified) && (
                      <p className="text-[11px] text-stone-500 mt-1.5 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-amber-700 shrink-0" />
                        Выбор предоставляемого преимущества (в т.ч. целевое обучение) доступен только после выбора документа и установки отметки «Документы подтверждены».
                      </p>
                    )}
                  </div>

                </div>
                );
              })()}
            </div>

            {/* Navigation and Save Buttons */}
            <div className="flex justify-between items-center pt-4 border-t border-stone-200">
              <button
                type="button"
                onClick={() => setCurrentStep(6)}
                className="px-5 py-2.5 border border-stone-300 text-stone-700 hover:bg-stone-100 rounded-xl font-medium text-sm transition-colors flex items-center gap-2 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Назад к специальности</span>
              </button>

              <button
                type="submit"
                disabled={saving}
                className="bg-rose-900 hover:bg-rose-950 text-white px-8 py-3 rounded-xl font-bold text-sm transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Сохранение в базу...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Завершить и перейти к формированию документов</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* ========================================================================= */}
        {/* ШАГ 8: Документы на подпись и выдача индивидуального кода */}
        {/* ========================================================================= */}
        {currentStep === 8 && createdApplicant && (
          <div className="p-6 md:p-8 space-y-8 animate-in fade-in duration-300">
            {/* Header / Success Banner */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-emerald-950">
                    Абитуриент успешно внесён в систему!
                  </h3>
                  <p className="text-sm text-emerald-800 mt-0.5">
                    Заявление № {createdApplicant.applicationNumber} | {createdApplicant.fullName} | {createdApplicant.specialtyName || createdApplicant.specialty}
                  </p>
                </div>
              </div>

              <span className="text-xs font-bold px-3 py-1.5 bg-emerald-100 text-emerald-900 rounded-xl">
                Завершающий шаг: Выдача кода и подпись документов
              </span>
            </div>

            {/* Карточка 1: Индивидуальный шифр поступающего */}
            <div className="bg-stone-900 text-white rounded-2xl p-6 space-y-4 shadow-md relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                <Shield className="w-48 h-48 text-white" />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                <div>
                  <div className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase tracking-wider mb-1">
                    <Sparkles className="w-4 h-4" />
                    <span>Индивидуальный анонимный шифр абитуриента</span>
                  </div>
                  <h4 className="text-stone-300 text-xs">
                    Для отслеживания своего текущего места в рейтинге на сайте без публикации ФИО
                  </h4>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (createdApplicant.applicantCode) {
                        navigator.clipboard.writeText(createdApplicant.applicantCode);
                        toast.success('Индивидуальный код скопирован в буфер обмена!');
                      }
                    }}
                    className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2 border border-stone-700 cursor-pointer"
                  >
                    <span>Скопировать код</span>
                  </button>
                  <Link
                    to={`/rating?code=${createdApplicant.applicantCode}`}
                    target="_blank"
                    className="px-4 py-2 bg-rose-800 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Открыть в рейтинге</span>
                  </Link>
                </div>
              </div>

              <div className="bg-stone-950/80 p-4 rounded-xl border border-stone-800 flex items-center justify-between relative z-10">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-stone-400 block font-semibold mb-0.5">
                    Уникальный код для абитуриента:
                  </span>
                  <span className="text-3xl font-extrabold text-rose-400 font-mono tracking-widest">
                    {createdApplicant.applicantCode}
                  </span>
                </div>
                <div className="text-right text-xs text-stone-400 max-w-xs hidden sm:block">
                  Выдайте этот код абитуриенту или родителю. Он используется для поиска своего заявления в публичных конкурсных списках.
                </div>
              </div>
            </div>

            {/* Карточка 2: Генерация и подписание документов в конце регистрационного цикла */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-base font-bold text-stone-900 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-rose-800" />
                    Обязательные документы для подписания
                  </h4>
                  <p className="text-xs text-stone-500">
                    Сформируйте бланки согласий в формате MS Word (.docx), распечатайте и отметьте статус подписания.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Согласие на обработку персональных данных */}
                <div className={`p-5 rounded-2xl border transition-all space-y-4 ${
                  createdApplicant.dataProcessingConsentSigned
                    ? 'bg-emerald-50/50 border-emerald-300'
                    : 'bg-white border-stone-200'
                }`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-stone-100 text-stone-700 rounded-md">
                        ФЗ №152-ФЗ
                      </span>
                      <h5 className="font-bold text-stone-900 text-sm mt-1.5">
                        Согласие на обработку и хранение персональных данных
                      </h5>
                      <p className="text-xs text-stone-500 mt-0.5">
                        Обязательно для каждого абитуриента при подаче заявления в приёмную комиссию.
                      </p>
                    </div>

                    {createdApplicant.dataProcessingConsentSigned ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 bg-emerald-100 text-emerald-900 rounded-lg shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                        Подписано
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 bg-amber-100 text-amber-900 rounded-lg shrink-0">
                        <Clock className="w-3.5 h-3.5 text-amber-700" />
                        Ожидает
                      </span>
                    )}
                  </div>

                  <div className="pt-2 border-t border-stone-200/80 flex flex-col gap-3">
                    <button
                      type="button"
                      onClick={() => generateDataProcessingConsent(createdApplicant)}
                      className="w-full py-2.5 px-4 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                    >
                      <Download className="w-4 h-4 text-stone-300" />
                      <span>Скачать бланк согласия (.docx)</span>
                    </button>

                    <label className="flex items-center gap-3 p-2.5 bg-stone-50 rounded-xl border border-stone-200 cursor-pointer hover:bg-stone-100 transition-colors">
                      <input
                        type="checkbox"
                        checked={createdApplicant.dataProcessingConsentSigned || false}
                        onChange={(e) => handleToggleDataProcessingConsent(e.target.checked)}
                        className="w-4 h-4 text-emerald-600 rounded border-stone-300 focus:ring-emerald-600 accent-emerald-600"
                      />
                      <span className="text-xs font-semibold text-stone-800">
                        Оригинал согласия подписан абитуриентом и сдан
                      </span>
                    </label>
                  </div>
                </div>

                {/* 2. Согласие родителя / законного представителя */}
                {(() => {
                  const age = calculateAge(createdApplicant.birthDate);
                  const isMinor = age < 18;

                  return (
                    <div className={`p-5 rounded-2xl border transition-all space-y-4 ${
                      !isMinor
                        ? 'bg-stone-50 border-stone-200 opacity-80'
                        : createdApplicant.parentalConsentSigned
                        ? 'bg-emerald-50/50 border-emerald-300'
                        : 'bg-amber-50/30 border-amber-200'
                    }`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                            isMinor
                              ? 'bg-rose-100 text-rose-900'
                              : 'bg-stone-200 text-stone-700'
                          }`}>
                            Возраст: {age > 0 ? `${age} лет` : 'Не указан'} {isMinor ? '(Несовершеннолетний)' : '(Совершеннолетний)'}
                          </span>
                          <h5 className="font-bold text-stone-900 text-sm mt-1.5">
                            Заявление законного представителя (Родителя / Опекуна)
                          </h5>
                          <p className="text-xs text-stone-500 mt-0.5">
                            {isMinor
                              ? 'Требуется для абитуриентов моложе 18 лет согласно законодательству РФ.'
                              : 'Не требуется, так как абитуриент достиг 18-летнего возраста.'}
                          </p>
                        </div>

                        {isMinor ? (
                          createdApplicant.parentalConsentSigned ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 bg-emerald-100 text-emerald-900 rounded-lg shrink-0">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                              Подписано
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 bg-amber-100 text-amber-900 rounded-lg shrink-0">
                              <Clock className="w-3.5 h-3.5 text-amber-700" />
                              Ожидает
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 bg-stone-200 text-stone-600 rounded-lg shrink-0">
                            Не требуется
                          </span>
                        )}
                      </div>

                      {isMinor ? (
                        <div className="pt-2 border-t border-stone-200/80 flex flex-col gap-3">
                          <button
                            type="button"
                            onClick={() => generateParentalConsent(createdApplicant)}
                            className="w-full py-2.5 px-4 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                          >
                            <Download className="w-4 h-4 text-stone-300" />
                            <span>Скачать согласие родителя (.docx)</span>
                          </button>

                          <label className="flex items-center gap-3 p-2.5 bg-stone-50 rounded-xl border border-stone-200 cursor-pointer hover:bg-stone-100 transition-colors">
                            <input
                              type="checkbox"
                              checked={createdApplicant.parentalConsentSigned || false}
                              onChange={(e) => handleToggleParentalConsent(e.target.checked)}
                              className="w-4 h-4 text-emerald-600 rounded border-stone-300 focus:ring-emerald-600 accent-emerald-600"
                            />
                            <span className="text-xs font-semibold text-stone-800">
                              Оригинал согласия родителя подписан и сдан
                            </span>
                          </label>
                        </div>
                      ) : (
                        <div className="pt-2 border-t border-stone-200/80 text-xs text-stone-500">
                          Поскольку абитуриент достиг совершеннолетия, подпись родителя не требуется.
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Карточка 3: Чек-лист документов для очного визита & Контакты */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
                <h5 className="text-xs font-bold uppercase tracking-wider text-stone-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Памятка для абитуриента (Что принести в колледж)
                </h5>
                <ul className="text-xs text-stone-700 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-800 mt-1.5 shrink-0" />
                    <span><strong>Оригинал документа об образовании</strong> (если подана копия)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-800 mt-1.5 shrink-0" />
                    <span><strong>5 фотографии 3х4 см</strong> (цветные)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-800 mt-1.5 shrink-0" />
                    <span><strong>Медицинская справка 086/у</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-800 mt-1.5 shrink-0" />
                    <span>Подписанные заявления и согласия</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-800 mt-1.5 shrink-0" />
                    <span>Копия паспорта и СНИЛС</span>
                  </li>
                </ul>
              </div>

              <div className="p-5 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
                <h5 className="text-xs font-bold uppercase tracking-wider text-stone-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-rose-800" />
                  Контакты приёмной комиссии
                </h5>
                <div className="text-xs text-stone-700 space-y-2">
                  <p><strong>Адрес:</strong> г. Новосибирск, ул. Первомайская, 202</p>
                  <p><strong>Телефон:</strong> 8 (383) 337-23-27, 8 (383) 337-25-56</p>
                  <p><strong>Режим работы:</strong> Пн–Пт: 09:00 – 16:00</p>
                  <p><strong>Email:</strong> priem_nemk.2020@mail.ru</p>
                </div>
              </div>
            </div>

            {/* Actions footer */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-stone-200">
              <Link
                to={`/rating?code=${createdApplicant.applicantCode}`}
                target="_blank"
                className="px-5 py-2.5 border border-stone-300 text-stone-800 hover:bg-stone-100 rounded-xl font-semibold text-sm transition-colors flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4 text-stone-600" />
                <span>Проверить абитуриента в публичном рейтинге</span>
              </Link>

              <button
                type="button"
                onClick={() => navigate(`/campaign/${id}`)}
                className="bg-rose-900 hover:bg-rose-950 text-white px-8 py-3 rounded-xl font-bold text-sm transition-all shadow-md flex items-center gap-2 cursor-pointer"
              >
                <span>Завершить и перейти к списку абитуриентов</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Модальное окно индивидуального реестра документов абитуриента */}
      <ApplicantDocumentsModal
        isOpen={isDocsModalOpen}
        onClose={() => setIsDocsModalOpen(false)}
        documents={applicantDocuments}
        onUpdateDocuments={(updatedDocs) => {
          setApplicantDocuments(updatedDocs);
        }}
        applicantName={applicantFullName || 'Новый абитуриент'}
        targetBenefitCategory={hasBenefit && benefit ? benefit : undefined}
        startInAddMode={hasBenefit && !applicantDocuments.some(d => isDocumentEligibleForBenefit(d, benefit))}
        onSelectDocumentForBenefit={(docItem) => {
          setSelectedDocumentId(docItem.id);
          if (docItem.details?.benefitCategory && !benefit) {
            setBenefit(docItem.details.benefitCategory);
          }
        }}
      />
    </div>
  );
}
