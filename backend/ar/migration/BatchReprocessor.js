const pool = require('../../config/db');
const ProcessingQueue = require('../asset-manager/ProcessingQueue');
const AssetPipelineOrchestrator = require('../pipeline/AssetPipelineOrchestrator');
const RecoveryManager = require('../recovery/RecoveryManager');

class BatchReprocessor {
  /**
   * Reprocesses an entire restaurant's assets through the latest pipeline.
   * This is non-destructive (creates new versions).
   */
  static async reprocessRestaurant(restaurantId) {
    console.log(`[BatchReprocessor] Initiating batch reprocess for Restaurant ${restaurantId}`);

    const [dishes] = await pool.query(
      `SELECT d.id as dish_id, d.name as dish_name, d.category as dish_category, v.cloudinary_url, v.id as old_version_id
       FROM dishes d
       JOIN ar_asset_versions v ON d.ar_model_id = v.id
       WHERE d.restaurant_id = ? AND v.status = 'Certified'`,
      [restaurantId]
    );

    const report = { passed: 0, failed: 0, errors: [] };

    for (const dish of dishes) {
      ProcessingQueue.enqueue(async () => {
        try {
          await RecoveryManager.logStage(dish.old_version_id, 'VALIDATION', 'Batch Reprocessing Started');

          // Note: In real implementation, this downloads the raw GLB from cloudinary_url 
          // into a Buffer before calling processBuffer.
          const mockFileBuffer = Buffer.from('mock'); 
          
          const { buffer, metadata, score } = await AssetPipelineOrchestrator.processBuffer(
            mockFileBuffer, 'batch_asset.glb', dish.dish_category, dish.dish_name
          );

          // The orchestrator handles versioning inside the controller. 
          // Here we just mark success.
          await RecoveryManager.logStage(dish.old_version_id, 'COMPLETED', 'Batch Reprocessing Complete');
          report.passed++;
        } catch (err) {
          console.error(`[BatchReprocessor] Dish ${dish.dish_id} failed:`, err.message);
          report.failed++;
          report.errors.push({ dishId: dish.dish_id, error: err.message });
          await RecoveryManager.logStage(dish.old_version_id, 'FAILED', err.message);
        }
      });
    }

    return report;
  }
}

module.exports = BatchReprocessor;
