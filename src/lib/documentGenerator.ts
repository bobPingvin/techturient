import { Document, Paragraph, TextRun, Packer, AlignmentType } from 'docx';
import PZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';
import { Applicant } from '../types';
import { displayRussianDate } from './validation';
import { getSpecialtyByFullName } from './specialties';
import { doc as firestoreDoc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Простая эвристика склонения ФИО в родительный падеж (от кого?)
 */
export function getGenitiveFIO(lastName = '', firstName = '', middleName = ''): string {
  const ln = lastName.trim();
  const fn = firstName.trim();
  const mn = middleName.trim();

  // Функция склонения фамилии
  function declineLastName(s: string, isFemale: boolean): string {
    if (!s) return '';
    const lower = s.toLowerCase();
    // Женские фамилии на -а, -я
    if (lower.endsWith('а') || lower.endsWith('я')) {
      return s.slice(0, -1) + (lower.endsWith('а') ? 'ой' : 'ей');
    }
    // Мужские на согласную
    if (!lower.endsWith('о') && !lower.endsWith('е') && !lower.endsWith('и') && !lower.endsWith('у') && !lower.endsWith('ы')) {
      return s + 'а';
    }
    return s;
  }

  // Функция склонения имени
  function declineFirstName(s: string, isFemale: boolean): string {
    if (!s) return '';
    const lower = s.toLowerCase();
    if (lower.endsWith('а')) {
      return s.slice(0, -1) + 'ой';
    }
    if (lower.endsWith('я')) {
      return s.slice(0, -1) + 'ей';
    }
    // Мужские имена на согласную
    if (!lower.endsWith('а') && !lower.endsWith('я') && !lower.endsWith('о') && !lower.endsWith('е') && !lower.endsWith('и')) {
      if (lower.endsWith('й')) {
        return s.slice(0, -1) + 'я';
      }
      return s + 'а';
    }
    return s;
  }

  // Функция склонения отчества
  function declineMiddleName(s: string, isFemale: boolean): string {
    if (!s) return '';
    const lower = s.toLowerCase();
    if (lower.endsWith('вич')) {
       return s + 'а';
    }
    if (lower.endsWith('вна')) {
       return s.slice(0, -3) + 'вны';
    }
    return s;
  }

  // Определяем пол по отчеству или имени
  const isFemale = mn.toLowerCase().endsWith('вна') || fn.toLowerCase().endsWith('а') || fn.toLowerCase().endsWith('я');

  const dLn = declineLastName(ln, isFemale);
  const dFn = declineFirstName(fn, isFemale);
  const dMn = declineMiddleName(mn, isFemale);

  return [dLn, dFn, dMn].filter(Boolean).join(' ').toUpperCase();
}

export async function generateEnrollmentApp(applicant: Applicant) {
  try {
    // 1. Проверяем, есть ли пользовательский шаблон в localStorage или Firestore
    let customTemplateBase64: string | null = null;
    try {
      customTemplateBase64 = localStorage.getItem('enrollAppTemplate_base64');
      if (!customTemplateBase64) {
        const templateDocRef = firestoreDoc(db, 'documentTemplates', 'enrollAppTemplate');
        const snap = await getDoc(templateDocRef);
        if (snap.exists()) {
          const snapData = snap.data() as any;
          if (snapData && snapData.base64Data) {
            customTemplateBase64 = snapData.base64Data;
            localStorage.setItem('enrollAppTemplate_base64', customTemplateBase64);
          }
        }
      }
    } catch (e) {
      console.warn('Could not load custom template, using default generator:', e);
    }

    const fioGen = getGenitiveFIO(applicant.lastName, applicant.firstName, applicant.middleName);
    const currentDate = new Date().toLocaleDateString('ru-RU');
    
    // Парсим школу (пытаемся выделить номер класса, название школы и город если записано в поле school или documents)
    let schoolName = applicant.school || 'СОШ';
    let className = '9';
    let city = 'Новосибирск';

    const rawProf = applicant.specialtyName || applicant.specialty || 'не указана';
    const cleanProf = rawProf.replace(/\s*\((Бюджет|Платно)\)\s*$/i, '').trim();

    const specObj = getSpecialtyByFullName(applicant.specialty);

    const dataContext = {
      abiturFIO: applicant.fullName || `${applicant.lastName} ${applicant.firstName} ${applicant.middleName}`,
      abiturFIOGen: fioGen,
      lastName: applicant.lastName || '',
      firstName: applicant.firstName || '',
      middleName: applicant.middleName || '',
      birthDate: displayRussianDate(applicant.birthDate),
      gender: applicant.gender || '',
      snils: applicant.snils || '',
      phone: applicant.phone || '',
      address: applicant.residence || applicant.registration || '',
      school: schoolName,
      className: className,
      city: city,
      profession: cleanProf,
      specialty: cleanProf,
      specialtyCode: specObj?.code || '',
      code: specObj?.code || '',
      specialtyCapacity: specObj?.capacity ? String(specObj.capacity) : '',
      capacity: specObj?.capacity ? String(specObj.capacity) : '',
      seatsCount: specObj?.capacity ? String(specObj.capacity) : '',
      applicationNumber: applicant.applicationNumber || String(applicant.createdAt || Date.now()).slice(-4),
      regNumber: applicant.applicationNumber || String(applicant.createdAt || Date.now()).slice(-4),
      appNumber: applicant.applicationNumber || String(applicant.createdAt || Date.now()).slice(-4),
      fundingType: applicant.fundingType || (applicant.specialty?.includes('Бюджет') ? 'Бюджет' : applicant.specialty?.includes('Платно') ? 'Платно' : 'Бюджет'),
      benefit: applicant.benefit || 'нет',
      currentDate: currentDate,
      directorTitle: 'Директору ГБПОУ НСО "НЭК" Дронь В.В.'
    };

    if (customTemplateBase64) {
      // Используем docxtemplater с загруженным файлом
      try {
        const binaryString = atob(customTemplateBase64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        const zip = new (PZip as any)(bytes.buffer);
        const docxTemplateInstance = new Docxtemplater(zip, {
          paragraphLoop: true,
          linebreaks: true,
        });

        docxTemplateInstance.render(dataContext);

        const out = docxTemplateInstance.getZip().generate({
          type: 'blob',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });

        saveAs(out, 'enrollApp.docx');
        return;
      } catch (err: any) {
        console.error('Error rendering custom docxtemplater template, falling back to default:', err);
        alert('Ошибка обработки пользовательского шаблона Word: ' + (err.message || err) + '. Генерируем документ по умолчанию.');
      }
    }

    // 2. Дефолтный генератор через библиотеку docx
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            // Шапка сверху жирным шрифтом
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: 'ГОСУДАРСТВЕННОЕ БЮДЖЕТНОЕ ПРОФЕССИОНАЛЬНОЕ ОБРАЗОВАТЕЛЬНОЕ УЧРЕЖДЕНИЕ НОВОСИБИРСКОЙ ОБЛАСТИ "НОВОСИБИРСКИЙ ЭЛЕКТРОМЕХАНИЧЕСКИЙ КОЛЛЕДЖ" (ГБПОУ НСО "НЭК")',
                  bold: true,
                  size: 20, // 10 pt
                  font: 'Times New Roman',
                }),
              ],
              spacing: { after: 300 },
            }),

            // Снизу справа: Директору... от ...
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({
                  text: 'Директору ГБПОУ НСО "НЭК" Дронь В.В.\n',
                  size: 22, // 11 pt
                  font: 'Times New Roman',
                }),
                new TextRun({
                  text: `от ${fioGen},\n`,
                  bold: true,
                  size: 22,
                  font: 'Times New Roman',
                }),
                new TextRun({
                  text: `окончивший ${className} класс ${schoolName} города ${city}.`,
                  size: 22,
                  font: 'Times New Roman',
                }),
              ],
              spacing: { after: 400 },
            }),

            // Снизу по центру жирным шрифтом: ЗАЯВЛЕНИЕ
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: 'ЗАЯВЛЕНИЕ',
                  bold: true,
                  size: 28, // 14 pt
                  font: 'Times New Roman',
                }),
              ],
              spacing: { after: 300 },
            }),

            // На новой строке: Прошу зачислить меня по профессии.
            new Paragraph({
              alignment: AlignmentType.LEFT,
              children: [
                new TextRun({
                  text: `Прошу зачислить меня по профессии / специальности: ${dataContext.profession} (${dataContext.fundingType}).`,
                  size: 24, // 12 pt
                  font: 'Times New Roman',
                }),
              ],
              spacing: { after: 200 },
            }),

            new Paragraph({
              alignment: AlignmentType.LEFT,
              children: [
                new TextRun({
                  text: `Дата рождения: ${dataContext.birthDate} | СНИЛС: ${dataContext.snils || 'не указан'} | Телефон: ${dataContext.phone || 'не указан'}`,
                  size: 22,
                  font: 'Times New Roman',
                }),
              ],
              spacing: { after: 400 },
            }),

            // Подпись и дата
            new Paragraph({
              alignment: AlignmentType.BOTH,
              children: [
                new TextRun({
                  text: `Дата: ${currentDate}`,
                  size: 22,
                  font: 'Times New Roman',
                }),
                new TextRun({
                  text: `                                   Подпись: ______________________`,
                  size: 22,
                  font: 'Times New Roman',
                }),
              ],
              spacing: { after: 100 },
            }),
          ],
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, 'enrollApp.docx');
  } catch (error) {
    console.error('Error generating enrollment app:', error);
    alert('Не удалось сгенерировать заявление. Пожалуйста, проверьте данные.');
  }
}

