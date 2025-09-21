import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, combineLatest, map, BehaviorSubject } from 'rxjs';
import { GoalService, Goal, NewGoal } from '../services/goal.service.js';
import { EntryService } from '../services/entry.service'; // <— use your scoped entries
import { authState } from '@angular/fire/auth';

type SortOption =
  | 'progress-desc'
  | 'progress-asc'
  | 'target-desc'
  | 'target-asc'
  | 'created-desc'
  | 'created-asc';

type StatusFilter = 'all' | 'completed' | 'in-progress' | 'not-started';

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

  // Computed streams
  goalsWithProgress$!: Observable<any[]>;
  sort$   = new BehaviorSubject<SortOption>('progress-desc');
  status$ = new BehaviorSubject<StatusFilter>('all');
  viewGoals$!: Observable<any[]>;

  newGoal: NewGoal = { name: '', target: 0, currency: 'RSD' };
  editingId: string | null = null;
  trackById = (_: number, g: Goal) => g.id;

  constructor(
    private goalService: GoalService,
    private entryService: EntryService, // <— inject
  ) {
    this.goals$ = this.goalService.getGoals();          // user-scoped goals
    this.entries$ = this.entryService.getEntries();    // user-scoped entries
  }

  ngOnInit(): void {
    // Use the single source of truth for progress calc (filters to income + matches goalId)
    this.goalsWithProgress$ = this.goalService.getGoalsWithProgress(this.entries$).pipe(
      map(goals => goals.map(g => {
        // normalize fields for UI
        const createdAt =
          (g as any)?.createdAt?.seconds ??
          (g as any)?.createdAt ?? 0;

        const remaining = Math.max((g.target ?? 0) - (g.contributed ?? 0), 0);
        return { ...g, createdAt, remaining };
      }))
    );

    // Apply filter + sort for the view
    this.viewGoals$ = combineLatest([this.goalsWithProgress$, this.sort$, this.status$]).pipe(
      map(([goals, sort, status]) => {
        // status filter
        let filtered = goals;
        if (status !== 'all') {
          filtered = goals.filter((g: any) => {
            if (status === 'completed')   return g.percent >= 100;
            if (status === 'in-progress') return g.percent > 0 && g.percent < 100;
            if (status === 'not-started') return g.percent === 0;
            return true;
          });
        }

        // sort
        const by = (a: any, b: any, key: 'percent' | 'target' | 'createdAt', dir: 1 | -1) =>
          (a[key] ?? 0) > (b[key] ?? 0) ? dir : (a[key] ?? 0) < (b[key] ?? 0) ? -dir : 0;

        const out = [...filtered];
        switch (sort) {
          case 'progress-desc': out.sort((a, b) => by(a, b, 'percent', -1)); break;
          case 'progress-asc':  out.sort((a, b) => by(a, b, 'percent',  1)); break;
          case 'target-desc':   out.sort((a, b) => by(a, b, 'target',  -1)); break;
          case 'target-asc':    out.sort((a, b) => by(a, b, 'target',   1)); break;
          case 'created-desc':  out.sort((a, b) => by(a, b, 'createdAt',-1)); break;
          case 'created-asc':   out.sort((a, b) => by(a, b, 'createdAt', 1)); break;
        }
        return out;
      })
    );
  }

  setSort(v: SortOption)     { this.sort$.next(v); }
  setStatus(v: StatusFilter) { this.status$.next(v); }

  async addGoal() {
    // ensure numeric
    this.newGoal.target = Number(this.newGoal.target) || 0;
    if (this.newGoal.name && this.newGoal.target > 0) {
      await this.goalService.addGoal(this.newGoal);
      this.newGoal = { name: '', target: 0, currency: 'RSD' };
    }
  }

  editGoal(goal: Goal) {
    if (this.displayOnly) return;
    this.editingId = goal.id;
    this.newGoal = { name: goal.name, target: Number(goal.target) || 0, currency: goal.currency };
  }

  async updateGoal() {
    if (!this.editingId) return;
    this.newGoal.target = Number(this.newGoal.target) || 0;
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
