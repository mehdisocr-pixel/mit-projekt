import { Box3, Group, Object3D, Vector3 } from 'three';
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ModelManifestService } from './model-manifest.service';
import { focusCameraOn, updateFloorGrid, createFallbackRoom } from './scene-utils';

export interface LoaderState {
  modelService: ModelManifestService;
  roomModelFile: string | null;
  cartModelFiles: string[];
  loader: GLTFLoader;
  scene: any;
  roomBounds: Box3 | null;
  logStatus: (msg: string) => void;
  focus: (box: Box3) => void;
  onBounds: (box: Box3) => void;
}

export async function loadModelManifest(state: LoaderState): Promise<void> {
  const manifest = await state.modelService.load();
  state.roomModelFile = manifest.roomModel;
  state.cartModelFiles = manifest.cartModels;
  state.logStatus(
    `Manifest: ${manifest.all.length} filer, rum: ${state.roomModelFile ?? 'ikke fundet'}, vogne: ${state.cartModelFiles.length}`,
  );
}

export function loadModel(loader: GLTFLoader, path: string, logStatus: (m: string) => void): Promise<Group> {
  return new Promise((resolve, reject) => {
    loader.load(
      path,
      (gltf: GLTF) => resolve(gltf.scene.clone(true)),
      undefined,
      (err: unknown) => { logStatus(`Load-fejl: ${path}`); reject(err); },
    );
  });
}

export async function loadRoom(state: LoaderState): Promise<void> {
  const roomPath = state.roomModelFile ? state.modelService.assetPath(state.roomModelFile) : null;
  if (!roomPath) { state.logStatus('Ingen rum-model fundet (vogndepot*.glb).'); return; }
  try {
    let room = await loadModel(state.loader, roomPath, state.logStatus);
    room.position.set(0, 0, 0);
    room.traverse((obj: Object3D) => {
      obj.castShadow = true;
      obj.receiveShadow = true;
    });
    const box = new Box3().setFromObject(room);
    const center = box.getCenter(new Vector3());
    const minY = box.min.y;
    room.position.sub(center);
    room.position.y -= minY;
    state.scene.add(room);
    state.roomBounds = new Box3().setFromObject(room);
    state.onBounds(state.roomBounds);
    state.focus(state.roomBounds);
    state.logStatus('Rum indlæst.');
  } catch {
    state.logStatus('Rum kunne ikke indlæses. Viser fallback-kasse.');
    const room = createFallbackRoom();
    state.scene.add(room);
    state.roomBounds = new Box3().setFromObject(room);
    state.onBounds(state.roomBounds);
    state.focus(state.roomBounds);
  }
}