/**
 * Рассчитывает точный возраст по дате рождения (поддерживает форматы ДД.ММ.ГГГГ и ГГГГ-ММ-ДД)
 */
export function calculateAge(birthDateStr?: string): number {
  if (!birthDateStr || !birthDateStr.trim()) return 18;
  const str = birthDateStr.trim();
  let birth: Date | null = null;

  if (str.includes('.')) {
    const parts = str.split('.');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      if (!isNaN(day) && !isNaN(month) && !isNaN(year) && year > 1900) {
        birth = new Date(year, month, day);
      }
    }
  } else if (str.includes('-')) {
    const parts = str.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      if (!isNaN(day) && !isNaN(month) && !isNaN(year) && year > 1900) {
        birth = new Date(year, month, day);
      }
    }
  }

  if (!birth || isNaN(birth.getTime())) {
    birth = new Date(str);
  }

  if (!birth || isNaN(birth.getTime())) return 18;

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

/**
 * Генерация Согласия на обработку персональных данных
 */
export async function generateDataProcessingConsent(applicant: Applicant) {
  try {
    // 1. Проверяем, есть ли пользовательский шаблон в localStorage или Firestore
    let customTemplateBase64: string | null = null;
    try {
      customTemplateBase64 = localStorage.getItem('dataProcessingConsentTemplate_base64');
      if (!customTemplateBase64) {
        const templateDocRef = firestoreDoc(db, 'documentTemplates', 'dataProcessingConsentTemplate');
        const snap = await getDoc(templateDocRef);
        if (snap.exists()) {
          const snapData = snap.data() as any;
          if (snapData && snapData.base64Data) {
            customTemplateBase64 = snapData.base64Data;
            localStorage.setItem('dataProcessingConsentTemplate_base64', customTemplateBase64);
          }
        }
      }
    } catch (e) {
      console.warn('Could not load custom consent template, using default generator:', e);
    }

    const fioGen = getGenitiveFIO(applicant.lastName, applicant.firstName, applicant.middleName);
    const currentDate = new Date().toLocaleDateString('ru-RU');
    const passportIssueDateStr = displayRussianDate(applicant.passportIssueDate);

    const dataContext = {
      abiturFIO: applicant.fullName || `${applicant.lastName} ${applicant.firstName} ${applicant.middleName}`.trim(),
      abiturFIOGen: fioGen,
      lastName: applicant.lastName || '',
      firstName: applicant.firstName || '',
      middleName: applicant.middleName || '',
      birthDate: displayRussianDate(applicant.birthDate),
      snils: applicant.snils || '',
      phone: applicant.phone || '',
      address: applicant.residence || applicant.registration || '',
      residence: applicant.residence || '',
      registration: applicant.registration || '',
      passportSeries: applicant.passportSeries || '',
      passportNumber: applicant.passportNumber || '',
      passportIssuedBy: applicant.passportIssuedBy || '',
      passportIssueDate: passportIssueDateStr,
      passportSubdivisionCode: applicant.passportSubdivisionCode || '',
      passportInfo: `паспорт серии ${applicant.passportSeries || '____'} № ${applicant.passportNumber || '______'}, выдан ${applicant.passportIssuedBy || '______________________'} от ${passportIssueDateStr}`,
      currentDate: currentDate,
      directorTitle: 'Директору ГБПОУ НСО "НЭК" Дронь В.В.',
      collegeName: 'ГБПОУ НСО "Новосибирский электромеханический колледж"',
      collegeAddress: '630068, г. Новосибирск, ул. Первомайская, д. 202, каб. 103'
    };

    if (customTemplateBase64) {
      try {
        const binaryString = atob(customTemplateBase64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        const zip = new (PZip as any)(bytes.buffer);
        const docxTemplateInstance = new Docxtemplater(zip, {
          paragraphLoop: true,
          linebreaks: true,
        });

        docxTemplateInstance.render(dataContext);

        const out = docxTemplateInstance.getZip().generate({
          type: 'blob',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });

        saveAs(out, `Согласие_ПД_${applicant.lastName || 'Абитуриент'}.docx`);
        return;
      } catch (err: any) {
        console.error('Error rendering custom consent docxtemplater template, falling back to default:', err);
        alert('Ошибка обработки пользовательского шаблона Согласия ПД: ' + (err.message || err) + '. Генерируем документ по умолчанию.');
      }
    }

    // 2. Стандартный генератор по умолчанию
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: 'СОГЛАСИЕ НА ОБРАБОТКУ И ХРАНЕНИЕ ПЕРСОНАЛЬНЫХ ДАННЫХ',
                  bold: true,
                  size: 26,
                  font: 'Times New Roman',
                }),
              ],
              spacing: { after: 300 },
            }),
            new Paragraph({
              alignment: AlignmentType.BOTH,
              children: [
                new TextRun({
                  text: `Я, ${dataContext.abiturFIO}, ${dataContext.passportInfo}, проживающий(ая) по адресу: ${dataContext.address || '__________________________________'}, даю свое согласие ГБПОУ НСО "Новосибирский электромеханический колледж" (630068, г. Новосибирск, ул. Первомайская, д. 202) на обработку и хранение моих персональных данных в целях организации приёмной кампании, зачисления и ведения образовательного процесса.`,
                  size: 22,
                  font: 'Times New Roman',
                }),
              ],
              spacing: { after: 200 },
            }),
            new Paragraph({
              alignment: AlignmentType.BOTH,
              children: [
                new TextRun({
                  text: 'Перечень персональных данных: ФИО, дата рождения, паспортные данные, СНИЛС, данные об образовании, льготах и контактный телефон.',
                  size: 22,
                  font: 'Times New Roman',
                }),
              ],
              spacing: { after: 300 },
            }),
            new Paragraph({
              alignment: AlignmentType.BOTH,
              children: [
                new TextRun({
                  text: `Дата: ${currentDate}                                      Подпись субъекта ПД: _________________ (${applicant.lastName} ${applicant.firstName ? applicant.firstName.charAt(0) + '.' : ''})`,
                  size: 22,
                  font: 'Times New Roman',
                }),
              ],
              spacing: { after: 100 },
            }),
          ],
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `Согласие_ПД_${applicant.lastName || 'Абитуриент'}.docx`);
  } catch (err) {
    console.error('Error generating data processing consent:', err);
    alert('Не удалось сгенерировать согласие на обработку данных');
  }
}

