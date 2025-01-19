import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { levels, getCurrentLevel } from './levels';

interface StartMenuProps {
  onSelectLevel: (levelId: string) => void;
}

const StartMenu: React.FC<StartMenuProps> = ({ onSelectLevel }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const playRandomSound = (sounds: string[]) => {
    const randomIndex = Math.floor(Math.random() * sounds.length);
    const sound = new Audio(sounds[randomIndex]);
    sound.volume = 0.3;
    sound.play().catch((error) => {
      console.log("Failed to play random sound:", error);
    });
  };


  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    mountRef.current.appendChild(renderer.domElement);

    // Background setup with rotating starfield effect
    const backgroundGeometry = new THREE.PlaneGeometry(100, 100);
    const backgroundMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
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
        varying vec2 vUv;

        float random(vec2 st) {
          return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
        }

        vec3 starfield(vec2 uv) {
          // Rotate UV coordinates
          float rotation = time * 0.05;
          vec2 center = vec2(0.5);
          vec2 rotatedUv = center + mat2(
            cos(rotation), -sin(rotation),
            sin(rotation), cos(rotation)
          ) * (uv - center);
          
          vec3 col = vec3(0.0);
          
          // Deep blue base
          col = vec3(0.1, 0.0, 0.2);
          
          // Add purple nebula
          float noise = random(rotatedUv + time * 0.1);
          col += vec3(0.2, 0.0, 0.3) * noise;
          
          // Add rotating stars
          float stars = step(0.98, random(floor(rotatedUv * 1000.0)));
          col += vec3(1.0) * stars;
          
          return col;
        }

        void main() {
          vec2 uv = vUv;
          vec3 color = starfield(uv);
          gl_FragColor = vec4(color, 1.0);
        }
      `
    });
    const background = new THREE.Mesh(backgroundGeometry, backgroundMaterial);
    background.position.z = -20;
    scene.add(background);

    // Sun setup
    const sunGeometry = new THREE.CircleGeometry(5, 32);
    const sunMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 }
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
        varying vec2 vUv;

        void main() {
          vec2 center = vec2(0.5);
          float dist = distance(vUv, center);
          
          vec3 color = vec3(1.0, 0.9, 0.4);
          float glow = 1.0 - smoothstep(0.0, 0.5, dist);
          
          float flare = sin(time * 2.0) * 0.1 + 0.9;
          glow *= flare;
          
          gl_FragColor = vec4(color * glow, 1.0);
        }
      `
    });
    /*
    const sun = new THREE.Mesh(sunGeometry, sunMaterial);
    sun.position.set(-8, -4, -15);
    scene.add(sun);
    */

    // Level setup
    const levelGroup = new THREE.Group();
    scene.add(levelGroup);

    // Define level positions (3 top, 2 bottom)
    const positions = [
      [-4, 2, 0],  // Top left
      [0, 2, 0],   // Top middle
      [4, 2, 0],   // Top right
      [-2, -1, 0], // Bottom left
      [2, -1, 0],  // Bottom right
    ];

    const frameGeometry = new THREE.CircleGeometry(1.2, 32);
    const levelGeometry = new THREE.CircleGeometry(1, 32);
    const planets: THREE.Group[] = [];

    levels.forEach((level, index) => {
      const planetGroup = new THREE.Group();
      
      // Create white frame
      const frameMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const frame = new THREE.Mesh(frameGeometry, frameMaterial);
      planetGroup.add(frame);

      // Create level preview
      const levelMaterial = new THREE.MeshBasicMaterial({ 
        color: new THREE.Color().setHSL(index * 0.2, 0.7, 0.5)
      });
      const levelMesh = new THREE.Mesh(levelGeometry, levelMaterial);
      planetGroup.add(levelMesh);

      // Add lock if level is locked (assuming all levels except first are locked)
      if (index > 0) {
        const lockGeometry = new THREE.PlaneGeometry(0.5, 0.5);
        const lockMaterial = new THREE.MeshBasicMaterial({ 
          color: 0xffffff,
          transparent: true,
          opacity: 0.9
        });
        const lock = new THREE.Mesh(lockGeometry, lockMaterial);
        lock.position.z = 0.1;
        planetGroup.add(lock);
      }

      // Add text label
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (context) {
        canvas.width = 256;
        canvas.height = 64;
        context.font = 'Bold 32px Arial';
        context.fillStyle = 'white';
        context.textAlign = 'center';
        context.fillText(level.name, 128, 32);
        const texture = new THREE.CanvasTexture(canvas);
        const labelMaterial = new THREE.SpriteMaterial({ map: texture });
        const label = new THREE.Sprite(labelMaterial);
        label.scale.set(2, 0.5, 1);
        label.position.y = -1.5;
        planetGroup.add(label);
      }

      planetGroup.position.set(...positions[index]);
      levelGroup.add(planetGroup);
      planets.push(planetGroup);
    });

    camera.position.z = 10;

    // Animation
    const animate = (time: number) => {
      requestAnimationFrame(animate);

      // Update shaders
      backgroundMaterial.uniforms.time.value = time * 0.001;
      sunMaterial.uniforms.time.value = time * 0.001;

      // Scale selected planet
      planets.forEach((planet, index) => {
        const targetScale = index === selectedIndex ? 1.2 : 1.0;
        planet.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
        
        // Add subtle floating animation
        planet.position.y = positions[index][1] + Math.sin(time * 0.002 + index) * 0.1;
      });

      renderer.render(scene, camera);
    };
    animate(0);

    // Keyboard controls
    const handleKeyDown = (event: KeyboardEvent) => {
      event.preventDefault(); // Prevent key events from reaching the game
      playRandomSound([  
          "music/effects/01.mp3",
          "music/effects/03.mp3",
          "music/effects/04.mp3",
          "music/effects/05.mp3",
        ]);

      switch (event.key) {
        case 'ArrowLeft':
          setSelectedIndex((prev) => (prev - 1 + levels.length) % levels.length);
          break;
        case 'ArrowRight':
          setSelectedIndex((prev) => (prev + 1) % levels.length);
          break;
        case 'Enter':
        case ' ':
          event.preventDefault();
          onSelectLevel(levels[selectedIndex].id);
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // Handle window resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      backgroundMaterial.uniforms.resolution.value.set(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
      mountRef.current?.removeChild(renderer.domElement);
    };
  }, [onSelectLevel, selectedIndex]);

  return (
    <div className="relative w-full h-screen">
      <div ref={mountRef} className="absolute inset-0" />
      <div className="absolute top-0 left-0 right-0 flex justify-center mt-8">
        <img className="rainbow_text_animated" src="logo.png" width="40%" />
        <br />
        <h1 className="text-6xl font-bold text-white text-center rainbow_text_animated" 
            style={{
              textShadow: '0 0 20px rgba(255,255,255,0.5), 0 0 40px rgba(255,255,255,0.3)'
            }}> beta
        </h1>
      </div>
      <button 
        onClick={(e) => {
          e.preventDefault();
          window.history.back();
        }}
        className="absolute top-4 left-4 w-16 h-16 rounded-full bg-pink-500 hover:bg-pink-600 flex items-center justify-center"
      >
        <div className="w-0 h-0 border-t-8 border-t-transparent border-r-12 border-r-white border-b-8 border-b-transparent transform rotate-180" />
      </button>
      <button 
        onClick={(e) => {
          e.preventDefault();
          alert('Help');
        }}
        className="absolute bottom-4 right-4 w-16 h-16 rounded-full bg-pink-500 hover:bg-pink-600 flex items-center justify-center text-white text-2xl font-bold"
      >
        ?
      </button>
    </div>
  );
};

export default StartMenu;

