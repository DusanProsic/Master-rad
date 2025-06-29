import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Auth, signInWithEmailAndPassword } from '@angular/fire/auth';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.css'],
  imports: [CommonModule, ReactiveFormsModule],
})
export class LoginPage {
  loginForm: FormGroup;
  error: string | null = null;

  constructor(private fb: FormBuilder, private auth: Auth, private router: Router) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  async onSubmit() {
  const { email, password } = this.loginForm.value;
  this.error = null;

  try {
    console.log('Logging in with:', email, password); // debug
    const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
    console.log('Login successful:', userCredential); // debug

    this.router.navigate(['/dashboard']); // or wherever you want to go after login
  } catch (err: any) {
    console.error('Login error:', err); // debug
    this.error = err.message;
  }
}
}
