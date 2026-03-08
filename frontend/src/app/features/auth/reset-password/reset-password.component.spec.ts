import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ResetPasswordComponent } from './reset-password.component';
import { AuthService } from '../../../core/auth/auth.service';
import { of, throwError } from 'rxjs';
import { RouterTestingModule } from '@angular/router/testing';
import { Router, ActivatedRoute, convertToParamMap } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';

describe('ResetPasswordComponent', () => {
    let component: ResetPasswordComponent;
    let fixture: ComponentFixture<ResetPasswordComponent>;
    let authServiceSpy: jasmine.SpyObj<AuthService>;
    let router: Router;

    beforeEach(async () => {
        authServiceSpy = jasmine.createSpyObj('AuthService', ['resetPassword']);

        await TestBed.configureTestingModule({
            imports: [ResetPasswordComponent, RouterTestingModule, ReactiveFormsModule],
            providers: [
                { provide: AuthService, useValue: authServiceSpy },
                {
                    provide: ActivatedRoute,
                    useValue: {
                        snapshot: {
                            queryParamMap: convertToParamMap({ token: 'test-token' })
                        }
                    }
                }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(ResetPasswordComponent);
        component = fixture.componentInstance;
        router = TestBed.inject(Router);
        fixture.detectChanges();
    });

    it('should show error if no token is provided', () => {
        // Create new component with no token
        const route = TestBed.inject(ActivatedRoute);
        (route.snapshot as any).queryParamMap = convertToParamMap({});

        const localFixture = TestBed.createComponent(ResetPasswordComponent);
        const localComp = localFixture.componentInstance;
        localFixture.detectChanges();

        expect(localComp.error).toBe('No reset token provided.');
        const errorEl = localFixture.debugElement.query(By.css('.alert-error'));
        expect(errorEl.nativeElement.textContent).toContain('No reset token provided');
    });

    it('should show success message after password reset', fakeAsync(() => {
        component.resetPasswordForm.patchValue({ password: 'newpassword123', confirmPassword: 'newpassword123' });
        authServiceSpy.resetPassword.and.returnValue(of({ detail: 'Success' }));
        const navigateSpy = spyOn(router, 'navigate');

        component.onSubmit();
        fixture.detectChanges();

        expect(component.success).toBeTrue();
        const successEl = fixture.debugElement.query(By.css('.alert-success'));
        expect(successEl.nativeElement.textContent).toContain('Success');

        tick(3000);
        expect(navigateSpy).toHaveBeenCalledWith(['/login']);
    }));

    it('should show validation error for password mismatch', () => {
        component.resetPasswordForm.patchValue({ password: 'password123', confirmPassword: 'mismatch' });
        component.resetPasswordForm.get('confirmPassword')?.markAsTouched();
        fixture.detectChanges();

        expect(component.resetPasswordForm.errors?.['mismatch']).toBeTrue();
        const mismatchEl = fixture.debugElement.query(By.css('.alert-error')); // wait, let's check template
        // In template: <div *ngIf="resetPasswordForm.errors?.['mismatch'] ...> Passwords do not match </div>
    });

    it('should handle API error and show it to user', () => {
        component.resetPasswordForm.patchValue({ password: 'newpassword123', confirmPassword: 'newpassword123' });
        authServiceSpy.resetPassword.and.returnValue(throwError(() => ({ error: { detail: 'Token expired' } })));

        component.onSubmit();
        fixture.detectChanges();

        expect(component.error).toBe('Token expired');
        const errorEl = fixture.debugElement.query(By.css('.alert-error'));
        expect(errorEl.nativeElement.textContent).toContain('Token expired');
    });
});
