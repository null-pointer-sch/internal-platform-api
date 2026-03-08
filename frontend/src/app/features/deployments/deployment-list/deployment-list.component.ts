import { Component, OnInit, OnDestroy, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DeploymentsService } from '../deployments.service';
import { EnvironmentsService } from '../../environments/environments.service';
import { Deployment } from '../../../shared/models/deployment.model';
import { Environment } from '../../../shared/models/environment.model';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';


@Component({
  selector: 'app-deployment-list',
  standalone: true,
  imports: [CommonModule, RouterModule, LoadingSpinnerComponent, StatusBadgeComponent],
  templateUrl: './deployment-list.component.html',
  styleUrl: './deployment-list.component.css'
})
export class DeploymentListComponent implements OnInit, OnDestroy {
  deployments: Deployment[] = [];
  environment: Environment | null = null;
  environmentId: string | null = null;
  loading = false;
  error: string | null = null;
  private pollingSubscription: any;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly deploymentsService: DeploymentsService,
    private readonly environmentsService: EnvironmentsService,
    private readonly ngZone: NgZone,
    private readonly cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.environmentId = this.route.snapshot.paramMap.get('envId');
    if (this.environmentId) {
      this.loadEnvironment();
      this.loadDeployments();
      this.startPolling();
    }
  }

  ngOnDestroy(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
    }
  }

  loadEnvironment(): void {
    console.log('DeploymentListComponent: Loading environment for envId:', this.environmentId);
    if (!this.environmentId) return;
    this.environmentsService.getEnvironment(this.environmentId).subscribe({
      next: (environment) => {
        console.log('DeploymentListComponent: loadEnvironment success', environment);
        this.ngZone.run(() => {
          this.environment = environment;
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          this.error = err.error?.detail || 'Failed to load environment';
          this.cdr.detectChanges();
        });
      }
    });
  }

  loadDeployments(): void {
    console.log('DeploymentListComponent: Loading deployments for envId:', this.environmentId);
    if (!this.environmentId) return;
    this.loading = true;
    this.error = null;
    this.deploymentsService.getDeployments(this.environmentId).subscribe({
      next: (deployments) => {
        console.log('DeploymentListComponent: loadDeployments success', deployments);
        this.ngZone.run(() => {
          this.deployments = deployments;
          this.loading = false;
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          this.error = err.error?.detail || 'Failed to load deployments';
          this.loading = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  startPolling(): void {
    if (!this.environmentId) return;
    this.pollingSubscription = this.deploymentsService.pollDeployments(this.environmentId).subscribe({
      next: (deployments) => {
        this.ngZone.run(() => {
          this.updateDeploymentsIfChanged(deployments);
        });
      },
      error: () => {
        // Silently fail polling
      }
    });
  }

  private updateDeploymentsIfChanged(newDeployments: Deployment[]): void {
    const hasChanges = this.deployments.some((dep) => {
      const newDep = newDeployments.find(d => d.id === dep.id);
      return newDep && newDep.status !== dep.status;
    });

    if (hasChanges) {
      this.deployments = newDeployments;
      this.cdr.detectChanges();
    }
  }
}
