import {
  Box2,
  Object3D,
  PerspectiveCamera,
  Raycaster,
  Vector2,
  Vector3,
} from 'three';
import { CartInstance } from './flow-types';

export interface InteractionState {
  viewer: HTMLCanvasElement;
  raycaster: Raycaster;
  camera: PerspectiveCamera;
  selectionStart: Vector2 | null;
  selectionEnd: Vector2 | null;
  selectionBox: Box2 | null;
  isDragging: boolean;
  draggingCartId: string | null;
  selectedIds: Set<string>;
  cartInstances: CartInstance[];
  floorY: number;
  onSelectionChanged: () => void;
}

export function onPointerDown(state: InteractionState, event: PointerEvent): void {
  const hitCart = hitTestCart(state, event);
  if (hitCart) {
    state.draggingCartId = hitCart.id;
  }

  const rect = state.viewer.getBoundingClientRect();
  state.selectionStart = new Vector2(event.clientX - rect.left, event.clientY - rect.top);
  state.selectionEnd = state.selectionStart.clone();
  state.isDragging = false;
}

export function onPointerMove(state: InteractionState, event: PointerEvent): void {
  if (state.draggingCartId) {
    const point = getGroundPoint(state, event);
    if (point) {
      const cart = state.cartInstances.find(c => c.id === state.draggingCartId);
      if (cart) {
        cart.object.position.copy(point);
        cart.box.setFromObject(cart.object);
      }
    }
    return;
  }

  if (!state.selectionStart) return;
  const rect = state.viewer.getBoundingClientRect();
  const current = new Vector2(event.clientX - rect.left, event.clientY - rect.top);
  const distance = current.distanceTo(state.selectionStart);
  if (distance > 4) state.isDragging = true;
  state.selectionEnd = current;
  if (state.isDragging) {
    state.selectionBox = new Box2(state.selectionStart.clone(), current.clone());
  }
}

export function onPointerUp(state: InteractionState, event: PointerEvent): void {
  state.draggingCartId = null;
  if (!state.selectionStart) return;
  if (state.isDragging && state.selectionBox) {
    performBoxSelect(state, state.selectionBox);
  } else {
    performClickSelect(state, event);
  }
  state.selectionStart = null;
  state.selectionEnd = null;
  state.selectionBox = null;
  state.isDragging = false;
}

function performClickSelect(state: InteractionState, event: PointerEvent): void {
  const hit = hitTestCart(state, event);
  if (!hit) {
    state.selectedIds.clear();
    state.onSelectionChanged();
    return;
  }
  state.selectedIds.clear();
  state.selectedIds.add(hit.id);
  state.onSelectionChanged();
}

function performBoxSelect(state: InteractionState, box: Box2): void {
  const rect = state.viewer.getBoundingClientRect();
  state.selectedIds.clear();
  for (const cart of state.cartInstances) {
    const screenPos = cart.object.getWorldPosition(new Vector3()).clone().project(state.camera);
    const px = ((screenPos.x + 1) / 2) * rect.width;
    const py = ((-screenPos.y + 1) / 2) * rect.height;
    if (
      px >= Math.min(box.min.x, box.max.x) &&
      px <= Math.max(box.min.x, box.max.x) &&
      py >= Math.min(box.min.y, box.max.y) &&
      py <= Math.max(box.min.y, box.max.y)
    ) {
      state.selectedIds.add(cart.id);
    }
  }
  state.onSelectionChanged();
}

export function hitTestCart(state: InteractionState, event: PointerEvent): CartInstance | null {
  const rect = state.viewer.getBoundingClientRect();
  const ndc = new Vector2(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1,
  );
  state.raycaster.setFromCamera(ndc, state.camera);
  const intersects = state.raycaster.intersectObjects(
    state.cartInstances.map(c => c.object),
    true,
  );
  if (!intersects.length) return null;
  let hit: Object3D | null = intersects[0].object;
  let owner: CartInstance | undefined;
  while (hit && !owner) {
    owner = state.cartInstances.find(c => c.object === hit);
    hit = hit.parent ?? null;
  }
  return owner ?? null;
}

export function applyHighlight(cart: CartInstance, selected: boolean): void {
  cart.object.traverse((child: Object3D) => {
    const mat = (child as any).material;
    if (mat?.color) {
      if (selected) {
        mat.color = mat.color.clone().offsetHSL(0, 0, 0.2);
      } else if (cart.object.userData['originalColor']) {
        mat.color.copy(cart.object.userData['originalColor']);
      }
    }
  });
}

export function captureBaseColor(obj: Object3D): any {
  let color: any = null;
  obj.traverse((child: Object3D) => {
    const mat = (child as any).material;
    if (mat?.color && !color) color = mat.color.clone();
  });
  return color;
}

export function getGroundPoint(state: InteractionState, event: PointerEvent): Vector3 | null {
  const rect = state.viewer.getBoundingClientRect();
  const ndc = new Vector2(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1,
  );
  state.raycaster.setFromCamera(ndc, state.camera);
  const planePoint = new Vector3(0, state.floorY, 0);
  const planeNormal = new Vector3(0, 1, 0);
  const denom = state.raycaster.ray.direction.dot(planeNormal);
  if (Math.abs(denom) < 1e-6) return null;
  const t = planePoint.clone().sub(state.raycaster.ray.origin).dot(planeNormal) / denom;
  if (t < 0) return null;
  return state.raycaster.ray.origin.clone().add(state.raycaster.ray.direction.clone().multiplyScalar(t));
}

// Simple helpers uden state-objekt (bruges fra komponenten)
export function hitTestCartSimple(
  camera: PerspectiveCamera,
  raycaster: Raycaster,
  viewer: HTMLCanvasElement,
  carts: CartInstance[],
  event: PointerEvent,
): CartInstance | null {
  const rect = viewer.getBoundingClientRect();
  const ndc = new Vector2(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1,
  );
  raycaster.setFromCamera(ndc, camera);
  const intersects = raycaster.intersectObjects(carts.map(c => c.object), true);
  if (!intersects.length) return null;
  let hit: Object3D | null = intersects[0].object;
  let owner: CartInstance | undefined;
  while (hit && !owner) {
    owner = carts.find(c => c.object === hit);
    hit = hit.parent ?? null;
  }
  return owner ?? null;
}

export function getGroundPointSimple(
  camera: PerspectiveCamera,
  raycaster: Raycaster,
  viewer: HTMLCanvasElement,
  floorY: number,
  event: PointerEvent,
): Vector3 | null {
  const rect = viewer.getBoundingClientRect();
  const ndc = new Vector2(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1,
  );
  raycaster.setFromCamera(ndc, camera);
  const planePoint = new Vector3(0, floorY, 0);
  const planeNormal = new Vector3(0, 1, 0);
  const denom = raycaster.ray.direction.dot(planeNormal);
  if (Math.abs(denom) < 1e-6) return null;
  const t = planePoint.clone().sub(raycaster.ray.origin).dot(planeNormal) / denom;
  if (t < 0) return null;
  return raycaster.ray.origin.clone().add(raycaster.ray.direction.clone().multiplyScalar(t));
}
