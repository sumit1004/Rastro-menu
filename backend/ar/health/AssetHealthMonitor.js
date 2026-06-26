class AssetHealthMonitor {
  /**
   * Generates a traffic-light status based on processing metrics.
   * Green = Good, Yellow = Usable but unoptimized, Red = Broken/Unusable.
   */
  static evaluate(rawMetrics, metadata, cloudinaryResponse) {
    let score = 100;
    const issues = [];
    let color = 'GREEN';

    if (!cloudinaryResponse || !cloudinaryResponse.secure_url) {
      issues.push('Cloudinary upload missing or corrupted');
      return { score: 0, color: 'RED', issues };
    }

    if (rawMetrics.counts.triangles > 200000) {
      score -= 50;
      issues.push('Critical Poly Count (>200k) - Device crashes likely');
      color = 'RED';
    } else if (rawMetrics.counts.triangles > 50000) {
      score -= 20;
      issues.push('High Poly Count (>50k)');
      if (color === 'GREEN') color = 'YELLOW';
    }

    if (metadata.scale_factor_applied > 500 || metadata.scale_factor_applied < 0.005) {
      score -= 20;
      issues.push('Extreme scale correction applied - Visual artifacts possible');
      if (color === 'GREEN') color = 'YELLOW';
    }

    if (rawMetrics.counts.materials === 0) {
      score -= 40;
      issues.push('Missing materials - Mesh will appear untextured');
      color = 'RED';
    }

    return {
      score: Math.max(0, score),
      color,
      issues
    };
  }
}

module.exports = AssetHealthMonitor;
