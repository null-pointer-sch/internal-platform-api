import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';


@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    private readonly router: Router
  ) { }

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    request = request.clone({
      withCredentials: true
    });

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          const isAuthEndpoint = request.url.includes('/auth/login') ||
            request.url.includes('/auth/me') ||
            request.url.includes('/auth/register') ||
            request.url.includes('/auth/verify-email');

          if (!isAuthEndpoint) {
            // Only redirect for protected data endpoints
            this.router.navigate(['/login']);
          }
        }
        return throwError(() => error);
      })
    );
  }
}
