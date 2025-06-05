export class Player {
  constructor() {
    this.currentCredits = 350;
    this.health = 100;
    this.maxHealth = 100;
  }

  // Method to add credits
  addCredits(amount) {
    this.currentCredits += amount;
  }

  // Method to spend credits
  spendCredits(amount) {
    if (this.currentCredits >= amount) {
      this.currentCredits -= amount;
      return true;
    }
    return false;
  }

  // Method to take damage
  takeDamage(amount) {
    this.health = Math.max(0, this.health - amount);
  }

  // Method to heal
  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  // Method to set max health (and optionally adjust current health)
  setMaxHealth(newMaxHealth, adjustCurrentHealth = false) {
    const oldMaxHealth = this.maxHealth;
    this.maxHealth = newMaxHealth;

    if (adjustCurrentHealth) {
      // Scale current health proportionally
      const healthRatio = this.health / oldMaxHealth;
      this.health = Math.round(healthRatio * newMaxHealth);
    } else {
      // Cap current health to new max
      this.health = Math.min(this.health, this.maxHealth);
    }
  }

  // Method to check if player is alive
  isAlive() {
    return this.health > 0;
  }

  // Method to get health percentage
  getHealthPercentage() {
    return (this.health / this.maxHealth) * 100;
  }
}
