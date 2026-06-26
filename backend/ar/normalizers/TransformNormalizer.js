const { center } = require('@gltf-transform/functions');

class TransformNormalizer {
  static async normalize(doc, rawMetrics, profile) {
    const { width, height, depth } = rawMetrics.dimensions;

    // Determine largest dimension to calculate the scale factor
    // Assuming units are originally generic, we want the longest edge to fit the expected longest edge
    const maxDimension = Math.max(width, depth); // Usually plate/pizza/burger diameter
    const expectedMax = Math.max(profile.expected_width_cm, profile.expected_depth_cm) / 100; // convert cm to meters

    let scaleFactor = 1.0;
    if (maxDimension > 0.001) {
      scaleFactor = expectedMax / maxDimension;
    }

    // Apply scale to the root scene
    const scene = doc.getRoot().getDefaultScene() || doc.getRoot().listScenes()[0];
    
    // Create a new root node to hold all existing nodes to scale uniformly
    const rootNode = doc.createNode('Rastro_Normalized_Root');
    rootNode.setScale([scaleFactor, scaleFactor, scaleFactor]);

    // Move all scene nodes into this new root
    const children = [...scene.listChildren()];
    children.forEach(child => {
      scene.removeChild(child);
      rootNode.addChild(child);
    });
    scene.addChild(rootNode);

    // Pivot Normalization (Bottom Center)
    // The center() function from gltf-transform recenters the model
    // pivot: 'below' makes the lowest Y point sit on the origin plane (Y=0)
    await doc.transform(
      center({ pivot: 'below' })
    );

    return {
      normalizedDoc: doc,
      scaleFactor,
      pivotOffset: 'Bottom-Center' // Documented
    };
  }
}

module.exports = TransformNormalizer;
