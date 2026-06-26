class DiffGenerator {
  /**
   * Generates a comparison report between two asset versions.
   */
  static generateDiff(oldMetadata, newMetadata) {
    return {
      scale: {
        old: oldMetadata?.scale_factor_applied || 1.0,
        new: newMetadata?.scale_factor_applied || 1.0,
        change: ((newMetadata.scale_factor_applied / (oldMetadata?.scale_factor_applied || 1.0)) * 100).toFixed(2) + '%'
      },
      quality: {
        old: oldMetadata?.quality_score || 0,
        new: newMetadata?.quality_score || 0,
        improvement: (newMetadata.quality_score || 0) - (oldMetadata?.quality_score || 0)
      }
    };
  }
}

module.exports = DiffGenerator;
