import { NgZone } from '@angular/core';
import { TimeController } from '../../time/time-controller';

export interface OnViewerReadyDeps {
  zone: NgZone;
  timeController: TimeController;
  loadModelManifest: () => Promise<void>;
  loadRoom: () => Promise<void>;
  selectDefaultCart: () => void;
  setTimeLabel: (label: string) => void;
  animate: () => void;
}

export function handleViewerReady(deps: OnViewerReadyDeps): void {
  deps.zone.runOutsideAngular(async () => {
    deps.timeController.currentMinutes = 240; // 04:00 start
    deps.setTimeLabel(deps.timeController.formatMinutes(deps.timeController.currentMinutes));

    await deps.loadModelManifest();
    deps.selectDefaultCart();
    await deps.loadRoom();
    deps.animate();
  });
}
