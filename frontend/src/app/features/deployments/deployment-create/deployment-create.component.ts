import { Component, OnInit, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DeploymentsService } from '../deployments.service';
import { EnvironmentsService } from '../../environments/environments.service';
import { Environment } from '../../../shared/models/environment.model';


@Component({
  selector: 'app-deployment-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './deployment-create.component.html',
  styleUrl: './deployment-create.component.css'
})
export class DeploymentCreateComponent implements OnInit {
  deploymentForm: FormGroup;
  environment: Environment | null = null;
  environmentId: string | null = null;
  loading = false;
  error: string | null = null;

  constructor(
    private readonly fb: FormBuilder,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly deploymentsService: DeploymentsService,
    private readonly environmentsService: EnvironmentsService,
    private readonly ngZone: NgZone,
    private readonly cdr: ChangeDetectorRef
  ) {
    this.deploymentForm = this.fb.group({
      version: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
    this.environmentId = this.route.snapshot.paramMap.get('envId');
    if (this.environmentId) {
      this.loadEnvironment();
    }
  }

  loadEnvironment(): void {
    if (!this.environmentId) return;
    this.environmentsService.getEnvironment(this.environmentId).subscribe({
      next: (environment) => {
        this.ngZone.run(() => {
          this.environment = environment;
          if (environment.status !== 'running') {
            this.error = `Environment is not ready (status: ${environment.status}). Only running environments can receive deployments.`;
          }
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

  onSubmit(): void {
    if (this.deploymentForm.invalid) {
      return;
    }

    if (!this.environmentId) return;

    if (this.environment?.status !== 'running') {
      this.error = 'Environment must be running to create a deployment';
      return;
    }

    this.loading = true;
    this.error = null;

    const { version } = this.deploymentForm.value;
    console.log('DeploymentCreateComponent: Submitting deployment...', { version });
    this.deploymentsService.createDeployment(this.environmentId, { version }).subscribe({
      next: (deployment) => {
        console.log('DeploymentCreateComponent: createDeployment success', deployment);
        this.ngZone.run(() => {
          this.loading = false;
          this.router.navigate(['/environments', this.environmentId, 'deployments']);
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          this.loading = false;
          this.error = err.error?.detail || 'Failed to create deployment';
          this.cdr.detectChanges();
        });
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/environments', this.environmentId, 'deployments']);
  }
}
