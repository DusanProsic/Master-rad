import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Firestore, collection, addDoc, deleteDoc, doc, updateDoc, collectionData, serverTimestamp } from '@angular/fire/firestore';
import { Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { GoalService, Goal } from '../components/goal-service.component';
import { FinanceChartComponent } from '../components/finance-chart.component';
import { ThemeService } from '../services/theme.service';

@Component({
  standalone: true,
  selector: 'app-finance',
  templateUrl: './finance.page.html',
  styleUrls: ['./finance.page.css'],
  imports: [CommonModule, ReactiveFormsModule, FormsModule, FinanceChartComponent],
})
export class FinancePage implements OnInit {
  @ViewChild('financeFormRef') financeFormRef!: ElementRef;
  entries$: Observable<any[]>;
  goals$: Observable<Goal[]>;
  latestGoals: Goal[] = [];
  goalProgressMap: { [goalId: string]: number } = {};

  selectedGoalName: string = '';
  selectedGoalTarget: number = 0;
  selectedGoalRemaining: number = 0;
  selectedGoalProgress: number = 0;

  financeForm: FormGroup;
  filterType$ = new BehaviorSubject<string>('all');
  dateFilter$ = new BehaviorSubject<string>('all');
  goalFilter$ = new BehaviorSubject<string>('all');

  filteredEntries$!: Observable<any[]>;
  totals$!: Observable<{ income: number; expense: number; savings: number }>;
  editingId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private firestore: Firestore,
    private goalService: GoalService,
    public themeService: ThemeService // public so we can access it in template
  ) {
    const entriesRef = collection(this.firestore, 'entries');
    this.entries$ = collectionData(entriesRef, { idField: 'id' });

    this.goals$ = this.goalService.getGoals();
    this.goals$.subscribe(goals => (this.latestGoals = goals));

    this.financeForm = this.fb.group({
      description: ['', Validators.required],
      amount: [null, [Validators.required, Validators.min(0.01)]],
      type: ['expense', Validators.required],
      goalId: ['']
    });
  }

  ngOnInit() {
    this.setupFilteredEntries();

    this.financeForm.get('goalId')?.valueChanges.subscribe(goalId => {
      this.selectedGoalName = this.getGoalName(goalId);
      this.updateGoalProgressPreview();
    });

    this.financeForm.get('type')?.valueChanges.subscribe(type => {
  if (type !== 'income') {
    this.financeForm.patchValue({ goalId: '' });
  }
});

    this.financeForm.valueChanges.subscribe(() => this.updateGoalProgressPreview());

    // Precompute goal totals
    combineLatest([this.goals$, this.entries$]).subscribe(([goals, entries]) => {
      this.goalProgressMap = {};
      for (const goal of goals) {
        const goalEntries = entries.filter(e => e.goalId === goal.id);
        const totalForGoal = goalEntries.reduce((sum, e) =>
          sum + (e.type === 'income' ? e.amount : -e.amount), 0
        );
        this.goalProgressMap[goal.id] = Math.min((totalForGoal / goal.target) * 100, 100);
      }
    });

    // Filtered totals
    this.totals$ = this.filteredEntries$.pipe(
      map(entries => {
        const income = entries.filter(e => e.type === 'income').reduce((sum, e) => sum + e.amount, 0);
        const expense = entries.filter(e => e.type === 'expense').reduce((sum, e) => sum + e.amount, 0);
        return { income, expense, savings: income - expense };
      })
    );
  }

  setupFilteredEntries() {
    this.filteredEntries$ = combineLatest([
      this.entries$,
      this.filterType$,
      this.dateFilter$,
      this.goalFilter$
    ]).pipe(
      map(([entries, typeFilter, dateFilter, goalFilter]) => {
        let filtered = entries;

        if (typeFilter !== 'all') {
          filtered = filtered.filter(e => e.type === typeFilter);
        }

        if (dateFilter !== 'all') {
          filtered = filtered.filter(e => {
            const date = new Date(e.timestamp?.seconds * 1000);
            const formatted = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            return formatted === dateFilter;
          });
        }

        if (goalFilter !== 'all') {
          filtered = filtered.filter(e => e.goalId === goalFilter);
        }

        return filtered;
      })
    );
  }

  onDateChange(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.dateFilter$.next(value || 'all');
  }

  onGoalFilterChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    this.goalFilter$.next(value || 'all');
  }

  onFilterChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.filterType$.next(select.value);
  }

 editEntry(entry: any) {
  this.editingId = entry.id;
  this.financeForm.setValue({
    description: entry.description,
    amount: entry.amount,
    type: entry.type,
    goalId: entry.goalId || ''
  });
  this.updateGoalProgressPreview();

  // Scroll to the form
  setTimeout(() => {
    this.financeFormRef?.nativeElement.scrollIntoView({ behavior: 'smooth' });
  }, 100);
}


  cancelEdit() {
    this.editingId = null;
    this.financeForm.reset({ type: 'expense', goalId: '' });
    this.updateGoalProgressPreview();
  }

  async onSubmit() {
    if (this.financeForm.valid) {
      const formData = this.financeForm.value;
      const entriesRef = collection(this.firestore, 'entries');

      const entryData = {
        ...formData,
        goalId: formData.goalId || null,
        timestamp: serverTimestamp()
      };

      if (this.editingId) {
        const docRef = doc(this.firestore, `entries/${this.editingId}`);
        await updateDoc(docRef, entryData);
        this.editingId = null;
      } else {
        await addDoc(entriesRef, entryData);
      }

      this.financeForm.reset({ type: 'expense', goalId: '' });
      this.updateGoalProgressPreview();
    }
  }

  async deleteEntry(id: string) {
    const docRef = doc(this.firestore, `entries/${id}`);
    await deleteDoc(docRef);
    this.updateGoalProgressPreview();
  }

  getGoalName(goalId: string | null): string {
    if (!goalId) return '';
    const goal = this.latestGoals.find(g => g.id === goalId);
    return goal ? goal.name : '';
  }

 getEntryGoalProgress(entry: any): number {
  if (!entry || !entry.goalId || !entry.amount) return 0;

  const goal = this.latestGoals.find(g => g.id === entry.goalId);
  if (!goal || !goal.target) return 0;

  return Math.min((entry.amount / goal.target) * 100, 100);
}

  getGoalOverallProgress(goalId: string): number {
    return this.goalProgressMap[goalId] || 0;
  }

  updateGoalProgressPreview() {
    const goalId = this.financeForm.get('goalId')?.value;

    if (!goalId) {
      this.selectedGoalProgress = 0;
      this.selectedGoalRemaining = 0;
      this.selectedGoalTarget = 0;
      return;
    }

    const newAmount = this.financeForm.get('amount')?.value || 0;
    const selectedGoal = this.latestGoals.find(g => g.id === goalId);
    this.selectedGoalTarget = selectedGoal?.target || 0;

    this.entries$.subscribe(entries => {
      const goalEntries = entries.filter(e => e.goalId === goalId);
      const totalForGoal = goalEntries.reduce((sum, e) =>
        sum + (e.type === 'income' ? e.amount : -e.amount), 0
      );

      const previewTotal = totalForGoal + (
        this.financeForm.get('amount')?.value
          ? (this.financeForm.get('type')?.value === 'income' ? newAmount : -newAmount)
          : 0
      );

      this.selectedGoalRemaining = Math.max(this.selectedGoalTarget - previewTotal, 0);
      this.selectedGoalProgress = this.selectedGoalTarget > 0
        ? Math.min((previewTotal / this.selectedGoalTarget) * 100, 100)
        : 0;
    }).unsubscribe();
  }

  // Dark mode toggle (using ThemeService)
  toggleDarkMode() {
    this.themeService.toggleDarkMode();
  }
}
