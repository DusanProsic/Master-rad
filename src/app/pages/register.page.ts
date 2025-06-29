import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Auth, createUserWithEmailAndPassword } from '@angular/fire/auth';
import { Router } from '@angular/router';

@Component({
  selector: 'app-register',
  standalone: true,
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.css'],
  imports: [CommonModule, ReactiveFormsModule]
})
export class RegisterPage {
  registerForm: FormGroup;
  error: string | null = null;

  constructor(private fb: FormBuilder, private auth: Auth, private router: Router) {
    this.registerForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  async onSubmit() {
    const { email, password } = this.registerForm.value;
    this.error = null;

    try {
      await createUserWithEmailAndPassword(this.auth, email, password);
      this.router.navigate(['/login']);
    } catch (err: any) {
      this.error = err.message;
    }
  }
}