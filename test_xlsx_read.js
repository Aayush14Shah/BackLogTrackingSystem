import * as XLSX from 'xlsx';
import { readFileSync } from 'fs';

const file = readFileSync('../BATCH 2021 SEM-6 FAILURE COMPONENTWISE.xlsx');
const workbook = XLSX.read(file);
const worksheet = workbook.Sheets[workbook.SheetNames[0]];
const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

console.log('Row 0:', jsonData[0]);
console.log('Row 1:', jsonData[1]);
console.log('Row 2:', jsonData[2]);
console.log('Row 3:', jsonData[3]);
console.log('\nTotal rows:', jsonData.length);
