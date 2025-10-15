import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { BuildingService } from '../../services/building.service';
import { SectionService } from '../../services/section.service';
import { EtageKode } from '../../models/section.model';
import { Observable } from 'rxjs';
import { BuildingModel } from '../../models/building.model';

// Fælles toolbar
import { GeoActionsComponent } from '../../shared/geo-actions/geo-actions.component';

@Component({
  selector: 'app-section-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, GeoActionsComponent],
  templateUrl: './section-create.component.html',
  styleUrl: './section-create.component.css'
})
export class SectionCreateComponent {
  private fb = inject(FormBuilder);
  protected router = inject(Router);
  private buildingSvc = inject(BuildingService);
  private sectionSvc = inject(SectionService);

  buildings$: Observable<BuildingModel[]> = this.buildingSvc.list();

  etager: { label: string; value: EtageKode }[] = [
    { label: 'Kælder', value: 1 },
    { label: 'Stue', value: 2 },
    { label: '1. sal', value: 3 },
    { label: '2. sal', value: 4 },
    { label: '3. sal', value: 5 },
  ];

  form = this.fb.group({
    afsnit: ['', Validators.required],
    etage: <EtageKode>2,
    buildingId: ['', Validators.required],
    description: [''],
  });

  submit() {
    if (this.form.invalid) {
      alert('Udfyld Afsnit og vælg Bygning.');
      return;
    }
    this.sectionSvc.create({
      afsnit: this.form.value.afsnit!,
      etage: this.form.value.etage!,
      buildingId: this.form.value.buildingId!,
      description: this.form.value.description ?? '',
    }).subscribe(() => {
      alert('Afsnit gemt');
      this.router.navigate(['/geografisk-lokationsdatabase/building/create']);
    });
  }
}
