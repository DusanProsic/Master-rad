import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="auth-page">
      <section class="card auth-card">
        <h2 class="auth-title">Reset Password</h2>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="auth-form">
          <div class="field">
            <label class="label" for="reset-email">Email</label>
            <input id="reset-email" class="input" type="email" formControlName="email" autocomplete="email" />
            <small class="error" *ngIf="form.get('email')?.invalid && form.get('email')?.touched">
              Please enter a valid email.
            </small>
          </div>

          <button class="btn w-full" type="submit" [disabled]="form.invalid || loading">
            {{ loading ? 'Sending…' : 'Send Reset Link' }}
          </button>
        </form>

        <div *ngIf="success" class="auth-hint">
          ✅ If an account exists for that email, a reset link has been sent.
        </div>
        <div *ngIf="error" class="auth-error">{{ error }}</div>

        <p class="auth-link" style="text-align:center;margin:0">
          Remembered your password? <a routerLink="/login">Back to login</a>
        </p>
      </section>
    </div>
  `,
  styles: [`
    .auth-page { min-height: 100dvh; display: grid; place-items: center; padding: var(--gap-lg); }
    .auth-card { width: 100%; max-width: 420px; border: 1px solid var(--c-border); display: grid; gap: var(--gap); }
    .auth-title { margin: 0; text-align: center; }
    .auth-form { display: grid; gap: var(--gap); }
    .field { display: grid; gap: .4rem; }
    .label { font-weight: 600; }
    .w-full { width: 100%; }
    .error { color: var(--danger); font-size: .85rem; }
    .auth-error { border: 1px solid var(--danger); color: var(--danger); background: color-mix(in oklab, var(--danger), transparent 90%); padding: .6rem .8rem; border-radius: var(--radius-sm); }
    .auth-hint { color: var(--c-muted); }
  `]
})
export class ResetPasswordComponent {
  private fb = inject(FormBuilder);

  loading = false;
  success = false;
  error: string | null = null;

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]]
  });

  async onSubmit() {
    if (this.form.invalid || this.loading) return;
    this.loading = true; this.error = null; this.success = false;
    try {
      // TODO: sendPasswordResetEmail(this.auth, this.form.value.email!)
      this.success = true;
    } catch (e: any) {
      this.error = e?.message ?? 'Could not send reset email.';
    } finally {
      this.loading = false;
    }
  }
}
