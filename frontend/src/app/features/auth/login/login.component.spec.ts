import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginComponent } from './login.component';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';
import { Router, ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { RouterTestingModule } from '@angular/router/testing';

describe('LoginComponent', () => {
    let component: LoginComponent;
    let fixture: ComponentFixture<LoginComponent>;
    let authServiceSpy: jasmine.SpyObj<AuthService>;
    let router: Router;

    beforeEach(async () => {
        authServiceSpy = jasmine.createSpyObj('AuthService', ['login', 'isAuthenticated']);
        authServiceSpy.isAuthenticated.and.returnValue(false);

        await TestBed.configureTestingModule({
            imports: [LoginComponent, ReactiveFormsModule, RouterTestingModule],
            providers: [
                FormBuilder,
                { provide: AuthService, useValue: authServiceSpy },
                {
                    provide: ActivatedRoute,
                    useValue: {
                        snapshot: { queryParams: { returnUrl: '/custom-path' } }
                    }
                }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(LoginComponent);
        component = fixture.componentInstance;
        router = TestBed.inject(Router);
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should redirect if already authenticated', () => {
        authServiceSpy.isAuthenticated.and.returnValue(true);
        component.ngOnInit();
        // Spying on router.navigate is better
        const navigateSpy = spyOn(router, 'navigate');
        component.ngOnInit();
        expect(navigateSpy).toHaveBeenCalledWith(['/projects']);
    });

    it('should call authService.login on valid submit', () => {
        const credentials = { email: 'test@example.com', password: 'password123' };
        component.loginForm.patchValue(credentials);

        authServiceSpy.login.and.returnValue(of({ id: '1', email: 'test@example.com' }));
        const navigateByUrlSpy = spyOn(router, 'navigateByUrl');

        component.onSubmit();

        expect(authServiceSpy.login).toHaveBeenCalledWith({ username: credentials.email, password: credentials.password });
        expect(navigateByUrlSpy).toHaveBeenCalledWith('/custom-path');
        expect(component.loading).toBeFalse();
    });

    it('should handle login error', () => {
        component.loginForm.patchValue({ email: 'test@example.com', password: 'wrong' });

        const errorRes = { error: { detail: 'Invalid credentials' } };
        authServiceSpy.login.and.returnValue(throwError(() => errorRes));

        component.onSubmit();

        expect(component.error).toBe('Invalid credentials');
        expect(component.loading).toBeFalse();
    });
});
