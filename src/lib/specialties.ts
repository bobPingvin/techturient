export interface SpecialtyItem {
  id: string;
  fullName: string; // Полное название с формой финансирования, e.g. "Электроснабжение (Бюджет)"
  name: string; // Название без финансирования, e.g. "Электроснабжение"
  funding: 'Бюджет' | 'Платно';
  programType: 'ППССЗ' | 'ППКРС';
  programTypeName: string; // 'Специальность (ППССЗ)' или 'Программа подготовки квалифицированных рабочих, служащих (ППКРС)'
  code?: string;
  capacity?: number;
  description?: string;
}

export const SPECIALTY_LIST: SpecialtyItem[] = [
  // 1. Электроснабжение
  {
    id: 'electrosnabzhenie_budget',
    fullName: 'Электроснабжение (Бюджет)',
    name: 'Электроснабжение',
    funding: 'Бюджет',
    programType: 'ППССЗ',
    programTypeName: 'Специальность (ППССЗ)',
    code: '13.02.07',
    capacity: 50,
    description: 'Подготовка специалистов среднего звена в области электроснабжения промышленных и гражданских объектов.'
  },
  {
    id: 'electrosnabzhenie_paid',
    fullName: 'Электроснабжение (Платно)',
    name: 'Электроснабжение',
    funding: 'Платно',
    programType: 'ППССЗ',
    programTypeName: 'Специальность (ППССЗ)',
    code: '13.02.07',
    capacity: 50,
    description: 'Обучение с полным возмещением затрат (коммерческая основа).'
  },

  // 2. Эксплуатация и обслуживание электрического и электромеханического оборудования
  {
    id: 'electric_equipment_budget',
    fullName: 'Эксплуатация и обслуживание электрического и электромеханического оборудования (Бюджет)',
    name: 'Эксплуатация и обслуживание электрического и электромеханического оборудования',
    funding: 'Бюджет',
    programType: 'ППССЗ',
    programTypeName: 'Специальность (ППССЗ)',
    code: '13.02.13',
    capacity: 25,
    description: 'Монтаж, наладка и эксплуатация электрических машин, аппаратов и автоматики.'
  },
  {
    id: 'electric_equipment_paid',
    fullName: 'Эксплуатация и обслуживание электрического и электромеханического оборудования (Платно)',
    name: 'Эксплуатация и обслуживание электрического и электромеханического оборудования',
    funding: 'Платно',
    programType: 'ППССЗ',
    programTypeName: 'Специальность (ППССЗ)',
    code: '13.02.13',
    capacity: 25,
    description: 'Обучение с полным возмещением затрат (коммерческая основа).'
  },

  // 3. Разработка и управление программным обеспечением
  {
    id: 'software_dev_budget',
    fullName: 'Разработка и управление программным обеспечением (Бюджет)',
    name: 'Разработка и управление программным обеспечением',
    funding: 'Бюджет',
    programType: 'ППССЗ',
    programTypeName: 'Специальность (ППССЗ)',
    code: '09.02.11',
    capacity: 25,
    description: 'Программирование, проектирование баз данных, разработка веб и мобильных приложений.'
  },
  {
    id: 'software_dev_paid',
    fullName: 'Разработка и управление программным обеспечением (Платно)',
    name: 'Разработка и управление программным обеспечением',
    funding: 'Платно',
    programType: 'ППССЗ',
    programTypeName: 'Специальность (ППССЗ)',
    code: '09.02.11',
    capacity: 25,
    description: 'Обучение с полным возмещением затрат (коммерческая основа).'
  },

  // 4. Техническое обслуживание и ремонт автотранспортных средств
  {
    id: 'auto_repair_budget',
    fullName: 'Техническое обслуживание и ремонт автотранспортных средств (Бюджет)',
    name: 'Техническое обслуживание и ремонт автотранспортных средств',
    funding: 'Бюджет',
    programType: 'ППССЗ',
    programTypeName: 'Специальность (ППССЗ)',
    code: '23.02.07',
    capacity: 50,
    description: 'Диагностика, регламентное ТО и ремонт легкового и грузового автомобильного транспорта.'
  },
  {
    id: 'auto_repair_paid',
    fullName: 'Техническое обслуживание и ремонт автотранспортных средств (Платно)',
    name: 'Техническое обслуживание и ремонт автотранспортных средств',
    funding: 'Платно',
    programType: 'ППССЗ',
    programTypeName: 'Специальность (ППССЗ)',
    code: '23.02.07',
    capacity: 50,
    description: 'Обучение с полным возмещением затрат (коммерческая основа).'
  },

  // 5. Эксплуатация транспортного электрооборудования и автоматики
  {
    id: 'transport_electrical_budget',
    fullName: 'Эксплуатация транспортного электрооборудования и автоматики (Бюджет)',
    name: 'Эксплуатация транспортного электрооборудования и автоматики',
    funding: 'Бюджет',
    programType: 'ППССЗ',
    programTypeName: 'Специальность (ППССЗ)',
    code: '23.02.05',
    capacity: 25,
    description: 'Электрооборудование и микропроцессорные системы наземного транспорта.'
  },
  {
    id: 'transport_electrical_paid',
    fullName: 'Эксплуатация транспортного электрооборудования и автоматики (Платно)',
    name: 'Эксплуатация транспортного электрооборудования и автоматики',
    funding: 'Платно',
    programType: 'ППССЗ',
    programTypeName: 'Специальность (ППССЗ)',
    code: '23.02.05',
    capacity: 25,
    description: 'Обучение с полным возмещением затрат (коммерческая основа).'
  },

  // 6. Техническая эксплуатация подъемно-транспортных, строительных, дорожных машин и оборудования
  {
    id: 'machinery_operation_budget',
    fullName: 'Техническая эксплуатация подъемно-транспортных, строительных, дорожных машин и оборудования (Бюджет)',
    name: 'Техническая эксплуатация подъемно-транспортных, строительных, дорожных машин и оборудования',
    funding: 'Бюджет',
    programType: 'ППССЗ',
    programTypeName: 'Специальность (ППССЗ)',
    code: '23.02.04',
    capacity: 25,
    description: 'Обслуживание кранов, подъемников, экскаваторов и тяжелой дорожно-строительной техники.'
  },
  {
    id: 'machinery_operation_paid',
    fullName: 'Техническая эксплуатация подъемно-транспортных, строительных, дорожных машин и оборудования (Платно)',
    name: 'Техническая эксплуатация подъемно-транспортных, строительных, дорожных машин и оборудования',
    funding: 'Платно',
    programType: 'ППССЗ',
    programTypeName: 'Специальность (ППССЗ)',
    code: '23.02.04',
    capacity: 25,
    description: 'Обучение с полным возмещением затрат (коммерческая основа).'
  },

  // 7. Электромонтер по ремонту и обслуживанию электрооборудования (ППКРС)
  {
    id: 'electrician_profession_budget',
    fullName: 'Электромонтер по ремонту и обслуживанию электрооборудования (Бюджет)',
    name: 'Электромонтер по ремонту и обслуживанию электрооборудования',
    funding: 'Бюджет',
    programType: 'ППКРС',
    programTypeName: 'Программа подготовки квалифицированных рабочих, служащих (ППКРС)',
    code: '13.01.10',
    capacity: 50,
    description: 'Профессия рабочего: слесарные, монтажные и пусконаладочные электротехнические работы.'
  }
];

export function getSpecialtyByFullName(fullName?: string): SpecialtyItem | undefined {
  if (!fullName) return undefined;
  const q = fullName.toLowerCase().trim();
  return SPECIALTY_LIST.find(s => 
    s.fullName.toLowerCase() === q || 
    s.id.toLowerCase() === q || 
    s.name.toLowerCase() === q ||
    `${s.code} ${s.name}`.toLowerCase() === q ||
    q.includes(s.name.toLowerCase())
  );
}

export function formatSpecialtyDisplay(specialtyStr?: string, specialtyName?: string): string {
  if (!specialtyStr) return 'Не указана';
  const specObj = getSpecialtyByFullName(specialtyStr);
  let rawName = specialtyName || specObj?.name || specialtyStr;
  let cleanName = rawName
    .replace(/\s*\((Бюджет|Платно)\)\s*/gi, '')
    .replace(/^[0-9]{2}\.[0-9]{2}\.[0-9]{2}\s*/, '')
    .trim();

  const code = specObj?.code;
  if (code && !cleanName.startsWith(code)) {
    return `${code} ${cleanName}`;
  }
  return cleanName || specialtyStr.replace(/\s*\((Бюджет|Платно)\)\s*/gi, '').trim();
}
