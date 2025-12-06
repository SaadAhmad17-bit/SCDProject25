const fileDB = require('./file');
const recordUtils = require('./record');
const vaultEvents = require('../events');
const fs = require('fs');
const path = require('path');

// Create backups directory if it doesn't exist
const backupsDir = path.join(__dirname, '..', 'backups');
if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir);
}

function createBackup() {
  const data = fileDB.readDB();
  const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
  const backupFileName = `backup_${timestamp}.json`;
  const backupPath = path.join(backupsDir, backupFileName);
  
  fs.writeFileSync(backupPath, JSON.stringify(data, null, 2));
  console.log(`🔒 Backup created: ${backupFileName}`);
}

function addRecord({ name, value }) {
  recordUtils.validateRecord({ name, value });
  const data = fileDB.readDB();
  const newRecord = { 
    id: recordUtils.generateId(), 
    name, 
    value,
    createdAt: new Date().toISOString().split('T')[0] // YYYY-MM-DD format
  };
  data.push(newRecord);
  fileDB.writeDB(data);
  createBackup(); // Automatic backup
  vaultEvents.emit('recordAdded', newRecord);
  return newRecord;
}

function listRecords() {
  return fileDB.readDB();
}

function updateRecord(id, newName, newValue) {
  const data = fileDB.readDB();
  const record = data.find(r => r.id === id);
  if (!record) return null;
  record.name = newName;
  record.value = newValue;
  fileDB.writeDB(data);
  vaultEvents.emit('recordUpdated', record);
  return record;
}

function deleteRecord(id) {
  let data = fileDB.readDB();
  const record = data.find(r => r.id === id);
  if (!record) return null;
  data = data.filter(r => r.id !== id);
  fileDB.writeDB(data);
  createBackup(); // Automatic backup
  vaultEvents.emit('recordDeleted', record);
  return record;
}

function searchRecords(keyword) {
  const data = fileDB.readDB();
  const lowerKeyword = keyword.toLowerCase();
  
  return data.filter(record => {
    const nameMatch = record.name.toLowerCase().includes(lowerKeyword);
    const idMatch = record.id.toString().includes(keyword);
    return nameMatch || idMatch;
  });
}

function sortRecords(field, order) {
  const data = fileDB.readDB();
  const sortedData = [...data]; // Create a copy to avoid modifying original
  
  const isAscending = order.toLowerCase().startsWith('a');
  
  if (field.toLowerCase().startsWith('n')) {
    // Sort by Name
    sortedData.sort((a, b) => {
      const comparison = a.name.localeCompare(b.name);
      return isAscending ? comparison : -comparison;
    });
  } else if (field.toLowerCase().startsWith('d')) {
    // Sort by Date
    sortedData.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0);
      const dateB = new Date(b.createdAt || 0);
      return isAscending ? dateA - dateB : dateB - dateA;
    });
  }
  
  return sortedData;
}

function exportData() {
  const data = fileDB.readDB();
  const exportPath = path.join(__dirname, '..', 'export.txt');
  const now = new Date();
  
  let content = '';
  content += '='.repeat(50) + '\n';
  content += 'NODEVAULT DATA EXPORT\n';
  content += '='.repeat(50) + '\n';
  content += `Export Date: ${now.toLocaleString()}\n`;
  content += `Total Records: ${data.length}\n`;
  content += `File Name: export.txt\n`;
  content += '='.repeat(50) + '\n\n';
  
  if (data.length === 0) {
    content += 'No records to export.\n';
  } else {
    data.forEach((record, index) => {
      content += `Record #${index + 1}\n`;
      content += `-`.repeat(30) + '\n';
      content += `ID: ${record.id}\n`;
      content += `Name: ${record.name}\n`;
      content += `Value: ${record.value}\n`;
      content += `Created: ${record.createdAt || 'N/A'}\n`;
      content += '\n';
    });
  }
  
  fs.writeFileSync(exportPath, content);
}

function getStatistics() {
  const data = fileDB.readDB();
  const dbFilePath = path.join(__dirname, '..', 'data', 'vault.json');
  
  let stats = {
    totalRecords: data.length,
    lastModified: 'N/A',
    longestName: 'N/A',
    longestNameLength: 0,
    earliestRecord: 'N/A',
    latestRecord: 'N/A'
  };
  
  // Get last modified date
  if (fs.existsSync(dbFilePath)) {
    const fileStats = fs.statSync(dbFilePath);
    stats.lastModified = fileStats.mtime.toLocaleString();
  }
  
  if (data.length > 0) {
    // Find longest name
    let longest = data[0].name;
    data.forEach(record => {
      if (record.name.length > longest.length) {
        longest = record.name;
      }
    });
    stats.longestName = longest;
    stats.longestNameLength = longest.length;
    
    // Find earliest and latest records
    const dates = data
      .filter(r => r.createdAt)
      .map(r => new Date(r.createdAt))
      .sort((a, b) => a - b);
    
    if (dates.length > 0) {
      stats.earliestRecord = dates[0].toISOString().split('T')[0];
      stats.latestRecord = dates[dates.length - 1].toISOString().split('T')[0];
    }
  }
  
  return stats;
}

module.exports = { 
  addRecord, 
  listRecords, 
  updateRecord, 
  deleteRecord,
  searchRecords,
  sortRecords,
  exportData,
  getStatistics
};
