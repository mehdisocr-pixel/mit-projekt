import { Vector2 } from 'three';
import { CartInstance } from '../flow-types';
import { hitTestCartSimple, getGroundPointSimple } from '../interaction-utils';

export interface PointerDownState {
  element: HTMLElement;
  camera: any;
  raycaster: any;
  cartInstances: CartInstance[];
  floorY: number;
  isCreatingRoute: boolean;
  routeCreationCart: CartInstance | null;
  routeStartPos: any;
}

export interface PointerDownResult {
  draggingCartId: string | null;
  selectionStart: Vector2 | null;
  selectionEnd: Vector2 | null;
  isDragging: boolean;
  routeStartPos: any;
}

export function onPointerDown(state: PointerDownState, event: PointerEvent): PointerDownResult {
  // Kun reager hvis vi klikker på selve renderer-elementet (ikke UI)
  if (event.target !== state.element) {
    return {
      draggingCartId: null,
      selectionStart: null,
      selectionEnd: null,
      isDragging: false,
      routeStartPos: state.routeStartPos,
    };
  }

  if (state.isCreatingRoute && state.routeCreationCart && !state.routeStartPos) {
    const point = getGroundPointSimple(state.camera, state.raycaster, state.element as any, state.floorY, event);
    if (point) {
      state.routeCreationCart.object.position.copy(point);
      state.routeCreationCart.box.setFromObject(state.routeCreationCart.object);
      return {
        draggingCartId: state.routeCreationCart.id,
        selectionStart: null,
        selectionEnd: null,
        isDragging: false,
        routeStartPos: point.clone(),
      };
    }
    // Hvis ingen gyldig ground point, gør ingenting
    return {
      draggingCartId: null,
      selectionStart: null,
      selectionEnd: null,
      isDragging: false,
      routeStartPos: state.routeStartPos,
    };
  }

  const hitCart = hitTestCartSimple(state.camera, state.raycaster, state.element as any, state.cartInstances, event);
  const draggingCartId = hitCart ? hitCart.id : null;

  const rect = state.element.getBoundingClientRect();
  const selectionStart = new Vector2(event.clientX - rect.left, event.clientY - rect.top);
  const selectionEnd = selectionStart.clone();

  return {
    draggingCartId,
    selectionStart,
    selectionEnd,
    isDragging: false,
    routeStartPos: state.routeStartPos,
  };
}
