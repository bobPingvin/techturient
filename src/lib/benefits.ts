import { ApplicantDocument } from '../types';

export interface BenefitCategoryDefinition {
  id: string;
  name: string;
  shortName: string;
  description: string;
  allowedDocTypes: string[];
  defaultEffect: string;
  defaultIssuerPlaceholder: string;
  defaultNumberPlaceholder: string;
  exampleDocTitle: string;
  badgeBg: string;
  badgeText: string;
}

export const BENEFIT_DEFINITIONS: BenefitCategoryDefinition[] = [
  {
    id: 'svo_child',
    name: 'Ребенок участника СВО',
    shortName: 'Ребёнок участника СВО',
    description: 'Дети военнослужащих и сотрудников, принимающих (принимавших) участие в специальной военной операции',
    allowedDocTypes: [
      'Справка об участии родителя в СВО (форма Минобороны РФ)',
      'Справка военного комиссариата об участии родителя в СВО',
      'Справка воинской части об участии родителя в СВО',
      'Справка филиала Государственного фонда «Защитники Отечества»',
      'Удостоверение члена семьи погибшего (умершего) ветерана боевых действий',
      'Справка о ранении (травме, контузии) родителя при выполнении задач СВО',
      'Иной подтверждающий документ об участии родителя в СВО'
    ],
    defaultEffect: 'Первоочередное зачисление (в рамках отдельной квоты)',
    defaultIssuerPlaceholder: 'Военный комиссариат / Воинская часть / Госфонд «Защитники Отечества»',
    defaultNumberPlaceholder: '145/СВО-24',
    exampleDocTitle: 'Справка об участии родителя в специальной военной операции (СВО)',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-900',
  },
  {
    id: 'svo_participant',
    name: 'Участник СВО',
    shortName: 'Участник СВО',
    description: 'Военнослужащие, добровольцы, мобилизованные граждане, принимавшие (принимающие) участие в СВО',
    allowedDocTypes: [
      'Справка об участии в СВО (форма Минобороны РФ)',
      'Удостоверение ветерана боевых действий',
      'Справка военного комиссариата',
      'Выписка из приказа командира воинской части',
      'Удостоверение к государственной награде РФ за участие в СВО',
      'Иной подтверждающий документ участника СВО'
    ],
    defaultEffect: 'Первоочередное зачисление (в рамках отдельной квоты)',
    defaultIssuerPlaceholder: 'Военный комиссариат / Командир войсковой части / Минобороны РФ',
    defaultNumberPlaceholder: 'СВО-872/2024',
    exampleDocTitle: 'Справка об участии в специальной военной операции (СВО)',
    badgeBg: 'bg-red-100',
    badgeText: 'text-red-900',
  },
  {
    id: 'combat_veteran',
    name: 'Ветеран боевых действий',
    shortName: 'Ветеран БД',
    description: 'Ветераны боевых действий на территории РФ и других государств согласно ФЗ «О ветеранах»',
    allowedDocTypes: [
      'Удостоверение ветерана боевых действий',
      'Справка военного комиссариата о статусе ветерана боевых действий',
      'Свидетельство о праве на льготы ветерана боевых действий',
      'Иной документ, подтверждающий статус ветерана БД'
    ],
    defaultEffect: 'Первоочередное зачисление (в рамках отдельной квоты)',
    defaultIssuerPlaceholder: 'Военный комиссариат / МВД РФ / ФСБ РФ / Росгвардия',
    defaultNumberPlaceholder: 'ВБД № 0123456',
    exampleDocTitle: 'Удостоверение ветерана боевых действий',
    badgeBg: 'bg-orange-100',
    badgeText: 'text-orange-900',
  },
  {
    id: 'orphan',
    name: 'Дети-сироты и дети без попечения',
    shortName: 'Дети-сироты / Опека',
    description: 'Дети-сироты и дети, оставшиеся без попечения родителей, а также лица из числа детей-сирот',
    allowedDocTypes: [
      'Справка органа опеки и попечительства',
      'Распоряжение / Акт органа опеки о назначении опекуна (попечителя)',
      'Свидетельства о смерти родителей (обоих или единственного)',
      'Решение суда о лишении / ограничении родительских прав',
      'Справка из организации для детей-сирот и детей без попечения',
      'Иной подтверждающий документ статуса сироты / опекаемого'
    ],
    defaultEffect: 'Первоочередное зачисление (в рамках отдельной квоты)',
    defaultIssuerPlaceholder: 'Отдел опеки и попечительства Администрации / Орган ЗАГС / Суд',
    defaultNumberPlaceholder: '№ 45-ОП/2024',
    exampleDocTitle: 'Справка органа опеки и попечительства',
    badgeBg: 'bg-purple-100',
    badgeText: 'text-purple-900',
  },
  {
    id: 'disability',
    name: 'Инвалид I или II группы',
    shortName: 'Инвалидность I/II гр. / Ребёнок-инвалид',
    description: 'Инвалиды I и II групп, дети-инвалиды, инвалиды с детства согласно заключению МСЭ',
    allowedDocTypes: [
      'Справка МСЭ (медико-социальной экспертизы) об установлении инвалидности',
      'Индивидуальная программа реабилитации или абилитации инвалида (ИПРА)',
      'Заключение психолого-медико-педагогической комиссии (ПМПК)',
      'Справка об инвалидности с детства',
      'Иной документ МСЭ / Минздрава об инвалидности'
    ],
    defaultEffect: 'Вне конкурса (особая квота)',
    defaultIssuerPlaceholder: 'ФКУ «Главное бюро МСЭ» / Бюро медико-социальной экспертизы',
    defaultNumberPlaceholder: 'МСЭ-2024 № 1234567',
    exampleDocTitle: 'Справка МСЭ об установлении инвалидности',
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-900',
  },
  {
    id: 'target_contract',
    name: 'Целевое направление',
    shortName: 'Целевое обучение',
    description: 'Граждане, поступающие на обучение по договорам о целевом обучении с организациями и ведомствами',
    allowedDocTypes: [
      'Договор о целевом обучении',
      'Соглашение о целевом обучении (ЕЦП «Работа в России»)',
      'Двусторонний / трехсторонний договор с организацией-заказчиком',
      'Выписка из реестра целевых договоров',
      'Иной договор / соглашение о целевом обучении'
    ],
    defaultEffect: 'Целевое обучение (отдельный конкурс / квота целевого приёма)',
    defaultIssuerPlaceholder: 'Организация-заказчик / Предприятие / Ведомство / Министерство',
    defaultNumberPlaceholder: 'Договор № ЦО-2024/018',
    exampleDocTitle: 'Договор о целевом обучении',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-900',
  },
  {
    id: 'other_benefit',
    name: 'Иная льготная категория',
    shortName: 'Иная льгота',
    description: 'Иные категории граждан, имеющие особые права и преимущества при приёме на обучение',
    allowedDocTypes: [
      'Справка, подтверждающая право на льготу',
      'Удостоверение, подтверждающее право на льготу',
      'Распорядительный акт / Решение уполномоченного органа',
      'Иной подтверждающий документ'
    ],
    defaultEffect: 'Преимущественное право зачисления при равенстве баллов',
    defaultIssuerPlaceholder: 'Уполномоченный государственный орган / Ведомство',
    defaultNumberPlaceholder: '№ 567/ЛГ',
    exampleDocTitle: 'Документ, подтверждающий льготную категорию',
    badgeBg: 'bg-stone-100',
    badgeText: 'text-stone-900',
  }
];

