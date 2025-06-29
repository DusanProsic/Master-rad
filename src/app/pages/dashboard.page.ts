import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Auth, signOut } from '@angular/fire/auth';

@Component({
  selector: 'app-dashboard',
  imports: [],
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