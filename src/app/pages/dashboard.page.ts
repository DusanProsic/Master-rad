// dashboard.page.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Auth, signOut } from '@angular/fire/auth';
import { Observable, map, combineLatest } from 'rxjs';

import { GoalService, Goal } from '../services/goal.service';
import { ThemeService } from '../services/theme.service';
import { BudgetGoalsComponent } from '../components/budget-goals.component';
import { ReminderService } from '../services/reminder.service';
import { FinanceChartComponent } from '../components/finance-chart.component';

// ✅ use your EntryService (it already reads users/{uid}/entries and createdAt)
import { EntryService, Entry } from '../services/entry.service';

// ✅ currency service
import { CurrencyService, CurrencyCode } from '../services/currency.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, BudgetGoalsComponent, FinanceChartComponent],
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.css']
})
export class DashboardPage implements OnInit {
  private auth = inject(Auth);
  private router = inject(Router);
  private goalService = inject(GoalService);
  public themeService = inject(ThemeService);
  private entryService = inject(EntryService);
  public currencySvc = inject(CurrencyService);

  trackByReminder = (_: number, r: any) => r.id ?? r.date + r.time + r.message;

  entries$!: Observable<Entry[]>;
  goalsWithProgress$!: Observable<any[]>;
  totals$!: Observable<{ income: number; expense: number; savings: number }>;
  monthlyTotals!: { income: number; expense: number };
  upcomingReminders$!: Observable<any[]>;
  monthlyTotals$!: Observable<{ income: number; expense: number }>;

  // expose current base currency to template
  base$ = this.currencySvc.baseCurrency$;

  ngOnInit(): void {
    // ✅ use EntryService (user-scoped, ordered by createdAt)
    this.entries$ = this.entryService.getEntries();


    this.totals$ = combineLatest([this.entries$, this.currencySvc.baseCurrency$]).pipe(
  map(([entries, base]) => {
    const toBase = (amt: number, from: CurrencyCode) =>
      this.currencySvc.convert(amt || 0, from, base as CurrencyCode);

    const income = entries
      .filter(e => e.type === 'income')
      .reduce((s, e) => s + toBase(+e.amount || 0, e.currency as CurrencyCode), 0);

    const expense = entries
      .filter(e => e.type === 'expense')
      .reduce((s, e) => s + toBase(+e.amount || 0, e.currency as CurrencyCode), 0);

    return {
      income: Math.round(income * 100) / 100,
      expense: Math.round(expense * 100) / 100,
      savings: Math.round((income - expense) * 100) / 100,
    };
  })
);



// in ngOnInit (replace the subscribe version)
this.monthlyTotals$ = combineLatest([this.entries$, this.currencySvc.baseCurrency$]).pipe(
  map(([entries, base]) => {
    const now = new Date();
    const m = now.getMonth();
    const y = now.getFullYear();
    const toBase = (amt: number, from: CurrencyCode) => this.currencySvc.convert(amt || 0, from, base as CurrencyCode);

    const isThisMonth = (e: Entry) => {
      const ts = e.createdAt;
      if (!ts || typeof ts.seconds !== 'number') return false;
      const d = new Date(ts.seconds * 1000);
      return d.getMonth() === m && d.getFullYear() === y;
    };

    const monthlyIncome = entries
      .filter(e => e.type === 'income' && isThisMonth(e))
      .reduce((s, e) => s + toBase(+e.amount || 0, e.currency as CurrencyCode), 0);

    const monthlyExpense = entries
      .filter(e => e.type === 'expense' && isThisMonth(e))
      .reduce((s, e) => s + toBase(+e.amount || 0, e.currency as CurrencyCode), 0);

    return {
      income: Math.round(monthlyIncome * 100) / 100,
      expense: Math.round(monthlyExpense * 100) / 100,
    };
  })
);

    // goals with progress already converts per-goal (you patched GoalService)
    this.goalsWithProgress$ = this.goalService.getGoalsWithProgress(this.entries$);

    

    // reminders unchanged
    this.upcomingReminders$ = this.reminderService.getReminders().pipe(
      map((reminders: any[]) =>
        reminders
          .filter((r: any) => new Date(r.date + 'T' + (r.time || '00:00')) > new Date())
          .sort((a: any, b: any) =>
            new Date(a.date + 'T' + (a.time || '00:00')).getTime() -
            new Date(b.date + 'T' + (b.time || '00:00')).getTime()
          )
          .slice(0, 5)
      )
    );

    // ✅ monthly totals: use createdAt (your EntryService writes this) and convert to base
    this.entries$
      .pipe(
        map(entries => {
          const now = new Date();
          const m = now.getMonth();
          const y = now.getFullYear();
          const base = this.currencySvc.base;
          const toBase = (amt: number, from: CurrencyCode) => this.currencySvc.convert(amt || 0, from, base);

          const isThisMonth = (e: Entry) => {
            const ts = e.createdAt;                        // <-- createdAt, not timestamp
            if (!ts || typeof ts.seconds !== 'number') return false;
            const d = new Date(ts.seconds * 1000);
            return d.getMonth() === m && d.getFullYear() === y;
          };

          const monthlyIncome = entries
            .filter(e => e.type === 'income' && isThisMonth(e))
            .reduce((s, e) => s + toBase(Number(e.amount) || 0, e.currency as CurrencyCode), 0);

          const monthlyExpense = entries
            .filter(e => e.type === 'expense' && isThisMonth(e))
            .reduce((s, e) => s + toBase(Number(e.amount) || 0, e.currency as CurrencyCode), 0);

          return {
            income: Math.round(monthlyIncome * 100) / 100,
            expense: Math.round(monthlyExpense * 100) / 100
          };
        })
      )
      .subscribe(t => (this.monthlyTotals = t));
  }

  

  

  constructor(private reminderService: ReminderService) {}

  // Theme + nav unchanged
  toggleTheme() { this.themeService.toggleDarkMode(); }
  isDarkMode(): boolean { return this.themeService.isDarkMode(); }
  logout() { signOut(this.auth).then(() => this.router.navigate(['/login'])).catch(err => console.error('Logout failed:', err)); }
  goTo(path: string) { this.router.navigate([path]); }

  // 🔘 simple cycle button (RSD -> EUR -> USD -> RSD)
  cycleBase() {
    const order: CurrencyCode[] = ['RSD', 'EUR', 'USD'];
    const cur = this.currencySvc.base;
    const idx = order.indexOf(cur);
    const next = order[(idx + 1) % order.length];
    this.currencySvc.setBaseCurrency(next);
  }

  // or direct setter for a dropdown:
  setBase(code: CurrencyCode) { this.currencySvc.setBaseCurrency(code); }
}
