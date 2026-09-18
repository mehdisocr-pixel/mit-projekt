import { Vector3 } from 'three';
import { FlowEvent } from './flow-types';
import { ModelManifestService } from './model-manifest.service';
import { FlowEditorComponent } from '../flow-editor/flow-editor.component';
import { CartInstance } from './flow-types';

export interface UiBridgeState {
  flowEvents: FlowEvent[];
  timeToMinutes: (t: string) => number;
  selectedIds: Set<string>;
  cartInstances: CartInstance[];
  modelService: ModelManifestService;
  logStatus: (m: string) => void;
}

export function addFlowEvent(state: UiBridgeState, evt: FlowEvent): FlowEvent[] {
  return [...state.flowEvents, evt].sort(
    (a, b) => state.timeToMinutes(a.time) - state.timeToMinutes(b.time),
  );
}

export function spawnTestCart(
  state: UiBridgeState,
  cartModelFiles: string[],
  spawnCart: (type: string, start: Vector3, end: Vector3, onComplete: 'DESTROY' | 'STAY') => void,
): void {
  const chosen = cartModelFiles[0];
  if (!chosen) {
    state.logStatus('Ingen vogn-model til test.');
    return;
  }
  spawnCart(chosen, new Vector3(0, 0, 0), new Vector3(0, 0, 0), 'STAY');
  state.logStatus(`Test-vogn spawnet: ${chosen}`);
}

export function captureStart(flowEditor: FlowEditorComponent | undefined, cart: CartInstance | null): void {
  if (!flowEditor || !cart) return;
  flowEditor.setStartFromVector(cart.object.position);
}

export function captureEnd(flowEditor: FlowEditorComponent | undefined, cart: CartInstance | null): void {
  if (!flowEditor || !cart) return;
  flowEditor.setEndFromVector(cart.object.position);
}
