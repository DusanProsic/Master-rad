import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Firestore, collection, addDoc, deleteDoc, doc, updateDoc, collectionData } from '@angular/fire/firestore';
import { Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { GoalService, Goal } from '../components/goal-service.component';
import { FinanceChartComponent } from '../components/finance-chart.component';

@Component({
  standalone: true,
  selector: 'app-finance',
  templateUrl: './finance.page.html',
  styleUrls: ['./finance.page.css'],
  imports: [CommonModule, ReactiveFormsModule, FormsModule, FinanceChartComponent],
})
export class FinancePage implements OnInit {
  entries$: Observable<any[]>;
  goals$: Observable<Goal[]>;
  latestGoals: Goal[] = [];                // <-- Cached goals array
  selectedGoalName: string = '';
  selectedGoalProgress: number = 0;
selectedGoalTarget: number = 0;
selectedGoalRemaining: number = 0;

  financeForm: FormGroup;
  filterType$ = new BehaviorSubject<string>('all');
  monthFilter$ = new BehaviorSubject<string>('all');
  availableMonths: string[] = [];

  filteredEntries$!: Observable<any[]>;
  totals$!: Observable<{ income: number; expense: number; savings: number }>;
  editingId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private firestore: Firestore,
    private goalService: GoalService
  ) {
    // Load entries
    const entriesRef = collection(this.firestore, 'entries');
    this.entries$ = collectionData(entriesRef, { idField: 'id' });

    // Load goals
    this.goals$ = this.goalService.getGoals();

    // Initialize form
    this.financeForm = this.fb.group({
      description: ['', Validators.required],
      amount: [null, [Validators.required, Validators.min(0.01)]],
      type: ['expense', Validators.required],
      goalId: ['']
    });
  }

  ngOnInit() {
    this.setupFilteredEntries();

    // Cache goals for lookups
    this.goals$.subscribe((goals: Goal[]) => {
      this.latestGoals = goals;
    });

   // Track selected goal name and progress
this.financeForm.get('goalId')?.valueChanges.subscribe(goalId => {
  if (!goalId) {
    this.selectedGoalName = '';
    this.selectedGoalTarget = 0;
    this.selectedGoalRemaining = 0;
    this.selectedGoalProgress = 0;
    return;
  }

  const selectedGoal = this.latestGoals.find(g => g.id === goalId);
  this.selectedGoalName = selectedGoal ? selectedGoal.name : '';
  this.selectedGoalTarget = selectedGoal?.target || 0;

  // Calculate savings from all entries
  this.entries$.subscribe(entries => {
    const income = entries
      .filter(e => e.type === 'income')
      .reduce((sum, e) => sum + e.amount, 0);
    const expense = entries
      .filter(e => e.type === 'expense')
      .reduce((sum, e) => sum + e.amount, 0);
    const savings = income - expense;

    this.selectedGoalRemaining = Math.max(this.selectedGoalTarget - savings, 0);
    this.selectedGoalProgress = this.selectedGoalTarget > 0
      ? Math.min((savings / this.selectedGoalTarget) * 100, 100)
      : 0;
  }).unsubscribe();
});

    // Totals
    this.totals$ = this.filteredEntries$.pipe(
      map(entries => {
        const income = entries
          .filter(e => e.type === 'income')
          .reduce((sum, e) => sum + e.amount, 0);
        const expense = entries
          .filter(e => e.type === 'expense')
          .reduce((sum, e) => sum + e.amount, 0);
        return { income, expense, savings: income - expense };
      })
    );
  }

  // Helper: Get goal name from cached goals
  getGoalName(goalId: string | null): string {
    if (!goalId) return '';
    const goal = this.latestGoals.find(g => g.id === goalId);
    return goal ? goal.name : '';
  }

  setupFilteredEntries() {
    this.filteredEntries$ = combineLatest([
      this.entries$,
      this.filterType$,
      this.monthFilter$
    ]).pipe(
      map(([entries, typeFilter, monthFilter]) => {
        let filtered = entries;
        if (typeFilter !== 'all') {
          filtered = filtered.filter(e => e.type === typeFilter);
        }
        if (monthFilter !== 'all') {
          filtered = filtered.filter(e => {
            const date = new Date(e.timestamp?.seconds * 1000);
            const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            return month === monthFilter;
          });
        }
        return filtered;
      })
    );
  }

  onMonthChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    this.monthFilter$.next(value);
  }

  onFilterChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.setFilter(select.value);
  }

  setFilter(value: string) {
    this.filterType$.next(value);
  }

  editEntry(entry: any) {
    this.editingId = entry.id;
    this.financeForm.setValue({
      description: entry.description,
      amount: entry.amount,
      type: entry.type,
      goalId: entry.goalId || ''
    });
  }

  cancelEdit() {
    this.editingId = null;
    this.financeForm.reset({ type: 'expense', goalId: '' });
  }

  onSubmit() {
    if (this.financeForm.valid) {
      const formData = this.financeForm.value;
      const entriesRef = collection(this.firestore, 'entries');

      const entryData = {
        ...formData,
        goalId: formData.goalId || null,
        timestamp: new Date()
      };

      if (this.editingId) {
        const docRef = doc(this.firestore, `entries/${this.editingId}`);
        updateDoc(docRef, entryData).then(() => {
          this.financeForm.reset({ type: 'expense', goalId: '' });
          this.editingId = null;
        });
      } else {
        addDoc(entriesRef, entryData).then(() => {
          this.financeForm.reset({ type: 'expense', goalId: '' });
        });
      }
    } else {
      console.warn('Form is invalid');
    }
  }

  deleteEntry(id: string) {
    const docRef = doc(this.firestore, `entries/${id}`);
    deleteDoc(docRef).catch(err => console.error('Delete error:', err));
  }
}
