import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ForgotPasswordComponent } from './forgot-password.component';
import { AuthService } from '../../../core/auth/auth.service';
import { of, throwError } from 'rxjs';
import { RouterTestingModule } from '@angular/router/testing';
import { ReactiveFormsModule } from '@angular/forms';

describe('ForgotPasswordComponent', () => {
    let component: ForgotPasswordComponent;
    let fixture: ComponentFixture<ForgotPasswordComponent>;
    let authServiceSpy: jasmine.SpyObj<AuthService>;

    beforeEach(async () => {
        authServiceSpy = jasmine.createSpyObj('AuthService', ['forgotPassword']);

        await TestBed.configureTestingModule({
            imports: [ForgotPasswordComponent, RouterTestingModule, ReactiveFormsModule],
            providers: [
                { provide: AuthService, useValue: authServiceSpy }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(ForgotPasswordComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create and initialize form', () => {
        expect(component).toBeTruthy();
        expect(component.forgotPasswordForm).toBeDefined();
    });

    it('should submit valid form', () => {
        component.forgotPasswordForm.patchValue({ email: 'test@example.com' });
        authServiceSpy.forgotPassword.and.returnValue(of({ detail: 'Email sent' }));

        component.onSubmit();
        expect(authServiceSpy.forgotPassword).toHaveBeenCalledWith('test@example.com');
        expect(component.success).toBeTrue();
        expect(component.loading).toBeFalse();
        expect(component.email).toBe('test@example.com');
    });

    it('should handle submission error', () => {
        component.forgotPasswordForm.patchValue({ email: 'test@example.com' });
        authServiceSpy.forgotPassword.and.returnValue(throwError(() => ({ error: { detail: 'User not found' } })));

        component.onSubmit();
        expect(component.error).toBe('User not found');
        expect(component.loading).toBeFalse();
    });
});
