// src/app/geografisk-lokationsdatabase/workbench/geo-workbench.component.ts
import { Component, AfterViewInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import * as L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';

import { Observable, Subscription } from 'rxjs';

import { BuildingService } from '../services/building.service';
import { SectionService } from '../services/section.service';
import { HospitalService } from '../services/hospital.service';
import { BuildingModel } from '../models/building.model';
import { HospitalModel } from '../models/hospital.model';

// Datakilde
import { SteddataService, StedRow } from '../services/steddata.service';

// Modal til detaljer
import { DetailModalComponent } from '../shared/detail-modal/detail-modal.component';

type ActiveForm = 'hospital' | 'building' | 'section' | null;

@Component({
  selector: 'app-geo-workbench',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DetailModalComponent],
  templateUrl: './geo-workbench.component.html',
  styleUrls: ['./geo-workbench.component.css']
})
export class GeoWorkbenchComponent implements AfterViewInit, OnDestroy {
  private fb = inject(FormBuilder);
  private buildingSvc = inject(BuildingService);
  private sectionSvc  = inject(SectionService);
  private hospitalSvc = inject(HospitalService);
  private stedSvc     = inject(SteddataService);

  buildings$: Observable<BuildingModel[]> = this.buildingSvc.list();

  activeForm: ActiveForm = null;
  hint = 'Vælg en handling i værktøjslinjen ovenfor.';

  // unikke opgange fra datakilden (til "Opret bygning")
  uniqueOpgange: string[] = [];

  private map?: L.Map;
  private tempLayer?: L.Layer;
  private hospitalLayer = L.layerGroup();
  private buildingLayer = L.layerGroup();
  private sectionLayer  = L.layerGroup();
  private invalidate = () => this.map?.invalidateSize();

  // subscriptions
  private subs = new Subscription();

  // ---------- Formularer ----------
  hospitalForm = this.fb.group({
    name: ['', Validators.required],
    polygon: this.fb.control<{type:'Polygon'; coordinates:number[][][]} | null>(null, { validators: [Validators.required] })
  });

  buildingForm = this.fb.group({
    opgang: ['', Validators.required],
    name: [''],
    floors: this.fb.control<number | null>(null, { validators: [Validators.required, Validators.min(1)] }),
    polygon: this.fb.control<{type:'Polygon'; coordinates:number[][][]} | null>(null, { validators: [Validators.required] })
  });

  sectionForm = this.fb.group({
    afsnit: ['', Validators.required],
    etage:  this.fb.control<number>(2, { validators: [Validators.required] }),
    buildingId: ['', Validators.required],
    description: [''],
    location: this.fb.control<[number, number] | null>(null, { validators: [Validators.required] })
  });

  etager = [
    { label: 'Kælder', value: 1 },
    { label: 'Stue',   value: 2 },
    { label: '1. sal', value: 3 },
    { label: '2. sal', value: 4 },
    { label: '3. sal', value: 5 }
  ];

  // ---------- Inspektions-state ----------
  selectedOpgang: string | null = null;
  rowsForSelected: StedRow[] = [];
  floorsForSelected: string[] = [];
  currentFloor: string | null = null;

  // Modal
  showModal = false;
  modalTitle = '';
  modalData: Record<string, any> | null = null;

