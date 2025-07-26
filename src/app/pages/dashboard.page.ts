import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Auth, signOut } from '@angular/fire/auth';
import { BudgetGoalsComponent } from '../components/budget-goals.component';



@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, BudgetGoalsComponent],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.css'
})
export class DashboardPage {
  constructor(private auth: Auth, private router: Router) {}

  logout() {
    signOut(this.auth).then(() => {
      this.router.navigate(['/login']);
      
    }).catch((error) => {
      console.error('Logout failed:', error);
    });
  }
}