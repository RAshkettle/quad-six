import * as THREE from "three";

export class Portals {
  constructor(scene) {
    // Portal shader material
    this.portalGeometry = new THREE.PlaneGeometry(4, 4);
    this.portalMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0.0 },
        resolution: { value: new THREE.Vector2(512, 512) },
        openingTime: { value: 0.0 },
        isOpening: { value: 0.0 },
        despawnTime: { value: 0.0 },
        isDespawning: { value: 0.0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec2 resolution;
        uniform float openingTime;
        uniform float isOpening;
        uniform float despawnTime;
        uniform float isDespawning;
        varying vec2 vUv;
        
        vec2 hash(vec2 p) {
          mat2 m = mat2(15.32, 83.43, 117.38, 289.59);
          return fract(sin(m * p) * 46783.289);
        }
        
        float voronoi(vec2 p) {
          vec2 g = floor(p);
          vec2 f = fract(p);
          
          float distanceFromPointToCloestFeaturePoint = 1.0;
          for(int y = -1; y <= 1; ++y) {
            for(int x = -1; x <= 1; ++x) {
              vec2 latticePoint = vec2(x, y);
              float h = distance(latticePoint + hash(g + latticePoint), f);
              distanceFromPointToCloestFeaturePoint = min(distanceFromPointToCloestFeaturePoint, h);
            }
          }
          
          return 1.0 - sin(distanceFromPointToCloestFeaturePoint);
        }
        
        float portalTexture(vec2 uv) {
          float t = voronoi(uv * 8.0 + vec2(time));
          t *= 1.0 - length(uv * 2.0);
          return t;
        }
        
        float fbm(vec2 uv) {
          float sum = 0.0;
          float amp = 1.0;
          
          for(int i = 0; i < 4; ++i) {
            sum += portalTexture(uv) * amp;
            uv += uv;
            amp *= 0.8;
          }
          
          return sum;
        }
        
        void main() {
          // Convert UV to centered coordinates (-1 to 1)
          vec2 uv = (vUv * 2.0 - 1.0);
          
          // Calculate distance from center for perfect circle
          float distFromCenter = length(uv);
          
          // Create a perfect circular mask with smooth edges
          float circleMask = 1.0 - smoothstep(0.9, 1.0, distFromCenter);
          
          // Only calculate the effect inside the circle to avoid edge artifacts
          if (circleMask <= 0.0) {
            gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
            return;
          }
          
          // Portal opening animation
          if (isOpening > 0.5) {
            float openDuration = 2.0; // 2 second opening animation
            float progress = clamp(openingTime / openDuration, 0.0, 1.0);
            
            if (progress < 1.0) {
              // Phase 1: Bright center explosion (first 0.5 seconds)
              if (progress < 0.25) {
                float centerPhase = progress / 0.25;
                float brightness = (1.0 - centerPhase) * 10.0; // Very bright center
                float radius = centerPhase * 0.3; // Expanding bright core
                
                float centerDist = smoothstep(radius - 0.1, radius, distFromCenter);
                vec3 centerColor = vec3(0.4, 0.8, 1.0) * brightness; // Bright blue-white
                
                float alpha = (1.0 - centerDist) * circleMask * brightness * 0.3;
                gl_FragColor = vec4(centerColor, alpha);
                return;
              }
              
              // Phase 2: Explosion wave (0.25 - 0.75)
              else if (progress < 0.75) {
                float wavePhase = (progress - 0.25) / 0.5;
                float waveRadius = wavePhase * 1.2; // Wave expands outward
                
                // Create explosion wave ring
                float waveDist = abs(distFromCenter - waveRadius);
                float waveIntensity = 1.0 - smoothstep(0.0, 0.2, waveDist);
                waveIntensity *= (1.0 - wavePhase); // Fade as it expands
                
                // Bright explosion color
                vec3 explosionColor = vec3(0.1, 0.6, 1.0) * waveIntensity * 5.0;
                
                float alpha = waveIntensity * circleMask;
                gl_FragColor = vec4(explosionColor, alpha);
                return;
              }
              
              // Phase 3: Portal formation (0.75 - 1.0)
              else {
                float portalPhase = (progress - 0.75) / 0.25;
                
                // Start introducing the portal effect
                float t = pow(fbm(uv * 0.3), 2.0) * portalPhase;
                t *= 1.5;
                
                // Mix explosion remnants with portal
                float explosionRemnant = (1.0 - portalPhase) * 0.5;
                vec3 explosionColor = vec3(0.1, 0.4, 1.0) * explosionRemnant;
                vec3 portalColor = vec3(t * 2.0, t * 4.0, t * 8.0);
                
                vec3 finalColor = mix(explosionColor, portalColor, portalPhase);
                float alpha = (t + explosionRemnant) * circleMask;
                
                gl_FragColor = vec4(finalColor, alpha);
                return;
              }
            }
          }
          
          // Portal despawn animation (reverse of spawn)
          if (isDespawning > 0.5) {
            float despawnDuration = 2.0; // 2 second despawn animation
            float progress = clamp(despawnTime / despawnDuration, 0.0, 1.0);
            
            if (progress < 1.0) {
              // Reverse the spawn animation phases
              
              // Phase 1: Portal dissolving (0.0 - 0.25) - reverse of formation phase
              if (progress < 0.25) {
                float dissolvePhase = progress / 0.25;
                
                // Start with portal and dissolve to explosion
                float t = pow(fbm(uv * 0.3), 2.0) * (1.0 - dissolvePhase);
                t *= 1.5;
                
                // Mix portal with growing explosion remnants
                float explosionRemnant = dissolvePhase * 0.5;
                vec3 explosionColor = vec3(0.1, 0.4, 1.0) * explosionRemnant;
                vec3 portalColor = vec3(t * 2.0, t * 4.0, t * 8.0);
                
                vec3 finalColor = mix(portalColor, explosionColor, dissolvePhase);
                float alpha = (t + explosionRemnant) * circleMask;
                
                gl_FragColor = vec4(finalColor, alpha);
                return;
              }
              
              // Phase 2: Implosion wave (0.25 - 0.75) - reverse of explosion wave
              else if (progress < 0.75) {
                float wavePhase = (progress - 0.25) / 0.5;
                float waveRadius = (1.0 - wavePhase) * 1.2; // Wave contracts inward
                
                // Create implosion wave ring
                float waveDist = abs(distFromCenter - waveRadius);
                float waveIntensity = 1.0 - smoothstep(0.0, 0.2, waveDist);
                waveIntensity *= wavePhase; // Grow as it contracts
                
                // Bright implosion color
                vec3 explosionColor = vec3(0.1, 0.6, 1.0) * waveIntensity * 5.0;
                
                float alpha = waveIntensity * circleMask;
                gl_FragColor = vec4(explosionColor, alpha);
                return;
              }
              
              // Phase 3: Final center collapse (0.75 - 1.0) - reverse of center explosion
              else {
                float centerPhase = (progress - 0.75) / 0.25;
                float brightness = centerPhase * 10.0; // Growing brightness towards center
                float radius = (1.0 - centerPhase) * 0.3; // Contracting bright core
                
                float centerDist = smoothstep(radius - 0.1, radius, distFromCenter);
                vec3 centerColor = vec3(0.4, 0.8, 1.0) * brightness; // Bright blue-white
                
                float alpha = (1.0 - centerDist) * circleMask * brightness * 0.3;
                gl_FragColor = vec4(centerColor, alpha);
                return;
              }
            } else {
              // Animation complete - portal is fully despawned
              gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
              return;
            }
          }
          
          // Normal portal effect (when not opening or after opening is complete)
          float t = pow(fbm(uv * 0.3), 2.0);
          t *= 1.5;
          
          float alpha = t * circleMask;
          vec3 color = vec3(t * 2.0, t * 4.0, t * 8.0);
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
    });

