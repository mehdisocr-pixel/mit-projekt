import { Component, AfterViewInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import * as L from 'leaflet';
import '@geoman-io/leaflet-geoman-free'; // side-effect import af Geoman
import { Router } from '@angular/router';
import { LocationService } from '../../services/location.service';
import { LocationModel } from '../../models/location.model';

type EtageKode = 1 | 2 | 3 | 4 | 5; // 1=Kælder, 2=Stue, 3=1.sal, ...

@Component({
  selector: 'app-location-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './location-create.component.html',
  styleUrl: './location-create.component.css'
})
export class LocationCreateComponent implements AfterViewInit, OnDestroy {
  private fb = inject(FormBuilder);
  private svc = inject(LocationService);
  private router = inject(Router);

  // Start i København (lon, lat)
  private defaultLonLat: [number, number] = [12.5683, 55.6761];

  // Formular: Afsnit (påkrævet), Etage (default 2 = Stue), Navn/Beskrivelse valgfrie
  form = this.fb.group({
    name: [''],
    description: [''],
    afsnit: ['', Validators.required],
    etage: <EtageKode>2,
    geometry: this.fb.nonNullable.control<{ type: 'Polygon'; coordinates: number[][][] } | null>(null)
  });

  etageOptions: { label: string; value: EtageKode }[] = [
    { label: 'Kælder', value: 1 },
    { label: 'Stue', value: 2 },
    { label: '1. sal', value: 3 },
    { label: '2. sal', value: 4 },
    { label: '3. sal', value: 5 }
  ];

  // Leaflet refs
  private map?: L.Map;
  private drawnLayer?: L.Polygon;

  ngAfterViewInit(): void {
    // Sikr korrekte ikon-stier (hvis du kopierer Leaflet images til /assets/leaflet)
    (L as any).Icon.Default.mergeOptions({
      iconRetinaUrl: 'assets/leaflet/marker-icon-2x.png',
      iconUrl: 'assets/leaflet/marker-icon.png',
      shadowUrl: 'assets/leaflet/marker-shadow.png'
    });

    // Opret fuldskærmskort
    this.map = L.map('map', { center: [this.defaultLonLat[1], this.defaultLonLat[0]], zoom: 15 });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 20
    }).addTo(this.map);

    // Geoman UI: kun Polygon + Edit/Delete
    (this.map as any).pm.addControls({
      position: 'topleft',
      drawMarker: false,
      drawCircleMarker: false,
      drawPolyline: false,
      drawRectangle: false,
      drawCircle: false,
      cutPolygon: false,
      drawText: false,
      drawPolygon: true,
      editMode: true,
      removalMode: true
    });

    // Når der tegnes en polygon, gemmes den og konverteres til GeoJSON (lon/lat)
    this.map.on('pm:create', (e: any) => {
      if (e.shape !== 'Polygon') return;
      if (this.drawnLayer) this.map!.removeLayer(this.drawnLayer);
      this.drawnLayer = e.layer as L.Polygon;

      const ring = (this.drawnLayer.getLatLngs()[0] as L.LatLng[])
        .map(p => [p.lng, p.lat]) as [number, number][];
      // Luk polygon, hvis ikke allerede lukket
      if (ring.length && (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1])) {
        ring.push(ring[0]);
      }
      this.form.patchValue({ geometry: { type: 'Polygon', coordinates: [ring] } as any });
    });

    // Når polygon redigeres eller slettes
    this.map.on('pm:remove', () => {
      this.drawnLayer = undefined;
      this.form.patchValue({ geometry: null });
    });
    this.map.on('pm:edit', () => {
      if (!this.drawnLayer) return;
      const ring = (this.drawnLayer.getLatLngs()[0] as L.LatLng[])
        .map(p => [p.lng, p.lat]) as [number, number][];
      if (ring.length && (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1])) {
        ring.push(ring[0]);
      }
      this.form.patchValue({ geometry: { type: 'Polygon', coordinates: [ring] } as any });
    });

    // Responsiv: invalider kortets størrelse, når vindue ændres
    setTimeout(() => this.map?.invalidateSize(), 0);
    window.addEventListener('resize', this.invalidate);
  }

  private invalidate = () => this.map?.invalidateSize();

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.invalidate);
    this.map?.remove();
  }

  submit() {
    // Valider krav: afsnit + polygon
    if (!this.form.value.afsnit) {
      alert('Afsnit er påkrævet.');
      return;
    }
    if (!this.form.value.geometry) {
      alert('Tegn en polygon for bygningen (påkrævet).');
      return;
    }

    const payload: LocationModel = {
      name: this.form.value.name ?? '',
      description: this.form.value.description ?? '',
      category: `Afsnit: ${this.form.value.afsnit}; Etage: ${this.etageOptions.find(x => x.value === this.form.value.etage)?.label ?? ''}`,
      geometry: this.form.value.geometry as any
    };

    this.svc.create(payload).subscribe(() => {
      alert('Bygning (polygon) gemt!');
      this.router.navigate(['/geografisk-lokationsdatabase']);
    });
  }
}
