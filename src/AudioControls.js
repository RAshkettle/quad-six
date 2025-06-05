import * as THREE from "three";

export class AudioControls {
  constructor(camera) {
    this.listener = new THREE.AudioListener();
    camera.add(this.listener);
    this.audioContextResumed = false;

    this.audioLoader = new THREE.AudioLoader();

    this.portalIdleSound = new THREE.Audio(this.listener);
    this.isIdleSoundPlaying = false;

    this.backgroundMusic = new THREE.Audio(this.listener);

    this._loadSounds();
  }

  _loadSounds() {
    // Load portal idle sound
    this.audioLoader.load("/portalIdle.mp3", (buffer) => {
      this.portalIdleSound.setBuffer(buffer);
      this.portalIdleSound.setLoop(true);
      this.portalIdleSound.setVolume(0.12); // 12% volume
    });

    // Load background music
    this.audioLoader.load("/backgroundMusic.mp3", (buffer) => {
      this.backgroundMusic.setBuffer(buffer);
      this.backgroundMusic.setLoop(true);
      this.backgroundMusic.setVolume(0.1); // 10% volume
      // Do not autoplay here, wait for user gesture
    });
  }

  resumeAudioContext() {
    if (
      !this.audioContextResumed &&
      this.listener.context.state === "suspended"
    ) {
      this.listener.context
        .resume()
        .then(() => {
          this.audioContextResumed = true;
          this._playLoadedSounds();
        })
        .catch((e) => console.error("Error resuming AudioContext:", e));
    } else if (this.listener.context.state === "running") {
      this.audioContextResumed = true; // Already running
      this._playLoadedSounds();
    }
  }

  _playLoadedSounds() {
    if (this.backgroundMusic.buffer && !this.backgroundMusic.isPlaying) {
      this.backgroundMusic.play();
    }
  }

  startIdleSound() {
    if (!this.audioContextResumed) return;
    if (
      !this.isIdleSoundPlaying &&
      this.portalIdleSound.buffer &&
      !this.portalIdleSound.isPlaying
    ) {
      this.portalIdleSound.play();
      this.isIdleSoundPlaying = true;
    }
  }

  stopIdleSound() {
    if (this.isIdleSoundPlaying && this.portalIdleSound.isPlaying) {
      this.portalIdleSound.stop();
      this.isIdleSoundPlaying = false;
    }
  }

  get IsIdleSoundPlaying() {
    return this.isIdleSoundPlaying;
  }
}
