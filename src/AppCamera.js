import * as THREE from "three";

export class AppCamera {
  constructor(sizes, scene) {
    this.instance = new THREE.PerspectiveCamera(75, sizes.width / sizes.height);
    this.instance.position.z = 15;
    // You might want to set an initial Y position for a better overview
    // this.instance.position.y = 1;
    scene.add(this.instance);

    // Keyboard controls for camera movement
    this.keys = {
      w: false,
      a: false,
      s: false,
      d: false,
      ArrowUp: false,
      ArrowLeft: false,
      ArrowDown: false,
      ArrowRight: false,
    };

    this.moveSpeed = 0.1;
    this.setupKeyboardControls();
  }

  setupKeyboardControls() {
    // Keyboard event listeners
    window.addEventListener("keydown", (event) => {
      if (this.keys.hasOwnProperty(event.key)) {
        this.keys[event.key] = true;
      }
    });

    window.addEventListener("keyup", (event) => {
      if (this.keys.hasOwnProperty(event.key)) {
        this.keys[event.key] = false;
      }
    });
  }

  // Function to update camera position based on keyboard input
  updateMovement(controls) {
    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);

    // Get camera direction vectors
    this.instance.getWorldDirection(forward);
    right.crossVectors(forward, up).normalize();

    // Flatten forward vector to prevent flying
    forward.y = 0;
    forward.normalize();

    // Calculate movement
    const movement = new THREE.Vector3();

    // WASD movement
    if (this.keys.w || this.keys.ArrowUp)
      movement.add(forward.clone().multiplyScalar(this.moveSpeed));
    if (this.keys.s || this.keys.ArrowDown)
      movement.add(forward.clone().multiplyScalar(-this.moveSpeed));
    if (this.keys.a || this.keys.ArrowLeft)
      movement.add(right.clone().multiplyScalar(-this.moveSpeed));
    if (this.keys.d || this.keys.ArrowRight)
      movement.add(right.clone().multiplyScalar(this.moveSpeed));

    // Apply movement to camera and controls target
    this.instance.position.add(movement);
    controls.target.add(movement);
  }

  resize(newWidth, newHeight) {
    this.instance.aspect = newWidth / newHeight;
    this.instance.updateProjectionMatrix();
  }

  // Getter to access the THREE.PerspectiveCamera instance directly
  get self() {
    return this.instance;
  }

  // Getter to access keys for backward compatibility
  getKeys() {
    return this.keys;
  }
}
