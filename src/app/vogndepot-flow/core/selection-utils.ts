import { Color, Group, Object3D } from 'three';
import { CartInstance } from './flow-types';

export function applyHighlight(obj: Group, selected: boolean): void {
  obj.traverse((child: Object3D) => {
    const mat = (child as any).material;
    if (mat?.color) {
      if (selected) {
        mat.color = mat.color.clone().offsetHSL(0, 0, 0.2);
      } else if (obj.userData['originalColor']) {
        mat.color.copy(obj.userData['originalColor'] as Color);
      }
    }
  });
}

export function captureBaseColor(obj: Group): Color | null {
  let color: Color | null = null;
  obj.traverse((child: Object3D) => {
    const mat = (child as any).material;
    if (mat?.color && !color) color = mat.color.clone();
  });
  return color;
}

export function selectedCartLabel(selectedIds: Set<string>, carts: CartInstance[]): string {
  const selected = carts.find(c => selectedIds.has(c.id));
  return selected ? selected.type : '';
}
