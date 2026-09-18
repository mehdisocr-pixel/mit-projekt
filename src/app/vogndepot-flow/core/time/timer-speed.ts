import { TimeController } from './time-controller';

export function setTimerSpeed(controller: TimeController, minutesPerSecond: number): void {
  controller.setSpeed(minutesPerSecond);
}

export function getTimerSpeed(controller: TimeController): number {
  return controller.getSpeed();
}
