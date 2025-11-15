const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const checksumFilePath = path.join(__dirname, 'checksum.json');

function createChecksum(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function getChecksums() {
  if (fs.existsSync(checksumFilePath)) {
    const checksums = fs.readFileSync(checksumFilePath, 'utf-8');
    return JSON.parse(checksums);
  }
  return {};
}

function saveChecksum(fileName, checksum) {
  const checksums = getChecksums();
  const existingChecksum = checksums[fileName];
  if (existingChecksum && existingChecksum.checksum === checksum) {
    return;
  }
  checksums[fileName] = {
    checksum: checksum,
  };
  fs.writeFileSync(checksumFilePath, JSON.stringify(checksums, null, 2));
}

function verifyChecksum(fileName, checksum) {
    const checksums = getChecksums();
    return checksums[fileName] && checksums[fileName].checksum === checksum;
}

module.exports = {
  createChecksum,
  getChecksums,
  saveChecksum,
  verifyChecksum,
};
