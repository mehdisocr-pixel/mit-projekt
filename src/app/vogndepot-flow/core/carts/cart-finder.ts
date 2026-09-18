import { CartInstance } from '../flow-types';

export function findCartByType(carts: CartInstance[], type: string): CartInstance | null {
  return carts.find(c => c.type === type) ?? null;
}
