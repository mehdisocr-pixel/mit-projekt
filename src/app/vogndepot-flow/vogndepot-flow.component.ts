import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ChangeDetectorRef,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { DropdownVogndepotFlowComponent } from '../dropdown-vogndepot-flow/dropdown-vogndepot-flow.component';
import {
  Box2,
  Box3,
  BoxGeometry,
  Clock,
  Color,
  Group,
  GridHelper,
  Mesh,
  MeshLambertMaterial,
  Object3D,
  PerspectiveCamera,
  Raycaster,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ActiveMove, CartInstance, FlowCompletion, FlowEvent } from './core/flow-types';
import { applyHighlight, captureBaseColor, selectedCartLabel } from './core/selection-utils';
import { ModelManifestService } from './core/model-manifest.service';
import { TimeController } from './core/time/time-controller';
import { SpeedControlComponent } from './core/time/speed-control/speed-control.component';
import { ViewerSetupComponent, ViewerSetupResult } from './core/scene/viewer-setup.component';
import { updateMoves as updateMovesHelper } from './core/moves/update-moves';
import { getGroundPoint, clampToBounds } from './core/input/ground-point';
import { loadModel, loadRoom as loadRoomHelper } from './core/loaders-utils';
import { handleEvent as handleEventHelper } from './core/events/handle-event';
import { processEvents as processEventsHelper } from './core/events/process-events/process-events';
import { startRouteCreation as startRouteCreationHelper } from './core/routes/start-route-creation';
import { promptTimeAtCursor } from './core/routes/time-modal';
import { selectableCarts, hitTestSelectable, boxSelectIds } from './core/input/selection-manager';
import { handlePointerDown as interactionDown } from './core/viewer-interaction/viewer-interaction';
import { handleRouteStartClick } from './core/routes/route-start/route-start.handler';
import { findCartByType } from './core/carts/cart-finder';
import { handleComponentPointerUp } from './core/input/on-pointer-up-component/on-pointer-up-component';
import { handleComponentPointerMove } from './core/input/on-pointer-move-component/on-pointer-move-component';
import { handleViewerReady } from './core/scene/on-viewer-ready/on-viewer-ready';
import { performClickSelectHelper } from './core/input/perform-click-select/perform-click-select';
import { completeRoute } from './core/flow/complete-route/complete-route';
import { handleComponentEvent } from './core/events/handle-event-component/handle-event-component';
import { removeCartHelper } from './core/flow/remove-cart/remove-cart';

