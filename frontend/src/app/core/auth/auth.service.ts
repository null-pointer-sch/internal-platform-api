import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, map, tap, catchError, of, switchMap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { User } from '../../shared/models/user.model';

export interface LoginCredentials {
  username: string; // email
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
}

export interface RegisterResponse {
  detail: string;
  verification_url?: string;
  email_mode?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // undefined means we haven't checked yet. null means unauthenticated.
  private readonly currentUserSubject = new BehaviorSubject<User | null | undefined>(undefined);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router
  ) {
    // Attempt to load session on startup
    this.loadCurrentUser().subscribe();
  }

  login(credentials: LoginCredentials): Observable<User | null> {
    console.log('AuthService: Attempting login for', credentials.username);
    const params = new URLSearchParams();
    params.append('username', credentials.username);
    params.append('password', credentials.password);

    return this.http.post<any>(
      `${environment.apiUrl}/api/v1/auth/login`,
      params.toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        withCredentials: true
      }
    ).pipe(
      tap(res => console.log('AuthService: Login POST success', res)),
      switchMap(() => this.loadCurrentUser()),
      tap(user => console.log('AuthService: Final user state after login', user))
    );
  }

  register(data: RegisterData): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${environment.apiUrl}/api/v1/auth/register`, data, { withCredentials: true });
  }

  verifyEmail(token: string): Observable<any> {
    return this.http.post(`${environment.apiUrl}/api/v1/auth/verify-email`, { token }, { withCredentials: true });
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${environment.apiUrl}/api/v1/auth/forgot-password`, { email }, { withCredentials: true });
  }

  resetPassword(token: string, password: string): Observable<any> {
    return this.http.post(`${environment.apiUrl}/api/v1/auth/reset-password`, { token, password }, { withCredentials: true });
  }

  logout(): void {
    this.http.post(`${environment.apiUrl}/api/v1/auth/logout`, {}, { withCredentials: true }).subscribe({
      next: () => {
        this.currentUserSubject.next(null);
        this.router.navigate(['/login']);
      },
      error: () => {
        this.currentUserSubject.next(null);
        this.router.navigate(['/login']);
      }
    });
  }

  checkAuth(): Observable<boolean> {
    // For AuthGuard: if already loaded, return it. Else fetch it.
    if (this.currentUserSubject.value !== undefined) {
      return of(!!this.currentUserSubject.value);
    }
    return this.loadCurrentUser().pipe(
      map(user => !!user)
    );
  }

  isAuthenticated(): boolean {
    return !!this.currentUserSubject.value;
  }

  loadCurrentUser(): Observable<User | null> {
    console.log('AuthService: Loading current user...');
    return this.http.get<User>(`${environment.apiUrl}/api/v1/auth/me`, { withCredentials: true }).pipe(
      tap(user => {
        console.log('AuthService: loadCurrentUser success', user);
        this.currentUserSubject.next(user);
      }),
      catchError(err => {
        console.warn('AuthService: loadCurrentUser failed (unauthenticated)', err);
        this.currentUserSubject.next(null);
        return of(null);
      })
    );
  }

  getCurrentUser(): User | null {
    const user = this.currentUserSubject.value;
    return user === undefined ? null : user;
  }
}
