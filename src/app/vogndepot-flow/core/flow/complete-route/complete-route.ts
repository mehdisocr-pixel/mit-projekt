import { FlowCompletion, FlowEvent, CartInstance } from '../../flow-types';
import { TimeController } from '../../time/time-controller';
import { Vector3 } from 'three';

export interface CompleteRouteDeps {
  routeStartPos: Vector3 | null;
  routeEndPos: Vector3 | null;
  routeCart: CartInstance | null;
  routeStartTime: string | null;
  moveSeconds: number;
  timeController: TimeController;
  addFlowEvent: (evt: FlowEvent) => void;
  logStatus: (msg: string) => void;
  cancelRouteCreation: () => void;
}

export function completeRoute(deps: CompleteRouteDeps, completion: FlowCompletion): void {
  const { routeStartPos, routeEndPos, routeCart } = deps;
  if (!routeStartPos || !routeEndPos || !routeCart) return;

  const newEvent: FlowEvent = {
    time: deps.routeStartTime ?? deps.timeController.formatMinutes(deps.timeController.currentMinutes),
    cartType: routeCart.type,
    action: 'MOVE',
    startPos: routeStartPos.clone(),
    endPos: routeEndPos.clone(),
    onComplete: completion,
    durationSeconds: deps.moveSeconds,
  };

  deps.addFlowEvent(newEvent);
  deps.logStatus(`Ny rute tilføjet for ${newEvent.cartType}.`);
  deps.cancelRouteCreation();
}
