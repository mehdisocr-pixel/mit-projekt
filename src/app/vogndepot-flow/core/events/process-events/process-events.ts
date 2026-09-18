import { FlowEvent } from '../../flow-types';
import { TimeController } from '../../time/time-controller';

export interface ProcessEventsDeps {
  flowEvents: FlowEvent[];
  firedEvents: Set<string>;
  timeController: TimeController;
  handleEvent: (evt: FlowEvent) => void;
  eventKey: (evt: FlowEvent) => string;
}

export interface ProcessEventsResult {
  firedEvents: Set<string>;
  timeLabel: string;
}

export function processEvents(deps: ProcessEventsDeps): ProcessEventsResult {
  const { timeController, flowEvents, eventKey, handleEvent } = deps;
  const fired = new Set(deps.firedEvents);
  const windowStart = timeController.lastMinutes;
  const windowEnd = timeController.currentMinutes;
  const crossedMidnight = windowEnd < windowStart;

  for (const evt of flowEvents) {
    const key = eventKey(evt);
    if (fired.has(key)) continue;
    const minute = timeController.toMinutes(evt.time);

    const isDue =
      (!crossedMidnight && minute >= windowStart && minute <= windowEnd) ||
      (crossedMidnight && (minute >= windowStart || minute <= windowEnd));

    if (isDue) {
      handleEvent(evt);
      fired.add(key);
    }
  }

  return {
    firedEvents: fired,
    timeLabel: timeController.formatMinutes(timeController.currentMinutes),
  };
}
