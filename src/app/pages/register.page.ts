// src/app/pages/register.page.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.css']
})
export class RegisterPage implements OnInit {
  showPwd = false;
  loading = false;
  error: string | null = null;

  registerForm!: FormGroup;

  constructor(private fb: FormBuilder, private router: Router) {}

  ngOnInit(): void {
    this.registerForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });
  }

  async onSubmit() {
    if (this.registerForm.invalid || this.loading) return;
    this.loading = true; this.error = null;
    try {
      // TODO: createUser...
      // this.router.navigate(['/dashboard']);
    } catch (e: any) {
      this.error = e?.message ?? 'Registration failed.';
    } finally {
      this.loading = false;
    }
  }

  goTo(path: string) { this.router.navigate([path]); }
}
