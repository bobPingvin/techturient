export interface Campaign {
  id: string;
  name: string;
  createdAt: number;
}

export type DocumentCategory = 'identity' | 'education' | 'benefit' | 'military' | 'other';

export interface ApplicantDocument {
  id: string;
  category: DocumentCategory;
  title: string; // "Документ, подтверждающий личность", "Документ об образовании", "Документ, подтверждающий участие в боевых действиях, СВО", "Договор о целевом обучении" и др.
  type: string; // 'Паспорт РФ', 'Справка', 'Выписка из справки / приказа', 'Удостоверение', 'Аттестат', 'Диплом', 'Договор'
  documentNumber: string;
  issueDate: string;
  issuedBy: string;
  beneficiaryName?: string;
  details?: {
    series?: string;
    subdivisionCode?: string;
    birthDate?: string;
    snils?: string;
    school?: string;
    grades?: {
      threes: number;
      fours: number;
      fives: number;
    };
    averageScore?: number;
    submissionType?: 'original' | 'copy';
    benefitCategory?: string;
    benefitEffect?: string;
    note?: string;
    [key: string]: any;
  };
  isVerified?: boolean;
  createdAt: number;
}

export interface BenefitDocument {
  id: string;
  type: string; // 'Справка', 'Выписка из справки / приказа', 'Удостоверение', 'Свидетельство', 'Договор', 'Иной документ'
  documentNumber: string; // Номер справки / выписки
  issueDate: string; // Дата выдачи
  issuedBy: string; // Кем выдано
  beneficiaryName?: string; // Кому выдано (ФИО)
  benefitCategory?: string; // Категория льготы
  note?: string; // Дополнительное примечание / основание
  createdAt: number;
}

export interface Relative {
  id?: string;
  relation: string; // Мать, Отец, Опекун, Другой
  fullName: string;
  phone: string;
  workplace: string;
}

export interface MilitaryRecord {
  isRegistered: boolean;
  status: string; // Подлежит призыву (призывник), Военнообязанный (в запасе), Не военнообязанный, Освобожден от воинской обязанности
  commissariat: string; // Военный комиссариат (наименование)
  documentType: string; // Удостоверение гражданина подлежащего призыву (приписное), Военный билет, Справка
  documentNumber: string; // Серия и номер документа
  fitnessCategory: string; // Категория годности: А, Б, В, Г, Д, Не установлена
}

export interface Applicant {
  id: string;
  campaignId: string;
  applicationNumber?: string;
  
  // ФИО и базовые данные
  lastName: string;
  firstName: string;
  middleName: string;
  fullName: string; // full calculated name
  phone: string; // Номер телефона абитуриента
  birthDate: string;
  gender: 'Мужской' | 'Женский' | string;
  snils: string;

  // Паспорт
  passportSeries: string;
  passportNumber: string;
  passportIssuedBy: string;
  passportIssueDate: string;
  passportSubdivisionCode: string;
  passport?: string;

  // Адрес
  residence: string;
  registration: string;
  matchesResidence: boolean;
  locality: string;

  // Аттестат (только номер)
  school: string;
  certificateType: string;
  certificateNumber: string;
  issueDate: string;
  grades: {
    threes: number;
    fours: number;
    fives: number;
  };
  averageScore: number;
  educationDocumentSubmissionType?: 'original' | 'copy'; // 'original' - Оригинал (по умолчанию), 'copy' - Копия (забрал документы / только копия)

  // Выбранная специальность / профессия
  specialty?: string; // e.g. "Электроснабжение (Бюджет)"
  specialtyName?: string; // e.g. "Электроснабжение"
  fundingType?: 'Бюджет' | 'Платно' | string;
  programType?: 'ППССЗ' | 'ППКРС' | string;

  // Альтернативные пожелания по специальностям и коммерческое зачисление (Обзвон)
  alternativeSpecialties?: string[]; // Пожелания на другие специальности (приоритеты 2, 3 и т.д.)
  commercialInterest?: boolean; // Готовность учиться по договору на платной основе
  callStatus?: 'not_called' | 'agreed_paid' | 'agreed_budget' | 'thinking' | 'refused' | 'unreachable' | string; // Статус обзвона
  callNote?: string; // Комментарий / результат разговора при обзвоне
  callUpdatedAt?: number; // Дата/время обновления статуса обзвона

  // Льготы и документы подтверждения
  hasBenefit?: boolean;
  benefit: string; // Категория льготы
  benefitDocumentId?: string; // ID выбранного документа из реестра
  benefitDocumentType?: string; // Справка / Выписка
  benefitDocumentNumber?: string; // Номер
  benefitDocumentIssuedBy?: string; // Кем выдано
  benefitDocumentIssueDate?: string; // Дата выдачи
  documentsVerified?: boolean; // Галочка "Документы подтверждены"
  benefitEffect: string; // Что даёт (Целевое обучение, Первоочередное зачисление и т.д.)

  // Индивидуальный код поступающего для публичного рейтинга
  applicantCode?: string;

  // Статусы подписи обязательных документов
  dataProcessingConsentSigned?: boolean; // Согласие на обработку персональных данных (Обязательно для всех)
  parentalConsentSigned?: boolean; // Заявление родителя / законного представителя (Обязательно при возрасте < 18 лет)

  // Индивидуальный реестр документов абитуриента
  documents?: ApplicantDocument[];

  // Сведения о родственниках (опционально)
  relatives?: Relative[];

  // Воинский учёт
  militaryRecord?: MilitaryRecord;

  createdAt: number;
}

export interface AuditLog {
  id: string;
  username: string;
  action: string;
  description: string;
  timestamp: number;
  campaignId?: string;
  applicantId?: string;
  details?: string;
}


