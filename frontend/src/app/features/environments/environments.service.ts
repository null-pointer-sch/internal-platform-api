import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, interval } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Environment, EnvironmentCreate } from '../../shared/models/environment.model';

@Injectable({
  providedIn: 'root'
})
export class EnvironmentsService {
  private readonly apiUrl = `${environment.apiUrl}/api/v1/environments`;

  constructor(private readonly http: HttpClient) { }

  getEnvironments(projectId: string): Observable<Environment[]> {
    return this.http.get<Environment[]>(`${this.apiUrl}/projects/${projectId}`);
  }

  pollEnvironments(projectId: string, intervalMs: number = 3000): Observable<Environment[]> {
    return interval(intervalMs).pipe(
      switchMap(() => this.getEnvironments(projectId))
    );
  }

  getEnvironment(id: string): Observable<Environment> {
    return this.http.get<Environment>(`${this.apiUrl}/${id}`);
  }

  createEnvironment(projectId: string, env: EnvironmentCreate): Observable<Environment> {
    return this.http.post<Environment>(`${this.apiUrl}/projects/${projectId}`, env);
  }

  deleteEnvironment(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
