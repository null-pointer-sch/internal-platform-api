import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, interval } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Deployment, DeploymentCreate } from '../../shared/models/deployment.model';

@Injectable({
  providedIn: 'root'
})
export class DeploymentsService {
  private readonly apiUrl = `${environment.apiUrl}/api/v1/deployments`;

  constructor(private readonly http: HttpClient) { }

  getDeployments(environmentId: string): Observable<Deployment[]> {
    return this.http.get<Deployment[]>(`${this.apiUrl}/environments/${environmentId}`)
      .pipe(
        map(deployments => deployments.sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ))
      );
  }

  pollDeployments(environmentId: string, intervalMs: number = 3000): Observable<Deployment[]> {
    return interval(intervalMs).pipe(
      switchMap(() => this.getDeployments(environmentId))
    );
  }

  getDeployment(id: string): Observable<Deployment> {
    return this.http.get<Deployment>(`${this.apiUrl}/${id}`);
  }

  createDeployment(environmentId: string, deployment: DeploymentCreate): Observable<Deployment> {
    return this.http.post<Deployment>(`${this.apiUrl}/environments/${environmentId}`, deployment);
  }

  getDeploymentLogs(deploymentId: string): Observable<{ deployment_logs: string; app_logs: string }> {
    return this.http.get<{ deployment_logs: string; app_logs: string }>(`${this.apiUrl}/${deploymentId}/logs`);
  }
}
