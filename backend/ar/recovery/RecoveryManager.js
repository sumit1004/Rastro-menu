const pool = require('../../config/db');

class RecoveryManager {
  /**
   * Logs a stage progression for a specific asset version.
   */
  static async logStage(versionId, stage, message = 'Success', durationMs = 0) {
    await pool.query(
      `INSERT INTO ar_processing_logs (asset_version_id, stage, message, duration_ms) VALUES (?, ?, ?, ?)`,
      [versionId, stage, message, durationMs]
    );
  }

  /**
   * Identifies interrupted assets (stuck in 'Normalized' or 'Validated' for > 10 mins).
   * Used by BatchReprocessor.
   */
  static async findInterruptedUploads() {
    const [stuckVersions] = await pool.query(
      `SELECT * FROM ar_asset_versions 
       WHERE status IN ('Draft', 'Validated', 'Normalized') 
       AND created_at < (NOW() - INTERVAL 10 MINUTE)`
    );
    return stuckVersions;
  }
}

module.exports = RecoveryManager;
