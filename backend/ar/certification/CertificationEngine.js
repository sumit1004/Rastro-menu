const AssetVersionManager = require('../versioning/AssetVersionManager');
const AssetHealthMonitor = require('../health/AssetHealthMonitor');

class CertificationEngine {
  /**
   * Promotes a 'Normalized' or 'Optimized' version to 'Certified' if health is Green/Yellow.
   */
  static async certifyAsset(versionId, rawMetrics, metadata, cloudinaryResponse) {
    const health = AssetHealthMonitor.evaluate(rawMetrics, metadata, cloudinaryResponse);

    let finalStatus = 'Certified';
    if (health.color === 'RED') {
      finalStatus = 'Rejected';
      console.warn(`[CertificationEngine] Asset ${versionId} rejected. Reason: ${health.issues.join(', ')}`);
    }

    await AssetVersionManager.updateVersionState(versionId, {
      status: finalStatus,
      cloudinary_url: cloudinaryResponse?.secure_url || '',
      quality_score: health.score
    });

    return {
      certified: finalStatus === 'Certified',
      health
    };
  }
}

module.exports = CertificationEngine;
