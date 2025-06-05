import * as THREE from "three";

export class Lighting {
  constructor(scene) {
    this.scene = scene;
    this.setupLighting();
  }

  setupLighting() {
    // Environmental lighting for dusk
    // Lighter blue ambient light to simulate dusk sky
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4); // Bright white ambient light
    this.scene.add(ambientLight);

    // Directional light to simulate sky glow from the horizon
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.3); // Bright white directional light
    directionalLight.position.set(-10, 5, 10); // Coming from the horizon
    directionalLight.castShadow = false; // Keep it subtle
    this.scene.add(directionalLight);
  }
}
