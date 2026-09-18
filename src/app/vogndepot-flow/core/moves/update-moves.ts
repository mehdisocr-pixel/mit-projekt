import { Vector3 } from 'three';
import { ActiveMove, CartInstance } from '../flow-types';

export interface UpdateMovesState {
  activeMoves: ActiveMove[];
  cartInstances: CartInstance[];
  isColliding: (cart: CartInstance) => boolean;
  removeCart: (id: string) => void;
  now?: number;
  ignoreCollisions?: boolean;
}

/**
 * Opdaterer aktive bevægelser og returnerer den filtrerede liste.
 */
export function updateMoves(state: UpdateMovesState): ActiveMove[] {
  const now = state.now ?? performance.now();
  const finished: ActiveMove[] = [];

  for (const move of state.activeMoves) {
    const cart = state.cartInstances.find(c => c.id === move.cartId);
    if (!cart) {
      finished.push(move);
      continue;
    }

    const t = Math.min(1, (now - move.startedAt) / move.durationMs);
    const nextPos = new Vector3().lerpVectors(move.start, move.end, t);
    const prevPos = cart.object.position.clone();
    cart.object.position.copy(nextPos);
    cart.box.setFromObject(cart.object);

    if (!state.ignoreCollisions && state.isColliding(cart)) {
      cart.object.position.copy(prevPos);
      cart.box.setFromObject(cart.object);
    }

    if (t >= 1) {
      finished.push(move);
      if (move.onComplete === 'DESTROY') {
        state.removeCart(cart.id);
      }
    }
  }

  return state.activeMoves.filter(m => !finished.includes(m));
}
