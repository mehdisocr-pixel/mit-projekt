import { Box3, Scene, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { CartInstance } from '../flow-types';
import { ModelManifestService } from '../model-manifest.service';
import { loadModel } from '../loaders-utils';
import { applyHighlight } from '../selection-utils';

export interface StartRouteDeps {
  selectedCartType: string;
  modelService: ModelManifestService;
  cartModelFiles: string[];
  loader: GLTFLoader;
  scene: Scene;
  selectedIds: Set<string>;
  updateSelectionVisuals: () => void;
  logStatus: (msg: string) => void;
  initialPosition: Vector3;
}

export interface StartRouteResult {
  isCreatingRoute: boolean;
  routeCreationCart: CartInstance | null;
}

export async function startRouteCreation(deps: StartRouteDeps): Promise<StartRouteResult | null> {
  if (!deps.selectedCartType) {
    deps.logStatus('Vælg venligst en vogn-type først.');
    return null;
  }

  const modelFile = deps.modelService.pickCartModel(deps.cartModelFiles, deps.selectedCartType);
  if (!modelFile) return null;
  const modelPath = deps.modelService.assetPath(modelFile);

  deps.logStatus('Start rute: Klik i depotet for at sætte startpunkt.');
  deps.selectedIds.clear();
  deps.updateSelectionVisuals();

  const object = await loadModel(deps.loader, modelPath, (m) => deps.logStatus(m));
  object.position.copy(deps.initialPosition);
  applyHighlight(object, true); // Fremhæv med en anden farve
  deps.scene.add(object);
  const box = new Box3().setFromObject(object);
  const routeCreationCart: CartInstance = {
    id: 'route-creation-cart',
    type: deps.selectedCartType,
    object,
    box,
  };

  return {
    isCreatingRoute: true,
    routeCreationCart,
  };
}
