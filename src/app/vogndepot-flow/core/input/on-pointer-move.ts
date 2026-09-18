import { Box2, Vector2, Vector3 } from 'three';
import { CartInstance } from '../flow-types';
import { getGroundPoint } from './ground-point';

export interface PointerMoveState {
  isCreatingRoute: boolean;
  routeCreationCart: CartInstance | null;
  routeStartPos: Vector3 | null;
  draggingCartId: string | null;
  cartInstances: CartInstance[];
  selectionStart: Vector2 | null;
  selectionEnd: Vector2 | null;
  selectionBox: Box2 | null;
  isDragging: boolean;
  element: HTMLElement;
  camera: any;
  raycaster: any;
  floorY: number;
  dragOffset: Vector3 | null;
}

export interface PointerMoveResult {
  draggingCartId: string | null;
  selectionStart: Vector2 | null;
  selectionEnd: Vector2 | null;
  selectionBox: Box2 | null;
  isDragging: boolean;
  lastGroundPoint?: Vector3 | null;
}

export function onPointerMove(state: PointerMoveState, event: PointerEvent): PointerMoveResult {
  let lastGroundPoint: Vector3 | null | undefined = undefined;

  // Ghost-move når vi er i rute-oprettelse men ikke har valgt start endnu
  if (state.isCreatingRoute && state.routeCreationCart && !state.routeStartPos) {
    const point = getGroundPoint(state.camera, state.raycaster, state.element, state.floorY, event);
    if (point) {
      lastGroundPoint = point.clone();
      state.routeCreationCart.object.position.copy(point);
      state.routeCreationCart.box.setFromObject(state.routeCreationCart.object);
    }
    return {
      draggingCartId: state.draggingCartId,
      selectionStart: state.selectionStart,
      selectionEnd: state.selectionEnd,
      selectionBox: state.selectionBox,
      isDragging: state.isDragging,
      lastGroundPoint,
    };
  }

  // Rute-oprettelse: flyt “spøgelses-vogn” til destinationen
  if (state.isCreatingRoute && state.routeCreationCart && state.draggingCartId === state.routeCreationCart.id) {
    const point = getGroundPoint(state.camera, state.raycaster, state.element, state.floorY, event);
    if (point) {
      lastGroundPoint = point.clone();
      const pos = state.dragOffset ? point.clone().add(state.dragOffset) : point;
      state.routeCreationCart.object.position.copy(pos);
      state.routeCreationCart.box.setFromObject(state.routeCreationCart.object);
    }
    return {
      draggingCartId: state.draggingCartId,
      selectionStart: state.selectionStart,
      selectionEnd: state.selectionEnd,
      selectionBox: state.selectionBox,
      isDragging: state.isDragging,
      lastGroundPoint,
    };
  }

  // Almindelig drag af valgt vogn
  if (state.draggingCartId && !state.isCreatingRoute) {
    const point = getGroundPoint(state.camera, state.raycaster, state.element, state.floorY, event);
    if (point) {
      const cart = state.cartInstances.find(c => c.id === state.draggingCartId);
      if (cart) {
        const pos = state.dragOffset ? point.clone().add(state.dragOffset) : point;
        cart.object.position.copy(pos);
        cart.box.setFromObject(cart.object);
      }
    }
    return {
      draggingCartId: state.draggingCartId,
      selectionStart: state.selectionStart,
      selectionEnd: state.selectionEnd,
      selectionBox: state.selectionBox,
      isDragging: state.isDragging,
    };
  }

  if (!state.selectionStart) {
    return {
      draggingCartId: state.draggingCartId,
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
    selectionStart: state.selectionStart,
    selectionEnd,
    selectionBox,
    isDragging,
    lastGroundPoint,
  };
}
