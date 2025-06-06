import * as THREE from "three";
import { Alien } from "./Alien.js";

export class AlienManager {
  constructor(scene, player, ui, spawnTimer, spawnFunc) {
    this.scene = scene;
    this.player = player;
    this.ui = ui;
    this.aliens = [];
    this.spawnTimer = spawnTimer;
    this.spawnFunc = spawnFunc;
  }

  // Spawn aliens at a specific portal position
  spawnAliensAtPortal(portalPosition) {
    // Spawn 2-4 aliens randomly
    const alienCount = Math.floor(Math.random() * 3) + 2; // 2-4 aliens

    for (let i = 0; i < alienCount; i++) {
      // Add some random offset so aliens don't spawn in exactly the same position
      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * 2, // Random X offset -1 to 1
        -2, // Spawn 2 units lower on Y axis (to compensate for portal height)
        (Math.random() - 0.5) * 2 // Random Z offset -1 to 1
      );

      const spawnPosition = portalPosition.clone().add(offset);
      const alien = new Alien(this.scene, spawnPosition, this.player, this);
      this.aliens.push(alien);
    }
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
    // this.aliens = this.aliens.filter((alien) => {
    //   if (alien.isActive()) {
    //     alien.update(deltaTime);
    //     return true;
    //   } else {
    //     // Alien is no longer active, clean it up
    //     alien.destroy();
    //     return false;
    //   }
    // });
    this.aliens.map((alien) => {
      alien.update(deltaTime);
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

  getSwarmCount() {
    return this.aliens.length;
  }

  notifyOfCreepDeath() {
    // Remove dead aliens before checking count
    this.aliens = this.aliens.filter((alien) => alien.isActive());
    if (this.aliens.length === 0) {
      this.spawnTimer.start(this.spawnFunc);
    }
  }

  // Get all active aliens (useful for debugging or other systems)
  getAliens() {
    return this.aliens;
  }
}
