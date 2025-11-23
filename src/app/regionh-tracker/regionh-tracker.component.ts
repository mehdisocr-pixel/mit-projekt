import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, map } from 'rxjs';
import {
  RegionhDeviceState,
  RegionhTrackerService,
} from './regionh-tracker.service';
import { DropdownRegionhTrackerComponent } from '../dropdown-regionh-tracker/dropdown-regionh-tracker.component';
import { ApResolverService, ResolvedLocation } from './ap-resolver.service';

type RegionhDeviceWithResolved = RegionhDeviceState & { resolved: ResolvedLocation | null };

@Component({
  selector: 'app-regionh-tracker',
  standalone: true,
  imports: [CommonModule, DropdownRegionhTrackerComponent],
  templateUrl: './regionh-tracker.component.html',
  styleUrls: ['./regionh-tracker.component.css'],
})
export class RegionhTrackerComponent {
  readonly devices$: Observable<RegionhDeviceWithResolved[]>;

  constructor(
    private regionhTrackerService: RegionhTrackerService,
    private apResolver: ApResolverService,
  ) {
    this.devices$ = this.regionhTrackerService.getDevices().pipe(
      map(devices =>
        devices.map(device => ({
          ...device,
          resolved: this.apResolver.resolveBssid((device as any).bssid ?? (device as any).macAddress),
        })),
      ),
    );
  }

  formatOnline(value: boolean | null): string {
    if (value === true) return 'Online';
    if (value === false) return 'Offline';
    return 'Ukendt';
  }

  formatLastSeen(value: Date | null): string {
    if (!value) return 'Ikke angivet';
    return value.toLocaleString('da-DK', {
      timeZone: 'Europe/Copenhagen',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  }

  formatIp(value: string): string {
    return value?.trim() || 'Ikke angivet';
  }
}
