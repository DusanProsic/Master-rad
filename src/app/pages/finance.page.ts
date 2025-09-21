import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import {
  BehaviorSubject,
  Observable,
  combineLatest,
  map,
  takeUntil,
  Subject,
} from 'rxjs';

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
  // --- Reactive form (matches your HTML) ---
  financeForm: FormGroup;
  editingId: string | null = null;

  // --- Data streams ---
  entries$: Observable<Entry[]>;
  goals$: Observable<Goal[]>;

  // Filters (type/date/goal)
  private typeFilter$ = new BehaviorSubject<'all' | 'income' | 'expense'>('all');
  private dateFilter$ = new BehaviorSubject<string>(''); // 'yyyy-MM-dd' or ''
  private goalFilter$ = new BehaviorSubject<string | 'all'>('all');

  filteredEntries$: Observable<Entry[]>;
  filteredTotals$: Observable<Totals>;
  totals$: Observable<Totals>; // unfiltered totals (for reference or other widgets)

  // Selected goal info (for the form preview box)
  selectedGoalName = '';
  selectedGoalTarget = 0;
  selectedGoalProgress = 0;
  selectedGoalRemaining = 0;

  // Caches for quick lookups in template helper methods
  private goalsMap: Record<string, Goal> = {};
  private goalIncomeMap: Record<string, number> = {}; // goalId -> total contributed (income entries)

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private entryService: EntryService,
    private goalService: GoalService
  ) {
    // Build form to match your HTML controls
    this.financeForm = this.fb.group({
      description: [''],
      amount: [0],
      type: ['expense'],
      goalId: [''],
      date: [''], // 'yyyy-MM-dd'
      note: [''],
      currency: ['RSD'],
    });

    // Streams
    this.entries$ = this.entryService.getEntries();
    this.goals$ = this.goalService.getGoals();

    // Keep fast lookup maps up to date
    combineLatest([this.goals$, this.entries$])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([goals, entries]) => {
        this.goalsMap = Object.fromEntries(goals.map((g) => [g.id, g]));
        const sums: Record<string, number> = {};
        for (const e of entries) {
          if (e.type !== 'income' || !e.goalId) continue;
          sums[e.goalId] = (sums[e.goalId] || 0) + (e.amount || 0);
        }
        this.goalIncomeMap = sums;
        this.updateSelectedGoalInfo(this.financeForm.get('goalId')?.value as string);
      });

    // Update selected goal info when goalId changes
    this.financeForm
      .get('goalId')!
      .valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((gid: string) => this.updateSelectedGoalInfo(gid));

    // Unfiltered totals (if you need them anywhere)
    this.totals$ = this.entries$.pipe(map(this.calcTotals));

    // Filtered streams for the list + summary + chart
    this.filteredEntries$ = combineLatest([
      this.entries$,
      this.typeFilter$,
      this.dateFilter$,
      this.goalFilter$,
    ]).pipe(
      map(([entries, type, date, goal]) =>
        entries.filter((e) => {
          if (type !== 'all' && e.type !== type) return false;
          if (goal !== 'all' && e.goalId !== goal) return false;
          if (date) {
            const d = this.toDate(e.date);
            if (this.toYMD(d) !== date) return false;
          }
          return true;
        })
      )
    );

    this.filteredTotals$ = this.filteredEntries$.pipe(map(this.calcTotals));
  }

  // --- Filters handlers (used by <select>/<input> change events in HTML) ---
  onFilterChange(ev: Event) {
    const val = (ev.target as HTMLSelectElement).value as 'all' | 'income' | 'expense';
    this.typeFilter$.next(val);
  }
  onDateChange(ev: Event) {
    const val = (ev.target as HTMLInputElement).value; // 'yyyy-MM-dd'
    this.dateFilter$.next(val || '');
  }
  onGoalFilterChange(ev: Event) {
    const val = (ev.target as HTMLSelectElement).value || 'all';
    this.goalFilter$.next(val as any);
  }

  // --- CRUD (used by your HTML: onSubmit, editEntry, deleteEntry, cancelEdit) ---
  async onSubmit() {
    const v = this.financeForm.value;
    const payload: NewEntry = {
      amount: Number(v.amount) || 0,
      type: (v.type as 'income' | 'expense') || 'expense',
      // description is optional; add it if present
      ...(v.description ? { description: v.description as string } : {}),
      category: v['category'] as string | undefined, // if you add a Category control later
      note: (v.note as string) || '',
      date: (v.date as string) || undefined, // stored as Timestamp by EntryService if empty
      currency: (v.currency as string) || 'RSD',
      goalId: (v.goalId as string) || undefined,
    } as any; // 'as any' is safe even if NewEntry doesn't yet include 'description'

    if (this.editingId) {
      await this.entryService.updateEntry(this.editingId, payload);
      this.cancelEdit();
    } else {
      await this.entryService.addEntry(payload);
      this.financeForm.reset({
        description: '',
        amount: 0,
        type: 'expense',
        goalId: '',
        date: '',
        note: '',
        currency: 'RSD',
      });
    }
  }

  editEntry(e: Entry) {
    this.editingId = e.id;
    this.financeForm.setValue({
      description: (e as any).description || '',
      amount: e.amount,
      type: e.type,
      goalId: e.goalId || '',
      date: this.toYMD(this.toDate(e.date)) || '',
      note: e.note || '',
      currency: e.currency || 'RSD',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async deleteEntry(id: string) {
    await this.entryService.deleteEntry(id);
    if (this.editingId === id) this.cancelEdit();
  }

  cancelEdit() {
    this.editingId = null;
    this.financeForm.reset({
      description: '',
      amount: 0,
      type: 'expense',
      goalId: '',
      date: '',
      note: '',
      currency: 'RSD',
    });
  }

  // --- Helpers used by template ---
  private calcTotals = (entries: Entry[]): Totals => {
    const income = entries
      .filter((e) => e.type === 'income')
      .reduce((s, e) => s + (e.amount || 0), 0);
    const expense = entries
      .filter((e) => e.type === 'expense')
      .reduce((s, e) => s + (e.amount || 0), 0);
    return { income, expense, savings: income - expense };
  };

  toDate(d: any): Date | null {
    if (!d) return null;
    return typeof d?.toDate === 'function' ? d.toDate() : new Date(d);
  }

  private toYMD(d: Date | null): string {
    if (!d) return '';
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const da = d.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${da}`;
  }

  getGoalName(goalId?: string): string {
    if (!goalId) return '—';
    return this.goalsMap[goalId]?.name ?? '—';
  }

  /** Percent contribution of THIS entry relative to its goal target */
  getEntryGoalProgress(entry: Entry): number {
    const goal = entry.goalId ? this.goalsMap[entry.goalId] : undefined;
    if (!goal || !goal.target) return 0;
    return Math.min(100, ((entry.amount || 0) / goal.target) * 100);
    // If you meant overall goal progress instead, use getGoalOverallProgress(entry.goalId).
  }

  /** Overall progress for a goal from ALL its income entries */
  getGoalOverallProgress(goalId?: string): number {
    if (!goalId) return 0;
    const goal = this.goalsMap[goalId];
    if (!goal || !goal.target) return 0;
    const contributed = this.goalIncomeMap[goalId] || 0;
    return Math.min(100, (contributed / goal.target) * 100);
  }

  private updateSelectedGoalInfo(goalId?: string) {
    if (!goalId) {
      this.selectedGoalName = '';
      this.selectedGoalTarget = 0;
      this.selectedGoalProgress = 0;
      this.selectedGoalRemaining = 0;
      return;
    }
    const goal = this.goalsMap[goalId];
    if (!goal) {
      this.selectedGoalName = '';
      this.selectedGoalTarget = 0;
      this.selectedGoalProgress = 0;
      this.selectedGoalRemaining = 0;
      return;
    }
    const contributed = this.goalIncomeMap[goalId] || 0;
    this.selectedGoalName = goal.name;
    this.selectedGoalTarget = goal.target;
    this.selectedGoalProgress = Math.min(100, (contributed / goal.target) * 100);
    this.selectedGoalRemaining = Math.max(0, goal.target - contributed);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
