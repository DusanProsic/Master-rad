import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BehaviorSubject, Observable, combineLatest, map, takeUntil, Subject } from 'rxjs';

import { EntryService, Entry, NewEntry } from '../services/entry.service';
import { GoalService, Goal } from '../services/goal.service';
import { FinanceChartComponent } from '../components/finance-chart.component';


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
    private goalService: GoalService
  ) {
    // IMPORTANT: goal is optional => initialize with null, not ''.
    this.financeForm = this.fb.group({
      description: [''],
  amount: [null, [Validators.required]],   // (optional) add Validators.min(0.01)
  type: ['expense', [Validators.required]],
  goalId: [null],       // <- null means "no goal selected"
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
          sums[e.goalId] = (sums[e.goalId] || 0) + (e.amount || 0);
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
    ...(v.description ? { description: v.description as string } : {}),
    ...(includeGoal ? { goalId: v.goalId as string } : {}), // omit goalId for expenses/none
  };

  if (this.editingId) {
    await this.entryService.updateEntry(this.editingId, payload);
    this.cancelEdit();
  } else {
    await this.entryService.addEntry(payload);
    this.financeForm.reset({ description: '', amount: null, type: 'expense', goalId: null });
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
    });
    this.updateSelectedGoalPreview();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async deleteEntry(id: string) {
    await this.entryService.deleteEntry(id);
    if (this.editingId === id) this.cancelEdit();
  }

  cancelEdit() {
    this.editingId = null;
    this.financeForm.reset({ description: '', amount: 0, type: 'expense', goalId: null });
    this.updateSelectedGoalPreview();
  }

  // Totals
  private calcTotals = (entries: Entry[]): Totals => {
    const income = entries.filter(e => e.type === 'income').reduce((s, e) => s + (e.amount || 0), 0);
    const expense = entries.filter(e => e.type === 'expense').reduce((s, e) => s + (e.amount || 0), 0);
    return { income, expense, savings: income - expense };
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

  // Selected goal PREVIEW (after this entry)
  private updateSelectedGoalPreview() {
    const gid = this.financeForm.get('goalId')?.value as string | null;
    const amount = Number(this.financeForm.get('amount')?.value) || 0;
    const type = this.financeForm.get('type')?.value as 'income' | 'expense';

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

    // current totals
    const current = this.goalIncomeMap[gid] || 0;

    // PREVIEW after this entry:
    // only income contributes; expenses do not reduce goal progress
    const previewContrib = type === 'income' ? current + Math.max(0, amount) : current;

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
