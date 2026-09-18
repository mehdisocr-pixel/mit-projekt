import {
  AmbientLight,
  Box3,
  BoxGeometry,
  BoxHelper,
  Color,
  DirectionalLight,
  GridHelper,
  Group,
  Mesh,
  MeshLambertMaterial,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export interface SceneState {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
  controls: OrbitControls;
  floorGrid?: GridHelper;
  floorY: number;
}

export function setupScene(
  canvas: HTMLCanvasElement,
  state: SceneState,
  onResize: () => void,
): void {
  state.scene = new Scene();
  state.scene.background = new Color('#0e1116');

  state.camera = new PerspectiveCamera(60, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
  state.camera.position.set(8, 8, 12);
  state.camera.lookAt(0, 0, 0);

  state.renderer = new WebGLRenderer({ canvas, antialias: true });
  state.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  state.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const ambient = new AmbientLight(0xffffff, 0.6);
  const directional = new DirectionalLight(0xffffff, 0.8);
  directional.position.set(5, 10, 7.5);
  state.scene.add(ambient, directional);

  state.controls = new OrbitControls(state.camera, state.renderer.domElement);
  state.controls.enableDamping = true;
  state.controls.target.set(0, 0, 0);

  window.addEventListener('resize', onResize);
}

export function handleResize(canvas: HTMLCanvasElement, state: SceneState): void {
  state.camera.aspect = canvas.clientWidth / canvas.clientHeight;
  state.camera.updateProjectionMatrix();
  state.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
}

export function focusCameraOn(state: SceneState, box: Box3): void {
  const size = box.getSize(new Vector3());
  const center = box.getCenter(new Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const dist = maxDim * 1.5;
  state.camera.position.set(center.x + dist, center.y + dist, center.z + dist);
  state.camera.lookAt(center);
}

export function createFallbackRoom(): Group {
  const geom = new BoxGeometry(12, 2, 12);
  const mat = new MeshLambertMaterial({ color: 0x1f2937, wireframe: true });
  const mesh = new Mesh(geom, mat);
  return new Group().add(mesh);
}

export function updateFloorGrid(state: SceneState, bounds: Box3): void {
  const size = bounds.getSize(new Vector3());
  const maxDim = Math.max(size.x, size.z);
  const gridSize = Math.max(4, Math.ceil(maxDim + 2));
  const divisions = Math.max(4, Math.ceil(gridSize * 2));
  if (state.floorGrid) {
    state.scene.remove(state.floorGrid);
  }
  state.floorGrid = new GridHelper(gridSize, divisions, 0x334155, 0x1f2937);
  const center = bounds.getCenter(new Vector3());
  state.floorY = bounds.min.y;
  state.floorGrid.position.set(center.x, state.floorY + 0.001, center.z);
  state.scene.add(state.floorGrid);
}
