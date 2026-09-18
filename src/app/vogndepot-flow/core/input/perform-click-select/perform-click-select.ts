import { Raycaster, PerspectiveCamera } from 'three';
import { CartInstance } from '../../flow-types';
import { hitTestSelectable } from '../selection-manager';

export interface PerformClickSelectDeps {
  raycaster: Raycaster;
  camera: PerspectiveCamera;
  element: HTMLElement;
  carts: CartInstance[];
  routeCart: CartInstance | null;
}

export function performClickSelectHelper(deps: PerformClickSelectDeps, event: PointerEvent): Set<string> {
  const hit = hitTestSelectable(
    deps.raycaster,
    deps.camera,
    deps.element,
    deps.carts,
    deps.routeCart,
    event,
  );

  const selected = new Set<string>();
  if (hit) selected.add(hit.id);
  return selected;
}
