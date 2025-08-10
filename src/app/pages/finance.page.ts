import { Component, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Firestore, collection, addDoc, deleteDoc, doc, updateDoc, collectionData, serverTimestamp } from '@angular/fire/firestore';
import { Observable, BehaviorSubject, combineLatest, Subject } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
import { GoalService, Goal } from '../components/goal-service.component';
import { FinanceChartComponent } from '../components/finance-chart.component';
import { ThemeService } from '../services/theme.service';

type Entry = {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  goalId?: string | null;
  timestamp?: any;
};

@Component({
  standalone: true,
  selector: 'app-finance',
  templateUrl: './finance.page.html',
  styleUrls: ['./finance.page.css'],
  imports: [CommonModule, ReactiveFormsModule, FormsModule, FinanceChartComponent],
})
export class FinancePage implements OnInit, OnDestroy {
  @ViewChild('financeFormRef') financeFormRef!: ElementRef;
  private destroy$ = new Subject<void>();

  entries$: Observable<Entry[]>;
  private entriesSnapshot: Entry[] = [];

  goals$: Observable<Goal[]>;
  latestGoals: Goal[] = [];
  goalProgressMap: { [goalId: string]: number } = {};

  selectedGoalName = '';
  selectedGoalTarget = 0;
  selectedGoalRemaining = 0;
  selectedGoalProgress = 0;

  financeForm: FormGroup;

  filterType$ = new BehaviorSubject<'all'|'income'|'expense'>('all');
  dateFilter$  = new BehaviorSubject<string | 'all'>('all');   // YYYY-MM-DD or 'all'
  goalFilter$  = new BehaviorSubject<string | 'all'>('all');

