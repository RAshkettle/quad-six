import * as THREE from "three";

export class AudioControls {
  constructor(camera) {
    this.listener = new THREE.AudioListener();
    camera.add(this.listener);

    this.audioLoader = new THREE.AudioLoader();

    this.portalIdleSound = new THREE.Audio(this.listener);
    this.isIdleSoundPlaying = false;

    this.backgroundMusic = new THREE.Audio(this.listener);

    this._loadSounds();
  }

  _loadSounds() {
    // Load portal idle sound
    this.audioLoader.load("public/portalIdle.mp3", (buffer) => {
      this.portalIdleSound.setBuffer(buffer);
      this.portalIdleSound.setLoop(true);
      this.portalIdleSound.setVolume(0.12); // 12% volume
    });

    // Load background music
    this.audioLoader.load("public/backgroundMusic.mp3", (buffer) => {
      this.backgroundMusic.setBuffer(buffer);
      this.backgroundMusic.setLoop(true);
      this.backgroundMusic.setVolume(0.1); // 10% volume
      this.backgroundMusic.play();
      console.log("Background music started");
    });
  }

  startIdleSound() {
    if (
      !this.isIdleSoundPlaying &&
      this.portalIdleSound.buffer &&
      !this.portalIdleSound.isPlaying
    ) {
      this.portalIdleSound.play();
      this.isIdleSoundPlaying = true;
      console.log("Portal idle sound started");
    }
  }

  stopIdleSound() {
    if (this.isIdleSoundPlaying && this.portalIdleSound.isPlaying) {
      this.portalIdleSound.stop();
      this.isIdleSoundPlaying = false;
      console.log("Portal idle sound stopped");
    }
  }

  get IsIdleSoundPlaying() {
    return this.isIdleSoundPlaying;
  }
}
