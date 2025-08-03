import { Routes } from '@angular/router';
import { LoginPage } from './pages/login.page';
import { LayoutComponent } from './shared/layout.component';
import { RegisterPage } from './pages/register.page';
import { DashboardPage } from './pages/dashboard.page';
import { authGuard } from './auth.guard';
import { FinancePage } from './pages/finance.page';
import { redirectIfAuthenticated } from './redirectIfAuthenticated.guard';
import { NotFoundPage } from './pages/not-found/not-found.component';

export const routes: Routes = [
  // Public pages (no layout, no sidebar)
  { path: 'login', component: LoginPage, canActivate: [redirectIfAuthenticated] },
  { path: 'register', component: RegisterPage, canActivate: [redirectIfAuthenticated] },

  // Pages with layout (sidebar + topbar)
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardPage, canActivate: [authGuard] },
      { path: 'finance', component: FinancePage, canActivate: [authGuard] },
      { path: '**', component: NotFoundPage },
    ]
  }
];
