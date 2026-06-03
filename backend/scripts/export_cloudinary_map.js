const fs = require('fs');
const path = require('path');
const pool = require('../config/db');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const backupDir = path.join(__dirname, '../backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir);
}

async function exportAssetMap() {
  try {
    const [rows] = await pool.query('SELECT id, dish_name, dish_slug, glb_url, usdz_url, thumbnail_url, preview_image FROM ar_model_library');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `asset_map_${timestamp}.json`;
    const filePath = path.join(backupDir, fileName);

    fs.writeFileSync(filePath, JSON.stringify(rows, null, 2));
    console.log(`Cloudinary Asset Map exported successfully to ${filePath}`);
    console.log(`Total Models mapped: ${rows.length}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Failed to export asset map:', error);
    process.exit(1);
  }
}

exportAssetMap();
