import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HeaderComponent } from './header.component';
import { AuthService } from '../../core/auth/auth.service';
import { of, BehaviorSubject } from 'rxjs';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { User } from '../../shared/models/user.model';

describe('HeaderComponent', () => {
    let component: HeaderComponent;
    let fixture: ComponentFixture<HeaderComponent>;
    let authServiceSpy: jasmine.SpyObj<AuthService>;
    let userSubject: BehaviorSubject<User | null>;

    const mockUser: User = {
        id: 'u1',
        email: 'test@example.com'
    };

    beforeEach(async () => {
        userSubject = new BehaviorSubject<User | null>(null);
        authServiceSpy = jasmine.createSpyObj('AuthService', ['logout'], {
            currentUser$: userSubject.asObservable()
        });

        await TestBed.configureTestingModule({
            imports: [HeaderComponent, RouterTestingModule, HttpClientTestingModule],
            providers: [
                { provide: AuthService, useValue: authServiceSpy }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(HeaderComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create and display user when logged in', () => {
        expect(component).toBeTruthy();
        expect(component.currentUser).toBeNull();

        userSubject.next(mockUser);
        fixture.detectChanges();
        expect(component.currentUser).toEqual(mockUser);
    });

    it('should call logout', () => {
        component.logout();
        expect(authServiceSpy.logout).toHaveBeenCalled();
    });
});
