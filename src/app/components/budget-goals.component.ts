import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, combineLatest, map } from 'rxjs';
import { GoalService, Goal, NewGoal } from './goal-service.component';
import { Firestore, collection, collectionData } from '@angular/fire/firestore';

@Component({
  selector: 'app-budget-goals',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './budget-goals.component.html',
  styleUrls: ['./budget-goals.component.css']
})
export class BudgetGoalsComponent implements OnInit {
  @Input() displayOnly = false;

  goals$: Observable<Goal[]>;
  entries$: Observable<any[]>;
  goalsWithProgress$!: Observable<any[]>;

  newGoal: NewGoal = { name: '', target: 0 };
  editingId: string | null = null;

  constructor(private goalService: GoalService, private firestore: Firestore) {
    this.goals$ = this.goalService.getGoals();
    const entriesRef = collection(this.firestore, 'entries');
    this.entries$ = collectionData(entriesRef, { idField: 'id' });
  }

  ngOnInit(): void {
    this.goalsWithProgress$ = combineLatest([this.goals$, this.entries$]).pipe(
      map(([goals, entries]) => {
        return goals.map(goal => {
          const goalEntries = entries.filter(e => e.goalId === goal.id);
          const totalForGoal = goalEntries.reduce((sum, e) => sum + e.amount, 0);
          const percent = goal.target > 0 ? Math.min((totalForGoal / goal.target) * 100, 100) : 0;
          const remaining = Math.max(goal.target - totalForGoal, 0);
          return { ...goal, totalForGoal, percent, remaining };
        });
      })
    );
  }

  async addGoal() {
    if (this.newGoal.name && this.newGoal.target > 0) {
      await this.goalService.addGoal(this.newGoal);
      this.newGoal = { name: '', target: 0 };
    }
  }

  editGoal(goal: Goal) {
    if (this.displayOnly) return;
    this.editingId = goal.id;
    this.newGoal = { name: goal.name, target: goal.target };
  }

  async updateGoal() {
    if (!this.editingId) return;
    await this.goalService.updateGoal(this.editingId, this.newGoal);
    this.editingId = null;
    this.newGoal = { name: '', target: 0 };
  }

  async deleteGoal(id: string) {
    if (this.displayOnly) return;
    await this.goalService.deleteGoal(id);
  }

  cancelEdit() {
    if (this.displayOnly) return;
    this.editingId = null;
    this.newGoal = { name: '', target: 0 };
  }
}
