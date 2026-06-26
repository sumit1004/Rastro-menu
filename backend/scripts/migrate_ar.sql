CREATE TABLE IF NOT EXISTS `ar_asset_versions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `dish_id` INT NOT NULL,
  `version_tag` VARCHAR(50) NOT NULL,
  `pipeline_version` VARCHAR(50) NOT NULL,
  `normalization_version` VARCHAR(50) NOT NULL,
  `optimization_version` VARCHAR(50) NOT NULL,
  `profile_version` VARCHAR(50) NOT NULL,
  `cloudinary_url` VARCHAR(255) NOT NULL,
  `scale_factor` FLOAT NOT NULL,
  `pivot_offset` VARCHAR(50),
  `category_detected` VARCHAR(100),
  `quality_score` INT DEFAULT 0,
  `status` ENUM('Draft', 'Validated', 'Normalized', 'Optimized', 'Certified', 'Rejected') DEFAULT 'Draft',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `processed_at` TIMESTAMP NULL,
  `source` VARCHAR(100) DEFAULT 'dashboard',
  FOREIGN KEY (`dish_id`) REFERENCES `dishes`(`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `ar_processing_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `asset_version_id` INT NOT NULL,
  `stage` ENUM('UPLOAD', 'VALIDATION', 'NORMALIZATION', 'OPTIMIZATION', 'CLOUDINARY', 'DATABASE', 'COMPLETED', 'FAILED') NOT NULL,
  `message` TEXT,
  `duration_ms` INT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`asset_version_id`) REFERENCES `ar_asset_versions`(`id`) ON DELETE CASCADE
);

-- Note: In `dishes` table, `ar_model_id` will now reference `ar_asset_versions(id)` where status='Certified'