  async ngAfterViewInit(): Promise<void> {
    (L as any).Icon.Default.mergeOptions({
      iconRetinaUrl: 'assets/leaflet/marker-icon-2x.png',
      iconUrl:       'assets/leaflet/marker-icon.png',
      shadowUrl:     'assets/leaflet/marker-shadow.png',
    });

    // opgange til dropdown
    try {
      this.uniqueOpgange = await this.stedSvc.getUniqueOpgange();
    } catch {
      this.uniqueOpgange = [];
    }

    this.map = L.map('geo-map', { center: [55.6761, 12.5683], zoom: 15 });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 20, attribution: '&copy; OpenStreetMap'
    }).addTo(this.map);

    this.hospitalLayer.addTo(this.map);
    this.buildingLayer.addTo(this.map);
    this.sectionLayer.addTo(this.map);

    (this.map as any).pm.addControls({
      position: 'topleft',
      drawPolygon: true,
      drawMarker: true,
      drawPolyline: false,
      drawRectangle: false,
      drawCircle: false,
      drawCircleMarker: false,
      drawText: false,
      cutPolygon: false,
      editMode: true,
      removalMode: true
    });

    this.map.on('pm:create', (e: any) => {
      if (this.tempLayer) this.map!.removeLayer(this.tempLayer);
      this.tempLayer = e.layer as L.Layer;

      if (e.shape === 'Polygon') {
        const poly = this.tempLayer as L.Polygon;
        const ring = (poly.getLatLngs()[0] as L.LatLng[])
          .map(p => [p.lng, p.lat]) as [number, number][];
        // luk polygon hvis ikke allerede lukket
        if (ring.length && (ring[0][0] !== ring.at(-1)![0] || ring[0][1] !== ring.at(-1)![1])) ring.push(ring[0]);

        if (this.activeForm === 'hospital') {
          this.hospitalForm.patchValue({ polygon: { type: 'Polygon', coordinates: [ring] } as any });
          this.hint = 'Hospitalspolygon registreret.';
        } else if (this.activeForm === 'building') {
          this.buildingForm.patchValue({ polygon: { type: 'Polygon', coordinates: [ring] } as any });
          this.hint = 'Bygningspolygon registreret.';
        }
      }

      if (e.shape === 'Marker' && this.activeForm === 'section') {
        const p = (this.tempLayer as L.Marker).getLatLng();
        this.sectionForm.patchValue({ location: [p.lng, p.lat] });
        this.hint = 'Afsnitsmarkør registreret.';
      }
    });

    // 1) Hent data ved opstart (vigtigt efter refresh)
    this.subs.add(this.hospitalSvc.syncFromSheets().subscribe());
    this.subs.add(this.buildingSvc.syncFromSheets().subscribe());



    // 2) Abonner og (re)tegn hospitals- og bygningslag naar listerne aendrer sig
    this.subs.add(
      this.hospitalSvc.list().subscribe((items: HospitalModel[]) => {
        this.hospitalLayer.clearLayers();

        for (const h of items) {
          const rings = h?.polygon?.coordinates ?? [];
          if (!Array.isArray(rings) || !rings.length) continue;

          const outer = rings[0] as [number, number][];
          const latlngs = outer.map(([lng, lat]) => L.latLng(lat, lng));
          L.polygon(latlngs, { color: '#7c3aed', fillOpacity: 0.15 }).addTo(this.hospitalLayer);
        }
      })
    );
    this.subs.add(
      this.buildingSvc.list().subscribe((items: BuildingModel[]) => {
        this.buildingLayer.clearLayers();

        for (const b of items) {
          const rings = b?.polygon?.coordinates ?? [];
          if (!Array.isArray(rings) || !rings.length) continue;

          const outer = rings[0] as [number, number][];
          const latlngs = outer.map(([lng, lat]) => L.latLng(lat, lng));
          const layer = L.polygon(latlngs, { color: '#2563eb', fillOpacity: 0.35 }).addTo(this.buildingLayer);
          (layer as any).__opgang = b.name;
          layer.on('click', () => this.openBuildingInspector((layer as any).__opgang));
        }
      })
    );

    setTimeout(this.invalidate, 0);
    window.addEventListener('resize', this.invalidate);
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.invalidate);
    this.map?.remove();
    this.subs.unsubscribe();
  }

  openForm(kind: ActiveForm) {
    this.activeForm = kind;
    if (kind) this.clearInspector();

    this.hint =
      kind === 'hospital' ? 'Tegn en polygon for hospitalet på kortet.'
      : kind === 'building' ? 'Vælg opgang, angiv etager og tegn bygningspolygon.'
      : kind === 'section' ? 'Vælg bygning/etage og placer en markør for afsnittet på kortet.'
      : 'Vælg en handling i værktøjslinjen ovenfor.';
    if (this.tempLayer && this.map?.hasLayer(this.tempLayer)) {
      this.map.removeLayer(this.tempLayer);
      this.tempLayer = undefined;
    }
  }

  startPolygon() { (this.map as any)?.pm.enableDraw('Polygon'); }
  startMarker()  { (this.map as any)?.pm.enableDraw('Marker');  }

  // ---------- Gem hospital ----------
  saveHospital() {
    if (this.hospitalForm.invalid) { alert('Udfyld navn og tegn en hospitalspolygon.'); return; }
    const v = this.hospitalForm.value;
    this.hospitalSvc.create({ name: v.name!, polygon: v.polygon as any }).subscribe(() => {
      // tegning håndteres af subscription ovenfor
      this.hospitalForm.reset();
      this.openForm(null);
      alert('Hospital gemt');
    });
  }

  // ---------- Gem bygning ----------
  saveBuilding() {
    if (this.buildingForm.invalid) { alert('Vælg opgang, angiv etager og tegn en bygningspolygon.'); return; }
    const v = this.buildingForm.value;

    const chosenOpgang = String(v.opgang);

    this.buildingSvc.create({
      name: chosenOpgang,
      polygon: v.polygon as any,
      floors: v.floors ?? undefined
    } as any).subscribe(async (created: any) => {
      try {
        const rows = await this.stedSvc.getByOpgang(chosenOpgang);
        if (rows.length && (this.sectionSvc as any).bulkCreateFromStedRows) {
          await (this.sectionSvc as any).bulkCreateFromStedRows(created.id, rows).toPromise?.();
        }
      } catch {}

      this.buildingForm.reset();
      this.openForm(null);
      alert('Bygning gemt');
    });
  }

  // ---------- Gem afsnit (manuelt) ----------
  saveSection() {
    if (this.sectionForm.invalid) { alert('Udfyld afsnit, vælg bygning/etage og placer en markør.'); return; }
    const v = this.sectionForm.value;
    this.sectionSvc.create({
      afsnit: v.afsnit!, etage: v.etage!, buildingId: v.buildingId!,
      description: v.description ?? '', location: v.location as [number, number]
    } as any).subscribe(() => {
      const [lng, lat] = v.location as [number, number];
      L.marker([lat, lng]).addTo(this.sectionLayer);
      this.sectionForm.reset({ etage: 2, buildingId: '' });
      this.openForm(null);
      alert('Afsnit gemt');
    });
  }

  // ---------- Inspektions-logik ----------
  private async openBuildingInspector(opgang: string) {
    this.activeForm = null;
    this.selectedOpgang = opgang || null;
    this.hint = this.selectedOpgang ? `Bygning/opgang: ${this.selectedOpgang}` : 'Vælg en bygning.';

    try {
      this.rowsForSelected = this.selectedOpgang
        ? await this.stedSvc.getByOpgang(this.selectedOpgang)
        : [];
    } catch {
      this.rowsForSelected = [];
    }

    const set = new Set(this.rowsForSelected.map(r => r.Etage).filter(Boolean));
    this.floorsForSelected = Array.from(set).sort(this.sortEtage);
    this.currentFloor = this.floorsForSelected[0] ?? null;
  }

  selectFloor(f: string) {
    this.currentFloor = f;
  }

  get rowsOnCurrentFloor(): StedRow[] {
    if (!this.currentFloor) return [];
    return this.rowsForSelected.filter(r => (r.Etage || '') === this.currentFloor);
  }

  openRowDetails(r: StedRow) {
    this.modalTitle = `${r.Afsnitsnr || ''} ${r.AfsnitsnavnRumnavn || ''}`.trim() || 'Detaljer';
    this.modalData = {
      Sted: r.Sted,
      Afsnitsnr: r.Afsnitsnr,
      'Afsnitsnavn/rumnavn': r.AfsnitsnavnRumnavn,
      Opgang: r.Opgang,
      Etage: r.Etage,
      Afsnit: r.Afsnit,
      Oprettet: r.Oprettet
    };
    this.showModal = true;
  }

  closeModal() { this.showModal = false; this.modalData = null; }

  clearInspector() {
    this.selectedOpgang = null;
    this.rowsForSelected = [];
    this.floorsForSelected = [];
    this.currentFloor = null;
  }

  // naturlig sortering af etage-tekster
  private sortEtage = (a: string, b: string) => {
    const order = (t: string) => {
      const s = (t || '').toLowerCase().trim();
      if (s === 'kælder') return 0;
      if (s === 'stue') return 1;
      const m = s.match(/^(\d+)\.\s*sal$/);
      if (m) return 1 + Number(m[1]);
      if (s === 'underkælder') return -1;
      return 999;
    };
    return order(a) - order(b);
  };
}

