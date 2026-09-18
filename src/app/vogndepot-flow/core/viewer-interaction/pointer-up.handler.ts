import { Box2, Vector3 } from 'three';
import { CartInstance } from '../flow-types';
import { handlePointerUp as interactionUp } from '../viewer-interaction/viewer-interaction';

export interface PointerUpDeps {
  isCreatingRoute: boolean;
  rendererElement: HTMLElement;
  routeCart: CartInstance | null;
  draggingCartId: string | null;
  selectionStart: any;
  selectionEnd: any;
  selectionBox: Box2 | null;
  isDragging: boolean;
  camera: any;
  raycaster: any;
  floorY: number;
  carts: CartInstance[];
  lastGroundPoint: Vector3 | null;
  clamp: (v: Vector3) => Vector3;
}

export interface PointerUpResult {
  draggingCartId: string | null;
  dragOffset: Vector3 | null;
  selectionStart: any;
  selectionEnd: any;
  selectionBox: Box2 | null;
  isDragging: boolean;
  selectedIds?: Set<string>;
  lastGroundPoint?: Vector3 | null;
}

export function handlePointerUp(deps: PointerUpDeps, event: PointerEvent): PointerUpResult {
  const result = interactionUp(
    {
      isCreatingRoute: deps.isCreatingRoute,
      routeCart: deps.routeCart,
      draggingCartId: deps.draggingCartId,
      selectionStart: deps.selectionStart,
      selectionEnd: deps.selectionEnd,
      selectionBox: deps.selectionBox,
      isDragging: deps.isDragging,
      camera: deps.camera,
      raycaster: deps.raycaster,
      element: deps.rendererElement,
      floorY: deps.floorY,
      carts: deps.carts,
      lastGroundPoint: deps.lastGroundPoint,
      routeStartPos: null,
      dragOffset: null,
    },
    event,
  );

  const clamped = result.lastGroundPoint ? deps.clamp(result.lastGroundPoint.clone()) : deps.lastGroundPoint;

  return {
    draggingCartId: result.draggingCartId,
    dragOffset: result.dragOffset ?? null,
    selectionStart: result.selectionStart,
    selectionEnd: result.selectionEnd,
    selectionBox: result.selectionBox,
    isDragging: result.isDragging,
    selectedIds: result.selectedIds,
    lastGroundPoint: clamped ?? null,
  };
}