  filteredEntries$!: Observable<Entry[]>;
  filteredTotals$!: Observable<{ income: number; expense: number; savings: number }>;
  totals$!: Observable<{ income: number; expense: number; savings: number }>;
  editingId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private firestore: Firestore,
    private goalService: GoalService,
    public themeService: ThemeService
  ) {
    const entriesRef = collection(this.firestore, 'entries');
    this.entries$ = collectionData(entriesRef, { idField: 'id' }) as Observable<Entry[]>;
    this.goals$ = this.goalService.getGoals();

    this.financeForm = this.fb.group({
      description: ['', Validators.required],
      amount: [null, [Validators.required, Validators.min(0.01)]],
      type: ['expense', Validators.required],
      goalId: ['']
    });
  }

  ngOnInit() {
    this.entries$.pipe(takeUntil(this.destroy$)).subscribe(list => (this.entriesSnapshot = list));
    this.goals$.pipe(takeUntil(this.destroy$)).subscribe(goals => (this.latestGoals = goals));

    this.setupFilteredEntries();

    this.filteredTotals$ = this.filteredEntries$.pipe(
      map(entries => {
        const income = entries.filter(e => e.type === 'income').reduce((s, e) => s + Number(e.amount || 0), 0);
        const expense = entries.filter(e => e.type === 'expense').reduce((s, e) => s + Number(e.amount || 0), 0);
        return { income, expense, savings: income - expense };
      })
    );

    this.totals$ = this.entries$.pipe(
      map(entries => {
        const income = entries.filter(e => e.type === 'income').reduce((s, e) => s + Number(e.amount || 0), 0);
        const expense = entries.filter(e => e.type === 'expense').reduce((s, e) => s + Number(e.amount || 0), 0);
        return { income, expense, savings: income - expense };
      })
    );

    combineLatest([this.goals$, this.entries$])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([goals, entries]) => {
        const mapProgress: { [id: string]: number } = {};
        for (const goal of goals) {
          const goalEntries = entries.filter(e => e.goalId === goal.id);
          const totalForGoal = goalEntries.reduce((sum, e) => sum + (e.type === 'income' ? Number(e.amount || 0) : -Number(e.amount || 0)), 0);
          mapProgress[goal.id] = goal.target > 0 ? Math.min((totalForGoal / goal.target) * 100, 100) : 0;
        }
        this.goalProgressMap = mapProgress;
      });

    this.financeForm.get('goalId')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(goalId => {
        this.selectedGoalName = this.getGoalName(goalId);
        this.updateGoalProgressPreview();
      });

    this.financeForm.get('type')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(type => {
        if (type !== 'income') this.financeForm.patchValue({ goalId: '' }, { emitEvent: true });
      });

    this.financeForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.updateGoalProgressPreview());
  }

  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }

  private toYMD(input: any): string | null {
    if (!input) return null;
    if (typeof input?.seconds === 'number') {
      const d = new Date(input.seconds * 1000);
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    }
    if (input instanceof Date) {
      const d = input;
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    }
    if (typeof input === 'string') {
      if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
      const d = new Date(input);
      if (!isNaN(d.getTime())) {
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      }
    }
    return null;
  }

  private setupFilteredEntries() {
    this.filteredEntries$ = combineLatest([this.entries$, this.filterType$, this.dateFilter$, this.goalFilter$]).pipe(
      map(([entries, typeFilter, dateFilter, goalFilter]) => {
        let filtered = entries.slice();
        if (typeFilter !== 'all') filtered = filtered.filter(e => e.type === typeFilter);
        if (dateFilter !== 'all') filtered = filtered.filter(e => this.toYMD(e.timestamp) === dateFilter);
        if (goalFilter !== 'all') filtered = filtered.filter(e => (e.goalId ?? '') === goalFilter);
        return filtered;
      })
    );
  }

  onDateChange(event: Event) {
    const value = (event.target as HTMLInputElement).value || 'all';
    this.dateFilter$.next(value);
  }
  onGoalFilterChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value || 'all';
    this.goalFilter$.next(value as any);
  }
  onFilterChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value as 'all'|'income'|'expense';
    this.filterType$.next(value);
  }

  editEntry(entry: Entry) {
    this.editingId = entry.id;
    this.financeForm.setValue({
      description: entry.description,
      amount: entry.amount,
      type: entry.type,
      goalId: entry.goalId || ''
    });
    this.updateGoalProgressPreview();
    setTimeout(() => this.financeFormRef?.nativeElement.scrollIntoView({ behavior: 'smooth' }), 100);
  }

  cancelEdit() {
    this.editingId = null;
    this.financeForm.reset({ type: 'expense', goalId: '' });
    this.updateGoalProgressPreview();
  }

  async onSubmit() {
    if (this.financeForm.invalid) return;
    const formData = this.financeForm.value;
    const entriesRef = collection(this.firestore, 'entries');

    const entryData: Partial<Entry> & { timestamp: any } = {
      description: formData.description,
      amount: Number(formData.amount || 0),
      type: formData.type,
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

  getEntryGoalProgress(entry: Entry): number {
    if (!entry || !entry.goalId || !entry.amount) return 0;
    const goal = this.latestGoals.find(g => g.id === entry.goalId);
    if (!goal || !goal.target) return 0;
    return Math.min((Number(entry.amount) / goal.target) * 100, 100);
  }

  getGoalOverallProgress(goalId: string): number {
    return this.goalProgressMap[goalId] || 0;
  }

  updateGoalProgressPreview() {
    const goalId = this.financeForm.get('goalId')?.value;
    if (!goalId) { this.selectedGoalProgress = 0; this.selectedGoalRemaining = 0; this.selectedGoalTarget = 0; return; }

    const newAmount = Number(this.financeForm.get('amount')?.value || 0);
    const type = this.financeForm.get('type')?.value as 'income'|'expense';
    const selectedGoal = this.latestGoals.find(g => g.id === goalId);
    this.selectedGoalTarget = selectedGoal?.target || 0;

    const goalEntries = this.entriesSnapshot.filter(e => e.goalId === goalId);
    const totalForGoal = goalEntries.reduce((sum, e) => sum + (e.type === 'income' ? Number(e.amount || 0) : -Number(e.amount || 0)), 0);

    const previewTotal = totalForGoal + (this.financeForm.get('amount')?.value ? (type === 'income' ? newAmount : -newAmount) : 0);

    this.selectedGoalRemaining = Math.max(this.selectedGoalTarget - previewTotal, 0);
    this.selectedGoalProgress = this.selectedGoalTarget > 0 ? Math.min((previewTotal / this.selectedGoalTarget) * 100, 100) : 0;
  }

  // Global theme toggle
  toggleDarkMode() {
    this.themeService.toggleDarkMode();
  }
}
