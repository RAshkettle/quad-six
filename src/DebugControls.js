import { GUI } from "lil-gui";

export class DebugControls {
  constructor(portalsInstance, audioControls, camera) {
    this.portalsInstance = portalsInstance;
    this.audioControls = audioControls;
    this.camera = camera;
    this.gui = new GUI();
    
    // Store references to the controllers for updating
    this.cameraControllers = {};

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

    // Create Camera folder
    const cameraFolder = this.gui.addFolder("Camera Position");

    // Add camera position controls and store references
    this.cameraControllers.x = cameraFolder
      .add(this.camera.position, "x", -20, 20, 0.1)
      .name("X Position");
    
    this.cameraControllers.y = cameraFolder
      .add(this.camera.position, "y", -10, 20, 0.1)
      .name("Y Position");
    
    this.cameraControllers.z = cameraFolder
      .add(this.camera.position, "z", -20, 20, 0.1)
      .name("Z Position");

    // Add reset camera button
    const cameraControls = {
      resetPosition: () => {
        this.camera.position.set(0, 0, 15);
        this.updateCameraControllers();
      },
    };

    cameraFolder
      .add(cameraControls, "resetPosition")
      .name("Reset Position");

    // Open the camera folder by default
    cameraFolder.open();
  }

  // Method to add more controls later if needed
  addFolder(name) {
    return this.gui.addFolder(name);
  }

  // Method to update camera controllers when position changes externally
  updateCameraControllers() {
    if (this.cameraControllers.x) {
      this.cameraControllers.x.updateDisplay();
    }
    if (this.cameraControllers.y) {
      this.cameraControllers.y.updateDisplay();
    }
    if (this.cameraControllers.z) {
      this.cameraControllers.z.updateDisplay();
    }
  }

  // Method to destroy the GUI
  destroy() {
    this.gui.destroy();
  }
}
