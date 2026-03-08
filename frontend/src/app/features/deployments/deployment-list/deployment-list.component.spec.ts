import { ComponentFixture, TestBed, fakeAsync, tick, discardPeriodicTasks } from '@angular/core/testing';
import { DeploymentListComponent } from './deployment-list.component';
import { DeploymentsService } from '../deployments.service';
import { EnvironmentsService } from '../../environments/environments.service';
import { ActivatedRoute } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Environment } from '../../../shared/models/environment.model';
import { Deployment } from '../../../shared/models/deployment.model';

describe('DeploymentListComponent', () => {
    let component: DeploymentListComponent;
    let fixture: ComponentFixture<DeploymentListComponent>;
    let deploymentsServiceSpy: jasmine.SpyObj<DeploymentsService>;
    let environmentsServiceSpy: jasmine.SpyObj<EnvironmentsService>;
    let depsSubject: Subject<Deployment[]>;

    const mockEnv: Environment = {
        id: 'e1',
        project_id: 'p1',
        name: 'E1',
        type: 'ephemeral',
        status: 'running',
        created_at: new Date().toISOString()
    };

    const mockDep: Deployment = {
        id: 'd1',
        environment_id: 'e1',
        version: 'v1',
        status: 'pending',
        created_at: new Date().toISOString()
    };

    beforeEach(async () => {
        depsSubject = new Subject();
        deploymentsServiceSpy = jasmine.createSpyObj('DeploymentsService', ['getDeployments', 'pollDeployments']);
        environmentsServiceSpy = jasmine.createSpyObj('EnvironmentsService', ['getEnvironment']);

        deploymentsServiceSpy.getDeployments.and.returnValue(of([]));
        deploymentsServiceSpy.pollDeployments.and.returnValue(depsSubject.asObservable());
        environmentsServiceSpy.getEnvironment.and.returnValue(of(mockEnv));

        await TestBed.configureTestingModule({
            imports: [DeploymentListComponent, RouterTestingModule, HttpClientTestingModule],
            providers: [
                { provide: DeploymentsService, useValue: deploymentsServiceSpy },
                { provide: EnvironmentsService, useValue: environmentsServiceSpy },
                {
                    provide: ActivatedRoute,
                    useValue: {
                        snapshot: { paramMap: { get: () => 'e1' } }
                    }
                }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(DeploymentListComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create and load data', () => {
        expect(component).toBeTruthy();
        expect(environmentsServiceSpy.getEnvironment).toHaveBeenCalledWith('e1');
        expect(deploymentsServiceSpy.getDeployments).toHaveBeenCalledWith('e1');
    });

    it('should update deployments when polling detects status change', fakeAsync(() => {
        component.deployments = [{ ...mockDep }];

        const updatedDeps: Deployment[] = [{ ...mockDep, status: 'succeeded' }];
        depsSubject.next(updatedDeps);
        tick();

        expect(component.deployments[0].status).toBe('succeeded');
        discardPeriodicTasks();
    }));

    it('should handle loadEnvironment error', () => {
        environmentsServiceSpy.getEnvironment.and.returnValue(throwError(() => ({ error: { detail: 'Env error' } })));
        component.loadEnvironment();
        expect(component.error).toBe('Env error');
    });

    it('should handle loadDeployments error', () => {
        deploymentsServiceSpy.getDeployments.and.returnValue(throwError(() => ({ error: { detail: 'Deps error' } })));
        component.loadDeployments();
        expect(component.error).toBe('Deps error');
        expect(component.loading).toBeFalse();
    });

    it('should handle update with no changes', fakeAsync(() => {
        component.deployments = [{ ...mockDep }];
        const cdrSpy = spyOn((component as any).cdr, 'detectChanges');

        const sameDeps: Deployment[] = [{ ...mockDep }];
        depsSubject.next(sameDeps);
        tick();

        expect(cdrSpy).not.toHaveBeenCalled();
        discardPeriodicTasks();
    }));

    it('should unsubscribe on destroy', () => {
        const subSpy = jasmine.createSpyObj('Subscription', ['unsubscribe']);
        (component as any).pollingSubscription = subSpy;
        component.ngOnDestroy();
        expect(subSpy.unsubscribe).toHaveBeenCalled();
    });
});
