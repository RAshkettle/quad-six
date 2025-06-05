import { GUI } from "lil-gui";

export class DebugControls {
  constructor(portalsInstance, audioControls) {
    this.portalsInstance = portalsInstance;
    this.audioControls = audioControls;
    this.gui = new GUI();

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
  }

  // Method to add more controls later if needed
  addFolder(name) {
    return this.gui.addFolder(name);
  }

  // Method to destroy the GUI
  destroy() {
    this.gui.destroy();
  }
}
