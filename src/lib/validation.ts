// Валидаторы и маски форматов полей формы абитуриента ("защита от дурака")

/**
 * Очистка строки от пробелов и проверка, что это ровно 1 слово (без пробелов внутри)
 * Разрешены русские/латинские буквы, дефис (например, Мамин-Сибиряк, Анна-Мария)
 */
export function sanitizeSingleWord(val: string): string {
  // Убираем любые пробельные символы внутри и по краям
  return val.replace(/\s+/g, '');
}

export function isSingleWord(val: string): boolean {
  const trimmed = val.trim();
  if (!trimmed) return false;
  // Не должно содержать пробелов внутри
  return !/\s/.test(trimmed);
}

/**
 * Телефон: только цифры, допускается ведущий '+' если начинается с +7
 * Варианты:
 * 1) 11 цифр: "89231231234" или "79231231234" (ровно 11 цифр, без букв)
 * 2) 12 символов: "+79231231234" (знак '+' и ровно 11 цифр)
 */
export function sanitizePhone(val: string): string {
  // Если начинается с +, сохраняем его, остальное только цифры
  const startsWithPlus = val.startsWith('+');
  const digits = val.replace(/\D/g, '');
  if (startsWithPlus) {
    return '+' + digits.slice(0, 11);
  }
  return digits.slice(0, 11);
}

export function isValidPhone(val: string): boolean {
  const trimmed = val.trim();
  // +7XXXXXXXXXX (12 символов: '+' и 11 цифр)
  if (trimmed.startsWith('+')) {
    return /^\+\d{11}$/.test(trimmed);
  }
  // 8XXXXXXXXXX или 7XXXXXXXXXX (11 цифр)
  return /^\d{11}$/.test(trimmed);
}

/**
 * Дата: формат ДД.ММ.ГГГГ (день 2 цифры, месяц 2 цифры, год 4 цифры)
 * Автоматическая маска при вводе
 */
export function formatMaskDate(val: string): string {
  // оставляем только цифры
  const digits = val.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4, 8)}`;
}

export function isValidDateDDMMYYYY(val: string): boolean {
  if (!/^\d{2}\.\d{2}\.\d{4}$/.test(val)) return false;
  const [dayStr, monthStr, yearStr] = val.split('.');
  const day = parseInt(dayStr, 10);
  const month = parseInt(monthStr, 10);
  const year = parseInt(yearStr, 10);
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  if (year < 1900 || year > 2099) return false;
  return true;
}

/**
 * Преобразование даты между YYYY-MM-DD (ISO) и DD.MM.YYYY
 */
export function isoToDDMMYYYY(iso: string): string {
  if (!iso) return '';
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(iso)) return iso;
  const parts = iso.split('-');
  if (parts.length === 3) {
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
  }
  return iso;
}

export function ddmmyyyyToIso(ddmmyyyy: string): string {
  if (!ddmmyyyy) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(ddmmyyyy)) return ddmmyyyy;
  const parts = ddmmyyyy.split('.');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return ddmmyyyy;
}

/**
 * СНИЛС: формат "XXX-XXX-XXX YY" (3 цифры, тире, 3 цифры, тире, 3 цифры, пробел, 2 цифры)
 */
export function formatMaskSnils(val: string): string {
  const digits = val.replace(/\D/g, '').slice(0, 11);
  let res = '';
  if (digits.length > 0) res += digits.slice(0, 3);
  if (digits.length > 3) res += '-' + digits.slice(3, 6);
  if (digits.length > 6) res += '-' + digits.slice(6, 9);
  if (digits.length > 9) res += ' ' + digits.slice(9, 11);
  return res;
}

export function isValidSnils(val: string): boolean {
  if (!val.trim()) return true; // если опционален
  return /^\d{3}-\d{3}-\d{3} \d{2}$/.test(val.trim());
}

/**
 * Серия паспорта: ровно 4 цифры
 */
export function formatMaskPassportSeries(val: string): string {
  return val.replace(/\D/g, '').slice(0, 4);
}

export function isValidPassportSeries(val: string): boolean {
  return /^\d{4}$/.test(val.trim());
}

/**
 * Номер паспорта: ровно 6 цифр
 */
export function formatMaskPassportNumber(val: string): string {
  return val.replace(/\D/g, '').slice(0, 6);
}

export function isValidPassportNumber(val: string): boolean {
  return /^\d{6}$/.test(val.trim());
}

/**
 * Код подразделения: 3 цифры, тире, 3 цифры ("XXX-XXX")
 */
export function formatMaskSubdivisionCode(val: string): string {
  const digits = val.replace(/\D/g, '').slice(0, 6);
  if (digits.length <= 3) return digits;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}`;
}

export function isValidSubdivisionCode(val: string): boolean {
  return /^\d{3}-\d{3}$/.test(val.trim());
}

/**
 * Универсальное отображение даты в формате ДД.ММ.ГГГГ
 */
export function displayRussianDate(val?: any): string {
  if (!val) return '—';
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return '—';
    // Если уже в формате ДД.ММ.ГГГГ
    if (/^\d{2}\.\d{2}\.\d{4}$/.test(trimmed)) return trimmed;
    // Если в формате ГГГГ-ММ-ДД
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const parts = trimmed.split('-');
      return `${parts[2]}.${parts[1]}.${parts[0]}`;
    }
  }

  try {
    // Если передан Firestore Timestamp
    if (val && typeof val.toDate === 'function') {
      return val.toDate().toLocaleDateString('ru-RU');
    }
    // Если передан объект с секундами
    if (val && typeof val.seconds === 'number') {
      return new Date(val.seconds * 1000).toLocaleDateString('ru-RU');
    }
    const d = new Date(val);
    if (isNaN(d.getTime())) return typeof val === 'string' ? val : '—';
    return d.toLocaleDateString('ru-RU');
  } catch {
    return typeof val === 'string' ? val : '—';
  }
}

