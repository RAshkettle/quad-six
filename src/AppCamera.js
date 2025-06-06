import * as THREE from "three";

export class AppCamera {
  constructor(sizes, scene) {
    this.instance = new THREE.PerspectiveCamera(75, sizes.width / sizes.height);
    this.instance.position.z = 13.9;
    this.instance.position.y = 3;
    // You might want to set an initial Y position for a better overview
    // this.instance.position.y = 1;
    scene.add(this.instance);

    // Keyboard controls for camera movement
    this.keys = {
      w: false,
      a: false,
      s: false,
      d: false,
      ArrowUp: false,
      ArrowLeft: false,
      ArrowDown: false,
      ArrowRight: false,
    };

    // Virtual thumbstick state
    this.thumbstick = {
      active: false,
      x: 0,
      y: 0,
    };

    this.moveSpeed = 0.1;
    this.isMobile = this.detectMobileDevice();

    this.setupKeyboardControls();
    if (this.isMobile) {
      this.setupVirtualThumbstick();
    }
  }

  setupKeyboardControls() {
    // Keyboard event listeners
    window.addEventListener("keydown", (event) => {
      if (this.keys.hasOwnProperty(event.key)) {
        this.keys[event.key] = true;
      }
    });

    window.addEventListener("keyup", (event) => {
      if (this.keys.hasOwnProperty(event.key)) {
        this.keys[event.key] = false;
      }
    });
  }

  // Function to update camera position based on keyboard and thumbstick input
  updateMovement(controls) {
    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);

    // Get camera direction vectors
    this.instance.getWorldDirection(forward);
    right.crossVectors(forward, up).normalize();

    // Flatten forward vector to prevent flying
    forward.y = 0;
    forward.normalize();

    // Calculate movement
    const movement = new THREE.Vector3();

    // WASD keyboard movement
    if (this.keys.w || this.keys.ArrowUp)
      movement.add(forward.clone().multiplyScalar(this.moveSpeed));
    if (this.keys.s || this.keys.ArrowDown)
      movement.add(forward.clone().multiplyScalar(-this.moveSpeed));
    if (this.keys.a || this.keys.ArrowLeft)
      movement.add(right.clone().multiplyScalar(-this.moveSpeed));
    if (this.keys.d || this.keys.ArrowRight)
      movement.add(right.clone().multiplyScalar(this.moveSpeed));

    // Virtual thumbstick movement (for mobile)
    if (this.thumbstick.active) {
      // Forward/backward movement (y-axis of thumbstick)
      movement.add(
        forward
          .clone()
          .multiplyScalar(-this.thumbstick.y * this.moveSpeed * 1.5)
      );
      // Left/right movement (x-axis of thumbstick)
      movement.add(
        right.clone().multiplyScalar(this.thumbstick.x * this.moveSpeed * 1.5)
      );
    }

    // Calculate new positions
    const newCameraPosition = this.instance.position.clone().add(movement);
    const newTargetPosition = controls.target.clone().add(movement);

    // Clamp positions to stay within the 30x30 plane bounds
    const planeSize = 15; // Half of the 30x30 plane size

    // Clamp target position
    newTargetPosition.x = Math.max(
      -planeSize,
      Math.min(planeSize, newTargetPosition.x)
    );
    newTargetPosition.z = Math.max(
      -planeSize,
      Math.min(planeSize, newTargetPosition.z)
    );
    newTargetPosition.y = 0; // Keep target on the ground plane

    // Clamp camera position
    newCameraPosition.x = Math.max(
      -planeSize,
      Math.min(planeSize, newCameraPosition.x)
    );
    newCameraPosition.z = Math.max(
      -planeSize,
      Math.min(planeSize, newCameraPosition.z)
    );
    // Prevent camera from going below ground level
    newCameraPosition.y = Math.max(0.5, newCameraPosition.y);

