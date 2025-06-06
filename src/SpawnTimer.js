// SpawnTimer.js
// Simple timer that waits a specified delay (in seconds) and then invokes a callback

export class SpawnTimer {
  /**
   * @param {number} delaySeconds - Delay in seconds before firing
   */
  constructor(delaySeconds = 10) {
    this.delayMs = delaySeconds * 1000;
    this.timerId = null;
  }

  /**
   * Starts the timer. When the delay elapses, the provided callback is called once.
   * @param {Function} callback - Function to invoke when timer finishes
   */
  start(callback) {
    this.stop();
    this.timerId = setTimeout(() => {
      callback();
      this.timerId = null;
    }, this.delayMs);
  }

  /**
   * Stops the timer if it's running.
   */
  stop() {
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  /**
   * Returns whether the timer is currently running.
   * @returns {boolean}
   */
  isRunning() {
    return this.timerId !== null;
  }
}