@Component({
  selector: 'app-vogndepot-flow',
  standalone: true,
  imports: [CommonModule, FormsModule, DropdownVogndepotFlowComponent, SpeedControlComponent, ViewerSetupComponent],
  templateUrl: './vogndepot-flow.component.html',
  styleUrls: ['./vogndepot-flow.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VogndepotFlowComponent implements AfterViewInit, OnDestroy {
  @ViewChild('viewer', { static: true }) viewerRef!: ElementRef<HTMLCanvasElement>;
  Math = Math;

  // >> NYT: State til at styre rute-oprettelse
  isCreatingRoute = false;
  isCameraLocked = false;
  private routeCreationCart: CartInstance | null = null;
  private routeStartPos: Vector3 | null = null;
  private routeEndPos: Vector3 | null = null;
  showCompletionModal = false;
  selectedCartTypeForRoute = '';

  timeLabel = '00:00';
  statusMessages: string[] = [];

  private readonly moveDurationMs = 4000;
  private readonly timeController = new TimeController(120);
  private modelService: ModelManifestService;
  private roomModelFile: string | null = null;
  private cartModelFiles: string[] = [];
  cartTypesForUi: string[] = [];

  private renderer!: WebGLRenderer;
  private scene!: Scene;
  private camera!: PerspectiveCamera;
  private controls!: OrbitControls;
  private floorGrid?: GridHelper;
  private clock = new Clock();
  private loader = new GLTFLoader();
  private roomBounds: Box3 | null = null;
  private cartInstances: CartInstance[] = [];
  private activeMoves: ActiveMove[] = [];
  private raycaster = new Raycaster();
  private selectedIds = new Set<string>();
  private draggingCartId: string | null = null;
  private dragOffset: Vector3 | null = null;
  private floorY = 0;
  private lastGroundPoint: Vector3 | null = null;
  private routeStartTime: string | null = null;
  moveSeconds = 10;

  get isPlaying(): boolean { return this.timeController.isPlaying; }
  get currentMinutes(): number { return this.timeController.currentMinutes; }
  set currentMinutes(value: number) { this.timeController.currentMinutes = value; }

  selectionBox: Box2 | null = null;
  selectionStart: Vector2 | null = null;
  selectionEnd: Vector2 | null = null;
  isDragging = false;

  private firedEvents = new Set<string>();
  private animationHandle: number | null = null;

  flowEvents: FlowEvent[] = [];

  constructor(private zone: NgZone, http: HttpClient, private cdr: ChangeDetectorRef) {
    this.modelService = new ModelManifestService(http);
  }

  ngAfterViewInit(): void {}

  ngOnDestroy(): void {
    if (this.animationHandle) cancelAnimationFrame(this.animationHandle);
    this.renderer?.dispose();
  }

  get timerSpeed(): number { return this.timeController.getSpeed(); }

  play(): void { this.timeController.isPlaying = true; }
  pause(): void { this.timeController.isPlaying = false; }

  onSpeedChange(speed: number): void {
    this.timeController.setSpeed(speed);
  }

  seek(): void {
    this.timeLabel = this.timeController.formatMinutes(this.timeController.currentMinutes);
    this.resetDailyState();
  }

  addFlowEvent(evt: FlowEvent): void {
    this.flowEvents = [...this.flowEvents, evt].sort(
      (a, b) => this.timeController.toMinutes(a.time) - this.timeController.toMinutes(b.time),
    );
  }

  toggleCameraLock(): void {
    this.isCameraLocked = !this.isCameraLocked;
    if (this.controls) {
      this.controls.enabled = !this.isCameraLocked;
    }
  }

  onViewerReady(result: ViewerSetupResult): void {
    this.scene = result.scene;
    this.camera = result.camera;
    this.renderer = result.renderer;
    this.controls = result.controls;

    handleViewerReady({
      zone: this.zone,
      timeController: this.timeController,
      loadModelManifest: () => this.loadModelManifest(),
      loadRoom: () => this.loadRoom(),
      selectDefaultCart: () => {
        if (this.cartTypesForUi.length > 0) {
          this.selectedCartTypeForRoute = this.cartTypesForUi[0];
          this.cdr.markForCheck();
        }
      },
      setTimeLabel: (label) => {
        this.timeLabel = label;
        this.cdr.markForCheck();
      },
      animate: () => this.animate(),
    });
  }

  // ---------- NY WORKFLOW: Rute-oprettelse ----------

  startRouteCreation(): void {
    this.isCreatingRoute = true;
    this.routeCreationCart = null;
    this.routeStartPos = null;
    this.routeEndPos = null;
    this.routeStartTime = null;
    this.draggingCartId = null;
    this.logStatus('Start rute: Klik i depotet for at sætte startpunkt.');
    this.selectedIds.clear();
    this.updateSelectionVisuals();
  }

  resumeRouteDrag(): void {
    this.showCompletionModal = false;
    if (this.controls) this.controls.enabled = false;
    // Drag start sker først når brugeren klikker på vognen med venstre museknap.
    this.draggingCartId = null;
  }

  completeRouteCreation(completion: FlowCompletion): void {
    completeRoute(
      {
        routeStartPos: this.routeStartPos,
        routeEndPos: this.routeEndPos,
        routeCart: this.routeCreationCart,
        routeStartTime: this.routeStartTime,
        moveSeconds: this.moveSeconds,
        timeController: this.timeController,
        addFlowEvent: (evt) => this.addFlowEvent(evt),
        logStatus: (msg) => this.logStatus(msg),
        cancelRouteCreation: () => this.cancelRouteCreation(),
      },
      completion,
    );
  }

  cancelRouteCreation(): void {
    if (this.routeCreationCart) {
      this.removeCart(this.routeCreationCart.id);
    }
    this.isCreatingRoute = false;
    this.routeCreationCart = null;
    this.routeStartPos = null;
    this.routeEndPos = null;
    this.showCompletionModal = false;
    this.cdr.markForCheck();
  }

  private async loadModelManifest(): Promise<void> {
    const manifest = await this.modelService.load();
    this.roomModelFile = manifest.roomModel;
    this.cartModelFiles = manifest.cartModels;
    this.cartTypesForUi = manifest.cartModels.map(f => f.replace(/\.glb$/i, ''));
    this.logStatus(`Manifest: ${manifest.all.length} filer, rum: ${this.roomModelFile ?? 'ikke fundet'}, vogne: ${this.cartModelFiles.length}`);
  }

  private async loadRoom(): Promise<void> {
    await loadRoomHelper({
      modelService: this.modelService,
      roomModelFile: this.roomModelFile,
      cartModelFiles: this.cartModelFiles,
      loader: this.loader,
      scene: this.scene,
      roomBounds: this.roomBounds,
      logStatus: (m) => this.logStatus(m),
      focus: (box) => this.focusCameraOn(box),
      onBounds: (box) => { this.roomBounds = box; this.updateFloorGrid(box); },
    });
  }

  // ---------- Flow + animation ----------
  private animate = (): void => {
    this.animationHandle = requestAnimationFrame(this.animate);
    const delta = this.clock.getDelta() * 1000; // ms

    this.controls?.update();

    if (this.timeController.isPlaying) {
      const { crossedMidnight } = this.timeController.tick(delta);
      if (crossedMidnight) this.firedEvents.clear();
      this.processEvents();
      // sikr change detection selvom vi kører outside Angular
      this.zone.run(() => {
        this.timeLabel = this.timeController.formatMinutes(this.timeController.currentMinutes);
        this.cdr.markForCheck();
      });
    }

    this.activeMoves = updateMovesHelper({
      activeMoves: this.activeMoves,
      cartInstances: this.cartInstances,
      isColliding: (cart) => this.isColliding(cart),
      removeCart: (id) => this.removeCart(id),
      ignoreCollisions: true,
    });
    this.renderer.render(this.scene, this.camera);
  };

  private processEvents(): void {
    const result = processEventsHelper({
      flowEvents: this.flowEvents,
      firedEvents: this.firedEvents,
      timeController: this.timeController,
      handleEvent: (evt) => this.handleEvent(evt),
      eventKey: (evt) => this.eventKey(evt),
    });
    this.firedEvents = result.firedEvents;
    this.timeLabel = result.timeLabel;
  }

  private handleEvent(evt: FlowEvent): void {
    handleComponentEvent(
      {
        modelService: this.modelService,
        cartModelFiles: this.cartModelFiles,
        loader: this.loader,
        scene: this.scene,
        logStatus: (m) => this.logStatus(m),
        startMove: (cart, start, end, onComplete, durationSeconds) => this.startMove(cart, start, end, onComplete, durationSeconds),
        findCart: (type) => findCartByType(this.cartInstances, type) ?? null,
        addCartInstance: (cart) => this.cartInstances.push(cart),
      },
      evt,
    );
  }

  private startMove(
    cart: CartInstance,
    start: Vector3,
    end: Vector3,
    onComplete: FlowCompletion,
    durationSeconds?: number,
  ): void {
    cart.object.position.copy(start);
    cart.box.setFromObject(cart.object);
    this.activeMoves.push({
      cartId: cart.id,
      start: start.clone(),
      end: end.clone(),
      startedAt: performance.now(),
      durationMs: durationSeconds ? durationSeconds * 1000 : this.moveDurationMs,
      onComplete,
    });
  }

  private isColliding(cart: CartInstance): boolean {
    if (this.roomBounds && !this.roomBounds.containsBox(cart.box)) return true;

    for (const other of this.cartInstances) {
      if (other.id === cart.id) continue;
      if (cart.box.intersectsBox(other.box)) return true;
    }
    return false;
  }

  private removeCart(id: string): void {
    const result = removeCartHelper({
      id,
      cartInstances: this.cartInstances,
      routeCreationCart: this.routeCreationCart,
      scene: this.scene,
      disposeObject: (obj) => this.disposeObject(obj),
    });
    this.cartInstances = result.cartInstances;
    this.routeCreationCart = result.routeCreationCart;
  }

  private eventKey(evt: FlowEvent): string {
    return `${evt.time}-${evt.cartType}-${evt.action}-${evt.startPos.toArray().join(',')}-${evt.endPos
      .toArray()
      .join(',')}`;
  }

  private resetDailyState(): void {
    this.firedEvents.clear();
    this.timeController.lastMinutes = this.timeController.currentMinutes;
  }

  private logStatus(msg: string) {
    const ts = new Date().toLocaleTimeString('da-DK', { hour12: false });
    this.statusMessages = [`${ts}: ${msg}`, ...this.statusMessages].slice(0, 8);
  }

  // ---------- Selection ----------
  async onPointerDown(event: PointerEvent): Promise<void> {
    // Ignorer klik mens slut-modal er åben, medmindre vi er i MOVE-resume
    if (this.showCompletionModal) {
      return;
    }

    const handled = await handleRouteStartClick(
      {
        isCreatingRoute: this.isCreatingRoute,
        routeStartTime: this.routeStartTime,
        routeCreationCart: this.routeCreationCart,
        rendererElement: this.renderer?.domElement ?? this.viewerRef.nativeElement,
        camera: this.camera,
        raycaster: this.raycaster,
        floorY: this.floorY,
        roomBounds: this.roomBounds,
        controls: this.controls,
        selectedCartTypeForRoute: this.selectedCartTypeForRoute,
        modelService: this.modelService,
        cartModelFiles: this.cartModelFiles,
        loader: this.loader,
        scene: this.scene,
        selectedIds: this.selectedIds,
        updateSelectionVisuals: () => this.updateSelectionVisuals(),
        logStatus: (m) => this.logStatus(m),
        setRouteStartTime: (t) => { this.routeStartTime = t; },
        setRouteStartPos: (v) => { this.routeStartPos = v; },
        setLastGroundPoint: (v) => { this.lastGroundPoint = v; },
        setCreatingRoute: (flag) => { this.isCreatingRoute = flag; },
        setRouteCreationCart: (cart) => { this.routeCreationCart = cart; },
        setDraggingCartId: (id) => { this.draggingCartId = id; },
        promptStartTime: (x, y) => promptTimeAtCursor(x, y, 'Starttid (HH:mm)'),
      },
      event,
    );
    if (handled) return;

    const result = interactionDown(
      {
        element: this.renderer?.domElement ?? this.viewerRef.nativeElement,
        camera: this.camera,
        raycaster: this.raycaster,
        carts: this.cartInstances,
        routeCart: this.routeCreationCart,
        floorY: this.floorY,
        isCreatingRoute: this.isCreatingRoute,
        routeStartPos: this.routeStartPos,
        lastGroundPoint: this.lastGroundPoint,
        selectionStart: this.selectionStart,
        selectionEnd: this.selectionEnd,
        selectionBox: this.selectionBox,
        isDragging: this.isDragging,
        draggingCartId: this.draggingCartId,
        dragOffset: this.dragOffset,
      },
      event,
    );
    this.draggingCartId = result.draggingCartId;
    this.dragOffset = result.dragOffset;
    this.selectionStart = result.selectionStart;
    this.selectionEnd = result.selectionEnd;
    this.selectionBox = result.selectionBox;
    this.isDragging = result.isDragging;
    this.routeStartPos = result.routeStartPos ?? this.routeStartPos;
    if (result.selectedIds) {
      this.selectedIds = result.selectedIds;
      this.updateSelectionVisuals();
    }
    this.routeStartPos = result.routeStartPos ?? this.routeStartPos;
    if (result.routeStartPos) {
      this.lastGroundPoint = result.routeStartPos.clone();
    }
  }

  onPointerMove(event: PointerEvent): void {
    const result = handleComponentPointerMove(
      {
        isCreatingRoute: this.isCreatingRoute,
        rendererElement: this.renderer?.domElement ?? this.viewerRef.nativeElement,
        routeCart: this.routeCreationCart,
        routeStartPos: this.routeStartPos,
        draggingCartId: this.draggingCartId,
        cartInstances: this.cartInstances,
        selectionStart: this.selectionStart,
        selectionEnd: this.selectionEnd,
        selectionBox: this.selectionBox,
        isDragging: this.isDragging,
        camera: this.camera,
        raycaster: this.raycaster,
        floorY: this.floorY,
        dragOffset: this.dragOffset,
        lastGroundPoint: this.lastGroundPoint,
        clamp: (v) => clampToBounds(v, this.roomBounds, this.floorY),
      },
      event,
    );
    this.draggingCartId = result.draggingCartId;
    this.selectionStart = result.selectionStart;
    this.selectionEnd = result.selectionEnd;
    this.selectionBox = result.selectionBox;
    this.isDragging = result.isDragging;
    this.lastGroundPoint = result.lastGroundPoint;
  }

  onPointerUp(event: PointerEvent): void {
    const result = handleComponentPointerUp(
      {
        isCreatingRoute: this.isCreatingRoute,
        rendererElement: this.renderer?.domElement ?? this.viewerRef.nativeElement,
        routeCart: this.routeCreationCart,
        draggingCartId: this.draggingCartId,
        selectionStart: this.selectionStart,
        selectionEnd: this.selectionEnd,
        selectionBox: this.selectionBox,
        isDragging: this.isDragging,
        camera: this.camera,
        raycaster: this.raycaster,
        floorY: this.floorY,
        carts: this.cartInstances,
        lastGroundPoint: this.lastGroundPoint,
        clamp: (v) => clampToBounds(v, this.roomBounds, this.floorY),
      },
      event,
    );
    this.draggingCartId = result.draggingCartId;
    this.dragOffset = result.dragOffset ?? this.dragOffset;
    this.selectionStart = result.selectionStart;
    this.selectionEnd = result.selectionEnd;
    this.selectionBox = result.selectionBox;
    this.isDragging = result.isDragging;
    if (result.selectedIds) {
      this.selectedIds = result.selectedIds;
      this.updateSelectionVisuals();
    }
    this.lastGroundPoint = result.lastGroundPoint ?? this.lastGroundPoint;
    if (result.selectedIds) {
      this.selectedIds = result.selectedIds;
      this.updateSelectionVisuals();
    }
    if (result.showCompletionModal && result.routeEndPos) {
      this.routeEndPos = result.routeEndPos;
      this.showCompletionModal = true;
      this.cdr.markForCheck();
    }
  }

  private performClickSelect(event: PointerEvent): void {
    this.selectedIds = performClickSelectHelper(
      {
        raycaster: this.raycaster,
        camera: this.camera,
        element: this.viewerRef.nativeElement,
        carts: this.cartInstances,
        routeCart: this.routeCreationCart,
      },
      event,
    );
    this.updateSelectionVisuals();
  }

  private performBoxSelect(box: Box2): void {
    const canvas = this.viewerRef.nativeElement;
    const rect = canvas.getBoundingClientRect();

    this.selectedIds = boxSelectIds(this.viewerRef.nativeElement, this.camera, box, this.cartInstances, this.routeCreationCart);
    this.updateSelectionVisuals();
  }

  private updateSelectionVisuals(): void {
    for (const cart of selectableCarts(this.cartInstances, this.routeCreationCart)) {
      const selected = this.selectedIds.has(cart.id);
      applyHighlight(cart.object, selected);
    }
  }

  private captureBaseColor(obj: Group): Color | null {
    let color: Color | null = null;
    obj.traverse((child: Object3D) => {
      const mat = (child as any).material;
      if (mat?.color && !color) color = mat.color.clone();
    });
    return color;
  }

  private disposeObject(object: Object3D): void {
    object.traverse((child) => {
      if (child instanceof Mesh) {
        if (child.geometry) {
          child.geometry.dispose();
        }
        if (child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach((m: any) => m.dispose());
        }
      }
    });
  }

  private createFallbackRoom(): Group {
    const geom = new BoxGeometry(12, 2, 12);
    const mat = new MeshLambertMaterial({ color: 0x1f2937, wireframe: true });
    const mesh = new Mesh(geom, mat);
    return new Group().add(mesh);
  }

  private hitTestCart(event: PointerEvent): CartInstance | null {
    return hitTestSelectable(
      this.raycaster,
      this.camera,
      this.viewerRef.nativeElement,
      this.cartInstances,
      this.routeCreationCart,
      event,
    );
  }

  private updateFloorGrid(bounds: Box3): void {
    const size = bounds.getSize(new Vector3());
    const maxDim = Math.max(size.x, size.z);
    const gridSize = Math.max(4, Math.ceil(maxDim + 2));
    const divisions = Math.max(4, Math.ceil(gridSize * 2));
    if (this.floorGrid) {
      this.scene.remove(this.floorGrid);
    }
    const center = bounds.getCenter(new Vector3());
    this.floorY = bounds.min.y;
    this.floorGrid = new GridHelper(gridSize, divisions, 0x334155, 0x1f2937);
    this.floorGrid.position.set(center.x, this.floorY + 0.001, center.z);
    this.scene.add(this.floorGrid);
  }

  private focusCameraOn(box: Box3): void {
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const dist = maxDim * 1.5;
    this.camera.position.set(center.x + dist, center.y + dist, center.z + dist);
    this.camera.lookAt(center);
  }

  private getGroundPoint(event: PointerEvent): Vector3 | null {
    return getGroundPoint(this.camera, this.raycaster, this.viewerRef.nativeElement, this.floorY, event);
  }
}
