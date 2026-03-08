import { Component, OnInit, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  error: string | null = null;
  verificationUrl: string | null = null;
  emailMode: string | null = null;
  loading = false;
  isDevelopment = !environment.production;

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly ngZone: NgZone,
    private readonly cdr: ChangeDetectorRef
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
    // If already logged in, skip the login page
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/projects']);
    }
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      return;
    }

    this.loading = true;
    this.error = null;

    const { email, password } = this.loginForm.value;
    console.log('LoginComponent: Submitting form...');
    this.authService.login({ username: email, password }).subscribe({
      next: (user) => {
        console.log('LoginComponent: Login successful', user);
        this.ngZone.run(() => {
          this.loading = false;
          const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/projects';
          this.router.navigateByUrl(returnUrl);
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        console.error('LoginComponent: Login failed', err);
        this.ngZone.run(() => {
          this.loading = false;
          this.verificationUrl = err.error?.verification_url || null;
          this.emailMode = err.error?.email_mode || null;

          this.error = err.error?.detail || 'Login failed. Please check your credentials.';
          // If the error object is a complex validation detail (422), flatten it
          if (Array.isArray(err.error?.detail)) {
            this.error = err.error.detail.map((d: any) => d.msg).join(', ');
          }
          this.cdr.detectChanges();
        });
      }
    });
  }

  loginAsAdmin(): void {
    this.loginForm.patchValue({
      email: 'admin@envctl.dev',
      password: 'adminpassword'
    });
    this.onSubmit();
  }

}
