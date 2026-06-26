const { NodeIO } = require('@gltf-transform/core');
const { bounds } = require('@gltf-transform/functions');

class GeometryAnalyzer {
  static io = new NodeIO();

  static async loadDocument(fileBuffer) {
    try {
      return await this.io.readBinary(fileBuffer);
    } catch (err) {
      throw new Error(`Failed to parse GLB document: ${err.message}`);
    }
  }

  static async saveDocument(doc) {
    return await this.io.writeBinary(doc);
  }

  static analyze(doc) {
    const scene = doc.getRoot().getDefaultScene() || doc.getRoot().listScenes()[0];
    if (!scene) throw new Error('GLB contains no scenes.');

    // Calculate Bounding Box
    const bbox = bounds(scene);
    
    // Width (X), Height (Y), Depth (Z)
    const width = bbox.max.map((v, i) => v - bbox.min[i]);
    const w = width[0];
    const h = width[1];
    const d = width[2];

    const center = [
      bbox.min[0] + w / 2,
      bbox.min[1] + h / 2,
      bbox.min[2] + d / 2
    ];

    // Count metrics
    const meshes = doc.getRoot().listMeshes();
    const materials = doc.getRoot().listMaterials();
    const textures = doc.getRoot().listTextures();
    
    let triangleCount = 0;
    let vertexCount = 0;

    meshes.forEach(mesh => {
      mesh.listPrimitives().forEach(prim => {
        const indices = prim.getIndices();
        const position = prim.getAttribute('POSITION');
        if (indices) triangleCount += indices.getCount() / 3;
        if (position) vertexCount += position.getCount();
      });
    });

    return {
      bbox,
      dimensions: { width: w, height: h, depth: d },
      center,
      counts: {
        meshes: meshes.length,
        materials: materials.length,
        textures: textures.length,
        triangles: triangleCount,
        vertices: vertexCount
      }
    };
  }
}

module.exports = GeometryAnalyzer;