    // Apply clamped positions
    this.instance.position.copy(newCameraPosition);
    controls.target.copy(newTargetPosition);
  }

  resize(newWidth, newHeight) {
    this.instance.aspect = newWidth / newHeight;
    this.instance.updateProjectionMatrix();
  }

  // Getter to access the THREE.PerspectiveCamera instance directly
  get self() {
    return this.instance;
  }

  // Getter to access keys for backward compatibility
  getKeys() {
    return this.keys;
  }

  // Detect if using a mobile device
  detectMobileDevice() {
    // Check user agent
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    if (
      /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
        userAgent.toLowerCase()
      )
    ) {
      return true;
    }

    // Additional check for touch capability
    if (
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0 ||
      navigator.msMaxTouchPoints > 0
    ) {
      return true;
    }

    // Check screen size as fallback
    if (window.innerWidth <= 800 || window.innerHeight <= 600) {
      return true;
    }

    return false;
  }

  // Setup virtual thumbstick for mobile devices
  setupVirtualThumbstick() {
    const thumbstickElement = document.getElementById("virtual-thumbstick");
    const baseElement = document.getElementById("thumbstick-base");
    const handleElement = document.getElementById("thumbstick-handle");

    // Show the thumbstick for mobile devices
    thumbstickElement.classList.remove("hidden");

    // Calculate initial position after a slight delay to ensure DOM is fully loaded
    setTimeout(() => {
      const baseRect = baseElement.getBoundingClientRect();
      const baseX = baseRect.left + baseRect.width / 2;
      const baseY = baseRect.top + baseRect.height / 2;
      const maxDistance = baseRect.width / 2 - handleElement.offsetWidth / 2;

      // Store these values for use in event handlers
      this.thumbstickDimensions = {
        baseX,
        baseY,
        maxDistance,
      };
    }, 100);

    // Touch start event
    baseElement.addEventListener("touchstart", (event) => {
      event.preventDefault();
      if (!this.thumbstickDimensions) return;

      this.thumbstick.active = true;
      this.updateThumbstickPosition(
        event.touches[0].clientX,
        event.touches[0].clientY,
        this.thumbstickDimensions.baseX,
        this.thumbstickDimensions.baseY,
        this.thumbstickDimensions.maxDistance,
        handleElement
      );
    });

    // Touch move event
    baseElement.addEventListener("touchmove", (event) => {
      event.preventDefault();
      if (this.thumbstick.active && this.thumbstickDimensions) {
        this.updateThumbstickPosition(
          event.touches[0].clientX,
          event.touches[0].clientY,
          this.thumbstickDimensions.baseX,
          this.thumbstickDimensions.baseY,
          this.thumbstickDimensions.maxDistance,
          handleElement
        );
      }
    });

    // Touch end event
    baseElement.addEventListener("touchend", (event) => {
      event.preventDefault();
      this.thumbstick.active = false;
      this.thumbstick.x = 0;
      this.thumbstick.y = 0;
      handleElement.style.transform = "translate(0px, 0px)";
    });

    // Touch cancel event
    baseElement.addEventListener("touchcancel", (event) => {
      event.preventDefault();
      this.thumbstick.active = false;
      this.thumbstick.x = 0;
      this.thumbstick.y = 0;
      handleElement.style.transform = "translate(0px, 0px)";
    });

    // Add window resize listener to update base position
    window.addEventListener("resize", () => {
      const newBaseRect = baseElement.getBoundingClientRect();
      const newBaseX = newBaseRect.left + newBaseRect.width / 2;
      const newBaseY = newBaseRect.top + newBaseRect.height / 2;
      const newMaxDistance =
        newBaseRect.width / 2 - handleElement.offsetWidth / 2;

      // Update the stored dimensions
      this.thumbstickDimensions = {
        baseX: newBaseX,
        baseY: newBaseY,
        maxDistance: newMaxDistance,
      };
    });
  }

  // Update thumbstick position and values
  updateThumbstickPosition(
    touchX,
    touchY,
    baseX,
    baseY,
    maxDistance,
    handleElement
  ) {
    // Calculate distance from touch to base center
    let deltaX = touchX - baseX;
    let deltaY = touchY - baseY;

    // Calculate distance using Pythagorean theorem
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // Normalize if distance exceeds max
    if (distance > maxDistance) {
      deltaX = (deltaX * maxDistance) / distance;
      deltaY = (deltaY * maxDistance) / distance;
    }

    // Update handle position
    handleElement.style.transform = `translate(${deltaX}px, ${deltaY}px)`;

    // Update thumbstick values (normalized between -1 and 1)
    this.thumbstick.x = deltaX / maxDistance;
    this.thumbstick.y = deltaY / maxDistance;
  }
}
