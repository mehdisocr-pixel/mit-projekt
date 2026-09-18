import { Box2, Object3D, PerspectiveCamera, Raycaster, Vector2, Vector3 } from 'three';
import { CartInstance } from '../flow-types';

export function selectableCarts(carts: CartInstance[], routeCart: CartInstance | null): CartInstance[] {
  return routeCart ? [...carts, routeCart] : [...carts];
}

export function hitTestSelectable(
  raycaster: Raycaster,
  camera: PerspectiveCamera,
  element: HTMLElement,
  carts: CartInstance[],
  routeCart: CartInstance | null,
  event: PointerEvent,
): CartInstance | null {
  const rect = element.getBoundingClientRect();
  const ndc = new Vector2(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1,
  );
  raycaster.setFromCamera(ndc, camera);
  const candidates = selectableCarts(carts, routeCart);
  const intersects = raycaster.intersectObjects(
    candidates.map((c: CartInstance) => c.object),
    true,
  );
  if (!intersects.length) return null;
  let hit: Object3D | null = intersects[0].object;
  let owner: CartInstance | undefined;
  while (hit && !owner) {
    owner = candidates.find((c: CartInstance) => c.object === hit);
    hit = hit.parent ?? null;
  }
  return owner ?? null;
}

export function boxSelectIds(
  element: HTMLElement,
  camera: PerspectiveCamera,
  box: Box2,
  carts: CartInstance[],
  routeCart: CartInstance | null,
): Set<string> {
  const rect = element.getBoundingClientRect();
  const ids = new Set<string>();
  for (const cart of selectableCarts(carts, routeCart)) {
    const screenPos = cart.object.getWorldPosition(new Vector3()).clone().project(camera);
    const px = ((screenPos.x + 1) / 2) * rect.width;
    const py = ((-screenPos.y + 1) / 2) * rect.height;
    if (
      px >= Math.min(box.min.x, box.max.x) &&
      px <= Math.max(box.min.x, box.max.x) &&
      py >= Math.min(box.min.y, box.max.y) &&
      py <= Math.max(box.min.y, box.max.y)
    ) {
      ids.add(cart.id);
    }
  }
  return ids;
}
