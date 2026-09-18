import { Scene, Object3D } from 'three';
import { CartInstance } from '../../flow-types';

export interface RemoveCartDeps {
  id: string;
  cartInstances: CartInstance[];
  routeCreationCart: CartInstance | null;
  scene: Scene;
  disposeObject: (obj: Object3D) => void;
}

export interface RemoveCartResult {
  cartInstances: CartInstance[];
  routeCreationCart: CartInstance | null;
}

export function removeCartHelper(deps: RemoveCartDeps): RemoveCartResult {
  // Håndter fjernelse af midlertidig rute-vogn
  if (deps.id === 'route-creation-cart' && deps.routeCreationCart) {
    deps.scene.remove(deps.routeCreationCart.object);
    deps.disposeObject(deps.routeCreationCart.object);
    return { cartInstances: deps.cartInstances, routeCreationCart: null };
  }

  const idx = deps.cartInstances.findIndex(c => c.id === deps.id);
  if (idx === -1) return { cartInstances: deps.cartInstances, routeCreationCart: deps.routeCreationCart };

  const [cart] = deps.cartInstances.splice(idx, 1);
  deps.scene.remove(cart.object);
  deps.disposeObject(cart.object);

  return { cartInstances: deps.cartInstances, routeCreationCart: deps.routeCreationCart };
}
