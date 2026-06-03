const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const backupDir = path.join(__dirname, '../backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir);
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const fileName = `rastro_db_backup_${timestamp}.sql.gz`;
const filePath = path.join(backupDir, fileName);

// Using mysqldump command
// Ensure mysqldump is in system PATH
const cmd = `mysqldump -u ${process.env.DB_USER} ${process.env.DB_PASSWORD ? `-p${process.env.DB_PASSWORD}` : ''} ${process.env.DB_NAME} | gzip > ${filePath}`;

console.log(`Starting database backup: ${fileName}`);

exec(cmd, (error, stdout, stderr) => {
  if (error) {
    console.error(`Backup failed: ${error.message}`);
    return;
  }
  if (stderr) {
    console.warn(`Backup stderr: ${stderr}`);
  }
  console.log(`Backup completed successfully at ${filePath}`);

  // Retention Policy: keep only last 7 days of backups
  fs.readdir(backupDir, (err, files) => {
    if (err) return console.error('Failed to read backup directory for cleanup', err);

    const now = Date.now();
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

    files.forEach(file => {
      const fullPath = path.join(backupDir, file);
      fs.stat(fullPath, (err, stats) => {
        if (err) return;
        if (now - stats.mtimeMs > SEVEN_DAYS) {
          fs.unlink(fullPath, err => {
            if (err) console.error(`Failed to delete old backup: ${file}`);
            else console.log(`Deleted old backup: ${file}`);
          });
        }
      });
    });
  });
});
