import { Component, ElementRef, EventEmitter, OnDestroy, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AmbientLight, Color, DirectionalLight, PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export interface ViewerSetupResult {
  scene: Scene;
  camera: PerspectiveCamera;
  renderer: WebGLRenderer;
  controls: OrbitControls;
}

@Component({
  selector: 'app-viewer-setup',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './viewer-setup.component.html',
  styleUrls: ['./viewer-setup.component.css'],
})
export class ViewerSetupComponent implements OnDestroy {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @Output() ready = new EventEmitter<ViewerSetupResult>();
  private controls?: OrbitControls;

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;
    const scene = new Scene();
    scene.background = new Color('#0e1116');

    const camera = new PerspectiveCamera(60, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
    camera.position.set(8, 8, 12);
    camera.lookAt(0, 0, 0);

    const renderer = new WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const ambient = new AmbientLight(0xffffff, 0.6);
    const directional = new DirectionalLight(0xffffff, 0.8);
    directional.position.set(5, 10, 7.5);
    scene.add(ambient, directional);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 0, 0);
    this.controls = controls;

    window.addEventListener('resize', this.handleResize(scene, camera, renderer));
    this.ready.emit({ scene, camera, renderer, controls });
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.handleResize(null, null, null));
    this.controls?.dispose();
  }

  private handleResize(scene: Scene | null, camera: PerspectiveCamera | null, renderer: WebGLRenderer | null) {
    return () => {
      if (!scene || !camera || !renderer || !this.canvasRef) return;
      const canvas = this.canvasRef.nativeElement;
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    };
  }
}
