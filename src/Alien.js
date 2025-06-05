import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export class Alien {
  static nextId = 1;

  constructor(scene, position, player) {
    this.scene = scene;
    this.id = Alien.nextId++;
    this.model = null;
    this.mixer = null;
    this.movingAction = null;
    this.deathAction = null;
    this.loader = new GLTFLoader();
    this.player = player;

    console.log(
      `Alien ${this.id}: Constructor - player reference:`,
      !!this.player
    );

    // Movement properties
    this.position = position.clone();
    this.targetPosition = new THREE.Vector3(0, 1.5, 14.5); // Station position - match Station.js
    this.walkSpeed = Math.random() + 1.0; // Random speed between 1.0 and 2.0 units per second
    this.isDying = false;
    this.direction = new THREE.Vector3();

    this.loadAlien();
  }

  loadAlien() {
    this.loader.load(
      "/slime.glb",
      (gltf) => {
        this.model = gltf.scene;

        // Set initial position
        this.model.position.copy(this.position);

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
          this.mixer = new THREE.AnimationMixer(this.model);

          // Find the "moving" animation
          const movingAnimation = gltf.animations.find(
            (animation) => animation.name.toLowerCase() === "moving"
          );

          // Find the "death" animation
          const deathAnimation = gltf.animations.find(
            (animation) => animation.name.toLowerCase() === "death"
          );

          if (movingAnimation) {
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

          if (deathAnimation) {
            this.deathAction = this.mixer.clipAction(deathAnimation);
            this.deathAction.setLoop(THREE.LoopOnce);
            this.deathAction.clampWhenFinished = true;
            this.deathAction.enabled = false;
          }
        } else {
          console.log(`Alien ${this.id}: No animations found in model`);
        }

        // Add to scene
        this.scene.add(this.model);
        console.log(`Alien ${this.id}: Added to scene`);

        // Calculate direction to station immediately
        this.direction
          .subVectors(this.targetPosition, this.position)
          .normalize();
      },
      (progress) => {
        // Add this
      },
      (error) => {
        console.error(`Alien ${this.id}: Error loading alien:`, error); // Modified this
      }
    );
  }

  update(deltaTime) {
    // Update animation mixer if it exists
    if (this.mixer) {
      this.mixer.update(deltaTime);
    }

    // Move toward target unless dying
    if (this.model && !this.isDying) {
      // Move toward target
      const movement = this.direction
        .clone()
        .multiplyScalar(this.walkSpeed * deltaTime);

      this.position.add(movement);
      this.model.position.copy(this.position);
      this.model.position.setY(0.0);

      // Check if reached target (within 2 units of station)
      const distanceToTarget = this.position.distanceTo(this.targetPosition);
      if (distanceToTarget < 2.0) {
        console.log(
          `Alien ${
            this.id
          }: Reached target! Distance: ${distanceToTarget.toFixed(2)}`
        );
        this.reachTarget();
      }
    }
  }

  reachTarget() {
    console.log(`Alien ${this.id}: reachTarget() called`);
    this.isDying = true;

    // Play death animation if available
    if (this.deathAction) {
      // Stop moving animation
      if (this.movingAction) {
        this.movingAction.fadeOut(0.2);
      }

      // Start death animation
      this.deathAction.reset();
      this.deathAction.enabled = true;
      this.deathAction.fadeIn(0.2);
      this.deathAction.play();
    }

    // Apply 2 damage to player
    if (this.player) {
      const oldHealth = this.player.health;
      this.player.takeDamage(2);
      console.log(
        `Alien ${this.id}: Player took 2 damage, health: ${oldHealth} -> ${this.player.health}`
      );
      console.log(
        `Alien ${this.id}: Player healthChanged flag: ${this.player.healthChanged}`
      );
    } else {
      console.log(`Alien ${this.id}: NO PLAYER REFERENCE!`);
    }

    // Destroy after 1 second (time for death animation)
    setTimeout(() => {
      this.destroy();
    }, 1000);
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
