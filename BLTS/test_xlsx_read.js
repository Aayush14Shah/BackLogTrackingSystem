import * as XLSX from 'xlsx';
import { readFileSync } from 'fs';

console.log('=== SEM-6 File ===');
const file6 = readFileSync('../BATCH 2021 SEM-6 FAILURE COMPONENTWISE.xlsx');
const workbook6 = XLSX.read(file6);
const worksheet6 = workbook6.Sheets[workbook6.SheetNames[0]];
const jsonData6 = XLSX.utils.sheet_to_json(worksheet6, { header: 1 });
console.log('Row 0:', jsonData6[0]);
console.log('Row 1:', jsonData6[1]);

console.log('\n=== SEM-5 File ===');
const file5 = readFileSync('../BATCH 2021 SEM-5 FAILURE COMPONENTWISE.xlsx');
const workbook5 = XLSX.read(file5);
const worksheet5 = workbook5.Sheets[workbook5.SheetNames[0]];
const jsonData5 = XLSX.utils.sheet_to_json(worksheet5, { header: 1 });
console.log('Row 0:', jsonData5[0]);
console.log('Row 1:', jsonData5[1]);
console.log('Row 2:', jsonData5[2]);
