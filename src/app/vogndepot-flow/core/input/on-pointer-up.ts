import { Box2 } from 'three';
import { CartInstance } from '../flow-types';
import { getGroundPoint } from './ground-point';

export interface PointerUpState {
  isCreatingRoute: boolean;
  routeCreationCart: CartInstance | null;
  draggingCartId: string | null;
  selectionStart: any;
  selectionEnd: any;
  selectionBox: Box2 | null;
  isDragging: boolean;
  camera: any;
  raycaster: any;
  element: HTMLElement;
  floorY: number;
  cancelRouteCreation: () => void;
  setRouteEnd: (pos: any) => void;
  showCompletion: () => void;
  performBoxSelect: (box: Box2) => void;
  performClickSelect: (event: PointerEvent) => void;
}

export function onPointerUp(state: PointerUpState, event: PointerEvent) {
  if (state.isCreatingRoute && state.draggingCartId === state.routeCreationCart?.id) {
    const groundPoint = getGroundPoint(state.camera, state.raycaster, state.element, state.floorY, event);
    if (groundPoint) {
      state.setRouteEnd(groundPoint.clone());
      state.showCompletion();
    } else {
      state.cancelRouteCreation();
    }
    return {
      draggingCartId: null,
      selectionStart: null,
      selectionEnd: null,
      selectionBox: null,
      isDragging: false,
    };
  }

  const draggingCartId = null;

  if (!state.selectionStart) {
    return {
      draggingCartId,
      selectionStart: null,
      selectionEnd: null,
      selectionBox: null,
      isDragging: false,
    };
  }

  if (state.isDragging && state.selectionBox) {
    state.performBoxSelect(state.selectionBox);
  } else {
    state.performClickSelect(event);
  }

  return {
    draggingCartId,
    selectionStart: null,
    selectionEnd: null,
    selectionBox: null,
    isDragging: false,
  };
}
