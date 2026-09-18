import { Box2, Vector2, Vector3 } from 'three';
import { CartInstance } from '../flow-types';
import { handlePointerMove as interactionMove } from '../viewer-interaction/viewer-interaction';

export interface PointerMoveDeps {
  isCreatingRoute: boolean;
  rendererElement: HTMLElement;
  routeCart: CartInstance | null;
  routeStartPos: Vector3 | null;
  draggingCartId: string | null;
  cartInstances: CartInstance[];
  selectionStart: Vector2 | null;
  selectionEnd: Vector2 | null;
  selectionBox: Box2 | null;
  isDragging: boolean;
  camera: any;
  raycaster: any;
  floorY: number;
  dragOffset: Vector3 | null;
  lastGroundPoint: Vector3 | null;
  clamp: (v: Vector3) => Vector3;
}

export interface PointerMoveResult {
  draggingCartId: string | null;
  selectionStart: Vector2 | null;
  selectionEnd: Vector2 | null;
  selectionBox: Box2 | null;
  isDragging: boolean;
  lastGroundPoint: Vector3 | null;
}

export function handlePointerMove(deps: PointerMoveDeps, event: PointerEvent): PointerMoveResult {
  if (deps.isCreatingRoute && event.target !== deps.rendererElement) {
    return {
      draggingCartId: deps.draggingCartId,
      selectionStart: deps.selectionStart,
      selectionEnd: deps.selectionEnd,
      selectionBox: deps.selectionBox,
      isDragging: deps.isDragging,
      lastGroundPoint: deps.lastGroundPoint,
    };
  }

  const result = interactionMove(
    {
      isCreatingRoute: deps.isCreatingRoute,
      routeCart: deps.routeCart,
      routeStartPos: deps.routeStartPos,
      draggingCartId: deps.draggingCartId,
      carts: deps.cartInstances,
      selectionStart: deps.selectionStart,
      selectionEnd: deps.selectionEnd,
      selectionBox: deps.selectionBox,
      isDragging: deps.isDragging,
      element: deps.rendererElement,
      camera: deps.camera,
      raycaster: deps.raycaster,
      floorY: deps.floorY,
      dragOffset: deps.dragOffset,
      lastGroundPoint: deps.lastGroundPoint,
    },
    event,
  );

  const clampedLg = result.lastGroundPoint ? deps.clamp(result.lastGroundPoint.clone()) : deps.lastGroundPoint;

  return {
    draggingCartId: result.draggingCartId,
    selectionStart: result.selectionStart,
    selectionEnd: result.selectionEnd,
    selectionBox: result.selectionBox,
    isDragging: result.isDragging,
    lastGroundPoint: clampedLg ?? null,
  };
}
