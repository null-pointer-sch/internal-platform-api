import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DeploymentCreateComponent } from './deployment-create.component';
import { DeploymentsService } from '../deployments.service';
import { EnvironmentsService } from '../../environments/environments.service';
import { of, throwError } from 'rxjs';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';

describe('DeploymentCreateComponent', () => {
    let component: DeploymentCreateComponent;
    let fixture: ComponentFixture<DeploymentCreateComponent>;
    let deploymentsServiceSpy: jasmine.SpyObj<DeploymentsService>;
    let envsServiceSpy: jasmine.SpyObj<EnvironmentsService>;

    beforeEach(async () => {
        deploymentsServiceSpy = jasmine.createSpyObj('DeploymentsService', ['createDeployment']);
        envsServiceSpy = jasmine.createSpyObj('EnvironmentsService', ['getEnvironments', 'getEnvironment']);
        envsServiceSpy.getEnvironment.and.returnValue(of({ id: 'e1', status: 'running' } as any));

        await TestBed.configureTestingModule({
            imports: [DeploymentCreateComponent, RouterTestingModule, HttpClientTestingModule, ReactiveFormsModule],
            providers: [
                { provide: DeploymentsService, useValue: deploymentsServiceSpy },
                { provide: EnvironmentsService, useValue: envsServiceSpy },
                {
                    provide: ActivatedRoute,
                    useValue: {
                        snapshot: {
                            queryParamMap: convertToParamMap({}),
                            paramMap: convertToParamMap({ projectId: 'p1', envId: 'e1' })
                        }
                    }
                }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(DeploymentCreateComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create and initialize', () => {
        expect(component).toBeTruthy();
        expect(component.deploymentForm).toBeDefined();
        expect(component.environmentId).toBe('e1');
    });

    it('should submit valid form', () => {
        component.deploymentForm.patchValue({ version: 'v1.0.0', config_override: '{}' });
        deploymentsServiceSpy.createDeployment.and.returnValue(of({ id: 'd1' } as any));

        component.onSubmit();
        expect(deploymentsServiceSpy.createDeployment).toHaveBeenCalled();
        expect(component.loading).toBeFalse();
    });

    it('should handle error', () => {
        component.deploymentForm.patchValue({ version: 'v1.0.0' });
        deploymentsServiceSpy.createDeployment.and.returnValue(throwError(() => ({ error: { detail: 'Deploy failed' } })));

        component.onSubmit();
        expect(component.error).toBe('Deploy failed');
    });
});
