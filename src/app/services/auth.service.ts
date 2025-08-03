import { Injectable, inject } from '@angular/core';
import { Auth, signOut, User } from '@angular/fire/auth';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = inject(Auth);
  private router = inject(Router);

  get currentUser(): User | null {
    return this.auth.currentUser;
  }

  isLoggedIn(): boolean {
    return !!this.auth.currentUser;
  }

  async logout(): Promise<void> {
    await signOut(this.auth);
    this.router.navigate(['/login']);
  }
}
