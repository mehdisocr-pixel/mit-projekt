import { PerspectiveCamera, Raycaster, Vector2, Vector3 } from 'three';
import { Box3 } from 'three';

export function getGroundPoint(
  camera: PerspectiveCamera,
  raycaster: Raycaster,
  element: HTMLElement,
  floorY: number,
  event: PointerEvent,
): Vector3 | null {
  const rect = element.getBoundingClientRect();
  const ndc = new Vector2(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1,
  );
  raycaster.setFromCamera(ndc, camera);
  const planePoint = new Vector3(0, floorY, 0);
  const planeNormal = new Vector3(0, 1, 0);
  const denom = raycaster.ray.direction.dot(planeNormal);
  if (Math.abs(denom) < 1e-6) return null;
  const t = planePoint.clone().sub(raycaster.ray.origin).dot(planeNormal) / denom;
  if (t < 0) return null;
  const hit = raycaster.ray.origin.clone().add(raycaster.ray.direction.clone().multiplyScalar(t));
  hit.y = floorY;
  return hit;
}

export function clampToBounds(point: Vector3, bounds: Box3 | null, floorY: number): Vector3 {
  if (!bounds) {
    point.y = floorY;
    return point;
  }
  const clamped = point.clone();
  clamped.x = Math.min(bounds.max.x, Math.max(bounds.min.x, clamped.x));
  clamped.z = Math.min(bounds.max.z, Math.max(bounds.min.z, clamped.z));
  clamped.y = floorY;
  return clamped;
}
