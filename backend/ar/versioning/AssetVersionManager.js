const pool = require('../../config/db');

class AssetVersionManager {
  /**
   * Registers a new Draft version of an asset in the database.
   */
  static async registerNewVersion(dishId, metadata, pipelineConfig, source = 'dashboard') {
    const versionTag = `v${Date.now()}`;
    const [result] = await pool.query(
      `INSERT INTO ar_asset_versions 
        (dish_id, version_tag, pipeline_version, normalization_version, optimization_version, profile_version, cloudinary_url, scale_factor, pivot_offset, category_detected, quality_score, status, source) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        dishId, versionTag, pipelineConfig.pipeline_version, pipelineConfig.normalization_version, 
        pipelineConfig.optimization_version, pipelineConfig.profile_version, 
        '', metadata.scale_factor_applied || 1.0, metadata.pivot_position || 'Center', 
        metadata.category_detected || 'Generic', 0, 'Draft', source
      ]
    );
    return result.insertId;
  }

  /**
   * Updates an existing version with Cloudinary URL and final scores.
   */
  static async updateVersionState(versionId, updateData) {
    const keys = Object.keys(updateData);
    const values = Object.values(updateData);
    const setQuery = keys.map(k => `${k} = ?`).join(', ');

    await pool.query(
      `UPDATE ar_asset_versions SET ${setQuery}, processed_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [...values, versionId]
    );
  }

  /**
   * Safe Rollback: Reverts the active certified asset for a dish to the previous certified version.
   */
  static async rollbackToPreviousCertified(dishId) {
    const [versions] = await pool.query(
      `SELECT id FROM ar_asset_versions WHERE dish_id = ? AND status = 'Certified' ORDER BY created_at DESC LIMIT 2`,
      [dishId]
    );

    if (versions.length < 2) {
      throw new Error('No previous certified version available for rollback.');
    }

    const previousCertifiedId = versions[1].id;
    await pool.query(`UPDATE dishes SET ar_model_id = ? WHERE id = ?`, [previousCertifiedId, dishId]);
    return previousCertifiedId;
  }
}

module.exports = AssetVersionManager;
