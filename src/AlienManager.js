import * as THREE from "three";
import { Alien } from "./Alien.js";

export class AlienManager {
  constructor(scene) {
    this.scene = scene;
    this.aliens = [];
  }

  // Spawn aliens at a specific portal position
  spawnAliensAtPortal(portalPosition) {
    // Spawn 2-4 aliens randomly
    const alienCount = Math.floor(Math.random() * 3) + 2; // 2-4 aliens

    for (let i = 0; i < alienCount; i++) {
      // Add some random offset so aliens don't spawn in exactly the same position
      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * 2, // Random X offset -1 to 1
        0,
        (Math.random() - 0.5) * 2 // Random Z offset -1 to 1
      );

      const spawnPosition = portalPosition.clone().add(offset);
      const alien = new Alien(this.scene, spawnPosition);
      this.aliens.push(alien);
    }

    console.log(
      `Spawned ${alienCount} aliens at portal position:`,
      portalPosition
    );
  }

  // Spawn aliens at all active portals
  spawnAliensAtPortals(portals) {
    portals.forEach((portal) => {
      if (portal.userData.active && portal.visible) {
        this.spawnAliensAtPortal(portal.position.clone());
      }
    });
  }

  // Update all aliens
  update(deltaTime) {
    // Update all aliens and remove inactive ones
    this.aliens = this.aliens.filter((alien) => {
      if (alien.isActive()) {
        alien.update(deltaTime);
        return true;
      } else {
        // Alien is no longer active, clean it up
        alien.destroy();
        return false;
      }
    });
  }

  // Get count of active aliens
  getActiveAlienCount() {
    return this.aliens.length;
  }

  // Remove all aliens (useful for reset or cleanup)
  removeAllAliens() {
    this.aliens.forEach((alien) => alien.destroy());
    this.aliens = [];
  }

  // Get all active aliens (useful for debugging or other systems)
  getAliens() {
    return this.aliens;
  }
}
