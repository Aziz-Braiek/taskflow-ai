import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, ChangeDetectorRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SubTask } from '../../models/subtask.model';

@Component({
  selector: 'app-subtask-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './subtask-list.component.html',
  styleUrl: './subtask-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SubtaskListComponent {
  @Input() subtasks: SubTask[] = [];
  @Input() canEdit: boolean = true;
  @Output() subtasksChange = new EventEmitter<SubTask[]>();
  @Output() addSubtask = new EventEmitter<string>();
  @Output() toggleSubtask = new EventEmitter<number>();
  @Output() deleteSubtask = new EventEmitter<number>();

  newSubtaskTitle = signal<string>('');
  showAddForm = signal<boolean>(false);

  onAddSubtask(): void {
    const title = this.newSubtaskTitle().trim();
    if (title) {
      this.addSubtask.emit(title);
      this.newSubtaskTitle.set('');
      this.showAddForm.set(false);
    }
  }

  onToggleSubtask(id: number): void {
    this.toggleSubtask.emit(id);
  }

  onDeleteSubtask(id: number): void {
    this.deleteSubtask.emit(id);
  }

  getCompletionPercentage(): number {
    if (this.subtasks.length === 0) return 0;
    const completed = this.getCompletedCount();
    return (completed / this.subtasks.length) * 100;
  }

  getCompletedCount(): number {
    return this.subtasks.filter(st => st.completed).length;
  }
}

