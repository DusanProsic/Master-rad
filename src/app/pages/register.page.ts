// src/app/pages/register.page.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';

import { Auth, createUserWithEmailAndPassword } from '@angular/fire/auth';
import { Firestore, doc, setDoc, serverTimestamp } from '@angular/fire/firestore';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.css']
})
export class RegisterPage implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private auth = inject(Auth);
  private firestore = inject(Firestore);

  showPwd = false;
  loading = false;
  error: string | null = null;

  registerForm!: FormGroup;

  ngOnInit(): void {
    this.registerForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  async onSubmit() {
    if (this.registerForm.invalid || this.loading) return;
    this.loading = true;
    this.error = null;

    const { email, password } = this.registerForm.value;

    try {
      // 1) Create Firebase Auth user
      const cred = await createUserWithEmailAndPassword(this.auth, email, password);

      // 2) (Optional) Create a user profile doc in Firestore
      await setDoc(doc(this.firestore, 'users', cred.user.uid), {
        uid: cred.user.uid,
        email: cred.user.email ?? email,
        createdAt: serverTimestamp(),
      });

      // 3) Go to login with a success flag (show a toast/message there)
      await this.router.navigate(['/login'], { queryParams: { registered: '1' } });
    } catch (e: any) {
      // Map a few common Firebase error codes to friendlier text
      const code = e?.code as string | undefined;
      this.error =
        code === 'auth/email-already-in-use' ? 'That email is already in use.' :
        code === 'auth/invalid-email'        ? 'The email address is invalid.' :
        code === 'auth/weak-password'        ? 'Password should be at least 6 characters.' :
        e?.message ?? 'Registration failed.';
    } finally {
      this.loading = false;
    }
  }

  goTo(path: string) { this.router.navigate([path]); }
}
