import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';

/**
 * Calculates monthly report stats from a list of kids for a given month/year
 * @param {Array} kids List of all kids
 * @param {string} monthStr format "YYYY-MM"
 * @returns {Object} Structured report counts
 */
export const calculateReportData = (kids, monthStr) => {
  const [year, month] = monthStr.split('-').map(Number);
  
  // Initialize report counts
  const report = {
    g6_11: {
      M: { BEN: 0, MAM: 0, MAS: 0 },
      F: { BEN: 0, MAM: 0, MAS: 0 }
    },
    g12_59: {
      M: { BEN: 0, MAM: 0, MAS: 0 },
      F: { BEN: 0, MAM: 0, MAS: 0 }
    }
  };

  // Filter kids for this month
  const kidsThisMonth = kids.filter(kid => {
    if (!kid.date) return false;
    const [kidYear, kidMonth] = kid.date.split('-');
    return Number(kidYear) === year && Number(kidMonth) === month;
  });

  kidsThisMonth.forEach(kid => {
    if (!kid.birthDate || !kid.sex) return;
    
    // Calculate age in months at the time of entry/report
    const birthDateObj = new Date(kid.birthDate);
    const entryDateObj = new Date(kid.date);
    
    let ageInMonths = (entryDateObj.getFullYear() - birthDateObj.getFullYear()) * 12 + 
                     (entryDateObj.getMonth() - birthDateObj.getMonth());
    
    // Adjust if birth day is later in month
    if (entryDateObj.getDate() < birthDateObj.getDate()) {
      ageInMonths--;
    }

    if (ageInMonths < 6 || ageInMonths > 59) {
      // Out of bounds for these reports (e.g. 0-5 months or 5+ years)
      return;
    }

    // Determine age group
    let ageGroup = '';
    if (ageInMonths >= 6 && ageInMonths <= 11) {
      ageGroup = 'g6_11';
    } else if (ageInMonths >= 12 && ageInMonths <= 59) {
      ageGroup = 'g12_59';
    } else {
      return;
    }

    // Determine classification class (BEN, MAM, MAS)
    // BEN: 0, 1, 1.5, -1, -1.5 (everything except -2 and -3)
    // MAM: -2
    // MAS: -3
    let status = 'BEN';
    const score = Number(kid.score);
    if (score === -2) {
      status = 'MAM';
    } else if (score === -3) {
      status = 'MAS';
    }

    const gender = kid.sex === 'M' ? 'M' : 'F';

    report[ageGroup][gender][status]++;
  });

  return report;
};

/**
 * Format month string "YYYY-MM" to readable French name
 * @param {string} monthStr "YYYY-MM"
 * @returns {string} e.g. "Juillet 2026"
 */
export const formatMonthFrench = (monthStr) => {
  if (!monthStr) return '';
  const [year, month] = monthStr.split('-');
  const months = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];
  return `${months[Number(month) - 1]} ${year}`;
};

/**
 * Export raw kid records to Excel
 * @param {Array} kids List of kids
 */
