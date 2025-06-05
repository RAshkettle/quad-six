import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export class Alien {
  static nextId = 1;

  constructor(scene, position) {
    this.scene = scene;
    this.id = Alien.nextId++;
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

          // Find the walk animation - check for specific name first, then general pattern
          let walkAnimation = gltf.animations.find(
            (animation) => animation.name === "AlienArmature|Alien_Walk"
          );

          if (!walkAnimation) {
            walkAnimation = gltf.animations.find((animation) =>
              animation.name.toLowerCase().includes("walk")
            );
          }

          if (walkAnimation) {
            this.walkAction = this.mixer.clipAction(walkAnimation);
            this.walkAction.setLoop(THREE.LoopRepeat, Infinity);
            this.walkAction.clampWhenFinished = false;
            this.walkAction.setEffectiveWeight(1.0);
          } else {
            // Fallback to first animation if no walk animation found
            if (gltf.animations.length > 0) {
              this.walkAction = this.mixer.clipAction(gltf.animations[0]);
              this.walkAction.setLoop(THREE.LoopRepeat, Infinity);
              this.walkAction.clampWhenFinished = false;
              this.walkAction.setEffectiveWeight(1.0);
            }
          }
        }

        // Add to scene
        this.scene.add(this.model);

        // Start walking toward the station
        this.startWalking();
      },
      (progress) => {
        // Loading progress can be handled silently
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
      this.walkAction.reset();
      this.walkAction.play();
      this.walkAction.enabled = true;
      this.walkAction.paused = false;
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
