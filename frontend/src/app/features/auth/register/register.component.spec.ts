import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { RegisterComponent } from './register.component';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { RouterTestingModule } from '@angular/router/testing';

describe('RegisterComponent', () => {
    let component: RegisterComponent;
    let fixture: ComponentFixture<RegisterComponent>;
    let authServiceSpy: jasmine.SpyObj<AuthService>;
    let router: Router;

    beforeEach(async () => {
        authServiceSpy = jasmine.createSpyObj('AuthService', ['register']);

        await TestBed.configureTestingModule({
            imports: [RegisterComponent, ReactiveFormsModule, RouterTestingModule],
            providers: [
                FormBuilder,
                { provide: AuthService, useValue: authServiceSpy }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(RegisterComponent);
        component = fixture.componentInstance;
        router = TestBed.inject(Router);
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should have invalid form when empty', () => {
        expect(component.registerForm.valid).toBeFalse();
    });

    it('should validate email format', () => {
        const email = component.registerForm.controls['email'];
        email.setValue('invalid-email');
        expect(email.errors?.['email']).toBeTruthy();

        email.setValue('test@example.com');
        expect(email.errors).toBeNull();
    });

    it('should validate password mismatch', () => {
        component.registerForm.patchValue({
            email: 'test@example.com',
            password: 'password123',
            confirmPassword: 'different-password'
        });
        expect(component.registerForm.controls['confirmPassword'].errors?.['passwordMismatch']).toBeTruthy();

        component.registerForm.patchValue({
            confirmPassword: 'password123'
        });
        expect(component.registerForm.controls['confirmPassword'].errors).toBeNull();
    });

    it('should call authService.register on submit when form is valid', () => {
        const registerData = { email: 'test@example.com', password: 'password123' };
        component.registerForm.patchValue({
            ...registerData,
            confirmPassword: 'password123'
        });

        authServiceSpy.register.and.returnValue(of({ detail: 'Success', email_mode: 'mock_api' }));

        component.onSubmit();

        expect(authServiceSpy.register).toHaveBeenCalledWith(registerData);
        expect(component.successMessage).toBe('Success');
        expect(component.loading).toBeFalse();
    });

    it('should handle registration error', () => {
        component.registerForm.patchValue({
            email: 'test@example.com',
            password: 'password123',
            confirmPassword: 'password123'
        });

        const errorRes = { error: { detail: 'Already registered' } };
        authServiceSpy.register.and.returnValue(throwError(() => errorRes));

        component.onSubmit();

        expect(component.registerForm.controls['email'].errors?.['alreadyRegistered']).toBeTrue();
        expect(component.loading).toBeFalse();
    });

    it('should show verification link in mock_api mode', () => {
        component.registerForm.patchValue({
            email: 'test@example.com',
            password: 'password123',
            confirmPassword: 'password123'
        });

        authServiceSpy.register.and.returnValue(of({
            detail: 'Success',
            email_mode: 'mock_api',
            verification_url: 'http://localhost/verify'
        }));

        component.onSubmit();

        expect(component.verificationUrl).toBe('/verify');
        expect(component.emailMode).toBe('mock_api');
    });
});
