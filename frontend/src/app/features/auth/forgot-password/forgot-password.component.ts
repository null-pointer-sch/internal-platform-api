import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  template: `
    <div class="forgot-container" style="display: flex; justify-content: center; align-items: center; min-height: calc(100vh - 60px); padding: 20px;">
      <div class="forgot-card" style="background: var(--surface-card); padding: 40px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); width: 100%; max-width: 400px; text-align: center;">
        <h1 style="margin-bottom: 24px; color: var(--text-primary);">Reset Password</h1>
        
        <div *ngIf="success" class="alert alert-success" style="margin-bottom: 24px; color: #155724;">
          If an account exists for {{ email }}, a reset link has been sent.
        </div>

        <div *ngIf="!success">
          <p style="margin-bottom: 24px;">Enter your email and we'll send you a link to reset your password.</p>
          
          <form [formGroup]="forgotPasswordForm" (ngSubmit)="onSubmit()">
            <div style="margin-bottom: 24px; text-align: left;">
              <label style="display: block; margin-bottom: 8px;">Email</label>
              <input type="email" formControlName="email" class="form-control" placeholder="you@example.com" style="width: 100%; padding: 12px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--surface-input); color: var(--text-primary);" />
            </div>
            
            <button type="submit" [disabled]="forgotPasswordForm.invalid || loading" class="btn-primary" style="width: 100%; padding: 12px; border: none; border-radius: 4px; background: var(--primary-color); color: white; cursor: pointer; font-weight: 500;">
              {{ loading ? 'Sending...' : 'Send Reset Link' }}
            </button>
          </form>

          <div *ngIf="error" class="alert alert-error" style="margin-top: 16px; color: #721c24;">
            {{ error }}
          </div>
        </div>
        
        <p style="margin-top: 24px;"><a routerLink="/login" style="color: var(--primary-color); text-decoration: none;">Back to Login</a></p>
      </div>
    </div>
  `
})
export class ForgotPasswordComponent {
  forgotPasswordForm: FormGroup;
  loading = false;
  success = false;
  error: string | null = null;
  email: string = '';

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthService
  ) {
    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }


  onSubmit(): void {
    if (this.forgotPasswordForm.invalid) return;

    this.loading = true;
    this.error = null;
    this.email = this.forgotPasswordForm.value.email;

    this.authService.forgotPassword(this.email).subscribe({
      next: () => {
        this.loading = false;
        this.success = true;
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.detail || 'An error occurred. Please try again.';
      }
    });
  }
}
