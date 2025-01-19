export interface GameObject {
  type: string;
  size: number;
  model: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  color: string;
  round?: boolean;
  sound?: string;
}

export interface CollectedObject {
  type: string;
  size: number;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  model: string;
  color: string;
}

export interface SizeTier {
  min: number;
  max: number;
  growthRate: number;
  requiredCount: number;
}

export interface GameState {
  playerSize: number;
  collectedObjects: CollectedObject[];
  timeElapsed: number;
  currentClass: number;
  currentLevel: string;
  levelProgress: {
    [key: string]: {
      completed: boolean;
      score: number;
      timeElapsed: number;
    };
  };
}
