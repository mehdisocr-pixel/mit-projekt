import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, combineLatest, interval, map, startWith } from 'rxjs';
import { DropdownPrototypetrackerComponent } from '../dropdown-prototypetracker/dropdown-prototypetracker.component';
import { PrototypetrackerService, PrototypetrackerScan } from './prototypetracker.service';
import { ApResolverService } from '../regionh-tracker/ap-resolver.service';

interface PrototypeViewModel {
  name: string;
  statusLabel: string;
  statusClass: 'online' | 'offline';
  locationName: string;
  lastSeenText: string;
  signalText: string;
  hasData: boolean;
}

@Component({
  selector: 'app-prototypetracker',
  standalone: true,
  imports: [CommonModule, DropdownPrototypetrackerComponent],
  templateUrl: './prototypetracker.component.html',
  styleUrls: ['./prototypetracker.component.css'],
})
export class PrototypetrackerComponent {
  readonly vm$: Observable<PrototypeViewModel>;

  constructor(
    private prototypetrackerService: PrototypetrackerService,
    private apResolver: ApResolverService,
  ) {
    this.vm$ = combineLatest([
      this.prototypetrackerService.loadLatestScan(),
      interval(1000).pipe(startWith(0)),
    ]).pipe(
      map(([scan]) => this.toViewModel(scan)),
    );
  }

  private toViewModel(scan: PrototypetrackerScan | null): PrototypeViewModel {
    const name = 'Prototype 1';
    const now = Date.now();
    const timestamp = scan?.timestamp?.getTime() ?? null;
    const ageMs = timestamp ? now - timestamp : null;
    const online = ageMs !== null && ageMs < 10_000;

    const best = scan?.bestEntry;
    const resolved = this.apResolver.resolveBssid(best?.bssid);
    const locationName = resolved?.location?.trim()
      ? resolved.location
      : 'Sporet uden registrering';

    const lastSeenText = timestamp
      ? `Sidst set for ${Math.floor(ageMs! / 1000)} sek. siden`
      : 'Ingen scanninger modtaget endnu';

    const signalText = typeof best?.rssi === 'number'
      ? `Signalstyrke: ${best.rssi} dBm`
      : 'Signalstyrke: ukendt';

    return {
      name,
      statusLabel: online ? 'ONLINE' : 'OFFLINE',
      statusClass: online ? 'online' : 'offline',
      locationName,
      lastSeenText,
      signalText,
      hasData: !!scan,
    };
  }
}
