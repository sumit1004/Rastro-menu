class MetadataGenerator {
  static generate(rawMetrics, scaleFactor, pivotOffset, profile) {
    const { width, height, depth } = rawMetrics.dimensions;

    return {
      original_dimensions_m: { width, height, depth },
      normalized_dimensions_m: {
        width: width * scaleFactor,
        height: height * scaleFactor,
        depth: depth * scaleFactor
      },
      scale_factor_applied: scaleFactor,
      pivot_position: pivotOffset,
      category_detected: profile ? "Profile Matched" : "Generic",
      pipeline_version: "1.0.0",
      processed_at: new Date().toISOString()
    };
  }
}

class QualityScorer {
  static score(rawMetrics, metadata) {
    let overall = 100;
    const reasons = [];

    // Poly count check
    if (rawMetrics.counts.triangles > 100000) {
      overall -= 30;
      reasons.push('High poly count (>100k)');
    } else if (rawMetrics.counts.triangles > 50000) {
      overall -= 10;
      reasons.push('Moderate poly count (>50k)');
    }

    // Material check
    if (rawMetrics.counts.materials === 0) {
      overall -= 50;
      reasons.push('Missing materials');
    }

    // Extreme scale check (was the original asset tiny or massive?)
    if (metadata.scale_factor_applied < 0.001 || metadata.scale_factor_applied > 1000) {
      overall -= 20;
      reasons.push('Extreme scale correction applied');
    }

    return {
      overall: Math.max(0, overall),
      geometry_quality: rawMetrics.counts.triangles < 50000 ? 100 : 70,
      ar_readiness: overall > 70 ? 100 : overall,
      reasons
    };
  }
}

module.exports = { MetadataGenerator, QualityScorer };
