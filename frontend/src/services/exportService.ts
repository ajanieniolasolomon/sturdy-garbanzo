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
export const mapPatientsForExport = (patients: any[]) =>
  patients.map((p) => ({
    FullName: p.fullName,
    CCNumber: p.ccNumber,
    Phone: p.phoneNumber || '',
    Age: p.age ?? '',
    Gender: p.gender,
    Address: p.address || '',
    LGA: p.lga || '',
    State: p.state || '',
    Country: p.country,
    Status: p.status,
    AssignedHCW: p.assignedHCW || '',
    HospitalId: p.hospitalId || '',
    CreatedAt: p.createdAt || '',
    UpdatedAt: p.updatedAt || '',
  }));

export default {
  exportToCSV,
  exportToExcel,
  exportToPDF,
  mapPatientsForExport,
};
