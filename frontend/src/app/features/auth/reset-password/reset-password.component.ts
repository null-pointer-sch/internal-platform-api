import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  template: `
    <div class="reset-container" style="display: flex; justify-content: center; align-items: center; min-height: calc(100vh - 60px); padding: 20px;">
      <div class="reset-card" style="background: var(--surface-card); padding: 40px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); width: 100%; max-width: 400px; text-align: center;">
        <h1 style="margin-bottom: 24px; color: var(--text-primary);">New Password</h1>
        
        <div *ngIf="success" class="alert alert-success" style="margin-bottom: 24px; color: #155724;">
          Success! Your password has been reset. Redirecting to login...
        </div>

        <div *ngIf="!success">
          <p style="margin-bottom: 24px;">Please enter your new password below.</p>
          
          <form [formGroup]="resetPasswordForm" (ngSubmit)="onSubmit()">
            <div style="margin-bottom: 16px; text-align: left;">
              <label style="display: block; margin-bottom: 8px;">New Password</label>
              <input type="password" formControlName="password" class="form-control" style="width: 100%; padding: 12px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--surface-input); color: var(--text-primary);" />
            </div>

            <div style="margin-bottom: 24px; text-align: left;">
              <label style="display: block; margin-bottom: 8px;">Confirm Password</label>
              <input type="password" formControlName="confirmPassword" class="form-control" style="width: 100%; padding: 12px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--surface-input); color: var(--text-primary);" />
              <div *ngIf="resetPasswordForm.errors?.['mismatch'] && resetPasswordForm.get('confirmPassword')?.touched" style="color: #721c24; font-size: 12px; margin-top: 4px;">
                Passwords do not match
              </div>
            </div>
            
            <button type="submit" [disabled]="resetPasswordForm.invalid || loading" class="btn-primary" style="width: 100%; padding: 12px; border: none; border-radius: 4px; background: var(--primary-color); color: white; cursor: pointer; font-weight: 500;">
              {{ loading ? 'Updating...' : 'Set New Password' }}
            </button>
          </form>

          <div *ngIf="error" class="alert alert-error" style="margin-top: 16px; color: #721c24;">
            {{ error }}
          </div>
        </div>
      </div>
    </div>
  `
})
export class ResetPasswordComponent implements OnInit {
  resetPasswordForm: FormGroup;
  loading = false;
  success = false;
  error: string | null = null;
  token: string | null = null;

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) {
    this.resetPasswordForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: [this.passwordMatchValidator] });
  }

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token');
    if (!this.token) {
      this.error = 'No reset token provided.';
    }
  }

  passwordMatchValidator(g: FormGroup) {
    return g.get('password')?.value === g.get('confirmPassword')?.value
      ? null : { 'mismatch': true };
  }

  onSubmit(): void {
    if (this.resetPasswordForm.invalid || !this.token) return;

    this.loading = true;
    this.error = null;

    this.authService.resetPassword(this.token, this.resetPasswordForm.value.password).subscribe({
      next: () => {
        this.loading = false;
        this.success = true;
        setTimeout(() => this.router.navigate(['/login']), 3000);
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.detail || 'Failed to reset password.';
      }
    });
  }
}
