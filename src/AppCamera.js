import * as THREE from "three";

export class AppCamera {
  constructor(sizes, scene) {
    this.instance = new THREE.PerspectiveCamera(75, sizes.width / sizes.height);
    this.instance.position.z = 15;
    // You might want to set an initial Y position for a better overview
    // this.instance.position.y = 1;
    scene.add(this.instance);
  }

  resize(newWidth, newHeight) {
    this.instance.aspect = newWidth / newHeight;
    this.instance.updateProjectionMatrix();
  }

  // Getter to access the THREE.PerspectiveCamera instance directly
  get self() {
    return this.instance;
  }
}
