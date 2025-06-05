import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export class Station {
  constructor(scene) {
    this.scene = scene;
    this.model = null;
    this.loader = new GLTFLoader();

    this.loadStation();
  }

  loadStation() {
    this.loader.load(
      "/station.glb",
      (gltf) => {
        this.model = gltf.scene;

        // Position the station at the opposite end from portals
        // Portals are at z: -14.5, so station goes at positive z
        // Centered (x: 0) and inset 2 units from edge (z: 12.5)
        // Place on the plane surface (y: 0)
        this.model.position.set(0, -0.25, 14.5);
        this.model.scale.set(0.5, 0.5, 0.5);

        // Rotate the station 90 degrees around the Y axis
        this.model.rotation.y = Math.PI / 2;

        // You may need to adjust scale depending on the model size
        // Uncomment and adjust if needed:
        // this.model.scale.setScalar(1.0);

        // Add to scene
        this.scene.add(this.model);

        console.log("Station loaded successfully");
      },
      (progress) => {
        console.log(
          "Station loading progress:",
          (progress.loaded / progress.total) * 100 + "%"
        );
      },
      (error) => {
        console.error("Error loading station:", error);
      }
    );
  }

  // Method to get the station model (useful for animations or interactions)
  getModel() {
    return this.model;
  }

  // Method to update station (if needed for animations)
  update(deltaTime) {
    // Add any station-specific animations or updates here
    if (this.model) {
      // Example: gentle rotation
      // this.model.rotation.y += deltaTime * 0.1;
    }
  }
}
