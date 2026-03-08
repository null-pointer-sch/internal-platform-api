import { Component, OnInit, OnDestroy, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { EnvironmentsService } from '../environments.service';
import { ProjectsService } from '../../projects/projects.service';
import { Environment } from '../../../shared/models/environment.model';
import { Project } from '../../../shared/models/project.model';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';


@Component({
  selector: 'app-environment-list',
  standalone: true,
  imports: [CommonModule, RouterModule, LoadingSpinnerComponent, StatusBadgeComponent],
  templateUrl: './environment-list.component.html',
  styleUrl: './environment-list.component.css'
})
export class EnvironmentListComponent implements OnInit, OnDestroy {
  environments: Environment[] = [];
  project: Project | null = null;
  loading = false;
  error: string | null = null;
  projectId: string | null = null;
  private pollingSubscription: any;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly environmentsService: EnvironmentsService,
    private readonly projectsService: ProjectsService,
    private readonly ngZone: NgZone,
    private readonly cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.projectId = this.route.snapshot.paramMap.get('projectId');
    if (this.projectId) {
      this.loadProject();
      this.loadEnvironments();
      this.startPolling();
    }
  }

  ngOnDestroy(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
    }
  }

  loadProject(): void {
    if (!this.projectId) return;
    this.projectsService.getProject(this.projectId).subscribe({
      next: (project) => {
        this.ngZone.run(() => {
          this.project = project;
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          this.error = err.error?.detail || 'Failed to load project';
          this.cdr.detectChanges();
        });
      }
    });
  }

  loadEnvironments(): void {
    console.log('EnvironmentListComponent: Loading environments for projectId:', this.projectId);
    if (!this.projectId) return;
    this.loading = true;
    this.error = null;
    this.environmentsService.getEnvironments(this.projectId).subscribe({
      next: (environments) => {
        console.log('EnvironmentListComponent: loadEnvironments success', environments);
        this.ngZone.run(() => {
          this.environments = environments;
          this.loading = false;
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          this.error = err.error?.detail || 'Failed to load environments';
          this.loading = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  startPolling(): void {
    if (!this.projectId) return;
    this.pollingSubscription = this.environmentsService.pollEnvironments(this.projectId).subscribe({
      next: (environments) => {
        this.ngZone.run(() => {
          this.updateEnvironmentsIfChanged(environments);
        });
      },
      error: () => {
        // Silently fail polling
      }
    });
  }

  private updateEnvironmentsIfChanged(newEnvironments: Environment[]): void {
    const hasChanges = this.environments.some((env) => {
      const newEnv = newEnvironments.find(e => e.id === env.id);
      return newEnv && newEnv.status !== env.status;
    });

    if (hasChanges) {
      this.environments = newEnvironments;
      this.cdr.detectChanges();
    }
  }

  deleteEnvironment(id: string): void {
    if (!confirm('Are you sure you want to delete this environment? This will also delete all deployments.')) {
      return;
    }

    this.environmentsService.deleteEnvironment(id).subscribe({
      next: () => {
        console.log('EnvironmentListComponent: deleteEnvironment success', id);
        this.ngZone.run(() => {
          this.loadEnvironments();
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        console.error('EnvironmentListComponent: deleteEnvironment failed', err);
        this.ngZone.run(() => {
          this.error = err.error?.detail || 'Failed to delete environment.';
          this.cdr.detectChanges();
        });
      }
    });
  }
}
