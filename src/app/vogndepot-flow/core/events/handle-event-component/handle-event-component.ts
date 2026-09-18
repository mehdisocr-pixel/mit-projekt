import { FlowEvent } from '../../flow-types';
import { handleEvent as handleEventHelper } from '../handle-event';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Scene } from 'three';
import { ModelManifestService } from '../../model-manifest.service';
import { CartInstance, FlowCompletion } from '../../flow-types';
import { Vector3 } from 'three';

export interface HandleEventComponentDeps {
  modelService: ModelManifestService;
  cartModelFiles: string[];
  loader: GLTFLoader;
  scene: Scene;
  logStatus: (msg: string) => void;
  startMove: (cart: CartInstance, start: Vector3, end: Vector3, onComplete: FlowCompletion, durationSeconds?: number) => void;
  findCart: (type: string) => CartInstance | null;
  addCartInstance: (cart: CartInstance) => void;
}

export function handleComponentEvent(deps: HandleEventComponentDeps, evt: FlowEvent): void {
  handleEventHelper(
    {
      modelService: deps.modelService,
      cartModelFiles: deps.cartModelFiles,
      loader: deps.loader,
      scene: deps.scene,
      logStatus: deps.logStatus,
      startMove: (cart, start, end, onComplete, durationSeconds) =>
        deps.startMove(cart, start, end, onComplete, durationSeconds),
      findCart: (type) => deps.findCart(type),
      addCartInstance: (cart) => deps.addCartInstance(cart),
    },
    evt,
  );
}