export const exportKidsToExcel = (kids) => {
  const formattedData = kids.map((kid, index) => ({
    'N°': index + 1,
    'Date de Saisie': kid.date || '',
    'Nom Mère': kid.motherName || '',
    'Prénom Enfant': kid.childName || '',
    'Date Naissance': kid.birthDate || '',
    'Sexe': kid.sex || '',
    'Quartier': kid.quartier || '',
    'Téléphone': kid.phone || '',
    'Poids (kg)': kid.weight || '',
    'Taille (cm)': kid.height || '',
    'Score Poids/Taille': kid.score !== undefined ? kid.score : '',
    'Tour Bras (PB)': kid.pb || '',
    'Œdèmes': kid.edema ? 'OUI' : 'NON',
    'Température (°C)': kid.temp || '',
    'Anémie': kid.screeningAnemia ? 'OUI' : 'NON',
    'Malnutrition': kid.screeningMalnutrition || 'NON'
  }));

  const ws = XLSX.utils.json_to_sheet(formattedData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Registre de Saisie");
  
  // Auto-width columns
  const maxProps = Object.keys(formattedData[0] || {});
  ws['!cols'] = maxProps.map(() => ({ wch: 15 }));

  XLSX.writeFile(wb, `Registre_Vaccination_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
};

/**
 * Export Monthly Report to Excel
 * @param {Object} reportData Data calculated from calculateReportData
 * @param {string} monthStr "YYYY-MM"
 */
export const exportReportToExcel = (reportData, monthStr) => {
  const readableMonth = formatMonthFrench(monthStr);

  const data = [
    ['RAPPORT MENSUEL DE SURVEILLANCE NUTRITIONNELLE'],
    [`Période : ${readableMonth}`],
    [],
    ['Groupe d\'âge', 'Sexe', 'Classe BEN (Bon État)', 'Classe MAM (Modérée)', 'Classe MAS (Sévère)', 'Total'],
    [
      '6 à 11 mois', 
      'Garçons (M)', 
      reportData.g6_11.M.BEN, 
      reportData.g6_11.M.MAM, 
      reportData.g6_11.M.MAS, 
      reportData.g6_11.M.BEN + reportData.g6_11.M.MAM + reportData.g6_11.M.MAS
    ],
    [
      '6 à 11 mois', 
      'Filles (F)', 
      reportData.g6_11.F.BEN, 
      reportData.g6_11.F.MAM, 
      reportData.g6_11.F.MAS, 
      reportData.g6_11.F.BEN + reportData.g6_11.F.MAM + reportData.g6_11.F.MAS
    ],
    [
      '1 an et plus (12-59m)', 
      'Garçons (M)', 
      reportData.g12_59.M.BEN, 
      reportData.g12_59.M.MAM, 
      reportData.g12_59.M.MAS, 
      reportData.g12_59.M.BEN + reportData.g12_59.M.MAM + reportData.g12_59.M.MAS
    ],
    [
      '1 an et plus (12-59m)', 
      'Filles (F)', 
      reportData.g12_59.F.BEN, 
      reportData.g12_59.F.MAM, 
      reportData.g12_59.F.MAS, 
      reportData.g12_59.F.BEN + reportData.g12_59.F.MAM + reportData.g12_59.F.MAS
    ],
    [],
    [
      'TOTAL GENERAL', 
      '', 
      reportData.g6_11.M.BEN + reportData.g6_11.F.BEN + reportData.g12_59.M.BEN + reportData.g12_59.F.BEN,
      reportData.g6_11.M.MAM + reportData.g6_11.F.MAM + reportData.g12_59.M.MAM + reportData.g12_59.F.MAM,
      reportData.g6_11.M.MAS + reportData.g6_11.F.MAS + reportData.g12_59.M.MAS + reportData.g12_59.F.MAS,
      (reportData.g6_11.M.BEN + reportData.g6_11.M.MAM + reportData.g6_11.M.MAS) +
      (reportData.g6_11.F.BEN + reportData.g6_11.F.MAM + reportData.g6_11.F.MAS) +
      (reportData.g12_59.M.BEN + reportData.g12_59.M.MAM + reportData.g12_59.M.MAS) +
      (reportData.g12_59.F.BEN + reportData.g12_59.F.MAM + reportData.g12_59.F.MAS)
    ]
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Rapport Mensuel");

  XLSX.writeFile(wb, `Rapport_Nutritionnel_${monthStr}.xlsx`);
};

/**
 * Export Monthly Report to PDF
 * @param {Object} reportData Data calculated from calculateReportData
 * @param {string} monthStr "YYYY-MM"
 * @param {Object} settings Nurse settings
 */
export const exportReportToPDF = (reportData, monthStr, settings = {}) => {
  const doc = new jsPDF();
  const readableMonth = formatMonthFrench(monthStr);

  // Styling properties
  const primaryColor = [79, 70, 229]; // Indigo
  const darkColor = [31, 41, 55]; // Gray-800
  const lightColor = [243, 244, 246]; // Gray-100

  // Title & Header
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("RAPPORT MENSUEL DE SURVEILLANCE NUTRITIONNELLE", 14, 20);

  doc.setFontSize(12);
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.text(`Période : ${readableMonth}`, 14, 28);
  
  if (settings.nurseName) {
    doc.setFont('Helvetica', 'normal');
    doc.text(`Infirmière : ${settings.nurseName}`, 14, 35);
  }
  if (settings.facilityName) {
    doc.setFont('Helvetica', 'normal');
    doc.text(`Structure : ${settings.facilityName}`, 14, 42);
  }

  // Draw table header
  const tableTop = 50;
  const colWidths = [45, 25, 35, 35, 35, 15];
  const colPositions = [14, 59, 84, 119, 154, 189];
  const headers = ['Groupe d\'âge', 'Sexe', 'Classe BEN (Bon)', 'Classe MAM (Mod.)', 'Classe MAS (Sév.)', 'Total'];

  // Draw Header Background
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(14, tableTop, 180, 10, 'F');
  
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  headers.forEach((header, i) => {
    doc.text(header, colPositions[i] + 1, tableTop + 7);
  });

  // Table rows
  const rows = [
    [
      '6 à 11 mois', 
      'Garçons (M)', 
      String(reportData.g6_11.M.BEN), 
      String(reportData.g6_11.M.MAM), 
      String(reportData.g6_11.M.MAS), 
      String(reportData.g6_11.M.BEN + reportData.g6_11.M.MAM + reportData.g6_11.M.MAS)
    ],
    [
      '6 à 11 mois', 
      'Filles (F)', 
      String(reportData.g6_11.F.BEN), 
      String(reportData.g6_11.F.MAM), 
      String(reportData.g6_11.F.MAS), 
      String(reportData.g6_11.F.BEN + reportData.g6_11.F.MAM + reportData.g6_11.F.MAS)
    ],
    [
      '1 an et plus (12-59m)', 
      'Garçons (M)', 
      String(reportData.g12_59.M.BEN), 
      String(reportData.g12_59.M.MAM), 
      String(reportData.g12_59.M.MAS), 
      String(reportData.g12_59.M.BEN + reportData.g12_59.M.MAM + reportData.g12_59.M.MAS)
    ],
    [
      '1 an et plus (12-59m)', 
      'Filles (F)', 
      String(reportData.g12_59.F.BEN), 
      String(reportData.g12_59.F.MAM), 
      String(reportData.g12_59.F.MAS), 
      String(reportData.g12_59.F.BEN + reportData.g12_59.F.MAM + reportData.g12_59.F.MAS)
    ]
  ];

  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);

  let currentY = tableTop + 10;
  rows.forEach((row, rowIndex) => {
    // Zebra striping
    if (rowIndex % 2 === 1) {
      doc.setFillColor(lightColor[0], lightColor[1], lightColor[2]);
      doc.rect(14, currentY, 180, 10, 'F');
    }
    
    // Draw cells
    row.forEach((text, colIndex) => {
      doc.text(text, colPositions[colIndex] + 1, currentY + 7);
    });

    // Draw bottom border
    doc.setDrawColor(200, 200, 200);
    doc.line(14, currentY + 10, 194, currentY + 10);

    currentY += 10;
  });

  // Total Row
  doc.setFillColor(238, 242, 255); // Indigo-50
  doc.rect(14, currentY, 180, 10, 'F');

  doc.setFont('Helvetica', 'bold');
  doc.text('TOTAL GENERAL', colPositions[0] + 1, currentY + 7);
  
  const totalBEN = reportData.g6_11.M.BEN + reportData.g6_11.F.BEN + reportData.g12_59.M.BEN + reportData.g12_59.F.BEN;
  const totalMAM = reportData.g6_11.M.MAM + reportData.g6_11.F.MAM + reportData.g12_59.M.MAM + reportData.g12_59.F.MAM;
  const totalMAS = reportData.g6_11.M.MAS + reportData.g6_11.F.MAS + reportData.g12_59.M.MAS + reportData.g12_59.F.MAS;
  const grandTotal = totalBEN + totalMAM + totalMAS;

  doc.text(String(totalBEN), colPositions[2] + 1, currentY + 7);
  doc.text(String(totalMAM), colPositions[3] + 1, currentY + 7);
  doc.text(String(totalMAS), colPositions[4] + 1, currentY + 7);
  doc.text(String(grandTotal), colPositions[5] + 1, currentY + 7);

  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.line(14, currentY + 10, 194, currentY + 10);

  // Footer/Signatures
  const footerY = currentY + 30;
  doc.setFont('Helvetica', 'italic');
  doc.setFontSize(10);
  doc.text(`Rapport généré le ${new Date().toLocaleString('fr-FR')}`, 14, footerY);

  doc.setFont('Helvetica', 'normal');
  doc.text("Signature Infirmière :", 140, footerY);
  doc.line(140, footerY + 15, 185, footerY + 15);

  // Save the PDF
  doc.save(`Rapport_Nutritionnel_${monthStr}.pdf`);
};
