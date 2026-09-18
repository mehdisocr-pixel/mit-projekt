import { Box3, Group, Vector3 } from 'three';

export type FlowAction = 'ENTER' | 'EXIT' | 'MOVE';
export type FlowCompletion = 'DESTROY' | 'STAY';

export interface FlowEvent {
  time: string; // HH:mm
  cartType: string;
  action: FlowAction;
  startPos: Vector3;
  endPos: Vector3;
  onComplete: FlowCompletion;
  durationSeconds?: number;
}

export interface CartInstance {
  id: string;
  type: string;
  object: Group;
  box: Box3;
}

export interface ActiveMove {
  cartId: string;
  start: Vector3;
  end: Vector3;
  startedAt: number;
  durationMs: number;
  onComplete: FlowCompletion;
}

export interface ModelsManifest {
  files: string[];
}
