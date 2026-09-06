import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Document, Paragraph, TextRun, Packer, AlignmentType } from 'docx';
import { Applicant } from '../types';
import { toast } from './toast';
import { displayRussianDate } from '../lib/validation';
import { formatSpecialtyDisplay } from '../lib/specialties';

/**
 * Профессиональный экспорт реестра абитуриентов в полноценный XLSX файл
 * с группировкой по специальностям, цветными шапками и итоговыми строками.
 */
export async function exportApplicantsToExcel(campaignName: string, applicants: Applicant[]) {
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Приёмная комиссия';
    workbook.lastModifiedBy = 'Приёмная комиссия';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Реестр по специальностям', {
      views: [{ showGridLines: true }]
    });

    // 1. Главный заголовок файла (Строка 1)
    worksheet.mergeCells('A1:I1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = `СВОДНЫЙ РЕЕСТР АБИТУРИЕНТОВ ПО СПЕЦИАЛЬНОСТЯМ — ${(campaignName || 'ПРИЁМНАЯ КАМПАНИЯ').toUpperCase()}`;
    titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF881337' } }; // Тёмно-бордовый
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(1).height = 34;

    // 2. Метаданные (Строка 2)
    worksheet.mergeCells('A2:I2');
    const subTitleCell = worksheet.getCell('A2');
    const nowStr = new Date().toLocaleDateString('ru-RU') + ' ' + new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    subTitleCell.value = `Приёмная кампания: ${campaignName || 'Главная'}  |  Дата выгрузки: ${nowStr}  |  Всего абитуриентов: ${applicants.length} чел.`;
    subTitleCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF44403C' } };
    subTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F4' } };
    subTitleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    worksheet.getRow(2).height = 24;

    let currentRowIndex = 4;

    // Группировка абитуриентов по специальностям
    const groupedMap: Record<string, Applicant[]> = {};
    applicants.forEach(a => {
      const specName = formatSpecialtyDisplay(a.specialty, a.specialtyName);
      if (!groupedMap[specName]) groupedMap[specName] = [];
      groupedMap[specName].push(a);
    });

    const headers = [
      '№ п/п',
      'ФИО Абитуриента',
      'Телефон',
      'СНИЛС',
      'Основание',
      'Ср. балл',
      'Документ',
      'Льгота / Квота',
      'Дата подачи'
    ];

    const colWidths = [8, 35, 18, 16, 14, 12, 16, 24, 20];

    if (Object.keys(groupedMap).length === 0) {
      worksheet.getCell(`A${currentRowIndex}`).value = 'В выгрузке нет данных по абитуриентам.';
    } else {
      Object.entries(groupedMap).forEach(([specName, specApplicants], groupIdx) => {
        const originalCount = specApplicants.filter(a => a.educationDocumentSubmissionType !== 'copy').length;

        // Заголовок раздела специальности
        worksheet.mergeCells(`A${currentRowIndex}:I${currentRowIndex}`);
        const groupHeaderCell = worksheet.getCell(`A${currentRowIndex}`);
        groupHeaderCell.value = `СПЕЦИАЛЬНОСТЬ ${groupIdx + 1}: ${specName.toUpperCase()}  (Всего подано: ${specApplicants.length} чел., Оригиналов: ${originalCount} чел.)`;
        groupHeaderCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF881337' } };
        groupHeaderCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE4E6' } }; // Розовый фон заголовка
        groupHeaderCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
        worksheet.getRow(currentRowIndex).height = 28;
        currentRowIndex++;

        // Шапка таблицы специальности
        const headerRow = worksheet.getRow(currentRowIndex);
        headerRow.height = 24;
        headers.forEach((h, hIdx) => {
          const cell = headerRow.getCell(hIdx + 1);
          cell.value = h;
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF9F1239' } };
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FF4C0519' } },
            left: { style: 'thin', color: { argb: 'FF881337' } },
            bottom: { style: 'thin', color: { argb: 'FF4C0519' } },
            right: { style: 'thin', color: { argb: 'FF881337' } }
          };
        });
        currentRowIndex++;

        // Строки абитуриентов
        specApplicants.forEach((a, aIdx) => {
          const row = worksheet.getRow(currentRowIndex);
          row.height = 22;

          const dateStr = displayRussianDate(a.createdAt);
          const scoreVal = typeof a.averageScore === 'number' ? a.averageScore : Number(a.averageScore) || 0;
          const docTypeStr = a.educationDocumentSubmissionType === 'copy' ? 'Копия' : 'Оригинал';
          const benefitStr = a.hasBenefit ? (a.benefit || 'Есть льгота') : 'Нет';
          const fundingStr = a.fundingType || (a.specialty?.includes('Платно') ? 'Платно' : 'Бюджет');

          const rowValues = [
            aIdx + 1,
            a.fullName || '—',
            a.phone || '—',
            a.snils || '—',
            fundingStr,
            scoreVal,
            docTypeStr,
            benefitStr,
            dateStr
          ];

          rowValues.forEach((val, cIdx) => {
            const cell = row.getCell(cIdx + 1);
            cell.value = val;
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: aIdx % 2 === 1 ? 'FFFAFAF9' : 'FFFFFFFF' }
            };
            cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF1C1917' } };
            cell.border = {
              top: { style: 'thin', color: { argb: 'FFE7E5E4' } },
              left: { style: 'thin', color: { argb: 'FFE7E5E4' } },
              bottom: { style: 'thin', color: { argb: 'FFE7E5E4' } },
              right: { style: 'thin', color: { argb: 'FFE7E5E4' } }
            };

            if (cIdx === 0 || cIdx === 4 || cIdx === 6 || cIdx === 8) {
              cell.alignment = { vertical: 'middle', horizontal: 'center' };
            } else if (cIdx === 5) {
              cell.alignment = { vertical: 'middle', horizontal: 'center' };
              cell.numFmt = '0.00';
              cell.font.bold = true;
            } else {
              cell.alignment = { vertical: 'middle', horizontal: 'left', indent: cIdx === 1 ? 1 : 0 };
              if (cIdx === 1) cell.font.bold = true;
            }

            const valLen = String(val).length + 4;
            if (valLen > colWidths[cIdx]) {
              colWidths[cIdx] = Math.min(valLen, 50);
            }
          });

          currentRowIndex++;
        });

        // Подытог по специальности
        const subTotalRow = worksheet.getRow(currentRowIndex);
        subTotalRow.height = 22;
        worksheet.mergeCells(`A${currentRowIndex}:E${currentRowIndex}`);
        const subLabelCell = subTotalRow.getCell(1);
        subLabelCell.value = `Итого по специальности: ${specApplicants.length} чел. (Оригиналов: ${originalCount})`;
        subLabelCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF881337' } };
        subLabelCell.alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };

        const avgSpecScore = specApplicants.length > 0
          ? specApplicants.reduce((sum, curr) => sum + (Number(curr.averageScore) || 0), 0) / specApplicants.length
          : 0;

        const subScoreCell = subTotalRow.getCell(6);
        subScoreCell.value = avgSpecScore;
        subScoreCell.numFmt = '0.00';
        subScoreCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF881337' } };
        subScoreCell.alignment = { vertical: 'middle', horizontal: 'center' };

        for (let c = 1; c <= 9; c++) {
          const cell = subTotalRow.getCell(c);
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F4' } };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFD6D3D1' } },
            bottom: { style: 'medium', color: { argb: 'FFA8A29E' } }
          };
        }

        currentRowIndex += 2; // Разделительный интервал
      });
    }

    // Итоговый блог по всей базе
    worksheet.mergeCells(`A${currentRowIndex}:I${currentRowIndex}`);
    const grandCell = worksheet.getCell(`A${currentRowIndex}`);
    grandCell.value = `ВСЕГО В РЕЕСТРЕ: ${applicants.length} абитуриентов`;
    grandCell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
    grandCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF881337' } };
    grandCell.alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(currentRowIndex).height = 28;

    // Установка ширины колонок
    colWidths.forEach((w, idx) => {
      worksheet.getColumn(idx + 1).width = w;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const fileName = `Reestr_Abiturienty_PoSpetsialnostyam_${(campaignName || 'Priem').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    saveAs(blob, fileName);

    toast.success('Отчёт с группировкой по специальностям успешно экспортирован!');
  } catch (error) {
    console.error('Failed to export Excel:', error);
    toast.error('Произошла ошибка при экспорте в Excel.');
  }
}

/**
 * Печать / Сохранение отчёта в PDF с группировкой по специальностям
 */
export function exportApplicantsToPDF(campaignName: string, applicants: Applicant[]) {
  try {
    const totalApplicants = applicants.length;
    const originalDocsCount = applicants.filter(a => a.educationDocumentSubmissionType !== 'copy').length;
    const copyDocsCount = applicants.filter(a => a.educationDocumentSubmissionType === 'copy').length;
    const averageScoreOverall = totalApplicants > 0 
      ? (applicants.reduce((acc, curr) => acc + (curr.averageScore || 0), 0) / totalApplicants).toFixed(2)
      : '0.00';

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.warning('Пожалуйста, разрешите всплывающие окна для экспорта/печати PDF.');
      return;
    }
    toast.success('Отчёт в формате PDF сформирован и открыт для печати/сохранения');

    // Группировка
    const groupedMap: Record<string, Applicant[]> = {};
    applicants.forEach(a => {
      const specName = formatSpecialtyDisplay(a.specialty, a.specialtyName);
      if (!groupedMap[specName]) groupedMap[specName] = [];
      groupedMap[specName].push(a);
    });

    let tablesHtml = '';
    Object.entries(groupedMap).forEach(([specName, specList], idx) => {
      const origCount = specList.filter(a => a.educationDocumentSubmissionType !== 'copy').length;
      const rows = specList.map((a, i) => `
        <tr>
          <td style="text-align: center; font-weight: bold;">${i + 1}</td>
          <td style="font-weight: 600;">${a.fullName || '—'}</td>
          <td>${a.snils || '—'}</td>
          <td style="text-align: center;">${a.fundingType || (a.specialty?.includes('Платно') ? 'Платно' : 'Бюджет')}</td>
          <td style="text-align: center; font-weight: bold;">${(a.averageScore || 0).toFixed(2)}</td>
          <td style="text-align: center;">${a.educationDocumentSubmissionType === 'copy' ? 'Копия' : 'Оригинал'}</td>
          <td>${a.hasBenefit ? (a.benefit || 'Да') : 'Нет'}</td>
        </tr>
      `).join('');

      tablesHtml += `
        <div style="margin-top: 18px; page-break-inside: avoid;">
          <div style="background-color: #ffe4e6; border: 1px solid #fecdd3; padding: 6px 12px; font-weight: bold; color: #881337; font-size: 10pt; border-radius: 4px; margin-bottom: 6px;">
            ${idx + 1}. Специальность: ${specName} (Подано: ${specList.length} чел., Оригиналов: ${origCount} чел.)
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 35px; text-align: center;">№</th>
                <th>ФИО Абитуриента</th>
                <th style="width: 110px;">СНИЛС</th>
                <th style="width: 80px; text-align: center;">Основание</th>
                <th style="width: 70px; text-align: center;">Ср. балл</th>
                <th style="width: 80px; text-align: center;">Документ</th>
                <th>Льгота / Квота</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </div>
      `;
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="ru">
      <head>
        <meta charset="UTF-8">
        <title>Отчёт по базе абитуриентов - ${campaignName}</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 15mm;
          }
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            color: #1c1917;
            margin: 0;
            padding: 0;
            font-size: 11pt;
            line-height: 1.4;
          }
          .header {
            border-bottom: 2px solid #881337;
            padding-bottom: 12px;
            margin-bottom: 16px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }
          .header h1 {
            font-size: 16pt;
            color: #881337;
            margin: 0 0 4px 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .header p {
            margin: 0;
            font-size: 9pt;
            color: #57534e;
          }
          .meta-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            margin-bottom: 20px;
          }
          .meta-card {
            background: #fafaf9;
            border: 1px solid #e7e5e4;
            border-radius: 6px;
            padding: 8px 12px;
            text-align: center;
          }
          .meta-card label {
            display: block;
            font-size: 8pt;
            text-transform: uppercase;
            color: #78716c;
            font-weight: 600;
            margin-bottom: 2px;
          }
          .meta-card value {
            display: block;
            font-size: 14pt;
            font-weight: 800;
            color: #1c1917;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            font-size: 9.5pt;
          }
          th {
            background-color: #f5f5f4;
            color: #292524;
            border: 1px solid #d6d3d1;
            padding: 8px 6px;
            font-weight: 700;
            text-align: left;
            font-size: 8.5pt;
            text-transform: uppercase;
          }
          td {
            border: 1px solid #e7e5e4;
            padding: 6px;
            vertical-align: middle;
          }
          tr:nth-child(even) {
            background-color: #fafaf9;
          }
          .footer {
            margin-top: 24px;
            padding-top: 12px;
            border-top: 1px solid #e7e5e4;
            display: flex;
            justify-content: space-between;
            font-size: 8.5pt;
            color: #78716c;
          }
          @media print {
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="background: #fffbe3; border: 1px solid #fef08a; padding: 10px 16px; border-radius: 8px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 10pt; color: #854d0e; font-weight: 600;">Готовый документ для сохранения в PDF или печати</span>
          <button onclick="window.print()" style="background: #881337; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer;">
            Сохранить в PDF / Распечатать
          </button>
        </div>

        <div class="header">
          <div>
            <h1>Официальный отчёт по базе абитуриентов</h1>
            <p>Приёмная кампания: <strong>${campaignName}</strong> | Отчёт сгенерирован: ${new Date().toLocaleDateString('ru-RU')} г.</p>
          </div>
          <div style="text-align: right;">
            <p style="font-weight: bold; color: #881337;">Приёмная комиссия</p>
            <p>Документ производственной практики</p>
          </div>
        </div>

        <div class="meta-grid">
          <div class="meta-card">
            <label>Всего абитуриентов</label>
            <value>${totalApplicants}</value>
          </div>
          <div class="meta-card">
            <label>Оригиналы аттестатов</label>
            <value style="color: #047857;">${originalDocsCount}</value>
          </div>
          <div class="meta-card">
            <label>Копии аттестатов</label>
            <value style="color: #b45309;">${copyDocsCount}</value>
          </div>
          <div class="meta-card">
            <label>Средний балл</label>
            <value>${averageScoreOverall}</value>
          </div>
        </div>

        ${tablesHtml || '<p style="text-align:center; padding: 20px;">Нет данных по абитуриентам</p>'}

        <div class="footer">
          <span>Автоматизированная система управления приёмной кампанией</span>
          <span>ГБПОУ НСО "НЭК"</span>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  } catch (error) {
    console.error('Failed to export PDF:', error);
    toast.error('Произошла ошибка при экспорте PDF файла.');
  }
}

/**
 * Печать / Экспорт приказа на зачисление (только абитуриенты с оригиналами)
 */
export function exportEnrollmentOrderToPDF(campaignName: string, applicants: Applicant[], selectedSpecialtyFilter: string = 'all') {
  try {
    // Оставляем только с оригиналами
    let enrolled = applicants.filter(a => a.educationDocumentSubmissionType !== 'copy');
    
    if (selectedSpecialtyFilter !== 'all') {
      enrolled = enrolled.filter(a => (a.specialty === selectedSpecialtyFilter || a.specialtyCode === selectedSpecialtyFilter));
    }

    if (enrolled.length === 0) {
      toast.warning('Нет абитуриентов с оригиналами документов для включения в приказ.');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.warning('Пожалуйста, разрешите всплывающие окна для печати приказа.');
      return;
    }

    // Группировка зачисленных по специальностям
    const groupedMap: Record<string, Applicant[]> = {};
    enrolled.forEach(a => {
      const specName = formatSpecialtyDisplay(a.specialty, a.specialtyName);
      if (!groupedMap[specName]) groupedMap[specName] = [];
      groupedMap[specName].push(a);
    });

    let groupsHtml = '';
    Object.entries(groupedMap).forEach(([specName, specList], gIdx) => {
      // Сортировка по убыванию среднего балла
      specList.sort((a, b) => (b.averageScore || 0) - (a.averageScore || 0));

      const rows = specList.map((a, i) => `
        <tr>
          <td style="text-align: center; font-weight: bold;">${i + 1}</td>
          <td style="font-weight: 600;">${a.fullName || '—'}</td>
          <td style="text-align: center;">${a.snils || '—'}</td>
          <td style="text-align: center; font-weight: bold;">${(a.averageScore || 0).toFixed(2)}</td>
          <td style="text-align: center;">${a.fundingType || 'Бюджет'}</td>
          <td style="text-align: center;">${a.hasBenefit ? 'Квота' : 'Общие основания'}</td>
        </tr>
      `).join('');

      groupsHtml += `
        <div style="margin-top: 20px; page-break-inside: avoid;">
          <h3 style="font-size: 11pt; color: #1c1917; margin-bottom: 6px; font-weight: bold; border-bottom: 1px solid #1c1917; padding-bottom: 2px;">
            1.${gIdx + 1}. Специальность / Профессия: ${specName} (${specList.length} чел.)
          </h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 9.5pt;">
            <thead>
              <tr style="background-color: #f5f5f4;">
                <th style="border: 1px solid #000; padding: 5px; width: 30px; text-align: center;">№</th>
                <th style="border: 1px solid #000; padding: 5px; text-align: left;">ФИО Абитуриента</th>
                <th style="border: 1px solid #000; padding: 5px; width: 110px; text-align: center;">СНИЛС</th>
                <th style="border: 1px solid #000; padding: 5px; width: 70px; text-align: center;">Ср. балл</th>
                <th style="border: 1px solid #000; padding: 5px; width: 90px; text-align: center;">Финансирование</th>
                <th style="border: 1px solid #000; padding: 5px; width: 120px; text-align: center;">Примечание</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </div>
      `;
    });

    const nowStr = new Date().toLocaleDateString('ru-RU');

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="ru">
      <head>
        <meta charset="UTF-8">
        <title>ПРИКАЗ О ЗАЧИСЛЕНИИ - ${campaignName}</title>
        <style>
          @page { size: A4 portrait; margin: 20mm 15mm 20mm 20mm; }
          body { font-family: 'Times New Roman', Times, serif; color: #000; margin: 0; padding: 0; font-size: 11pt; line-height: 1.3; }
          .header-org { text-align: center; font-weight: bold; font-size: 10pt; text-transform: uppercase; margin-bottom: 15px; }
          .doc-title { text-align: center; font-size: 14pt; font-weight: bold; margin-top: 20px; margin-bottom: 5px; }
          .doc-subtitle { text-align: center; font-size: 12pt; font-weight: bold; margin-bottom: 20px; }
          .order-meta { display: flex; justify-content: space-between; margin-bottom: 15px; font-weight: bold; }
          .p-text { text-indent: 25px; text-align: justify; margin-bottom: 10px; }
          td { border: 1px solid #000; padding: 5px; }
          .signatures { margin-top: 40px; page-break-inside: avoid; }
          .sig-row { display: flex; justify-content: space-between; margin-top: 25px; font-weight: bold; }
          @media print { .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="no-print" style="background: #e0f2fe; border: 1px solid #7dd3fc; padding: 10px 16px; border-radius: 8px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 10pt; color: #0369a1; font-weight: bold;">ПРИКАЗ НА ЗАЧИСЛЕНИЕ (Готов к печати)</span>
          <button onclick="window.print()" style="background: #0369a1; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer;">
            Печать приказа
          </button>
        </div>

        <div class="header-org">
          МИНИСТЕРСТВО ОБРАЗОВАНИЯ НОВОСИБИРСКОЙ ОБЛАСТИ<br>
          ГОСУДАРСТВЕННОЕ БЮДЖЕТНОЕ ПРОФЕССИОНАЛЬНОЕ ОБРАЗОВАТЕЛЬНОЕ УЧРЕЖДЕНИЕ<br>
          НОВОСИБИРСКОЙ ОБЛАСТИ "НОВОСИБИРСКИЙ ЭЛЕКТРОМЕХАНИЧЕСКИЙ КОЛЛЕДЖ"
        </div>

        <div class="doc-title">ПРИКАЗ</div>
        <div class="doc-subtitle">О зачислении в число студентов 1 курса очной формы обучения</div>

        <div class="order-meta">
          <span>от ${nowStr} г.</span>
          <span>№ ______ - К</span>
          <span>г. Новосибирск</span>
        </div>

        <p class="p-text">
          На основании решения приёмной комиссии (протокол заседания № ___ от ${nowStr} г.), по результатам освоения поступающими образовательной программы основного общего / среднего общего образования, а также на основании предоставленных оригиналов документов об образовании, в рамках приёмной кампании "<strong>${campaignName}</strong>":
        </p>

        <p class="p-text" style="font-weight: bold;">
          ПРИКАЗЫВАЮ:
        </p>

        <p class="p-text">
          1. Зачислить с 1 сентября 2026 года в число студентов 1 курса очной формы обучения ГБПОУ НСО "НЭК" следующих абитуриентов, успешно прошедших конкурс аттестатов и предоставивших оригиналы документов:
        </p>

        ${groupsHtml}

        <p class="p-text" style="margin-top: 25px;">
          2. Контроль за исполнением настоящего приказа возложить на ответственного секретаря приёмной комиссии.
        </p>

        <div class="signatures">
          <div class="sig-row">
            <span>Директор ГБПОУ НСО "НЭК"</span>
            <span>_________________ / В.В. Дронь /</span>
          </div>
          <div class="sig-row" style="margin-top: 15px; font-weight: normal; font-size: 10pt;">
            <span>С приказом ознакомлен(а): Ответственный секретарь ПК</span>
            <span>_________________ / ___________________ /</span>
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 300);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    toast.success('Приказ на зачисление сформирован!');
  } catch (error) {
    console.error('Failed to export Enrollment Order:', error);
    toast.error('Произошла ошибка при формировании приказа на зачисление.');
  }
}

/**
 * Экспорт приказа на зачисление в редактируемый файл Microsoft Word (.docx)
 */
export async function exportEnrollmentOrderToDocx(campaignName: string, applicants: Applicant[], selectedSpecialtyFilter: string = 'all') {
  try {
    let enrolled = applicants.filter(a => a.educationDocumentSubmissionType !== 'copy');
    
    if (selectedSpecialtyFilter !== 'all') {
      enrolled = enrolled.filter(a => (a.specialty === selectedSpecialtyFilter || a.specialtyCode === selectedSpecialtyFilter));
    }

    if (enrolled.length === 0) {
      toast.warning('Нет абитуриентов с оригиналами документов для включения в приказ.');
      return;
    }

    const groupedMap: Record<string, Applicant[]> = {};
    enrolled.forEach(a => {
      const specName = formatSpecialtyDisplay(a.specialty, a.specialtyName);
      if (!groupedMap[specName]) groupedMap[specName] = [];
      groupedMap[specName].push(a);
    });

    const nowStr = new Date().toLocaleDateString('ru-RU');

    const docChildren: Paragraph[] = [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: 'МИНИСТЕРСТВО ОБРАЗОВАНИЯ НОВОСИБИРСКОЙ ОБЛАСТИ\nГБПОУ НСО "НОВОСИБИРСКИЙ ЭЛЕКТРОМЕХАНИЧЕСКИЙ КОЛЛЕДЖ"',
            bold: true,
            size: 20,
            font: 'Times New Roman'
          })
        ],
        spacing: { after: 200 }
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: 'ПРИКАЗ',
            bold: true,
            size: 28,
            font: 'Times New Roman'
          })
        ],
        spacing: { after: 100 }
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: 'О зачислении в число студентов 1 курса очной формы обучения',
            bold: true,
            size: 24,
            font: 'Times New Roman'
          })
        ],
        spacing: { after: 250 }
      }),
      new Paragraph({
        alignment: AlignmentType.BOTH,
        children: [
          new TextRun({
            text: `от ${nowStr} г.                       № ______ - К                       г. Новосибирск`,
            bold: true,
            size: 22,
            font: 'Times New Roman'
          })
        ],
        spacing: { after: 300 }
      }),
      new Paragraph({
        alignment: AlignmentType.BOTH,
        children: [
          new TextRun({
            text: `На основании решения приёмной комиссии (протокол заседания № ___ от ${nowStr} г.), по результатам освоения поступающими образовательной программы основного общего / среднего общего образования, а также на основании предоставленных оригиналов документов об образовании, в рамках приёмной кампании "${campaignName}":`,
            size: 22,
            font: 'Times New Roman'
          })
        ],
        spacing: { after: 200 }
      }),
      new Paragraph({
        alignment: AlignmentType.BOTH,
        children: [
          new TextRun({
            text: 'ПРИКАЗЫВАЮ:',
            bold: true,
            size: 22,
            font: 'Times New Roman'
          })
        ],
        spacing: { after: 200 }
      }),
      new Paragraph({
        alignment: AlignmentType.BOTH,
        children: [
          new TextRun({
            text: '1. Зачислить с 1 сентября 2026 года в число студентов 1 курса очной формы обучения ГБПОУ НСО "НЭК" следующих абитуриентов, успешно прошедших конкурс аттестатов и предоставивших оригиналы документов:',
            size: 22,
            font: 'Times New Roman'
          })
        ],
        spacing: { after: 300 }
      })
    ];

    Object.entries(groupedMap).forEach(([specName, specList], gIdx) => {
      specList.sort((a, b) => (b.averageScore || 0) - (a.averageScore || 0));

      docChildren.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          children: [
            new TextRun({
              text: `1.${gIdx + 1}. Специальность / Профессия: ${specName} (${specList.length} чел.)`,
              bold: true,
              size: 22,
              font: 'Times New Roman'
            })
          ],
          spacing: { before: 200, after: 150 }
        })
      );

      const enrolledTextList = specList.map((a, i) => 
        `${i + 1}. ${a.fullName || '—'} (СНИЛС: ${a.snils || '—'}, Ср. балл: ${(a.averageScore || 0).toFixed(2)}, Финансирование: ${a.fundingType || 'Бюджет'})`
      ).join('\n');

      docChildren.push(
        new Paragraph({
          alignment: AlignmentType.BOTH,
          children: [
            new TextRun({
              text: enrolledTextList,
              size: 20,
              font: 'Times New Roman'
            })
          ],
          spacing: { after: 250 }
        })
      );
    });

    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.BOTH,
        children: [
          new TextRun({
            text: '2. Контроль за исполнением настоящего приказа возложить на ответственного секретаря приёмной комиссии.',
            size: 22,
            font: 'Times New Roman'
          })
        ],
        spacing: { before: 300, after: 400 }
      }),
      new Paragraph({
        alignment: AlignmentType.BOTH,
        children: [
          new TextRun({
            text: 'Директор ГБПОУ НСО "НЭК"                        _________________ / Дронь В.В. /',
            bold: true,
            size: 22,
            font: 'Times New Roman'
          })
        ],
        spacing: { after: 200 }
      })
    );

    const doc = new Document({
      sections: [{ properties: {}, children: docChildren }]
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `Prikaz_O_Zachislenii_${campaignName.replace(/\s+/g, '_')}_${nowStr.replace(/\./g, '-')}.docx`);
    toast.success('Приказ на зачисление успешно сформирован в Word (.docx)!');
  } catch (error) {
    console.error('Failed to export DOCX Enrollment Order:', error);
    toast.error('Ошибка при создании приказа в формате Word.');
  }
}
