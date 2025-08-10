// src/app/pages/login.page.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.css']
})
export class LoginPage implements OnInit {
  showPwd = false;
  loading = false;
  error: string | null = null;

  loginForm!: FormGroup; // declare first

  constructor(private fb: FormBuilder, private router: Router) {}

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });
  }

  async onSubmit() {
    if (this.loginForm.invalid || this.loading) return;
    this.loading = true; this.error = null;
    try {
      // TODO: signIn...
      // this.router.navigate(['/dashboard']);
    } catch (e: any) {
      this.error = e?.message ?? 'Login failed.';
    } finally {
      this.loading = false;
    }
  }

  goTo(path: string) { this.router.navigate([path]); }
}
