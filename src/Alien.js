import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export class Alien {
  constructor(scene, position) {
    this.scene = scene;
    this.model = null;
    this.mixer = null;
    this.walkAction = null;
    this.loader = new GLTFLoader();

    // Movement properties
    this.position = position.clone();
    this.targetPosition = new THREE.Vector3(0, 0, 12.5); // Station position
    this.walkSpeed = 1.0; // 1 unit per second
    this.isWalking = false;
    this.direction = new THREE.Vector3();

    this.loadAlien();
  }

  loadAlien() {
    this.loader.load(
      "/Alien.glb",
      (gltf) => {
        this.model = gltf.scene;

        // Set initial position
        this.model.position.copy(this.position);

        // Scale down if needed (adjust as necessary)
        this.model.scale.setScalar(0.5);

        // Setup animations
        if (gltf.animations && gltf.animations.length > 0) {
          this.mixer = new THREE.AnimationMixer(this.model);

          // Find the walk animation
          const walkAnimation = gltf.animations.find((animation) =>
            animation.name.toLowerCase().includes("walk")
          );

          if (walkAnimation) {
            this.walkAction = this.mixer.clipAction(walkAnimation);
            this.walkAction.setLoop(THREE.LoopRepeat);
            console.log(`Found walk animation: ${walkAnimation.name}`);
          } else {
            console.warn(
              "No walk animation found, using first available animation"
            );
            // Fallback to first animation if no walk animation found
            if (gltf.animations.length > 0) {
              this.walkAction = this.mixer.clipAction(gltf.animations[0]);
              this.walkAction.setLoop(THREE.LoopRepeat);
            }
          }
        }

        // Add to scene
        this.scene.add(this.model);

        // Start walking toward the station
        this.startWalking();

        console.log("Alien loaded successfully");
      },
      (progress) => {
        console.log(
          "Alien loading progress:",
          (progress.loaded / progress.total) * 100 + "%"
        );
      },
      (error) => {
        console.error("Error loading alien:", error);
      }
    );
  }

  startWalking() {
    if (!this.model) return;

    this.isWalking = true;

    // Calculate direction to station
    this.direction.subVectors(this.targetPosition, this.position).normalize();

    // Rotate alien to face the target
    const angle = Math.atan2(this.direction.x, this.direction.z);
    this.model.rotation.y = angle;

    // Start walk animation
    if (this.walkAction) {
      this.walkAction.play();
    }
  }

  update(deltaTime) {
    if (!this.model || !this.isWalking) return;

    // Update animation mixer
    if (this.mixer) {
      this.mixer.update(deltaTime);
    }

    // Move toward target
    const movement = this.direction
      .clone()
      .multiplyScalar(this.walkSpeed * deltaTime);
    this.position.add(movement);
    this.model.position.copy(this.position);

    // Check if reached target (within 1 unit of station)
    const distanceToTarget = this.position.distanceTo(this.targetPosition);
    if (distanceToTarget < 1.0) {
      this.reachTarget();
    }
  }

  reachTarget() {
    console.log("Alien reached the station!");
    this.isWalking = false;

    // Stop walk animation
    if (this.walkAction) {
      this.walkAction.stop();
    }

    // Here you can add logic for when alien reaches the station
    // For now, we'll just remove the alien
    this.destroy();
  }

  destroy() {
    if (this.model) {
      this.scene.remove(this.model);
    }
    if (this.mixer) {
      this.mixer.stopAllAction();
    }
  }

  // Get the current position of the alien
  getPosition() {
    return this.position.clone();
  }

  // Check if the alien is still alive/active
  isActive() {
    return this.isWalking && this.model;
  }
}
