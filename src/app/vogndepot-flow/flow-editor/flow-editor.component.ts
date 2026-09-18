import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FlowEvent, FlowCompletion, FlowAction } from '../core/flow-types';
import { Vector3 } from 'three';

type InputAction = FlowAction;
type InputCompletion = FlowCompletion;

@Component({
  selector: 'app-flow-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './flow-editor.component.html',
  styleUrls: ['./flow-editor.component.css'],
})
export class FlowEditorComponent {
  @Input() cartTypes: string[] = [];
  @Input() selectedCartLabel = '';
  @Output() addEvent = new EventEmitter<FlowEvent>();
  @Output() captureStart = new EventEmitter<void>();
  @Output() captureEnd = new EventEmitter<void>();

  private readonly defaultSpawn = { x: -6, y: 0, z: -6 };

  model = {
    time: '08:00',
    cartType: '',
    action: 'ENTER' as InputAction,
    onComplete: 'STAY' as InputCompletion,
    startX: -6,
    startY: 0,
    startZ: -6,
    endX: -6,
    endY: 0,
    endZ: -6,
  };

  actions: InputAction[] = ['ENTER', 'MOVE', 'EXIT'];
  completions: InputCompletion[] = ['STAY', 'DESTROY'];

  submit(): void {
    if (!this.model.cartType || !this.model.time) return;
    const evt: FlowEvent = {
      time: this.model.time,
      cartType: this.model.cartType,
      action: this.model.action,
      onComplete: this.model.onComplete,
      startPos: new Vector3(this.model.startX, this.model.startY, this.model.startZ),
      endPos: new Vector3(this.model.endX, this.model.endY, this.model.endZ),
    };
    this.addEvent.emit(evt);
  }

  setStartFromVector(v: Vector3): void {
    this.model.startX = Number(v.x.toFixed(2));
    this.model.startY = Number(v.y.toFixed(2));
    this.model.startZ = Number(v.z.toFixed(2));
  }

  setEndFromVector(v: Vector3): void {
    this.model.endX = Number(v.x.toFixed(2));
    this.model.endY = Number(v.y.toFixed(2));
    this.model.endZ = Number(v.z.toFixed(2));
  }

  onCartTypeChange(): void {
    // Når en vogn vælges, flyt standard start/slut til et fast punkt i gridet.
    this.model.startX = this.defaultSpawn.x;
    this.model.startY = this.defaultSpawn.y;
    this.model.startZ = this.defaultSpawn.z;
    this.model.endX = this.defaultSpawn.x;
    this.model.endY = this.defaultSpawn.y;
    this.model.endZ = this.defaultSpawn.z;
  }
}