/**
 * Генерация Заявления родителя (законного представителя) для несовершеннолетних
 */
export async function generateParentalConsent(applicant: Applicant) {
  try {
    // 1. Проверяем наличие кастомного шаблона в localStorage / Firestore
    let customTemplateBase64: string | null = null;
    try {
      customTemplateBase64 = localStorage.getItem('parentalConsentTemplate_base64');
      if (!customTemplateBase64) {
        const templateDocRef = firestoreDoc(db, 'documentTemplates', 'parentalConsentTemplate');
        const snap = await getDoc(templateDocRef);
        if (snap.exists()) {
          const snapData = snap.data() as any;
          if (snapData && snapData.base64Data) {
            customTemplateBase64 = snapData.base64Data;
            localStorage.setItem('parentalConsentTemplate_base64', customTemplateBase64);
          }
        }
      }
    } catch (e) {
      console.warn('Could not load custom parental consent template, using default generator:', e);
    }

    const fio = applicant.fullName || `${applicant.lastName} ${applicant.firstName} ${applicant.middleName}`.trim();
    const fioGen = getGenitiveFIO(applicant.lastName, applicant.firstName, applicant.middleName);
    const currentDate = new Date().toLocaleDateString('ru-RU');

    const dataContext = {
      abiturFIO: fio,
      abiturFIOGen: fioGen,
      lastName: applicant.lastName || '',
      firstName: applicant.firstName || '',
      middleName: applicant.middleName || '',
      birthDate: displayRussianDate(applicant.birthDate),
      currentDate,
      directorTitle: 'Директору ГБПОУ НСО "НЭК" Дронь В.В.',
      collegeName: 'ГБПОУ НСО "Новосибирский электромеханический колледж"',
    };

    if (customTemplateBase64) {
      try {
        const binaryString = atob(customTemplateBase64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        const zip = new (PZip as any)(bytes.buffer);
        const docxTemplateInstance = new Docxtemplater(zip, {
          paragraphLoop: true,
          linebreaks: true,
        });

        docxTemplateInstance.render(dataContext);

        const out = docxTemplateInstance.getZip().generate({
          type: 'blob',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });

        saveAs(out, `Заявление_Родителя_${applicant.lastName || 'Абитуриент'}.docx`);
        return;
      } catch (err: any) {
        console.error('Error rendering custom parental consent docxtemplater template, falling back to default:', err);
        alert('Ошибка обработки пользовательского шаблона заявления родителя: ' + (err.message || err) + '. Генерируем документ по умолчанию.');
      }
    }

    // 2. Стандартный генератор по умолчанию
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({
                  text: 'Директору ГБПОУ НСО "НЭК" Дронь В.В.\n',
                  size: 22,
                  font: 'Times New Roman',
                }),
                new TextRun({
                  text: 'от родителя (законного представителя): ____________________________________________________\n',
                  bold: true,
                  size: 22,
                  font: 'Times New Roman',
                }),
                new TextRun({
                  text: 'паспортные данные родителя: ____________________________________________________\n',
                  size: 22,
                  font: 'Times New Roman',
                }),
                new TextRun({
                  text: `в отношении несовершеннолетнего(ей) поступающего(ей): ${fio}, ${displayRussianDate(applicant.birthDate)} г.р.`,
                  size: 22,
                  font: 'Times New Roman',
                }),
              ],
              spacing: { after: 400 },
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: 'ЗАЯВЛЕНИЕ РОДИТЕЛЯ (ЗАКОННОГО ПРЕДСТАВИТЕЛЯ)',
                  bold: true,
                  size: 26,
                  font: 'Times New Roman',
                }),
              ],
              spacing: { after: 300 },
            }),
            new Paragraph({
              alignment: AlignmentType.BOTH,
              children: [
                new TextRun({
                  text: `Я, ____________________________________________________ (мать / отец / опекун), даю официальное согласие на поступление и обучение моего несовершеннолетнего ребенка (${fio}) в ГБПОУ НСО "Новосибирский электромеханический колледж" по выбранной специальности, а также на обработку и хранение персональных данных моего ребенка в соответствии с 152-ФЗ.`,
                  size: 22,
                  font: 'Times New Roman',
                }),
              ],
              spacing: { after: 300 },
            }),
            new Paragraph({
              alignment: AlignmentType.BOTH,
              children: [
                new TextRun({
                  text: `Дата: ${currentDate}                                      Подпись родителя: _________________ / ________________________ /`,
                  size: 22,
                  font: 'Times New Roman',
                }),
              ],
              spacing: { after: 100 },
            }),
          ],
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `Заявление_Родителя_${applicant.lastName || 'Абитуриент'}.docx`);
  } catch (err) {
    console.error('Error generating parental consent:', err);
    alert('Не удалось сгенерировать заявление родителя');
  }
}