export function getBenefitDefinition(benefitName?: string): BenefitCategoryDefinition | undefined {
  if (!benefitName) return undefined;
  const trimmed = benefitName.trim().toLowerCase();
  return BENEFIT_DEFINITIONS.find(def => 
    def.name.toLowerCase() === trimmed || 
    def.id.toLowerCase() === trimmed ||
    trimmed.includes(def.name.toLowerCase()) ||
    def.name.toLowerCase().includes(trimmed)
  );
}

/**
 * Checks if a document is legally suitable to prove a benefit.
 * Passports, Identity documents, School diplomas/certificates, and Military registration cards
 * are NOT benefit documents and will return false.
 */
export function isDocumentEligibleForBenefit(
  doc: ApplicantDocument,
  benefitName?: string
): boolean {
  if (!doc) return false;

  // Identity, Education, and Military registration documents CANNOT be used as benefit documents
  if (doc.category === 'identity' || doc.category === 'education' || doc.category === 'military') {
    return false;
  }

  // Must be category 'benefit' or specifically created for benefit
  if (doc.category !== 'benefit') {
    return false;
  }

  // If specific benefit is selected, check if document details match or are general benefit
  if (benefitName && benefitName.trim() !== '') {
    const docBenefitCategory = doc.details?.benefitCategory;
    if (docBenefitCategory && docBenefitCategory.trim() !== '') {
      const def = getBenefitDefinition(benefitName);
      const docDef = getBenefitDefinition(docBenefitCategory);
      if (def && docDef && def.id !== docDef.id) {
        // Document belongs to a different specific benefit category
        return false;
      }
    }
  }

  return true;
}

/**
 * Returns allowed document types for a specific benefit category.
 */
export function getAllowedDocTypesForBenefit(benefitName?: string): string[] {
  const def = getBenefitDefinition(benefitName);
  if (def) {
    return def.allowedDocTypes;
  }
  return [
    'Справка, подтверждающая право на льготу',
    'Удостоверение',
    'Выписка из приказа / справки',
    'Акт / Распоряжение',
    'Договор о целевом обучении',
    'Иной подтверждающий документ'
  ];
}
