import { GUI } from "lil-gui";

export class DebugControls {
  constructor(portalsInstance, audioControls, camera, player, alienManager) {
    this.portalsInstance = portalsInstance;
    this.audioControls = audioControls;
    this.camera = camera;
    this.player = player;
    this.alienManager = alienManager;
    this.gui = new GUI();

    // Store references to the controllers for updating
    this.playerControllers = {};

    this.setupControls();
  }

  setupControls() {
    // Create Portals folder
    const portalsFolder = this.gui.addFolder("Portals");

    // Add spawn portals button
    const portalControls = {
      spawnPortals: () => {
        this.portalsInstance.spawnEnemyPortals(this.audioControls);
      },
    };

    portalsFolder
      .add(portalControls, "spawnPortals")
      .name("Spawn Enemy Portals");

    // Open the portals folder by default
    portalsFolder.open();

    // Create Player folder
    const playerFolder = this.gui.addFolder("Player Stats");

    // Add player controls and store references
    this.playerControllers.currentCredits = playerFolder
      .add(this.player, "currentCredits", 0, 10000, 1)
      .name("Credits");

    this.playerControllers.health = playerFolder
      .add(this.player, "health", 0, this.player.maxHealth, 1)
      .name("Health");

    this.playerControllers.maxHealth = playerFolder
      .add(this.player, "maxHealth", 1, 1000, 1)
      .name("Max Health")
      .onChange(() => {
        // Update health controller range when max health changes
        this.playerControllers.health.max(this.player.maxHealth);
        // Cap current health to new max
        this.player.health = Math.min(
          this.player.health,
          this.player.maxHealth
        );
        this.updatePlayerControllers();
      });

    // Open the player folder by default
    playerFolder.open();
  }

  // Method to add more controls later if needed
  addFolder(name) {
    return this.gui.addFolder(name);
  }

  // Method to update player controllers when values change externally
  updatePlayerControllers() {
    if (this.playerControllers.currentCredits) {
      this.playerControllers.currentCredits.updateDisplay();
    }
    if (this.playerControllers.health) {
      this.playerControllers.health.updateDisplay();
    }
    if (this.playerControllers.maxHealth) {
      this.playerControllers.maxHealth.updateDisplay();
    }
  }

  // Method to destroy the GUI
  destroy() {
    this.gui.destroy();
  }
}
