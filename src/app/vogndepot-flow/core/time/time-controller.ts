export class TimeController {
  currentMinutes = 0;
  lastMinutes = 0;
  isPlaying = false;

  private minutesPerSecond: number;

  constructor(minutesPerSecond: number) {
    this.minutesPerSecond = minutesPerSecond;
  }

  setSpeed(minutesPerSecond: number): void {
    this.minutesPerSecond = Math.max(0, minutesPerSecond);
  }

  getSpeed(): number {
    return this.minutesPerSecond;
  }

  tick(deltaMs: number): { crossedMidnight: boolean } {
    this.lastMinutes = this.currentMinutes;
    const deltaMinutes = (deltaMs / 1000) * this.minutesPerSecond;
    this.currentMinutes = (this.currentMinutes + deltaMinutes) % 1440;
    const crossedMidnight = this.currentMinutes < this.lastMinutes;
    return { crossedMidnight };
  }

  formatMinutes(minutes: number): string {
    const h = Math.floor(minutes / 60) % 24;
    const m = Math.floor(minutes % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  toMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }
}
