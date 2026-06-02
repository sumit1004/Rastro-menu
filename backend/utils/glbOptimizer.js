const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Optimizes a GLB model using gltf-transform CLI via npx.
 * Applies draco compression and texture resizing for production AR.
 * 
 * @param {string} inputPath - Absolute path to the uploaded .glb file
 * @returns {Promise<string>} - Resolves to the path of the optimized .glb file
 */
const optimizeGlb = (inputPath) => {
  return new Promise((resolve, reject) => {
    // Determine output path (e.g. upload_dir/optimized_1234.glb)
    const parsedPath = path.parse(inputPath);
    const outputPath = path.join(parsedPath.dir, `optimized_${parsedPath.name}${parsedPath.ext}`);

    // Command uses npx to run gltf-transform.
    // It compresses using draco and resizes textures to 2048x2048.
    const command = `npx @gltf-transform/cli optimize "${inputPath}" "${outputPath}" --texture-size 2048 --compress draco`;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`GLB Optimization failed: ${error.message}`);
        console.error(stderr);
        // Fallback to original file if optimization fails
        return resolve(inputPath);
      }
      
      console.log(`GLB Optimized successfully:\n${stdout}`);
      resolve(outputPath);
    });
  });
};

module.exports = {
  optimizeGlb
};
