import { Box2, Vector3 } from 'three';
import { CartInstance } from '../../flow-types';
import { handlePointerMove as pointerMoveHandler } from '../../viewer-interaction/pointer-move.handler';

export interface PointerMoveComponentDeps {
  isCreatingRoute: boolean;
  rendererElement: HTMLElement;
  routeCart: CartInstance | null;
  routeStartPos: Vector3 | null;
  draggingCartId: string | null;
  cartInstances: CartInstance[];
  selectionStart: any;
  selectionEnd: any;
  selectionBox: Box2 | null;
  isDragging: boolean;
  camera: any;
  raycaster: any;
  floorY: number;
  dragOffset: Vector3 | null;
  lastGroundPoint: Vector3 | null;
  clamp: (v: Vector3) => Vector3;
}

export interface PointerMoveComponentResult {
  draggingCartId: string | null;
  selectionStart: any;
  selectionEnd: any;
  selectionBox: Box2 | null;
  isDragging: boolean;
  lastGroundPoint: Vector3 | null;
}

export function handleComponentPointerMove(
  deps: PointerMoveComponentDeps,
  event: PointerEvent,
): PointerMoveComponentResult {
  const result = pointerMoveHandler(
    {
      isCreatingRoute: deps.isCreatingRoute,
      rendererElement: deps.rendererElement,
      routeCart: deps.routeCart,
      routeStartPos: deps.routeStartPos,
      draggingCartId: deps.draggingCartId,
      cartInstances: deps.cartInstances,
      selectionStart: deps.selectionStart,
      selectionEnd: deps.selectionEnd,
      selectionBox: deps.selectionBox,
      isDragging: deps.isDragging,
      camera: deps.camera,
      raycaster: deps.raycaster,
      floorY: deps.floorY,
      dragOffset: deps.dragOffset,
      lastGroundPoint: deps.lastGroundPoint,
      clamp: deps.clamp,
    },
    event,
  );

  return {
    draggingCartId: result.draggingCartId,
    selectionStart: result.selectionStart,
    selectionEnd: result.selectionEnd,
    selectionBox: result.selectionBox,
    isDragging: result.isDragging,
    lastGroundPoint: result.lastGroundPoint,
  };
}
