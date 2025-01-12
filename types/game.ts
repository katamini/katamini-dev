export interface GameObject {
  type: string
  size: number
  model: string
  position: [number, number, number]
  rotation: [number, number, number]
  scale: number
  color: string
}

export interface GameState {
  playerSize: number
  collectedObjects: GameObject[]
  timeElapsed: number
}

