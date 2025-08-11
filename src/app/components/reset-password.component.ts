import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Auth, sendPasswordResetEmail } from '@angular/fire/auth';
import { Router } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-reset-password',
  imports: [CommonModule, FormsModule],
  template: `
    <div class="auth-page">
      <section class="auth-card">
        <h2>Reset Password</h2>

        <label class="label" for="email">Email</label>
        <input id="email" class="input" [(ngModel)]="email" type="email" placeholder="you@example.com" />

        <button class="btn" (click)="reset()" [disabled]="busy || !email">
          {{ busy ? 'Sending…' : 'Send reset link' }}
        </button>

        <p *ngIf="msg" class="auth-msg">{{ msg }}</p>
        <p *ngIf="err" class="auth-error">{{ err }}</p>

        <p class="auth-link">
          <a (click)="go('/login')">Back to login</a>
        </p>
      </section>
    </div>
  `,
  styles: [`
    /* Page container */
    .auth-page {
      min-height: 100vh;
      display: flex; align-items: center; justify-content: center;
      background: var(--c-bg);
      padding: 1rem;
    }

    /* Card */
    .auth-card {
      background: var(--c-panel);
      border: 1px solid var(--c-border);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
      padding: 2rem;
      width: 100%;
      max-width: 420px;
      display: grid;
      gap: 1rem;
      color: var(--c-text);
    }

    .auth-card h2 {
      margin: 0;
      font-size: 1.4rem;
      font-weight: 700;
      text-align: center;
    }

    /* Inputs */
    .label { font-weight: 600; opacity: .9; }
    .input {
      width: 100%;
      padding: .6rem .75rem;
      border-radius: var(--radius-sm);
      border: 1px solid var(--c-border);
      background: var(--c-panel-2);
      color: var(--c-text);
      font-size: 1rem;
      outline: none;
      transition: border-color .2s ease;
    }
    .input:focus { border-color: var(--accent); }

    /* Button */
    .btn {
      display: inline-flex; align-items: center; justify-content: center;
      padding: .6rem 1rem;
      border-radius: var(--radius-sm);
      border: 1px solid transparent;
      background: var(--accent);
      color: #fff;
      font-weight: 600;
      cursor: pointer;
      transition: filter .15s ease, background-color .2s ease;
    }
    .btn:hover { filter: brightness(0.95); }
    .btn:disabled { opacity: .6; cursor: default; }

    /* Messages */
    .auth-msg { color: var(--success); text-align: center; font-size: .95rem; }
    .auth-error { color: var(--danger); text-align: center; font-size: .95rem; }

    /* Link */
    .auth-link { text-align: center; margin: 0; }
    .auth-link a {
      color: var(--c-text);
      text-decoration: underline;
      cursor: pointer;
    }

    @media (max-width: 480px) {
      .auth-card { padding: 1.25rem; }
    }
  `]
})
export class ResetPasswordComponent {
  private auth = inject(Auth);
  private router = inject(Router);

  email = '';
  msg = '';
  err = '';
  busy = false;

  async reset() {
    this.msg = this.err = '';
    if (!this.email) return;
    this.busy = true;

    // Optional: localize email language
    this.auth.languageCode = navigator.language || 'en';

    // Optional redirect after the user clicks the email link
    const actionCodeSettings = {
      url: window.location.origin + '/login?reset=1',
      handleCodeInApp: false,
    };

    try {
      await sendPasswordResetEmail(this.auth, this.email.trim(), actionCodeSettings);
      this.msg = 'If an account exists for that email, a reset link has been sent.';
    } catch (e: any) {
      const code = e?.code as string | undefined;
      this.err =
        code === 'auth/invalid-email' ? 'Please enter a valid email.' :
        code === 'auth/missing-email' ? 'Email is required.' :
        'Could not send reset email. Please try again.';
    } finally {
      this.busy = false;
    }
  }

  go(path: string) {
    this.router.navigate([path]);
  }
}
