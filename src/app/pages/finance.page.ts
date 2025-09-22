import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BehaviorSubject, Observable, combineLatest, map, takeUntil, Subject } from 'rxjs';

import { EntryService, Entry, NewEntry } from '../services/entry.service';
import { GoalService, Goal } from '../services/goal.service';
import { FinanceChartComponent } from '../components/finance-chart.component';
import { CurrencyService, CurrencyCode } from '../services/currency.service';


type Totals = { income: number; expense: number; savings: number };

@Component({
  selector: 'app-finance',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FinanceChartComponent],
  templateUrl: './finance.page.html',
  styleUrls: ['./finance.page.css'],
})
export class FinancePage implements OnDestroy {
  financeForm: FormGroup;
  editingId: string | null = null;

  entries$: Observable<Entry[]>;
  goals$: Observable<Goal[]>;

  // Filters (type + goal only; date removed)
  private typeFilter$ = new BehaviorSubject<'all' | 'income' | 'expense'>('all');
  private goalFilter$ = new BehaviorSubject<string | 'all'>('all');

  filteredEntries$: Observable<Entry[]>;
  filteredTotals$: Observable<Totals>;
  totals$: Observable<Totals>;

  // Selected-goal preview (AFTER this entry)
  selectedGoalName = '';
  selectedGoalTarget = 0;
  selectedGoalProgress = 0;    // percent AFTER adding current form amount (if income)
  selectedGoalRemaining = 0;   // remaining AFTER adding current form amount (if income)

  // lookups
  private goalsMap: Record<string, Goal> = {};
  private goalIncomeMap: Record<string, number> = {}; // current contributed (ALL income entries)
  private latestEntries: Entry[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private entryService: EntryService,
    private goalService: GoalService,
     private currencySvc: CurrencyService, 
  ) {
   
    this.financeForm = this.fb.group({
      description: [''],
  amount: [null, [Validators.required]],   
  type: ['expense', [Validators.required]],
  goalId: [null],    
  currency: ['RSD', [Validators.required]],   
    });

    this.entries$ = this.entryService.getEntries();
    this.goals$ = this.goalService.getGoals();

    // Build caches and update preview box initially
    combineLatest([this.goals$, this.entries$])
  .pipe(takeUntil(this.destroy$))
  .subscribe(([goals, entries]) => {
    this.latestEntries = entries ?? [];
    this.goalsMap = Object.fromEntries(goals.map(g => [g.id, g]));

    const sums: Record<string, number> = {};
    for (const e of entries) {
      if (e.type !== 'income' || !e.goalId) continue;
      const g = this.goalsMap[e.goalId];
      if (!g) continue;

      const from = (e.currency as CurrencyCode) || this.currencySvc.base;
      const to = (g.currency as CurrencyCode) || this.currencySvc.base;

      const converted = this.currencySvc.convert(Number(e.amount) || 0, from, to);
      sums[e.goalId] = (sums[e.goalId] || 0) + converted;
    }

    this.goalIncomeMap = sums;
    this.updateSelectedGoalPreview();
  });

    // Recompute preview when these change
    ['goalId', 'amount', 'type'].forEach(ctrl => {
      this.financeForm.get(ctrl)!.valueChanges
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => this.updateSelectedGoalPreview());
    });

    this.totals$ = this.entries$.pipe(map(this.calcTotals));

    this.filteredEntries$ = combineLatest([this.entries$, this.typeFilter$, this.goalFilter$]).pipe(
      map(([entries, type, goal]) =>
        entries.filter(e => {
          if (type !== 'all' && e.type !== type) return false;
          if (goal !== 'all' && e.goalId !== goal) return false;
          return true;
        })
      )
    );

