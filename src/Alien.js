import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export class Alien {
  static nextId = 1;

  constructor(scene, position) {
    this.scene = scene;
    this.id = Alien.nextId++;
    this.model = null;
    this.mixer = null;
    this.movingAction = null;
    this.loader = new GLTFLoader();

    // Movement properties
    this.position = position.clone();
    this.targetPosition = new THREE.Vector3(0, 1.5, 14.5); // Station position - match Station.js
    this.walkSpeed = Math.random() + 1.0; // Random speed between 1.0 and 2.0 units per second
    this.isWalking = false;
    this.direction = new THREE.Vector3();

    this.loadAlien();
  }

  loadAlien() {
    console.log(`Alien ${this.id}: Starting to load /slime.glb`); // Add this
    this.loader.load(
      "/slime.glb",
      (gltf) => {
        console.log(`Alien ${this.id}: Model loaded successfully`, gltf); // Add this
        this.model = gltf.scene;

        // Set initial position
        this.model.position.copy(this.position);
        console.log(`Alien ${this.id}: Positioned at`, this.position); // Add this

        // Scale down if needed (adjust as necessary)
        this.model.scale.setScalar(20);

        // Keep original materials but ensure they receive shadows properly
        this.model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        // Add internal orange light source
        const lightColor = 0xff6600; // Orange color to match pustules
        const light = new THREE.PointLight(lightColor, 130.5, 8); // intensity 1.5, distance 8
        light.position.set(0, 1, 0); // Position slightly above center
        light.castShadow = true;
        light.shadow.mapSize.width = 512;
        light.shadow.mapSize.height = 512;

        // Add the light as a child of the model so it moves with the alien
        this.model.add(light);

        // Store reference to light for potential cleanup
        this.internalLight = light;

        // Setup animations
        if (gltf.animations && gltf.animations.length > 0) {
          console.log(
            `Alien ${this.id}: Found ${gltf.animations.length} animations:`,
            gltf.animations.map((a) => a.name)
          );
          this.mixer = new THREE.AnimationMixer(this.model);

          // Find the "moving" animation
          const movingAnimation = gltf.animations.find(
            (animation) => animation.name.toLowerCase() === "moving"
          );

          if (movingAnimation) {
            console.log(
              `Alien ${this.id}: Found moving animation:`,
              movingAnimation.name
            );
            this.movingAction = this.mixer.clipAction(movingAnimation);
            this.movingAction.setLoop(THREE.LoopRepeat, Infinity);
            this.movingAction.clampWhenFinished = false;
            this.movingAction.setEffectiveWeight(1.0);
            this.movingAction.enabled = true;
            this.movingAction.paused = false;
            // Start the animation immediately
            this.movingAction.play();
            console.log(`Alien ${this.id}: Animation started`);
          } else {
            console.log(
              `Alien ${this.id}: No 'moving' animation found, available:`,
              gltf.animations.map((a) => a.name)
            );
            // Fallback to first animation if no "moving" animation found
            if (gltf.animations.length > 0) {
              this.movingAction = this.mixer.clipAction(gltf.animations[0]);
              this.movingAction.setLoop(THREE.LoopRepeat, Infinity);
              this.movingAction.clampWhenFinished = false;
              this.movingAction.setEffectiveWeight(1.0);
              this.movingAction.enabled = true;
              this.movingAction.paused = false;
              this.movingAction.play();
              console.log(
                `Alien ${this.id}: Using fallback animation:`,
                gltf.animations[0].name
              );
            }
          }
        } else {
          console.log(`Alien ${this.id}: No animations found in model`);
        }

        // Add to scene
        this.scene.add(this.model);
        console.log(`Alien ${this.id}: Added to scene`); // Add this

        // Start walking toward the station
        this.startWalking();
      },
      (progress) => {
        console.log(
          `Alien ${this.id}: Loading progress:`,
          Math.round((progress.loaded / progress.total) * 100) + "%"
        ); // Add this
      },
      (error) => {
        console.error(`Alien ${this.id}: Error loading alien:`, error); // Modified this
      }
    );
  }

  startWalking() {
    if (!this.model) return;

    console.log(
      `Alien ${this.id}: Starting to walk from`,
      this.position,
      "to",
      this.targetPosition
    );

    // Check distance to target immediately
    const initialDistance = this.position.distanceTo(this.targetPosition);
    console.log(
      `Alien ${this.id}: Initial distance to target: ${initialDistance}`
    );

    if (initialDistance < 1.0) {
      console.log(
        `Alien ${this.id}: WARNING - Already too close to target! Will be destroyed immediately.`
      );
    }

    this.isWalking = true;

    // Calculate direction to station
    this.direction.subVectors(this.targetPosition, this.position).normalize();
    console.log(`Alien ${this.id}: Direction calculated:`, this.direction);

    // Rotate alien to face the target
    const angle = Math.atan2(this.direction.x, this.direction.z);
    this.model.rotation.y = angle;
    console.log(`Alien ${this.id}: Rotated to angle:`, angle);
  }

  update(deltaTime) {
    console.log("YIPEE!!!!!!!!!!!!!!!!!!");
    // Update animation mixer if it exists
    if (this.mixer) {
      this.mixer.update(deltaTime);
    }

    if (!this.model || !this.isWalking) {
      return;
    }

    // Move toward target
    const movement = this.direction
      .clone()
      .multiplyScalar(this.walkSpeed * deltaTime);

    this.position.add(movement);
    this.model.position.copy(this.position);

    console.log(
      `Alien ${this.id}: Position: (${this.position.x.toFixed(
        1
      )}, ${this.position.y.toFixed(1)}, ${this.position.z.toFixed(1)})`
    );

    // Check if reached target (within 2 units of station - increased from 1.0)
    const distanceToTarget = this.position.distanceTo(this.targetPosition);
    if (distanceToTarget < 2.0) {
      console.log(
        `Alien ${this.id}: Reached target! Distance: ${distanceToTarget.toFixed(
          2
        )}`
      );
      this.reachTarget();
    }
  }

  reachTarget() {
    this.isWalking = false;

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
    // Clean up the internal light
    if (this.internalLight) {
      this.internalLight.dispose();
    }
  }

  // Get the current position of the alien
  getPosition() {
    return this.position.clone();
  }

  // Check if the alien is still alive/active
  isActive() {
    return this.model;
  }
}
