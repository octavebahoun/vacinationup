import XLSX from 'xlsx';
import fs from 'fs';

const parseFile = (filepath) => {
  const workbook = XLSX.readFile(filepath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  const data = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 4) continue;
    
    const length = parseFloat(row[0]);
    const L = parseFloat(row[1]);
    const M = parseFloat(row[2]);
    const S = parseFloat(row[3]);
    
    const sd3neg = parseFloat(row[5]);
    const sd2neg = parseFloat(row[6]);
    const sd1neg = parseFloat(row[7]);
    const sd0 = parseFloat(row[8]);
    const sd1 = parseFloat(row[9]);
    const sd2 = parseFloat(row[10]);
    const sd3 = parseFloat(row[11]);
    
    data.push({
      l: length,
      L,
      M,
      S,
      sd3: sd3neg,
      sd2: sd2neg,
      sd1: sd1neg,
      sd0: sd0,
      sd1pos: sd1,
      sd2pos: sd2,
      sd3pos: sd3
    });
  }
  return data;
};

try {
  const boysData = parseFile('src/utils/data/wfl_boys.xlsx');
  const girlsData = parseFile('src/utils/data/wfl_girls.xlsx');
  
  const output = {
    boys: boysData,
    girls: girlsData
  };
  
  // Save as JS file for seamless import without JSON assert errors in Node/Vite
  fs.writeFileSync('src/utils/data/wfl_data.js', 'export default ' + JSON.stringify(output) + ';');
  console.log(`Successfully parsed WHO growth standards into JS!`);
  console.log(`Boys records: ${boysData.length}`);
  console.log(`Girls records: ${girlsData.length}`);
} catch (error) {
  console.error(`Error parsing files:`, error);
}