    this.filteredTotals$ = this.filteredEntries$.pipe(map(this.calcTotals));
  }

  // Filters
  onFilterChange(ev: Event) {
    const val = (ev.target as HTMLSelectElement).value as 'all' | 'income' | 'expense';
    this.typeFilter$.next(val);
  }
  onGoalFilterChange(ev: Event) {
    const val = (ev.target as HTMLSelectElement).value || 'all';
    this.goalFilter$.next(val as any);
  }

  // CRUD
  async onSubmit() {
  const v = this.financeForm.value;

  // true only when it's income AND a real goal id is selected
  const includeGoal =
    v.type === 'income' && v.goalId != null && String(v.goalId).trim() !== '';

  const payload: NewEntry = {
    amount: Number(v.amount) || 0,
    type: (v.type as 'income' | 'expense') || 'expense',
     currency: (v.currency as any) || 'RSD',
    ...(v.description ? { description: v.description as string } : {}),
    ...(includeGoal ? { goalId: v.goalId as string } : {}), // omit goalId for expenses/none
  };

  if (this.editingId) {
    await this.entryService.updateEntry(this.editingId, payload);
    this.cancelEdit();
  } else {
    await this.entryService.addEntry(payload);
    this.financeForm.reset({ description: '', amount: null, type: 'expense', goalId: null, currency: v.currency || 'RSD', });
    this.updateSelectedGoalPreview?.();
  }
}

  editEntry(e: Entry) {
    this.editingId = e.id;
    this.financeForm.setValue({
      description: e.description || '',
      amount: e.amount,
      type: e.type,
      goalId: e.goalId ?? null,
      currency: e.currency || 'RSD',
    });
    this.updateSelectedGoalPreview();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async deleteEntry(id: string) {
    await this.entryService.deleteEntry(id);
    if (this.editingId === id) this.cancelEdit();
  }

  cancelEdit() {
    const currentCurrency = this.financeForm.get('currency')?.value || 'RSD';
    this.editingId = null;
    this.financeForm.reset({ description: '', amount: 0, type: 'expense', goalId: null, currency: currentCurrency,});
    this.updateSelectedGoalPreview();
  }

  // Totals
  private calcTotals = (entries: Entry[]): Totals => {
  const toRSD = (amt: number, from: CurrencyCode) =>
    this.currencySvc.convert(amt || 0, from, 'RSD');

  const income = entries
    .filter(e => e.type === 'income')
    .reduce((s, e) => s + toRSD(e.amount, e.currency as CurrencyCode), 0);

  const expense = entries
    .filter(e => e.type === 'expense')
    .reduce((s, e) => s + toRSD(e.amount, e.currency as CurrencyCode), 0);

  return {
    income: Math.round(income * 100) / 100,
    expense: Math.round(expense * 100) / 100,
    savings: Math.round((income - expense) * 100) / 100,
  };
};

  // Goal helpers for list rendering
  getGoalName(goalId?: string | null): string {
    if (!goalId) return '—';
    return this.goalsMap[goalId]?.name ?? '—';
  }
  getGoalOverallProgress(goalId?: string | null): number {
    if (!goalId) return 0;
    const goal = this.goalsMap[goalId];
    if (!goal || !goal.target) return 0;
    const contributed = this.goalIncomeMap[goalId] || 0;
    return Math.min(100, (contributed / goal.target) * 100);
  }
  getGoalRemaining(goalId?: string | null): number {
    if (!goalId) return 0;
    const goal = this.goalsMap[goalId];
    if (!goal || !goal.target) return 0;
    const contributed = this.goalIncomeMap[goalId] || 0;
    return Math.max(0, goal.target - contributed);
  }

  formatEntryAmount(e: Entry): string {
  const code = (e.currency as CurrencyCode) || this.currencySvc.base;
  return `${(Number(e.amount) || 0).toFixed(2)} ${code}`;
}

getEntryAmountInGoalCurrency(e: Entry): number | null {
  if (!e.goalId) return null;
  const g = this.goalsMap[e.goalId];
  if (!g) return null;
  const from = (e.currency as CurrencyCode) || this.currencySvc.base;
  const to = (g.currency as CurrencyCode) || this.currencySvc.base;
  return Math.round(this.currencySvc.convert(Number(e.amount) || 0, from, to) * 100) / 100;
}

  // Selected goal PREVIEW (after this entry)
private updateSelectedGoalPreview() {
  const gid = this.financeForm.get('goalId')?.value as string | null;
  const amount = Number(this.financeForm.get('amount')?.value) || 0;
  const type = this.financeForm.get('type')?.value as 'income' | 'expense';
  const formCurr = (this.financeForm.get('currency')?.value as CurrencyCode) || this.currencySvc.base;

  if (!gid) {
    this.selectedGoalName = '';
    this.selectedGoalTarget = 0;
    this.selectedGoalProgress = 0;
    this.selectedGoalRemaining = 0;
    return;
  }

  const goal = this.goalsMap[gid];
  if (!goal || !goal.target) {
    this.selectedGoalName = '';
    this.selectedGoalTarget = 0;
    this.selectedGoalProgress = 0;
    this.selectedGoalRemaining = 0;
    return;
  }

  // current contributed (already in goal currency thanks to sums loop)
  const current = this.goalIncomeMap[gid] || 0;

  // only income contributes; convert the form amount FROM form currency → goal currency
  const addInGoalCurrency =
    type === 'income'
      ? this.currencySvc.convert(Math.max(0, amount), formCurr, goal.currency as CurrencyCode)
      : 0;

  const previewContrib = current + addInGoalCurrency;

  this.selectedGoalName = goal.name;
  this.selectedGoalTarget = goal.target;
  this.selectedGoalProgress = Math.min(100, (previewContrib / goal.target) * 100);
  this.selectedGoalRemaining = Math.max(0, goal.target - previewContrib);
}


  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
