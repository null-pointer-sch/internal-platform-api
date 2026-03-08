import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';
import { User } from '../../shared/models/user.model';

describe('AuthService', () => {
    let service: AuthService;
    let httpMock: HttpTestingController;

    const mockUser: User = {
        id: 'user-123',
        email: 'test@example.com'
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule, RouterTestingModule],
            providers: [AuthService]
        });
        service = TestBed.inject(AuthService);
        httpMock = TestBed.inject(HttpTestingController);

        // Initial call from constructor
        const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/auth/me`);
        req.flush(null, { status: 401, statusText: 'Unauthorized' });
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should load current user on success', () => {
        service.loadCurrentUser().subscribe(user => {
            expect(user).toEqual(mockUser);
            expect(service.getCurrentUser()).toEqual(mockUser);
            expect(service.isAuthenticated()).toBeTrue();
        });

        const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/auth/me`);
        expect(req.request.method).toBe('GET');
        req.flush(mockUser);
    });

    it('should handle loadCurrentUser failure', () => {
        service.loadCurrentUser().subscribe(user => {
            expect(user).toBeNull();
            expect(service.isAuthenticated()).toBeFalse();
        });

        const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/auth/me`);
        req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    });

    it('should login successfully', () => {
        const credentials = { username: 'test@example.com', password: 'password' };

        service.login(credentials).subscribe(user => {
            expect(user).toEqual(mockUser);
        });

        const loginReq = httpMock.expectOne(`${environment.apiUrl}/api/v1/auth/login`);
        expect(loginReq.request.method).toBe('POST');
        expect(loginReq.request.headers.get('Content-Type')).toBe('application/x-www-form-urlencoded');
        loginReq.flush({}); // Status 200

        const meReq = httpMock.expectOne(`${environment.apiUrl}/api/v1/auth/me`);
        meReq.flush(mockUser);
    });

    it('should register successfully', () => {
        const registerData = { email: 'test@example.com', password: 'password' };
        const mockRes = { detail: 'Verification email sent' };

        service.register(registerData).subscribe(res => {
            expect(res).toEqual(mockRes);
        });

        const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/auth/register`);
        expect(req.request.method).toBe('POST');
        req.flush(mockRes);
    });
});
