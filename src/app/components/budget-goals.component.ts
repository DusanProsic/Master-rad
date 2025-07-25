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
  goalsWithProgress$!: Observable<any[]>;

  newGoal = { name: '', target: 0 };
  editingId: string | null = null;

  constructor(private firestore: Firestore) {
    // Firestore collections
    const entriesRef = collection(this.firestore, 'entries');
    this.entries$ = collectionData(entriesRef, { idField: 'id' });

    const goalsRef = collection(this.firestore, 'budgetGoals');
    this.goals$ = collectionData(goalsRef, { idField: 'id' });
  }

  ngOnInit(): void {
    this.goalsWithProgress$ = combineLatest([this.goals$, this.entries$]).pipe(
      map(([goals, entries]) => {
        // Calculate total savings (income - expense)
        const totalIncome = entries
          .filter(e => e.type === 'income')
          .reduce((sum, e) => sum + e.amount, 0);

        const totalExpense = entries
          .filter(e => e.type === 'expense')
          .reduce((sum, e) => sum + e.amount, 0);

        const currentSavings = totalIncome - totalExpense;

        // Map each goal with its progress
        return goals.map(goal => {
          const percent = Math.min((currentSavings / goal.target) * 100, 100);
          const remaining = goal.target - currentSavings;

          return {
            ...goal,
            currentSavings,
            percent,
            remaining
          };
        });
      })
    );
  }

  // Add new goal
  async addGoal() {
    const goalsRef = collection(this.firestore, 'budgetGoals');
    if (this.newGoal.name && this.newGoal.target > 0) {
      await addDoc(goalsRef, this.newGoal);
      this.newGoal = { name: '', target: 0 };
    }
  }

  // Edit existing goal
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
