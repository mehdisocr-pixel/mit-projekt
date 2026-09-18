import { Box2, PerspectiveCamera, Raycaster, Vector2, Vector3 } from 'three';
import { CartInstance } from '../flow-types';
import { getGroundPoint } from '../input/ground-point';
import { clampToBounds } from '../input/ground-point';
import { hitTestSelectable, boxSelectIds } from '../input/selection-manager';

export interface InteractionState {
  element: HTMLElement;
  camera: PerspectiveCamera;
  raycaster: Raycaster;
  carts: CartInstance[];
  routeCart: CartInstance | null;
  floorY: number;
  isCreatingRoute: boolean;
  routeStartPos: Vector3 | null;
  lastGroundPoint: Vector3 | null;
  selectionStart: Vector2 | null;
  selectionEnd: Vector2 | null;
  selectionBox: Box2 | null;
  isDragging: boolean;
  draggingCartId: string | null;
  dragOffset: Vector3 | null;
}

export interface InteractionResult {
  draggingCartId: string | null;
  dragOffset: Vector3 | null;
  selectionStart: Vector2 | null;
  selectionEnd: Vector2 | null;
  selectionBox: Box2 | null;
  isDragging: boolean;
  selectedIds?: Set<string>;
  routeStartPos?: Vector3 | null;
  lastGroundPoint?: Vector3 | null;
}

export function handlePointerDown(state: InteractionState, event: PointerEvent): InteractionResult {
  const hit = hitTestSelectable(state.raycaster, state.camera, state.element, state.carts, state.routeCart, event);
  if (hit) {
    let dragOffset = state.dragOffset;
    let draggingCartId: string | null = null;
    if (event.buttons === 1) {
      const gp = getGroundPoint(state.camera, state.raycaster, state.element, state.floorY, event);
      if (gp) {
        dragOffset = hit.object.position.clone().sub(gp);
        draggingCartId = hit.id;
      }
    }
    return {
      draggingCartId,
      dragOffset: dragOffset ?? null,
      selectionStart: null,
      selectionEnd: null,
      selectionBox: null,
      isDragging: false,
      selectedIds: new Set([hit.id]),
      routeStartPos: state.routeStartPos,
      lastGroundPoint: state.lastGroundPoint,
    };
  }

  // Under rute-oprettelse: ignorér box-select
  if (state.isCreatingRoute) {
    return {
      draggingCartId: null,
      dragOffset: null,
      selectionStart: null,
      selectionEnd: null,
      selectionBox: null,
      isDragging: false,
      selectedIds: new Set(),
      routeStartPos: state.routeStartPos,
      lastGroundPoint: state.lastGroundPoint,
    };
  }

  const rect = state.element.getBoundingClientRect();
  const selectionStart = new Vector2(event.clientX - rect.left, event.clientY - rect.top);
  return {
    draggingCartId: null,
    dragOffset: null,
    selectionStart,
    selectionEnd: selectionStart.clone(),
    selectionBox: null,
    isDragging: false,
    selectedIds: new Set(),
    routeStartPos: state.routeStartPos,
    lastGroundPoint: state.lastGroundPoint,
  };
}

export function handlePointerMove(state: InteractionState, event: PointerEvent): InteractionResult {
  // Drag af rute-cart
  if (state.isCreatingRoute && state.routeCart && state.draggingCartId === state.routeCart.id) {
    const point = getGroundPoint(state.camera, state.raycaster, state.element, state.floorY, event);
    if (point) {
      const pos = state.dragOffset ? point.clone().add(state.dragOffset) : point;
      const clamped = clampToBounds(pos, null, state.floorY);
      state.routeCart.object.position.copy(clamped);
      state.routeCart.box.setFromObject(state.routeCart.object);
      return {
        draggingCartId: state.draggingCartId,
        dragOffset: state.dragOffset,
        selectionStart: state.selectionStart,
        selectionEnd: state.selectionEnd,
        selectionBox: state.selectionBox,
        isDragging: state.isDragging,
        lastGroundPoint: clamped.clone(),
        routeStartPos: state.routeStartPos,
      };
    }
  }

  // Almindelig drag
  if (state.draggingCartId && !state.isCreatingRoute) {
    const point = getGroundPoint(state.camera, state.raycaster, state.element, state.floorY, event);
    if (point) {
      const cart = state.carts.find(c => c.id === state.draggingCartId);
      if (cart) {
        const pos = state.dragOffset ? point.clone().add(state.dragOffset) : point;
        const clamped = clampToBounds(pos, null, state.floorY);
        cart.object.position.copy(clamped);
        cart.box.setFromObject(cart.object);
      }
    }
    return {
      draggingCartId: state.draggingCartId,
      dragOffset: state.dragOffset,
      selectionStart: state.selectionStart,
      selectionEnd: state.selectionEnd,
      selectionBox: state.selectionBox,
      isDragging: state.isDragging,
    };
  }

  if (!state.selectionStart) {
    return {
      draggingCartId: state.draggingCartId,
      dragOffset: state.dragOffset,
      selectionStart: state.selectionStart,
      selectionEnd: state.selectionEnd,
      selectionBox: state.selectionBox,
      isDragging: state.isDragging,
    };
  }

  const rect = state.element.getBoundingClientRect();
  const current = new Vector2(event.clientX - rect.left, event.clientY - rect.top);
  const distance = current.distanceTo(state.selectionStart);
  const isDragging = distance > 4 ? true : state.isDragging;
  const selectionEnd = current;
  const selectionBox = isDragging ? new Box2(state.selectionStart.clone(), current.clone()) : state.selectionBox;

  return {
    draggingCartId: state.draggingCartId,
    dragOffset: state.dragOffset,
    selectionStart: state.selectionStart,
    selectionEnd,
    selectionBox,
    isDragging,
  };
}

export function handlePointerUp(state: InteractionState, event: PointerEvent): InteractionResult {
  // Rute: capture slut og stop drag
  if (state.isCreatingRoute && state.draggingCartId === state.routeCart?.id) {
    const groundPoint = getGroundPoint(state.camera, state.raycaster, state.element, state.floorY, event);
    return {
      draggingCartId: null,
      dragOffset: null,
      selectionStart: null,
      selectionEnd: null,
      selectionBox: null,
      isDragging: false,
      routeStartPos: state.routeStartPos,
      lastGroundPoint: groundPoint ?? state.lastGroundPoint,
    };
  }

  const draggingCartId = null;

  if (!state.selectionStart) {
    return {
      draggingCartId,
      dragOffset: null,
      selectionStart: null,
      selectionEnd: null,
      selectionBox: null,
      isDragging: false,
    };
  }

  if (state.isDragging && state.selectionBox) {
    const ids = boxSelectIds(state.element, state.camera, state.selectionBox, state.carts, state.routeCart);
    return {
      draggingCartId,
      dragOffset: null,
      selectionStart: null,
      selectionEnd: null,
      selectionBox: null,
      isDragging: false,
      selectedIds: ids,
    };
  }

  return {
    draggingCartId,
    dragOffset: null,
    selectionStart: null,
    selectionEnd: null,
    selectionBox: null,
    isDragging: false,
  };
}
