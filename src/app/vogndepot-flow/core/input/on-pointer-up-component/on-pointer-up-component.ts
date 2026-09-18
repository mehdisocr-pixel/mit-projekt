import { Box2, Vector3 } from 'three';
import { CartInstance } from '../../flow-types';
import { handlePointerUp as pointerUpHandler } from '../../viewer-interaction/pointer-up.handler';

export interface PointerUpComponentDeps {
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

export interface PointerUpComponentResult {
  draggingCartId: string | null;
  dragOffset: Vector3 | null;
  selectionStart: any;
  selectionEnd: any;
  selectionBox: Box2 | null;
  isDragging: boolean;
  selectedIds?: Set<string>;
  lastGroundPoint: Vector3 | null;
  routeEndPos: Vector3 | null;
  showCompletionModal: boolean;
}

export function handleComponentPointerUp(
  deps: PointerUpComponentDeps,
  event: PointerEvent,
): PointerUpComponentResult {
  const result = pointerUpHandler(
    {
      isCreatingRoute: deps.isCreatingRoute,
      rendererElement: deps.rendererElement,
      routeCart: deps.routeCart,
      draggingCartId: deps.draggingCartId,
      selectionStart: deps.selectionStart,
      selectionEnd: deps.selectionEnd,
      selectionBox: deps.selectionBox,
      isDragging: deps.isDragging,
      camera: deps.camera,
      raycaster: deps.raycaster,
      floorY: deps.floorY,
      carts: deps.carts,
      lastGroundPoint: deps.lastGroundPoint,
      clamp: deps.clamp,
    },
    event,
  );

  const lastGround = result.lastGroundPoint ?? deps.lastGroundPoint;
  const routeEndPos =
    deps.isCreatingRoute && result.lastGroundPoint ? result.lastGroundPoint.clone() : null;

  return {
    draggingCartId: result.draggingCartId,
    dragOffset: result.dragOffset ?? null,
    selectionStart: result.selectionStart,
    selectionEnd: result.selectionEnd,
    selectionBox: result.selectionBox,
    isDragging: result.isDragging,
    selectedIds: result.selectedIds,
    lastGroundPoint: lastGround ?? null,
    routeEndPos,
    showCompletionModal: !!(deps.isCreatingRoute && routeEndPos),
  };
}
