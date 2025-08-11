import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, combineLatest, map, BehaviorSubject } from 'rxjs'; // ⬅ add BehaviorSubject
import { GoalService, Goal, NewGoal } from './goal-service.component';
import { Firestore, collection, collectionData } from '@angular/fire/firestore';

type SortOption =
  | 'progress-desc'   // closest to completion
  | 'progress-asc'    // least completed
  | 'target-desc'     // biggest target first
  | 'target-asc'      // smallest target first
  | 'created-desc'    // newest first
  | 'created-asc';    // oldest first

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

  // original computed stream (kept)
  goalsWithProgress$!: Observable<any[]>;

  // NEW: UI subjects + final stream for template
  sort$   = new BehaviorSubject<SortOption>('progress-desc');
  status$ = new BehaviorSubject<StatusFilter>('all');
  viewGoals$!: Observable<any[]>;

  newGoal: NewGoal = { name: '', target: 0, currency: 'RSD' };
  editingId: string | null = null;
  trackById = (_: number, g: Goal) => g.id;

  constructor(private goalService: GoalService, private firestore: Firestore) {
    this.goals$ = this.goalService.getGoals();
    const entriesRef = collection(this.firestore, 'entries');
    this.entries$ = collectionData(entriesRef, { idField: 'id' });
  }

  ngOnInit(): void {
    // compute totals/progress per goal
    this.goalsWithProgress$ = combineLatest([this.goals$, this.entries$]).pipe(
      map(([goals, entries]) => {
        return goals.map(goal => {
          const goalEntries = entries.filter(e => e.goalId === goal.id);
          const totalForGoal = goalEntries.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
          const percentRaw = goal.target > 0 ? (totalForGoal / goal.target) * 100 : 0;
          const percent = Math.min(Math.max(percentRaw, 0), 100);
          const remaining = Math.max(goal.target - totalForGoal, 0);

          // best-effort createdAt (if you store it)
          const createdAt =
            (goal as any)?.createdAt?.seconds ??
            (goal as any)?.createdAt ??
            0;

          return { ...goal, totalForGoal, saved: totalForGoal, percent, remaining, createdAt };
        });
      })
    );

    // apply filter + sort for the view
    this.viewGoals$ = combineLatest([this.goalsWithProgress$, this.sort$, this.status$]).pipe(
      map(([goals, sort, status]) => {
        // filter by status
        let filtered = goals;
        if (status !== 'all') {
          filtered = goals.filter((g: any) => {
            if (status === 'completed')   return g.percent >= 100;
            if (status === 'in-progress') return g.percent > 0 && g.percent < 100;
            if (status === 'not-started') return g.percent === 0;
            return true;
          });
        }

        // sorting helper
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

  // called from template
  setSort(v: SortOption)      { this.sort$.next(v); }
  setStatus(v: StatusFilter)  { this.status$.next(v); }

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
