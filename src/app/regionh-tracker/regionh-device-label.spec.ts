import { regionhTrackerDisplayNames } from './regionh-device-label';

describe('regionhTrackerDisplayNames', () => {
  function labels(devices: { id: string; name?: string }[]): Record<string, string> {
    return Object.fromEntries(regionhTrackerDisplayNames(devices));
  }

  it('names the live ESP32-S3 boards and leaves m5demo', () => {
    expect(labels([
      { id: 'esp32s3zero', name: 'ESP32-S3 Zero' },
      { id: 'esp32s3zero2', name: 'ESP32-S3 Zero2' },
      { id: 'esp32s3zero3', name: 'ESP32-S3 Zero3' },
      { id: 'esp32s3zero4', name: 'ESP32-S3 Zero4' },
      { id: 'm5demo' },
    ])).toEqual({
      esp32s3zero: 'S3 tracker 1',
      esp32s3zero2: 'S3 tracker 2',
      esp32s3zero3: 'S3 tracker 3',
      esp32s3zero4: 'S3 tracker 4',
      m5demo: 'm5demo',
    });
  });

  it('keeps the suffix numbers when the unsuffixed board is not first', () => {
    expect(labels([
      { id: 'esp32s3zero4', name: 'ESP32-S3 Zero4' },
      { id: 'esp32s3zero', name: 'ESP32-S3 Zero' },
      { id: 'other', name: 'Lager' },
    ])).toEqual({
      esp32s3zero4: 'S3 tracker 4',
      esp32s3zero: 'S3 tracker 1',
      other: 'Lager',
    });
  });

  it('continues after the highest Zero suffix for other ESP32-S3 devices', () => {
    expect(labels([
      { id: 'esp32s3zero', name: 'ESP32-S3 Zero' },
      { id: 'esp32s3zero2', name: 'ESP32-S3 Zero2' },
      { id: 'esp32s3zero3', name: 'ESP32-S3 Zero3' },
      { id: 'esp32s3zero4', name: 'ESP32-S3 Zero4' },
      { id: 'mini', name: 'ESP32-S3 Mini' },
      { id: 'mega', name: 'ESP32-S3 Mega' },
      // No stored name: the document id esp32s3zero5 is tracker 5.
      { id: 'esp32s3zero5' },
    ])).toEqual({
      esp32s3zero: 'S3 tracker 1',
      esp32s3zero2: 'S3 tracker 2',
      esp32s3zero3: 'S3 tracker 3',
      esp32s3zero4: 'S3 tracker 4',
      mini: 'S3 tracker 6',
      mega: 'S3 tracker 7',
      esp32s3zero5: 'S3 tracker 5',
    });
  });

  it('uses the next free number when two boards claim the same suffix', () => {
    expect(labels([
      { id: 'a', name: 'ESP32-S3 Zero2' },
      { id: 'b', name: 'ESP32-S3 Zero2' },
    ])).toEqual({
      a: 'S3 tracker 2',
      b: 'S3 tracker 3',
    });
  });

  it('falls back to the document id when name is blank', () => {
    expect(labels([
      { id: 'esp32s3zero2', name: '   ' },
      { id: 'm5demo', name: '' },
    ])).toEqual({
      esp32s3zero2: 'S3 tracker 2',
      m5demo: 'm5demo',
    });
  });
});
