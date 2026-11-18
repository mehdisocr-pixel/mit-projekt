// Firestore gemmer hardwarenavne som "ESP32-S3 Zero2".
// Region H-tracker viser dem som "S3 tracker 2". Andre enheder, fx m5demo, beholdes.

export interface RegionhNamedDevice {
  id: string;
  name?: string;
}

const PRETTY_ZERO_NAME = /^ESP32-S3\s+Zero\s*(\d*)$/i;
const COMPACT_ZERO_ID = /^esp32-?s3-?zero(\d*)$/i;

function regionhDeviceSourceLabel(device: RegionhNamedDevice): string {
  const name = device.name?.trim();
  return name || device.id;
}

function trackerIndexFromStoredLabel(label: string): number | null {
  const match = label.match(PRETTY_ZERO_NAME) ?? label.match(COMPACT_ZERO_ID);
  if (!match) return null;
  const index = match[1] === '' ? 1 : Number(match[1]);
  if (!Number.isInteger(index) || index < 1) return null;
  return index;
}

function isEsp32S3Device(label: string): boolean {
  return /esp32-?s3/i.test(label);
}

/**
 * Visible card title for each device.
 * "ESP32-S3 Zero" is S3 tracker 1, and "ESP32-S3 ZeroN" is S3 tracker N.
 * Further ESP32-S3 devices continue after the highest of those numbers.
 */
export function regionhTrackerDisplayNames(
  devices: readonly RegionhNamedDevice[],
): Map<string, string> {
  const labels = new Map<string, string>();
  const taken = new Set<number>();
  const pending: RegionhNamedDevice[] = [];
  let maxIndex = 0;

  for (const device of devices) {
    if (labels.has(device.id)) continue;

    const label = regionhDeviceSourceLabel(device);
    const index = trackerIndexFromStoredLabel(label);
    if (index != null && !taken.has(index)) {
      labels.set(device.id, `S3 tracker ${index}`);
      taken.add(index);
      if (index > maxIndex) maxIndex = index;
      continue;
    }

    if (index != null || isEsp32S3Device(label)) {
      pending.push(device);
      continue;
    }

    labels.set(device.id, label);
  }

  let next = maxIndex + 1;
  for (const device of pending) {
    if (labels.has(device.id)) continue;
    labels.set(device.id, `S3 tracker ${next}`);
    next += 1;
  }

  return labels;
}
