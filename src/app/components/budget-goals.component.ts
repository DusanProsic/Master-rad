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
  

  newGoal: NewGoal = { name: '', target: 0, currency: 'RSD' };
  editingId: string | null = null;
  trackById = (_: number, g: Goal) => g.id;

  constructor(private goalService: GoalService, private firestore: Firestore) {
    this.goals$ = this.goalService.getGoals();
    const entriesRef = collection(this.firestore, 'entries');
    this.entries$ = collectionData(entriesRef, { idField: 'id' });
    
  }

  ngOnInit(): void {
    this.goalsWithProgress$ = combineLatest([this.goals$, this.entries$]).pipe(
      map(([goals, entries]) => {
      const items = goals.map(goal => {
        const goalEntries = entries.filter(e => e.goalId === goal.id);
        const totalForGoal = goalEntries.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
        const percentRaw = goal.target > 0 ? (totalForGoal / goal.target) * 100 : 0;
        const percent = Math.min(Math.max(percentRaw, 0), 100);
        const remaining = Math.max(goal.target - totalForGoal, 0);
        return { ...goal, totalForGoal, percent, remaining };
      });

      return items.sort((a, b) => {
        const aDone = a.percent >= 100 ? 1 : 0;
        const bDone = b.percent >= 100 ? 1 : 0;
        if (aDone !== bDone) return aDone - bDone;      // not done first
        return b.percent - a.percent;                   // higher % first
      });
    })
  );
}

  async addGoal() {
    if (this.newGoal.name && this.newGoal.target > 0) {
      await this.goalService.addGoal(this.newGoal);
      this.newGoal = { name: '', target: 0, currency: 'RSD' };
    }
  }

  editGoal(goal: Goal) {
    if (this.displayOnly) return;
    this.editingId = goal.id;
    this.newGoal = { name: goal.name, target: goal.target, currency: goal.currency };
  }

  async updateGoal() {
    if (!this.editingId) return;
    await this.goalService.updateGoal(this.editingId, this.newGoal);
    this.editingId = null;
    this.newGoal = { name: '', target: 0, currency: 'RSD' };
  }

  async deleteGoal(id: string) {
    if (this.displayOnly) return;
    await this.goalService.deleteGoal(id);
  }

  cancelEdit() {
    if (this.displayOnly) return;
    this.editingId = null;
    this.newGoal = { name: '', target: 0, currency: 'RSD' };
  }
}
