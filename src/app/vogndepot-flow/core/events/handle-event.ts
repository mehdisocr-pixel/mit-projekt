import { FlowEvent, FlowCompletion } from '../flow-types';
import { CartInstance } from '../flow-types';
import { Vector3, Box3, Object3D } from 'three';
import { ModelManifestService } from '../model-manifest.service';
import { loadModel } from '../loaders-utils';

export interface HandleEventDeps {
  modelService: ModelManifestService;
  cartModelFiles: string[];
  loader: any;
  scene: any;
  logStatus: (msg: string) => void;
  startMove: (cart: CartInstance, start: Vector3, end: Vector3, onComplete: FlowCompletion, durationSeconds?: number) => void;
  findCart: (type: string) => CartInstance | null;
  addCartInstance: (cart: CartInstance) => void;
}

export async function handleEvent(
  deps: HandleEventDeps,
  evt: FlowEvent,
): Promise<void> {
  let cart = deps.findCart(evt.cartType);
  if (!cart) {
    cart = await spawnCart(deps, evt.cartType, evt.startPos, evt.endPos, evt.onComplete, evt.durationSeconds);
  }
  if (!cart) return;
  // ENTER bruges her også til bevægelse, så vi får ghost ind på plads
  deps.startMove(cart, evt.startPos, evt.endPos, evt.onComplete, evt.durationSeconds);
}

async function spawnCart(
  deps: HandleEventDeps,
  type: string,
  start: Vector3,
  end: Vector3,
  onComplete: FlowCompletion,
  durationSeconds?: number,
): Promise<CartInstance | null> {
  const chosen = deps.modelService.pickCartModel(deps.cartModelFiles, type);
  const modelPath = chosen ? deps.modelService.assetPath(chosen) : null;
  if (!modelPath) return null;

  const object = await loadModel(deps.loader, modelPath, (m) => deps.logStatus(m));
  object.position.copy(start);
  object.userData['originalColor'] = captureBaseColor(object);
  deps.scene.add(object);

  const box = new Box3().setFromObject(object);
  const cart: CartInstance = { id: crypto.randomUUID(), type, object, box };
  deps.addCartInstance(cart);
  return cart;
}

function captureBaseColor(obj: Object3D): any {
  let color: any = null;
  obj.traverse((child: Object3D) => {
    const mat = (child as any).material;
    if (mat?.color && !color) color = mat.color.clone();
  });
  return color;
}
