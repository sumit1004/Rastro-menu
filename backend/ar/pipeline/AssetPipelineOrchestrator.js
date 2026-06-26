const FileValidator = require('../validators/FileValidator');
const GeometryAnalyzer = require('../analyzers/GeometryAnalyzer');
const CategoryResolver = require('../utils/CategoryResolver');
const TransformNormalizer = require('../normalizers/TransformNormalizer');
const MetadataGenerator = require('../metadata/MetadataGenerator');
const QualityScorer = require('../analyzers/QualityScorer');

class AssetPipelineOrchestrator {
  /**
   * Main entry point for the universal processing flow.
   * Upload -> Validation -> Analysis -> Normalization -> Metadata -> Score
   */
  static async processBuffer(fileBuffer, originalFilename, dishCategory, dishName) {
    try {
      // 1. File Validation
      FileValidator.validate(fileBuffer, originalFilename);

      // 2. Load into geometry engine
      const doc = await GeometryAnalyzer.loadDocument(fileBuffer);

      // 3. Geometry Analysis
      const rawMetrics = GeometryAnalyzer.analyze(doc);

      // 4. Category Profile Resolution
      const profile = CategoryResolver.resolve(dishCategory, dishName);

      // 5-8. Scale, Pivot, Orientation Normalization & Transform Bake
      const { normalizedDoc, scaleFactor, pivotOffset } = await TransformNormalizer.normalize(doc, rawMetrics, profile);

      // 9. Metadata Generation
      const metadata = MetadataGenerator.generate(rawMetrics, scaleFactor, pivotOffset, profile);

      // 10. Quality Scoring
      const score = QualityScorer.score(rawMetrics, metadata);
      if (score.overall < 50) {
        throw new Error(`Asset quality too low (${score.overall}/100): ${score.reasons.join(', ')}`);
      }

      // Serialize back to GLB buffer
      const finalBuffer = await GeometryAnalyzer.saveDocument(normalizedDoc);

      return {
        buffer: finalBuffer,
        metadata,
        score
      };
    } catch (error) {
      console.error('[AssetPipelineOrchestrator] Processing failed:', error.message);
      throw error;
    }
  }
}

module.exports = AssetPipelineOrchestrator;
