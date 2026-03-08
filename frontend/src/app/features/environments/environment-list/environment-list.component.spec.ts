import { ComponentFixture, TestBed, fakeAsync, tick, discardPeriodicTasks } from '@angular/core/testing';
import { EnvironmentListComponent } from './environment-list.component';
import { EnvironmentsService } from '../environments.service';
import { ProjectsService } from '../../projects/projects.service';
import { ActivatedRoute } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Environment } from '../../../shared/models/environment.model';
import { Project } from '../../../shared/models/project.model';

describe('EnvironmentListComponent', () => {
    let component: EnvironmentListComponent;
    let fixture: ComponentFixture<EnvironmentListComponent>;
    let environmentsServiceSpy: jasmine.SpyObj<EnvironmentsService>;
    let projectsServiceSpy: jasmine.SpyObj<ProjectsService>;
    let envsSubject: Subject<Environment[]>;

    const mockProject: Project = {
        id: 'p1',
        name: 'P1',
        created_at: new Date().toISOString()
    };

    const mockEnv: Environment = {
        id: 'e1',
        project_id: 'p1',
        name: 'E1',
        type: 'ephemeral',
        status: 'provisioning',
        created_at: new Date().toISOString()
    };

    beforeEach(async () => {
        envsSubject = new Subject();
        environmentsServiceSpy = jasmine.createSpyObj('EnvironmentsService', ['getEnvironments', 'pollEnvironments', 'deleteEnvironment']);
        projectsServiceSpy = jasmine.createSpyObj('ProjectsService', ['getProject']);

        environmentsServiceSpy.getEnvironments.and.returnValue(of([]));
        environmentsServiceSpy.pollEnvironments.and.returnValue(envsSubject.asObservable());
        projectsServiceSpy.getProject.and.returnValue(of(mockProject));

        await TestBed.configureTestingModule({
            imports: [EnvironmentListComponent, RouterTestingModule, HttpClientTestingModule],
            providers: [
                { provide: EnvironmentsService, useValue: environmentsServiceSpy },
                { provide: ProjectsService, useValue: projectsServiceSpy },
                {
                    provide: ActivatedRoute,
                    useValue: {
                        snapshot: { paramMap: { get: () => 'p1' } }
                    }
                }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(EnvironmentListComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create and load data', () => {
        expect(component).toBeTruthy();
        expect(projectsServiceSpy.getProject).toHaveBeenCalledWith('p1');
        expect(environmentsServiceSpy.getEnvironments).toHaveBeenCalledWith('p1');
    });

    it('should update environments when polling detects status change', fakeAsync(() => {
        component.environments = [{ ...mockEnv }];

        const updatedEnvs: Environment[] = [{ ...mockEnv, status: 'running' }];
        envsSubject.next(updatedEnvs);
        tick();

        expect(component.environments[0].status).toBe('running');
        discardPeriodicTasks();
    }));

    it('should handle delete result', () => {
        spyOn(window, 'confirm').and.returnValue(true);
        environmentsServiceSpy.deleteEnvironment.and.returnValue(of(undefined as any));
        const loadSpy = spyOn(component, 'loadEnvironments');

        component.deleteEnvironment('e1');
        expect(environmentsServiceSpy.deleteEnvironment).toHaveBeenCalledWith('e1');
        expect(loadSpy).toHaveBeenCalled();
    });

    it('should handle loadProject error', () => {
        projectsServiceSpy.getProject.and.returnValue(throwError(() => ({ error: { detail: 'Project error' } })));
        component.loadProject();
        expect(component.error).toBe('Project error');
    });

    it('should handle loadEnvironments error', () => {
        environmentsServiceSpy.getEnvironments.and.returnValue(throwError(() => ({ error: { detail: 'Envs error' } })));
        component.loadEnvironments();
        expect(component.error).toBe('Envs error');
        expect(component.loading).toBeFalse();
    });

    it('should handle deleteEnvironment error', () => {
        spyOn(window, 'confirm').and.returnValue(true);
        environmentsServiceSpy.deleteEnvironment.and.returnValue(throwError(() => ({ error: { detail: 'Delete failed' } })));
        component.deleteEnvironment('e1');
        expect(component.error).toBe('Delete failed');
    });

    it('should unsubscribe on destroy', () => {
        const subSpy = jasmine.createSpyObj('Subscription', ['unsubscribe']);
        (component as any).pollingSubscription = subSpy;
        component.ngOnDestroy();
        expect(subSpy.unsubscribe).toHaveBeenCalled();
    });
});