    // Create 6 portals evenly spaced along the far edge of the plane
    this.portals = [];
    const planeWidth = 30;
    const portalCount = 6;
    const portalSpacing = planeWidth / (portalCount + 1);
    const farEdgeZ = -14.5;

    for (let i = 0; i < portalCount; i++) {
      const portalMaterialInstance = this.portalMaterial.clone();
      const portal = new THREE.Mesh(
        this.portalGeometry,
        portalMaterialInstance
      );
      const xPosition = -planeWidth / 2 + portalSpacing * (i + 1);
      portal.position.set(xPosition, 0, farEdgeZ);
      portal.userData = {
        active: false,
        index: i,
        openingStartTime: 0,
        activationTime: 0,
        despawnStartTime: 0,
        isDespawning: false,
      };
      portal.visible = false;
      this.portals.push(portal);
      scene.add(portal);
    }
  }

  getPortals() {
    return this.portals;
  }

  // Spawns 3 random enemy portals (renamed from togglePortalStatus)
  spawnEnemyPortals(audioControls) {
    const portals = this.portals;
    const activePortals = portals.filter((portal) => portal.userData.active);
    const currentTime = performance.now() * 0.001;

    if (activePortals.length === 3) {
      // If 3 are active, deactivate all and pick 3 new random ones
      portals.forEach((portal) => {
        portal.userData.active = false;
        portal.userData.isDespawning = false;
        portal.visible = false;
        portal.material.uniforms.isOpening.value = 0.0;
        portal.material.uniforms.isDespawning.value = 0.0;
      });

      // Pick 3 random portals to activate
      const shuffled = [...portals].sort(() => 0.5 - Math.random());
      for (let i = 0; i < 3; i++) {
        shuffled[i].userData.active = true;
        shuffled[i].visible = true;
        // Start opening animation
        shuffled[i].userData.openingStartTime = currentTime;
        shuffled[i].userData.activationTime = currentTime;
        shuffled[i].material.uniforms.isOpening.value = 1.0;
        shuffled[i].material.uniforms.openingTime.value = 0.0;
      }

      // Start idle sound when portals become active
      if (audioControls) audioControls.startIdleSound();
    } else {
      // If less than 3 are active, activate random ones until we have 3
      const inactivePortals = portals.filter(
        (portal) => !portal.userData.active
      );
      const needed = 3 - activePortals.length;

      const shuffledInactive = [...inactivePortals].sort(
        () => 0.5 - Math.random()
      );
      for (let i = 0; i < Math.min(needed, shuffledInactive.length); i++) {
        shuffledInactive[i].userData.active = true;
        shuffledInactive[i].visible = true;
        // Start opening animation
        shuffledInactive[i].userData.openingStartTime = currentTime;
        shuffledInactive[i].userData.activationTime = currentTime;
        shuffledInactive[i].material.uniforms.isOpening.value = 1.0;
        shuffledInactive[i].material.uniforms.openingTime.value = 0.0;
      }

      // Start idle sound when portals become active (if not already playing)
      if (audioControls) audioControls.startIdleSound();
    }
  }
}
