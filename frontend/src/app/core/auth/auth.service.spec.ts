import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { User } from '../../shared/models/user.model';

describe('AuthService', () => {
    let service: AuthService;
    let httpMock: HttpTestingController;
    let router: Router;

    const mockUser: User = {
        id: '123',
        email: 'test@example.com'
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                provideRouter([]),
            ],
        });

        service = TestBed.inject(AuthService);
        httpMock = TestBed.inject(HttpTestingController);
        router = TestBed.inject(Router);

        // Initial loadCurrentUser call in constructor
        const req = httpMock.expectOne('/api/v1/auth/me');
        expect(req.request.method).toBe('GET');
        req.flush(null); // Default to unauthenticated
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should return false for isAuthenticated when not logged in', () => {
        expect(service.isAuthenticated()).toBeFalse();
    });

    it('should login successfully', (done) => {
        const credentials = { username: 'test@example.com', password: 'password' };

        service.login(credentials).subscribe(user => {
            expect(user).toEqual(mockUser);
            expect(service.isAuthenticated()).toBeTrue();
            done();
        });

        const loginReq = httpMock.expectOne('/api/v1/auth/login');
        expect(loginReq.request.method).toBe('POST');
        loginReq.flush({}); // backend returns 200/204 usually

        const meReq = httpMock.expectOne('/api/v1/auth/me');
        expect(meReq.request.method).toBe('GET');
        meReq.flush(mockUser);
    });

    it('should logout and navigate to login', () => {
        spyOn(router, 'navigate');

        // Set authenticated state first
        service.login({ username: 'u', password: 'p' }).subscribe();
        httpMock.expectOne('/api/v1/auth/login').flush({});
        httpMock.expectOne('/api/v1/auth/me').flush(mockUser);

        expect(service.isAuthenticated()).toBeTrue();

        service.logout();

        const logoutReq = httpMock.expectOne('/api/v1/auth/logout');
        expect(logoutReq.request.method).toBe('POST');
        logoutReq.flush({});

        expect(service.isAuthenticated()).toBeFalse();
        expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('should verify email', () => {
        const token = 'verify-token';
        service.verifyEmail(token).subscribe();

        const req = httpMock.expectOne('/api/v1/auth/verify-email');
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({ token });
        req.flush({});
    });

    it('should return user from getCurrentUser after successful load', () => {
        expect(service.getCurrentUser()).toBeNull();

        service.loadCurrentUser().subscribe();
        const req = httpMock.expectOne('/api/v1/auth/me');
        req.flush(mockUser);

        expect(service.getCurrentUser()).toEqual(mockUser);
    });
});
