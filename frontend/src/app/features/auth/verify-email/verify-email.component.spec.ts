import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { VerifyEmailComponent } from './verify-email.component';
import { AuthService } from '../../../core/auth/auth.service';
import { of, throwError } from 'rxjs';
import { RouterTestingModule } from '@angular/router/testing';
import { Router, ActivatedRoute, convertToParamMap } from '@angular/router';

describe('VerifyEmailComponent', () => {
    let component: VerifyEmailComponent;
    let fixture: ComponentFixture<VerifyEmailComponent>;
    let authServiceSpy: jasmine.SpyObj<AuthService>;

    beforeEach(async () => {
        authServiceSpy = jasmine.createSpyObj('AuthService', ['verifyEmail']);

        await TestBed.configureTestingModule({
            imports: [VerifyEmailComponent, RouterTestingModule],
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
    });

    function createComponent() {
        fixture = TestBed.createComponent(VerifyEmailComponent);
        component = fixture.componentInstance;
    }

    it('should verify email and show success message', fakeAsync(() => {
        authServiceSpy.verifyEmail.and.returnValue(of({ detail: 'Verified' }));
        const navigateSpy = spyOn(TestBed.inject(Router), 'navigate');

        createComponent();
        fixture.detectChanges(); // ngOnInit

        // Since it's sync, loading will be false immediately
        expect(component.loading).toBeFalse();
        expect(component.success).toBeTrue();

        tick(3000); // Redirect timer
        expect(navigateSpy).toHaveBeenCalledWith(['/login']);
    }));

    it('should show error if no token is provided', () => {
        (TestBed.inject(ActivatedRoute).snapshot as any).queryParamMap = convertToParamMap({});

        createComponent();
        fixture.detectChanges(); // ngOnInit

        expect(component.error).toContain('No verification token provided');
        expect(component.loading).toBeFalse();
    });

    it('should handle verification error', () => {
        authServiceSpy.verifyEmail.and.returnValue(throwError(() => ({ error: { detail: 'Token expired' } })));

        createComponent();
        fixture.detectChanges(); // ngOnInit

        expect(component.error).toBe('Token expired');
        expect(component.loading).toBeFalse();
    });
});
