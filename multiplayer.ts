import * as THREE from 'three';
import { Room } from 'trystero';
import { GameObject } from '../types/game';

export class MultiplayerManager {
  private room: Room;
  private peers: Map<string, THREE.Mesh> = new Map();
  private scene: THREE.Scene;
  private sendPlayerState: (state: PlayerState) => void;
  private getPlayerState: (callback: (state: PlayerState, peerId: string) => void) => void;
  private sendStealAttempt: (targetPeerId: string) => void;
  private getStealAttempt: (callback: (peerId: string) => void) => void;

  constructor(room: Room, scene: THREE.Scene) {
    this.room = room;
    this.scene = scene;
    
    // Set up P2P actions
    [this.sendPlayerState, this.getPlayerState] = room.makeAction('playerState');
    [this.sendStealAttempt, this.getStealAttempt] = room.makeAction('stealAttempt');

    // Handle peer joins/leaves
    room.onPeerJoin((peerId) => this.handlePeerJoin(peerId));
    room.onPeerLeave((peerId) => this.handlePeerLeave(peerId));

    // Listen for player states
    this.getPlayerState((state, peerId) => this.updatePeerState(state, peerId));
    
    // Listen for steal attempts
    this.getStealAttempt((peerId) => this.handleStealAttempt(peerId));
  }

  private createPeerMesh(): THREE.Mesh {
    // Create a mesh similar to the player but with different color
    const geometry = new THREE.CylinderGeometry(0.5, 0.5, 0.2, 32);
    const material = new THREE.MeshStandardMaterial({
      color: 0x6495ED,  // Cornflower blue to distinguish from player
      roughness: 0.7,
      metalness: 0.3,
    });
    const mesh = new THREE.Mesh(geometry, material);
    
    // Add roomba details
    const topDisc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.45, 0.05, 32),
      new THREE.MeshStandardMaterial({ color: 0x4169E1 })
    );
    topDisc.position.y = 0.1;
    mesh.add(topDisc);

    const sensorBump = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, 0.1, 16),
      new THREE.MeshStandardMaterial({ color: 0x1E90FF })
    );
    sensorBump.position.set(0, 0.15, 0.3);
    mesh.add(sensorBump);

    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  private handlePeerJoin(peerId: string) {
    console.log('Peer joined:', peerId);
    const peerMesh = this.createPeerMesh();
    this.peers.set(peerId, peerMesh);
    this.scene.add(peerMesh);
  }

  private handlePeerLeave(peerId: string) {
    console.log('Peer left:', peerId);
    const peerMesh = this.peers.get(peerId);
    if (peerMesh) {
      this.scene.remove(peerMesh);
      this.peers.delete(peerId);
    }
  }

  private updatePeerState(state: PlayerState, peerId: string) {
    const peerMesh = this.peers.get(peerId);
    if (peerMesh) {
      // Update position
      peerMesh.position.set(...state.position);
      
      // Update direction
      const direction = new THREE.Vector3(...state.direction);
      peerMesh.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        direction.normalize()
      );
      
      // Update size
      peerMesh.scale.setScalar(state.size * 0.25);
      peerMesh.position.y = 0.1 * peerMesh.scale.y;
    }
  }

  public broadcastPlayerState(state: PlayerState) {
    this.sendPlayerState(state);
  }

  public attemptSteal(targetPeerId: string) {
    this.sendStealAttempt(targetPeerId);
  }

  private handleStealAttempt(attackerPeerId: string) {
    // This will be called when another player attempts to steal from this player
    // Implementation will be added in the Game component
  }

  public getPeerMeshes(): Map<string, THREE.Mesh> {
    return this.peers;
  }

  public cleanup() {
    this.peers.forEach((mesh) => {
      this.scene.remove(mesh);
    });
    this.peers.clear();
  }
}
