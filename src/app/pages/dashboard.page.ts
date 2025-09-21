import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Auth, signOut } from '@angular/fire/auth';
import { collection, collectionData, Firestore } from '@angular/fire/firestore';
import { Observable, map } from 'rxjs';
import { GoalService, Goal } from '../services/goal.service';
import { ThemeService } from '../services/theme.service';
import { BudgetGoalsComponent } from '../components/budget-goals.component';
import { ReminderService } from '../services/reminder.service';
import { FinanceChartComponent } from '../components/finance-chart.component';


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
  private firestore = inject(Firestore);
  private goalService = inject(GoalService);
  public themeService = inject(ThemeService); // for template use
  trackByReminder = (_: number, r: any) => r.id ?? r.date + r.time + r.message;

  entries$: Observable<any[]>;
  goalsWithProgress$: Observable<any[]>;
  totals$!: Observable<{ income: number, expense: number, savings: number }>;
  monthlyTotals!: { income: number, expense: number };
  upcomingReminders$!: Observable<any[]>;

  constructor(private reminderService: ReminderService) {
    const entriesRef = collection(this.firestore, 'entries');
    this.entries$ = collectionData(entriesRef, { idField: 'id' });

    this.goalsWithProgress$ = this.goalService.getGoalsWithProgress(this.entries$);
  }

  ngOnInit(): void {
    this.totals$ = this.entries$.pipe(
      map(entries => {
        const income = entries.filter(e => e.type === 'income').reduce((sum, e) => sum + e.amount, 0);
        const expense = entries.filter(e => e.type === 'expense').reduce((sum, e) => sum + e.amount, 0);
        return { income, expense, savings: income - expense };
      })
    );
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
    this.entries$.pipe(
    map(entries => {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const isThisMonth = (entry: any) => {
        if (!entry.timestamp || !entry.timestamp.seconds) return false;
        const date = new Date(entry.timestamp.seconds * 1000);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      };

      const monthlyIncome = entries.filter(e => e.type === 'income' && isThisMonth(e))
                                   .reduce((sum, e) => sum + e.amount, 0);
      const monthlyExpense = entries.filter(e => e.type === 'expense' && isThisMonth(e))
                                    .reduce((sum, e) => sum + e.amount, 0);
      return { income: monthlyIncome, expense: monthlyExpense };
    })
  ).subscribe(totals => this.monthlyTotals = totals);
}
  

  toggleTheme() {
    this.themeService.toggleDarkMode();
  }

  isDarkMode(): boolean {
    return this.themeService.isDarkMode();
  }

  logout() {
    signOut(this.auth).then(() => this.router.navigate(['/login']))
      .catch(err => console.error('Logout failed:', err));
  }

  goTo(path: string) {
    this.router.navigate([path]);
  }

  
}
