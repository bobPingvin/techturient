import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Applicant } from '../types';
import { toast } from './toast';
import { displayRussianDate } from '../lib/validation';
import { formatSpecialtyDisplay } from '../lib/specialties';

/**
 * Профессиональный экспорт реестра абитуриентов в полноценный XLSX файл
 * с цветными шапками, автоподбором ширины колонок и форматированием дат.
 */
export async function exportApplicantsToExcel(campaignName: string, applicants: Applicant[]) {
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Приёмная комиссия';
    workbook.lastModifiedBy = 'Приёмная комиссия';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Реестр абитуриентов', {
      views: [{ showGridLines: true }]
    });

    // 1. Заголовок таблицы (Строка 1)
    worksheet.mergeCells('A1:J1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = `РЕЕСТР АБИТУРИЕНТОВ — ${(campaignName || 'ПРИЁМНАЯ КАМПАНИЯ').toUpperCase()}`;
    titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF881337' } }; // Тёмно-бордовый
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(1).height = 34;

    // 2. Метаданные (Строка 2)
    worksheet.mergeCells('A2:J2');
    const subTitleCell = worksheet.getCell('A2');
    const nowStr = new Date().toLocaleDateString('ru-RU') + ' ' + new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    subTitleCell.value = `Приёмная кампания: ${campaignName || 'Главная'}  |  Дата выгрузки: ${nowStr}  |  Всего абитуриентов в выгрузке: ${applicants.length} чел.`;
    subTitleCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF44403C' } };
    subTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F4' } }; // Светлый каменно-серый
    subTitleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    worksheet.getRow(2).height = 24;

    // Разделительная пустая строка 3
    worksheet.getRow(3).height = 10;

    // 3. Шапка таблицы (Строка 4)
    const headers = [
      { header: '№ п/п', minWidth: 8 },
      { header: 'ФИО Абитуриента', minWidth: 35 },
      { header: 'Телефон', minWidth: 18 },
      { header: 'СНИЛС', minWidth: 16 },
      { header: 'Специальность / Профессия', minWidth: 38 },
      { header: 'Основание', minWidth: 16 },
      { header: 'Ср. балл', minWidth: 14 },
      { header: 'Документ', minWidth: 16 },
      { header: 'Льгота / Квота', minWidth: 24 },
      { header: 'Дата подачи заявления', minWidth: 24 }
    ];

    const headerRow = worksheet.getRow(4);
    headerRow.height = 30;

    headers.forEach((h, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = h.header;
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF9F1239' } // Яркий бордовый / роза
      };
      cell.font = {
        name: 'Calibri',
        size: 11,
        bold: true,
        color: { argb: 'FFFFFFFF' }
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center',
        wrapText: true
      };
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF4C0519' } },
        left: { style: 'thin', color: { argb: 'FF881337' } },
        bottom: { style: 'medium', color: { argb: 'FF4C0519' } },
        right: { style: 'thin', color: { argb: 'FF881337' } }
      };
    });

    // Массив для вычисления максимальной длины в колонках
    const colWidths = headers.map(h => Math.max(h.minWidth, h.header.length + 4));

    // 4. Наполнение данными (Строки 5+)
    applicants.forEach((a, idx) => {
      const rowIndex = 5 + idx;
      const row = worksheet.getRow(rowIndex);
      row.height = 24;

      const dateStr = displayRussianDate(a.createdAt);
      const scoreVal = typeof a.averageScore === 'number' ? a.averageScore : Number(a.averageScore) || 0;
      const docTypeStr = a.educationDocumentSubmissionType === 'copy' ? 'Копия' : 'Оригинал';
      const benefitStr = a.hasBenefit ? (a.benefit || 'Есть льгота') : 'Нет';
      const cleanSpecialty = formatSpecialtyDisplay(a.specialty, a.specialtyName);
      const fundingStr = a.fundingType || (a.specialty?.includes('Платно') ? 'Платно' : 'Бюджет');

      const rowValues = [
        idx + 1,
        a.fullName || '—',
        a.phone || '—',
        a.snils || '—',
        cleanSpecialty,
        fundingStr,
        scoreVal,
        docTypeStr,
        benefitStr,
        dateStr
      ];

      // Корректировка ширины под контент
      rowValues.forEach((val, cIdx) => {
        const valStr = String(val);
        if (valStr.length + 5 > colWidths[cIdx]) {
          colWidths[cIdx] = Math.min(valStr.length + 5, 60); // ограничение 60 символов
        }
      });

      const isOdd = idx % 2 === 1;
      const rowBgColor = isOdd ? 'FFFAFAF9' : 'FFFFFFFF'; // Чередующаяся зебра

      rowValues.forEach((val, cIdx) => {
        const cell = row.getCell(cIdx + 1);
        cell.value = val;

        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: rowBgColor }
        };

        cell.font = {
          name: 'Calibri',
          size: 10,
          color: { argb: 'FF1C1917' }
        };

        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE7E5E4' } },
          left: { style: 'thin', color: { argb: 'FFE7E5E4' } },
          bottom: { style: 'thin', color: { argb: 'FFE7E5E4' } },
          right: { style: 'thin', color: { argb: 'FFE7E5E4' } }
        };

        // Выравнивание и формат по типам данных
        if (cIdx === 0) {
          // №
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.font.bold = true;
        } else if (cIdx === 1) {
          // ФИО
          cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
          cell.font.bold = true;
        } else if (cIdx === 6) {
          // Ср. балл
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.numFmt = '0.00';
          cell.font.bold = true;
        } else if (cIdx === 9) {
          // Дата подачи — выравнивание по центру, форматированная строка (гарантирует отсутствие ###)
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.font.bold = true;
        } else if (cIdx === 2 || cIdx === 3 || cIdx === 5 || cIdx === 7) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        } else {
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
        }
      });
    });

    // 5. Итоговая строка
    const summaryRowIndex = 5 + applicants.length;
    const summaryRow = worksheet.getRow(summaryRowIndex);
    summaryRow.height = 26;

    const totalApplicants = applicants.length;
    const avgScoreOverall = totalApplicants > 0
      ? applicants.reduce((acc, curr) => {
          const score = typeof curr.averageScore === 'number' ? curr.averageScore : Number(curr.averageScore) || 0;
          return acc + score;
        }, 0) / totalApplicants
      : 0;

    worksheet.mergeCells(`A${summaryRowIndex}:F${summaryRowIndex}`);
    const summaryLabelCell = summaryRow.getCell(1);
    summaryLabelCell.value = `ИТОГО В РЕЕСТРЕ: ${totalApplicants} абитуриентов`;
    summaryLabelCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF881337' } };
    summaryLabelCell.alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };

    const avgScoreCell = summaryRow.getCell(7);
    avgScoreCell.value = avgScoreOverall;
    avgScoreCell.numFmt = '0.00';
    avgScoreCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF881337' } };
    avgScoreCell.alignment = { vertical: 'middle', horizontal: 'center' };

    worksheet.mergeCells(`H${summaryRowIndex}:J${summaryRowIndex}`);

    // Стилирование итоговой строки
    for (let c = 1; c <= 10; c++) {
      const cell = summaryRow.getCell(c);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7E5E4' } };
      cell.border = {
        top: { style: 'medium', color: { argb: 'FFA8A29E' } },
        bottom: { style: 'medium', color: { argb: 'FFA8A29E' } },
        left: { style: 'thin', color: { argb: 'FFD6D3D1' } },
        right: { style: 'thin', color: { argb: 'FFD6D3D1' } }
      };
    }

    // 6. Установка динамической ширины колонок
    headers.forEach((_, idx) => {
      worksheet.getColumn(idx + 1).width = colWidths[idx];
    });

    // 7. Формирование файла и скачивание
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const fileName = `Reestr_Abiturienty_${(campaignName || 'Priem').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    saveAs(blob, fileName);

    toast.success('Отчёт в формате Excel (.xlsx) успешно сгенерирован!');
  } catch (error) {
    console.error('Failed to export Excel:', error);
    toast.error('Произошла ошибка при экспорте в Excel.');
  }
}

/**
 * Печать / Сохранение отчёта в PDF
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

    const rowsHtml = applicants.map((a, i) => {
      const cleanSpecialty = formatSpecialtyDisplay(a.specialty, a.specialtyName);
      const fundingStr = a.fundingType || (a.specialty?.includes('Платно') ? 'Платно' : 'Бюджет');
      return `
        <tr>
          <td style="text-align: center; font-weight: bold;">${i + 1}</td>
          <td style="font-weight: 600;">${a.fullName || '—'}</td>
          <td>${a.snils || '—'}</td>
          <td>${cleanSpecialty}</td>
          <td style="text-align: center;">${fundingStr}</td>
          <td style="text-align: center; font-weight: bold;">${(a.averageScore || 0).toFixed(2)}</td>
          <td style="text-align: center;">${a.educationDocumentSubmissionType === 'copy' ? 'Копия' : 'Оригинал'}</td>
          <td>${a.hasBenefit ? (a.benefit || 'Да') : 'Нет'}</td>
        </tr>
      `;
    }).join('');

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

        <table>
          <thead>
            <tr>
              <th style="width: 35px; text-align: center;">№</th>
              <th>ФИО Абитуриента</th>
              <th style="width: 110px;">СНИЛС</th>
              <th>Специальность</th>
              <th style="width: 80px; text-align: center;">Основание</th>
              <th style="width: 70px; text-align: center;">Ср. балл</th>
              <th style="width: 80px; text-align: center;">Документ</th>
              <th>Льгота / Квота</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colSpan="8" style="text-align:center;">Нет данных по абитуриентам</td></tr>'}
          </tbody>
        </table>

        <div class="footer">
          <span>Автоматизированная система управления приёмной кампанией</span>
          <span>Страница 1 из 1</span>
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
