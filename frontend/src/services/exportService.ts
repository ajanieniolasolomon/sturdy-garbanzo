import { saveAs } from 'file-saver';
// Heavy libs are loaded dynamically on demand to reduce initial bundle size

type RowObject = Record<string, any>;

const sanitize = (value: any) => {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const toCSV = (rows: RowObject[]): string => {
  if (!rows || rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];
  for (const row of rows) {
    const line = headers
      .map((key) => {
        const cell = sanitize(row[key]).replace(/\"/g, '""');
        return `"${cell}"`;
      })
      .join(',');
    lines.push(line);
  }
  return lines.join('\n');
};

export const exportToCSV = (filename: string, rows: RowObject[]) => {
  const csv = toCSV(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, filename.endsWith('.csv') ? filename : `${filename}.csv`);
};

export const exportToExcel = async (filename: string, rows: RowObject[]) => {
  const XLSX = await import('xlsx');
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/octet-stream' });
  saveAs(blob, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
};

export const exportToPDF = async (
  filename: string,
  rows: RowObject[],
  title = 'Report'
) => {
  const jsPDFModule = await import('jspdf');
  await import('jspdf-autotable');
  const jsPDF = jsPDFModule.default || (jsPDFModule as any).jsPDF;
  const doc = new jsPDF({ orientation: 'landscape' });
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  const data = rows.map((row) => headers.map((h) => sanitize(row[h])));

  doc.setFontSize(14);
  doc.text(title, 14, 16);
  (doc as any).autoTable({
    head: [headers],
    body: data,
    startY: 22,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [37, 99, 235] },
  });
  doc.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
};

// Domain-specific helpers
const computeFromConsultations = (p: any) => {
  const consults = Array.isArray(p.consultations) ? p.consultations : [];
  const sorted = [...consults].sort((a, b) => new Date(a.consultationDate).getTime() - new Date(b.consultationDate).getTime());
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const begin = first || {};
  const end = last || {};

  return {
    latestDiagnosis: last?.diagnosis || begin?.diagnosis || '',
    treatmentStartDate: begin?.consultationDate || '',
    initialWeight: begin?.weightKg || '',
    initialHeight: begin?.heightCm || '',
    initialLabTests: begin?.labTests || '',
    initialDrugs: begin?.treatment || '',
    lastVisitDate: last?.consultationDate || '',
    endingWeight: end?.weightKg || '',
    endingHeight: end?.heightCm || '',
    endingLabTests: end?.labTests || '',
    endingDrugs: end?.treatment || '',
    nextAppointmentDate: last?.followUpDate || '',
  };
};

export const mapPatientsForExport = (patients: any[]) =>
  patients.map((raw) => {
    const p = { ...raw, ...(computeFromConsultations(raw) as any) };
    return {
      'CC No': p.ccNumber,
      'Name': p.fullName,
      'Age': p.age ?? '',
      'gender': p.gender,
      'Nationality': p.nationality || p.country || '',
      'Phone number': p.phoneNumber || p.phone || '',
      'address': p.address || '',
      'contact phone': p.emergencyContact || '',
      'Assigned Hospital name': p.hospitalName || p.hospitalId || '',
      'Diagnosis': p.latestDiagnosis || '',
      'Date of treatment start': p.treatmentStartDate || '',
      'Weight at beginning date chosen': p.initialWeight || '',
      'Height at beginning date chosen': p.initialHeight || '',
      'Lab test at beginning date chosen': p.initialLabTests || '',
      'Drugs given at beginning date chosen': p.initialDrugs || '',
      'Last visit date': p.lastVisitDate || '',
      'Weight at ending date chosen': p.endingWeight || '',
      'Height at ending date chosen': p.endingHeight || '',
      'Lab test at ending date chosen': p.endingLabTests || '',
      'Drugs given at ending date chosen': p.endingDrugs || '',
      'Next appointment date': p.nextAppointmentDate || '',
      'Status': p.status,
    };
  });

export default {
  exportToCSV,
  exportToExcel,
  exportToPDF,
  mapPatientsForExport,
};
