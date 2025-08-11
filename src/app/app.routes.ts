import { Routes } from '@angular/router';
import { LoginPage } from './pages/login.page';
import { LayoutComponent } from './shared/layout.component';
import { RegisterPage } from './pages/register.page';
import { DashboardPage } from './pages/dashboard.page';
import { authGuard } from './auth.guard';
import { FinancePage } from './pages/finance.page';
import { redirectIfAuthenticated } from './redirectIfAuthenticated.guard';
import { NotFoundPage } from './pages/not-found/not-found.component';
import { GoalsPage } from './pages/goals.page';
import { CalendarPage } from './pages/calendar.page';
import { ResetPasswordComponent } from './components/reset-password.component';

export const routes: Routes = [
  // Public pages (no layout, no sidebar)
  { path: 'login', component: LoginPage, canActivate: [redirectIfAuthenticated] },
  { path: 'register', component: RegisterPage, canActivate: [redirectIfAuthenticated] },
  { path: 'reset-password', loadComponent: () => import('./components/reset-password.component').then(m => m.ResetPasswordComponent) },

  // Pages with layout (sidebar + topbar)
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardPage, canActivate: [authGuard] },
      { path: 'finance', component: FinancePage, canActivate: [authGuard] },
       {path: 'goals', component: GoalsPage, canActivate: [authGuard] },
       {path: 'calendar', component: CalendarPage, canActivate: [authGuard] },
      { path: '**', component: NotFoundPage },
      

    ]
  }
];
