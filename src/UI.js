// UI Manager for game interface
export class UI {
  constructor(player) {
    this.player = player;
    this.healthElement = document.getElementById("health-value");
    this.creditsElement = document.getElementById("credits-value");

    // Initialize display
    this.updateDisplay();
  }

  updateDisplay() {
    if (this.healthElement) {
      this.healthElement.textContent = Math.round(this.player.health);
    }

    if (this.creditsElement) {
      this.creditsElement.textContent = this.player.currentCredits;
    }

    // Check if health changed and trigger animation
    if (this.player.healthChanged) {
      this.animateHealthChange(this.player.previousHealth, this.player.health);
      this.player.healthChanged = false; // Reset the flag
    }
  }

  // Method to be called when player stats change
  onPlayerStatsChange() {
    this.updateDisplay();
  }

  // Animate health change (for damage/healing effects)
  animateHealthChange(oldHealth, newHealth) {
    if (!this.healthElement) return;

    // Add flash effect for health changes
    if (newHealth < oldHealth) {
      // Damage - red flash
      this.healthElement.style.color = "#ff4444";
      this.healthElement.style.textShadow = "0 0 15px rgba(255, 68, 68, 0.8)";
    } else if (newHealth > oldHealth) {
      // Healing - bright green flash
      this.healthElement.style.color = "#44ff44";
      this.healthElement.style.textShadow = "0 0 15px rgba(68, 255, 68, 0.8)";
    }

    // Reset to normal color after animation
    setTimeout(() => {
      if (this.healthElement) {
        this.healthElement.style.color = "#4eff4e";
        this.healthElement.style.textShadow = "0 0 8px rgba(78, 255, 78, 0.5)";
      }
    }, 300);
  }

  // Animate credits change
  animateCreditsChange(oldCredits, newCredits) {
    if (!this.creditsElement) return;

    if (newCredits > oldCredits) {
      // Credits gained - bright yellow flash
      this.creditsElement.style.color = "#ffff44";
      this.creditsElement.style.textShadow = "0 0 15px rgba(255, 255, 68, 0.8)";
    } else if (newCredits < oldCredits) {
      // Credits spent - dim flash
      this.creditsElement.style.color = "#cc9922";
      this.creditsElement.style.textShadow = "0 0 10px rgba(204, 153, 34, 0.6)";
    }

    // Reset to normal color after animation
    setTimeout(() => {
      if (this.creditsElement) {
        this.creditsElement.style.color = "#ffdd44";
        this.creditsElement.style.textShadow =
          "0 0 8px rgba(255, 221, 68, 0.5)";
      }
    }, 300);
  }

  // Show temporary message (for future use)
  showMessage(text, duration = 3000) {
    // TODO: Implement message system if needed
    console.log(`UI Message: ${text}`);
  }
}
