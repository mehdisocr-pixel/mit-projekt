import { Vector3 } from 'three';
import { clampToBounds, getGroundPoint } from '../../input/ground-point';
import { startRouteCreation as startRouteCreationHelper } from '../start-route-creation';

export interface RouteStartDeps {
  isCreatingRoute: boolean;
  routeStartTime: string | null;
  routeCreationCart: any;
  rendererElement: HTMLElement;
  camera: any;
  raycaster: any;
  floorY: number;
  roomBounds: any;
  controls: any;
  selectedCartTypeForRoute: string;
  modelService: any;
  cartModelFiles: string[];
  loader: any;
  scene: any;
  selectedIds: Set<string>;
  updateSelectionVisuals: () => void;
  logStatus: (m: string) => void;
  setRouteStartTime: (t: string) => void;
  setRouteStartPos: (v: Vector3) => void;
  setLastGroundPoint: (v: Vector3) => void;
  setCreatingRoute: (flag: boolean) => void;
  setRouteCreationCart: (cart: any) => void;
  setDraggingCartId: (id: string | null) => void;
  promptStartTime: (x: number, y: number) => Promise<string | null>;
}

export async function handleRouteStartClick(deps: RouteStartDeps, event: PointerEvent): Promise<boolean> {
  if (!deps.isCreatingRoute) return false;

  // Første klik: vælg starttid
  if (!deps.routeStartTime) {
    const chosenTime = await deps.promptStartTime(event.clientX, event.clientY);
    if (!chosenTime) return true;
    deps.setRouteStartTime(chosenTime);
    deps.logStatus(`Starttid sat: ${chosenTime}. Klik på startpunktet.`);
    return true;
  }

  // Andet klik: spawn vogn ved klikpunkt
  if (!deps.routeCreationCart) {
    const raw = getGroundPoint(deps.camera, deps.raycaster, deps.rendererElement, deps.floorY, event);
    if (!raw) return true;
    const point = clampToBounds(raw, deps.roomBounds, deps.floorY);
    deps.setRouteStartPos(point.clone());
    deps.setLastGroundPoint(point.clone());
    if (deps.controls) deps.controls.enabled = false;
    const res = await startRouteCreationHelper({
      selectedCartType: deps.selectedCartTypeForRoute,
      modelService: deps.modelService,
      cartModelFiles: deps.cartModelFiles,
      loader: deps.loader,
      scene: deps.scene,
      selectedIds: deps.selectedIds,
      updateSelectionVisuals: () => deps.updateSelectionVisuals(),
      logStatus: (m) => deps.logStatus(m),
      initialPosition: point.clone(),
    });
    if (res) {
      deps.setCreatingRoute(res.isCreatingRoute);
      deps.setRouteCreationCart(res.routeCreationCart);
      deps.setDraggingCartId(event.buttons === 1 && res.routeCreationCart ? res.routeCreationCart.id : null);
      deps.updateSelectionVisuals();
    }
    return true;
  }

  return false;
}
