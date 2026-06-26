class FileValidator {
  static validate(fileBuffer, originalFilename) {
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new Error('File buffer is empty or undefined.');
    }

    if (!originalFilename.toLowerCase().endsWith('.glb')) {
      throw new Error('Invalid file type. Only .glb files are supported for AR optimization.');
    }

    // Check magic number for GLB (glTF binary format starts with 'glTF' which is 0x46546C67)
    if (fileBuffer.length > 4) {
      const magic = fileBuffer.readUInt32LE(0);
      if (magic !== 0x46546C67) {
        throw new Error('File does not have a valid GLB binary signature.');
      }
    }

    // Enforce max file size before processing (e.g., 50MB)
    const MAX_SIZE = 50 * 1024 * 1024; 
    if (fileBuffer.length > MAX_SIZE) {
      throw new Error(`File is too large. Maximum allowed size is ${MAX_SIZE / 1024 / 1024}MB.`);
    }

    return true;
  }
}

module.exports = FileValidator;
