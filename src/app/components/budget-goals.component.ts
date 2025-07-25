import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Firestore, collection, addDoc, collectionData, deleteDoc, doc, updateDoc } from '@angular/fire/firestore';
import { Observable, combineLatest, map } from 'rxjs';

@Component({
  selector: 'app-budget-goals',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './budget-goals.component.html',
  styleUrls: ['./budget-goals.component.css']
})
export class BudgetGoalsComponent implements OnInit {
  goals$: Observable<any[]>;
  entries$: Observable<any[]>;
  newGoal = { name: '', target: 0 };
  editingId: string | null = null;

  constructor(private firestore: Firestore) {
    const entriesRef = collection(this.firestore, 'entries');
this.entries$ = collectionData(entriesRef, { idField: 'id' });
    const goalsRef = collection(this.firestore, 'budgetGoals');
    this.goals$ = collectionData(goalsRef, { idField: 'id' });
  }
goalsWithProgress$!: Observable<any[]>;

  ngOnInit(): void {
  this.goalsWithProgress$ = combineLatest([this.goals$, this.entries$]).pipe(
    map(([goals, entries]) => {
      return goals.map(goal => {
        const goalEntries = entries.filter(e => e.goalId === goal.id);
        const spent = goalEntries.reduce((sum, e) => sum + e.amount, 0);
        const percent = Math.min((spent / goal.target) * 100, 100);
        const remaining = goal.target - spent;

        return {
          ...goal,
          spent,
          percent,
          remaining
        };
      });
    })
  );
}

  async addGoal() {
    const goalsRef = collection(this.firestore, 'budgetGoals');
    if (this.newGoal.name && this.newGoal.target > 0) {
      await addDoc(goalsRef, this.newGoal);
      this.newGoal = { name: '', target: 0 };
    }
  }

  editGoal(goal: any) {
    this.editingId = goal.id;
    this.newGoal = { name: goal.name, target: goal.target };
  }

  async updateGoal() {
    if (!this.editingId) return;
    const docRef = doc(this.firestore, `budgetGoals/${this.editingId}`);
    await updateDoc(docRef, this.newGoal);
    this.editingId = null;
    this.newGoal = { name: '', target: 0 };
  }

  async deleteGoal(id: string) {
    const docRef = doc(this.firestore, `budgetGoals/${id}`);
    await deleteDoc(docRef);
  }

  cancelEdit() {
    this.editingId = null;
    this.newGoal = { name: '', target: 0 };
  }
}
