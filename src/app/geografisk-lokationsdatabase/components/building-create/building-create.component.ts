import { Component, AfterViewInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import * as L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';
import { Router } from '@angular/router';
import { BuildingService } from '../../services/building.service';

// Fælles toolbar
import { GeoActionsComponent } from '../../shared/geo-actions/geo-actions.component';

@Component({
  selector: 'app-building-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, GeoActionsComponent],
  templateUrl: './building-create.component.html',
  styleUrl: './building-create.component.css'
})
export class BuildingCreateComponent implements AfterViewInit, OnDestroy {
  private fb = inject(FormBuilder);
  private svc = inject(BuildingService);
  protected router = inject(Router);

  form = this.fb.group({
    name: [''],
    polygon: this.fb.control<{ type: 'Polygon'; coordinates: number[][][] } | null>(null)
  });

  private map?: L.Map;
  private drawn?: L.Polygon;
  private defaultLonLat: [number, number] = [12.5683, 55.6761];

  ngAfterViewInit(): void {
    (L as any).Icon.Default.mergeOptions({
      iconRetinaUrl: 'assets/leaflet/marker-icon-2x.png',
      iconUrl: 'assets/leaflet/marker-icon.png',
      shadowUrl: 'assets/leaflet/marker-shadow.png'
    });

    this.map = L.map('map-building', {
      center: [this.defaultLonLat[1], this.defaultLonLat[0]],
      zoom: 16
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 20,
      attribution: '&copy; OpenStreetMap'
    }).addTo(this.map);

    (this.map as any).pm.addControls({
      position: 'topleft',
      drawPolygon: true, editMode: true, removalMode: true,
      drawMarker: false, drawCircleMarker: false, drawPolyline: false,
      drawRectangle: false, drawCircle: false, drawText: false, cutPolygon: false
    });

    this.map.on('pm:create', (e: any) => {
      if (e.shape !== 'Polygon') return;
      if (this.drawn) this.map!.removeLayer(this.drawn);
      this.drawn = e.layer as L.Polygon;
      this.updateFormFromPolygon();
    });
    this.map.on('pm:edit',   () => this.updateFormFromPolygon());
    this.map.on('pm:remove', () => { this.drawn = undefined; this.form.patchValue({ polygon: null }); });

    setTimeout(() => this.map?.invalidateSize(), 0);
    window.addEventListener('resize', this.invalidate);
  }

  private invalidate = () => this.map?.invalidateSize();

  private updateFormFromPolygon() {
    if (!this.drawn) return;
    const ring = (this.drawn.getLatLngs()[0] as L.LatLng[])
      .map(p => [p.lng, p.lat]) as [number, number][];
    if (ring.length && (ring[0][0] !== ring.at(-1)![0] || ring[0][1] !== ring.at(-1)![1])) {
      ring.push(ring[0]);
    }
    this.form.patchValue({ polygon: { type: 'Polygon', coordinates: [ring] } as any });
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.invalidate);
    this.map?.remove();
  }

  submit() {
    if (!this.form.value.polygon) {
      alert('Tegn polygon for bygningen (påkrævet).');
      return;
    }
    this.svc.create({
      name: this.form.value.name ?? '',
      polygon: this.form.value.polygon as any
    }).subscribe(() => {
      alert('Bygning gemt');
      this.router.navigate(['/geografisk-lokationsdatabase/section/create']);
    });
  }
}
