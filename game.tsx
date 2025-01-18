"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { SizeIndicator } from "./components/size-indicator";
import { auraVertexShader, auraFragmentShader } from "./shaders/aura";
import type { GameObject, GameState } from "./types/game";
import { levels, distributeObjects } from "./levels";

// Global audio instance
const bgMusic = new Audio();
bgMusic.loop = true;
bgMusic.volume = 0.4;

const Game: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<THREE.Mesh | null>(null);
  const collectedObjectsRef = useRef<THREE.Group | null>(null);
  const finishedRef = useRef(false);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  const touchRef = useRef({
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    isDragging: false
  });

  const keysRef = useRef({
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    Space: false
  });

  const [gameState, setGameState] = useState<GameState>({
    playerSize: 0.5,
    collectedObjects: [],
    timeElapsed: 0,
    currentClass: 0,
    currentLevel: levels[0].id,
    levelProgress: {}
  });

  const [showLevelSelect, setShowLevelSelect] = useState(true);
  const [userInteracted, setUserInteracted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  const getCurrentLevel = () => {
    return levels.find(l => l.id === gameState.currentLevel) || levels[0];
  };

  const detectMobileDevice = () => {
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  };

  const playBackgroundMusic = () => {
    const currentLevel = getCurrentLevel();
    if (!userInteracted || !currentLevel.backgroundMusic.length) return;
    
    if (bgMusic.paused) {
      const randomTrack = currentLevel.backgroundMusic[Math.floor(Math.random() * currentLevel.backgroundMusic.length)];
      bgMusic.src = randomTrack;
      bgMusic.play().catch(console.error);
    }
  };

  const stopBackgroundMusic = () => {
    bgMusic.pause();
    bgMusic.currentTime = 0;
  };

  const playBlipSound = (sound: string) => {
    if (!userInteracted) return;
    const blip = new Audio(sound);
    blip.volume = 0.3;
    blip.play().catch(console.error);
  };

  const stopAllAudio = () => {
    stopBackgroundMusic();
  };

  const handleLevelSelect = (levelId: string) => {
    stopAllAudio();
    setGameState(prev => ({
      ...prev,
      currentLevel: levelId,
      playerSize: 0.5,
      collectedObjects: [],
      timeElapsed: 0,
      currentClass: 0
    }));
    setShowLevelSelect(false);
    setGameOver(false);
    finishedRef.current = false;
    startTimeRef.current = Date.now();
    resetGame();
  };

  const handleGameOver = (completed: boolean) => {
    stopBackgroundMusic();
    const currentLevel = getCurrentLevel();
    const score = gameState.collectedObjects.length;
    
    setGameState(prev => ({
      ...prev,
      levelProgress: {
        ...prev.levelProgress,
        [currentLevel.id]: {
          completed,
          score,
          timeElapsed: prev.timeElapsed
        }
      }
    }));
    
    setGameOver(true);
  };

  const resetGame = () => {
    if (sceneRef.current && rendererRef.current && cameraRef.current) {
      while(sceneRef.current.children.length > 0){ 
        sceneRef.current.remove(sceneRef.current.children[0]);
      }
      
      if (playerRef.current) {
        playerRef.current.position.set(0, 0.1, 0);
        playerRef.current.scale.setScalar(0.25);
      }

      if (collectedObjectsRef.current) {
        collectedObjectsRef.current.clear();
      }

      initializeLevel();
    }
  };

  const initializeLevel = () => {
    if (!mountRef.current || !sceneRef.current || !rendererRef.current || !cameraRef.current) return;

    const currentLevel = getCurrentLevel();
    playBackgroundMusic();
    
    const scene = sceneRef.current;
    scene.background = new THREE.Color(currentLevel.ambientColor || "#E0E0E0");

    // Lighting setup
    const ambientLight = new THREE.AmbientLight(0x404040, 1);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1200;
    directionalLight.shadow.mapSize.height = 1200;
    directionalLight.shadow.camera.near = 0.6;
    directionalLight.shadow.camera.far = 50;
    scene.add(directionalLight);

    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0xffcacc, 0.3);
    scene.add(hemisphereLight);

    // Room setup
    const wallTexture = new THREE.TextureLoader().load(currentLevel.wallTexture || "textures/wall_shoji.png");
    wallTexture.wrapS = THREE.RepeatWrapping;
    wallTexture.wrapT = THREE.RepeatWrapping;
    wallTexture.repeat.set(2.5, 1);
    
    const roomGeometry = new THREE.BoxGeometry(50, 20, 50);
    const roomMaterial = new THREE.MeshStandardMaterial({
      map: wallTexture,
      color: 0xffffff,
      side: THREE.BackSide,
      roughness: 0.8,
      metalness: 0.0,
    });
    const room = new THREE.Mesh(roomGeometry, roomMaterial);
    room.position.y = 10;
    scene.add(room);

    // Floor setup
    const floorTexture = new THREE.TextureLoader().load(currentLevel.floorTexture || "textures/floor_carpet.jpg");
    floorTexture.wrapS = THREE.RepeatWrapping;
    floorTexture.wrapT = THREE.RepeatWrapping;
    floorTexture.repeat.set(20, 20);

    const floorGeometry = new THREE.PlaneGeometry(50, 50);
    const floorMaterial = new THREE.MeshStandardMaterial({
      map: floorTexture,
      roughness: 1.0,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.01;
    floor.receiveShadow = true;
    scene.add(floor);

    // Player setup
    if (!playerRef.current) {
      const playerGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.2, 32);
      const playerMaterial = new THREE.MeshStandardMaterial({
        color: 0x303030,
        roughness: 0.7,
        metalness: 0.3,
      });
      const player = new THREE.Mesh(playerGeometry, playerMaterial);
      playerRef.current = player;

      // Roomba details
      const topDisc = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.45, 0.05, 32),
        new THREE.MeshStandardMaterial({ color: 0x404040 })
      );
      topDisc.position.y = 0.1;
      player.add(topDisc);

      const sensorBump = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.1, 0.1, 16),
        new THREE.MeshStandardMaterial({ color: 0x202020 })
      );
      sensorBump.position.set(0, 0.15, 0.3);
      player.add(sensorBump);

      const collectedObjectsContainer = new THREE.Group();
      collectedObjectsRef.current = collectedObjectsContainer;
      player.add(collectedObjectsContainer);

      player.scale.setScalar(0.25);
      player.position.y = 0.1 * player.scale.y;
      player.castShadow = true;
      player.receiveShadow = true;
    }

    scene.add(playerRef.current);

    // Initialize level objects
    const loader = new GLTFLoader();
    const objects: THREE.Object3D[] = [];
    const auras: THREE.Mesh[] = [];
    let totalObjects = 0;

    const auraMaterial = new THREE.ShaderMaterial({
      vertexShader: auraVertexShader,
      fragmentShader: auraFragmentShader,
      transparent: true,
      uniforms: {
        time: { value: 0 },
      },
    });

    distributeObjects(currentLevel.gameObjects).forEach((obj) => {
      loader.load(
        obj.model,
        (gltf) => {
          const model = gltf.scene;
          model.position.set(...obj.position);
          if (obj.round) {
            model.rotation.set(
              obj.rotation[0],
              obj.rotation[1] + Math.random() * Math.PI,
              obj.rotation[2] + Math.random() * Math.PI
            );
            model.position.y = 0.05;
          } else {
            model.rotation.set(0, obj.rotation[2] + Math.random() * Math.PI, 0);
            model.position.y = 0.05;
          }
          model.scale.setScalar(obj.scale);
          model.userData.size = obj.size;
          model.userData.sound = obj.sound;

          model.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              (child as THREE.Mesh).castShadow = true;
              (child as THREE.Mesh).receiveShadow = true;
            }
          });
          scene.add(model);
          objects.push(model);

          // Create aura
          const auraGeometry = new THREE.SphereGeometry(obj.size * 0.15, 32, 32);
          const auraMesh = new THREE.Mesh(auraGeometry, auraMaterial.clone());
          auraMesh.scale.multiplyScalar(1.2);
          auraMesh.visible = false;
          model.add(auraMesh);
          auras.push(auraMesh);
          totalObjects++;
        },
        undefined,
        () => {
          // Fallback object creation if model loading fails
          const geometry = new THREE.BoxGeometry(
            obj.size * 0.1,
            obj.size * 0.1,
            obj.size * 0.1
          );
          const material = new THREE.MeshStandardMaterial({
            color: obj.color,
          });
          const mesh = new THREE.Mesh(geometry, material);
          mesh.position.set(...obj.position);
          mesh.rotation.set(...obj.rotation);
          mesh.scale.setScalar(obj.scale);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          mesh.userData.size = obj.size;
          mesh.userData.sound = obj.sound;
          mesh.position.y = obj.size * 0.005;
          scene.add(mesh);
          objects.push(mesh);

          // Create aura for fallback object
          const auraGeometry = new THREE.SphereGeometry(obj.size * 0.15, 32, 32);
          const auraMesh = new THREE.Mesh(auraGeometry, auraMaterial.clone());
          auraMesh.scale.multiplyScalar(1.2);
          auraMesh.visible = false;
          mesh.add(auraMesh);
          auras.push(auraMesh);
          totalObjects++;
        }
      );
    });

    // Game loop
    let time = 0;
    const playerVelocity = new THREE.Vector3();
    const playerDirection = new THREE.Vector3(0, 0, -1);
    const rotationSpeed = 0.03;
    const acceleration = 0.003;
    const maxSpeed = 0.4;
    const friction = 0.9;
    const bounceForce = 0.4;
    const gravity = 0.01;
    const jumpForce = 0.2;
    let isGrounded = false;
    const cameraOffset = new THREE.Vector3(0, 2, 2.5);
    const minZoom = 2.5;
    const maxZoom = 150;
    let currentZoom = minZoom;

    const animate = () => {
      time += 0.016;

      if (finishedRef.current) {
        return;
      }

      requestAnimationFrame(animate);

      // Update time elapsed
      if (!finishedRef.current && !gameOver) {
        const currentTime = Date.now();
        const elapsedSeconds = Math.floor((currentTime - startTimeRef.current) / 1000);
        setGameState(prev => ({ ...prev, timeElapsed: elapsedSeconds }));

        // Check time limit
        if (elapsedSeconds > currentLevel.maxTime) {
          handleGameOver(false);
          return;
        }
      }

      // Update aura uniforms and visibility
      const smallestObject = objects.reduce(
        (smallest, obj) => {
          if (obj.parent === scene && obj.userData.size < smallest.userData.size) {
            return obj;
          }
          return smallest;
        },
        { userData: { size: Infinity } }
      );

      objects.forEach((object, index) => {
        if (object.parent === scene) {
          const aura = auras[index];
          if (aura) {
            aura.material.uniforms.time.value = time;
            aura.visible =
              object.userData.size <=
              Math.max(gameState.playerSize * 1.2, smallestObject.userData.size);
          }
        }
      });

      // Player movement using keysRef
      const moveDirection = new THREE.Vector3();
      if (keysRef.current.ArrowUp) moveDirection.z -= 1;
      if (keysRef.current.ArrowDown) moveDirection.z += 1;
      
      if (keysRef.current.ArrowLeft) {
        playerDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotationSpeed);
      }
      if (keysRef.current.ArrowRight) {
        playerDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), -rotationSpeed);
      }

      let dynamicMaxSpeed = maxSpeed * (1 + gameState.playerSize * 0.6);
      const dynamicAcceleration = acceleration * (1 + gameState.playerSize * 0.4);

      if (isMobileDevice) {
        dynamicMaxSpeed *= 2;
      }

      playerVelocity.add(
        playerDirection.clone().multiplyScalar(moveDirection.z * dynamicAcceleration)
      );

      playerVelocity.y -= gravity;

      isGrounded = playerRef.current.position.y <= playerRef.current.scale.y * 0.5;
      if (isGrounded) {
        playerRef.current.position.y = playerRef.current.scale.y * 0.5;
        playerVelocity.y = Math.max(0, playerVelocity.y);
      }

      if (keysRef.current.Space && isGrounded) {
        playerVelocity.y = jumpForce;
      }

      // Apply friction and limit speed
      playerVelocity.multiplyScalar(friction);
      
      if (playerVelocity.length() > dynamicMaxSpeed) {
        playerVelocity.normalize().multiplyScalar(dynamicMaxSpeed);
      }

      // Calculate next position
      const nextPosition = playerRef.current.position.clone().add(playerVelocity);
      nextPosition.x = Math.max(-24, Math.min(24, nextPosition.x));
      nextPosition.z = Math.max(-24, Math.min(24, nextPosition.z));

      // Check collisions with objects and handle collection
      let collisionOccurred = false;
      objects.forEach((object, index) => {
        if (object.parent === scene) {
          const distance = nextPosition.distanceTo(object.position);
          const combinedRadius = playerRef.current.scale.x * 0.5 + object.userData.size * 0.05;

          if (distance < combinedRadius) {
            if (object.userData.size <= Math.max(gameState.playerSize * 1.2, smallestObject.userData.size)) {
              // Object collection logic
              scene.remove(object);
              const aura = auras[index];
              if (aura) {
                aura.visible = false;
                aura.parent?.remove(aura);
              }
              totalObjects--;

              // Position on sphere surface
              const u = Math.random();
              const v = Math.random();
              const radius = playerRef.current.scale.x * 0.5;

              const theta = 2 * Math.PI * u;
              const phi = Math.acos(2 * v - 1);

              const surfacePosition = new THREE.Vector3(
                radius * Math.sin(phi) * Math.cos(theta),
                radius * Math.sin(phi) * Math.sin(theta),
                radius * Math.cos(phi)
              );

              object.userData.initialPosition = {
                theta: theta,
                phi: phi,
                radius: radius,
              };

              object.position.copy(surfacePosition);
              surfacePosition.add(
                new THREE.Vector3(
                  (Math.random() - 0.5) * 0.05,
                  (Math.random() - 0.5) * 0.05,
                  (Math.random() - 0.5) * 0.05
                ).multiplyScalar(playerRef.current.scale.x)
              );

              const scaleFactor = Math.min(1.2, object.userData.size / gameState.playerSize);
              object.scale.multiplyScalar(scaleFactor * 0.8);
              collectedObjectsRef.current.add(object);

              if (object.userData.sound) {
                playBlipSound(object.userData.sound);
              }

              // Update game state
              setGameState((prev) => {
                const currentTier = currentLevel.sizeTiers[prev.currentClass];
                const objectsInTier = prev.collectedObjects.filter(
                  (obj) => obj => obj.size >= currentTier.min && obj.size <= currentTier.max
                ).length;

                const newObjectInTier = object.userData.size >= currentTier.min && 
                                      object.userData.size <= currentTier.max;
                
                const allObjectsInTierCaptured = 
                  (objectsInTier + (newObjectInTier ? 1 : 0)) >= currentTier.requiredCount;

                let newPlayerSize = prev.playerSize;
                let newClass = prev.currentClass;

                if (allObjectsInTierCaptured && prev.currentClass < currentLevel.sizeTiers.length - 1) {
                  newClass++;
                  newPlayerSize = prev.playerSize * 1.8;
                }

                return {
                  ...prev,
                  playerSize: newPlayerSize,
                  currentClass: newClass,
                  collectedObjects: [
                    ...prev.collectedObjects,
                    {
                      type: object.userData.type || "object",
                      size: object.userData.size,
                      position: surfacePosition.toArray(),
                      rotation: [0, 0, 0],
                      scale: object.scale.x,
                      model: object.userData.model || "",
                      color: object.userData.color || "#ffffff",
                    },
                  ],
                };
              });

              // Check level completion
              if (totalObjects === 0) {
                const hasMetRequirements = gameState.collectedObjects.length >= currentLevel.requiredScore;
                handleGameOver(hasMetRequirements);
              }
            } else {
              // Bounce off larger objects
              collisionOccurred = true;
              const pushDirection = nextPosition
                .clone()
                .sub(object.position)
                .normalize();
              playerVelocity.reflect(pushDirection).multiplyScalar(bounceForce);

              // Squish effect
              playerRef.current.scale.x *= 0.95;
              playerRef.current.scale.z *= 1.05;
              setTimeout(() => {
                playerRef.current.scale.x /= 0.95;
                playerRef.current.scale.z /= 1.05;
              }, 100);
            }
          }
        }
      });

      // Update player position
      if (!collisionOccurred) {
        playerRef.current.position.copy(nextPosition);
      } else {
        playerRef.current.position.add(playerVelocity);
      }

      // Update camera
      const zoomFactor = 4;
      const targetZoom = THREE.MathUtils.clamp(
        playerRef.current.scale.x * zoomFactor,
        minZoom,
        maxZoom
      );

      currentZoom = THREE.MathUtils.lerp(currentZoom, targetZoom, 0.1);
      cameraOffset.z = currentZoom;
      cameraOffset.y = Math.max(2, currentZoom * 0.3);

      const idealOffset = cameraOffset
        .clone()
        .applyAxisAngle(
          new THREE.Vector3(0, 1, 0),
          Math.atan2(playerDirection.x, playerDirection.z)
        );

      cameraRef.current.position.lerp(
        playerRef.current.position.clone().add(idealOffset),
        0.1
      );
      cameraRef.current.lookAt(playerRef.current.position);

      rendererRef.current.render(scene, cameraRef.current);
    };

    animate();
  };

  // Handle visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && userInteracted) {
        playBackgroundMusic();
      } else {
        bgMusic.pause();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [userInteracted]);

  // Main setup effect
  useEffect(() => {
    if (!mountRef.current) return;

    setIsMobileDevice(detectMobileDevice());

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
    });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(
      isMobileDevice ? window.devicePixelRatio / 2 : window.devicePixelRatio
    );
    renderer.shadowMap.enabled = true;

    mountRef.current.appendChild(renderer.domElement);

    sceneRef.current = scene;
    rendererRef.current = renderer;
    cameraRef.current = camera;

    const onWindowResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(
        isMobileDevice ? window.devicePixelRatio / 2 : window.devicePixelRatio
      );
    };

    window.addEventListener("resize", onWindowResize);

    // Keyboard controls
    const onKeyDown = (event: KeyboardEvent) => {
      keysRef.current[event.code] = true;
      if (event.code === "Space") {
        event.preventDefault();
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      keysRef.current[event.code] = false;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    if (!showLevelSelect && !gameOver) {
      initializeLevel();
    }

    return () => {
      window.removeEventListener("resize", onWindowResize);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      stopAllAudio();
      mountRef.current?.removeChild(renderer.domElement);
    };
  }, []);

  useEffect(() => {
    if (!showLevelSelect && !gameOver) {
      initializeLevel();
    }
  }, [gameState.currentLevel, showLevelSelect]);

  const handleTouchStart = (event: React.TouchEvent) => {
    const touch = event.touches[0];
    touchRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      lastX: touch.clientX,
      lastY: touch.clientY,
      isDragging: true
    };
  };

  const handleTouchMove = (event: React.TouchEvent) => {
    if (!touchRef.current.isDragging) return;
  
    const touch = event.touches[0];
    const deltaX = touch.clientX - touchRef.current.lastX;
    const deltaY = touch.clientY - touchRef.current.lastY;

    keysRef.current.ArrowUp = false;
    keysRef.current.ArrowDown = false;
    keysRef.current.ArrowLeft = false;
    keysRef.current.ArrowRight = false;

    const threshold = 2;
  
    if (Math.abs(deltaY) > threshold || Math.abs(deltaX) > threshold) {
      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        if (deltaY < 0) {
          keysRef.current.ArrowUp = true;
        } else {
          keysRef.current.ArrowDown = true;
        }
      } else {
        if (deltaX < 0) {
          keysRef.current.ArrowLeft = true;
        } else {
          keysRef.current.ArrowRight = true;
        }
      }
    }

    touchRef.current.lastX = touch.clientX;
    touchRef.current.lastY = touch.clientY;
  };

  const handleTouchEnd = () => {
    touchRef.current.isDragging = false;
    keysRef.current.ArrowUp = false;
    keysRef.current.ArrowDown = false;
    keysRef.current.ArrowLeft = false;
    keysRef.current.ArrowRight = false;
  };

  return (
    <>
      <div ref={mountRef} className="w-full h-full" />
      <SizeIndicator size={gameState.playerSize} time={gameState.timeElapsed} />

      {showLevelSelect && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-70">
          <div className="bg-white p-8 rounded-lg text-center">
            <h1 className="text-3xl font-bold mb-4">Select Level</h1>
            {levels.map((level, index) => {
              const progress = gameState.levelProgress[level.id];
              const isLocked = index > 0 && !gameState.levelProgress[levels[index - 1].id]?.completed;

              return (
                <div key={level.id} className="mb-4">
                  <button
                    onClick={() => handleLevelSelect(level.id)}
                    disabled={isLocked}
                    className={`w-full p-4 rounded ${
                      isLocked ? 'bg-gray-300' : 'bg-blue-500 text-white hover:bg-blue-600'
                    }`}
                  >
                    <div className="text-lg font-bold">{level.name}</div>
                    <div className="text-sm">
                      {progress?.completed ? '⭐ Completed' : level.description}
                    </div>
                    {progress?.completed && (
                      <div className="text-xs mt-1">
                        Best Time: {Math.floor(progress.timeElapsed / 60)}m {progress.timeElapsed % 60}s
                      </div>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {gameOver && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-70">
          <div className="bg-white p-8 rounded-lg text-center">
            <h1 className={`text-3xl font-bold mb-4 ${
              gameState.levelProgress[gameState.currentLevel]?.completed 
                ? 'rainbow_text_animated' 
                : ''
            }`}>
              {gameState.levelProgress[gameState.currentLevel]?.completed 
                ? 'Level Complete!' 
                : 'Try Again'}
            </h1>
            
            <div className="space-y-2 mb-6">
              <p>
                Size: {Math.floor(gameState.playerSize)}cm {Math.floor((gameState.playerSize % 1) * 10)}mm
              </p>
              <p>
                Time: {Math.floor(gameState.timeElapsed / 60)}m {gameState.timeElapsed % 60}s
              </p>
              <p>
                Score: {gameState.collectedObjects.length} / {getCurrentLevel().requiredScore}
              </p>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => handleLevelSelect(gameState.currentLevel)}
                className="w-full p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Try Again
              </button>
              
              <button
                onClick={() => {
                  setShowLevelSelect(true);
                  setGameOver(false);
                  stopBackgroundMusic();
                }}
                className="w-full p-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Level Select
              </button>
            </div>

            {gameState.levelProgress[gameState.currentLevel]?.completed && (
              <div className="mt-4">
                <img 
                  src="/api/placeholder/400/320"
                  alt="Celebration"
                  className="mx-auto"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {isMobileDevice && (
        <div 
          className="fixed bottom-10 right-10 w-32 h-32 bg-white bg-opacity-40 rounded-full border-2 border-white flex items-center justify-center"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
        >
          <div className="w-8 h-8 bg-white rounded-full border-2" />
        </div>
      )}
    </>
  );
};

export default Game;
