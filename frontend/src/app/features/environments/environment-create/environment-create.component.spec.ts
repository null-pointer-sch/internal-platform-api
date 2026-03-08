import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EnvironmentCreateComponent } from './environment-create.component';
import { EnvironmentsService } from '../environments.service';
import { ProjectsService } from '../../projects/projects.service';
import { of, throwError } from 'rxjs';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';

describe('EnvironmentCreateComponent', () => {
    let component: EnvironmentCreateComponent;
    let fixture: ComponentFixture<EnvironmentCreateComponent>;
    let envServiceSpy: jasmine.SpyObj<EnvironmentsService>;
    let projectsServiceSpy: jasmine.SpyObj<ProjectsService>;

    beforeEach(async () => {
        envServiceSpy = jasmine.createSpyObj('EnvironmentsService', ['createEnvironment']);
        projectsServiceSpy = jasmine.createSpyObj('ProjectsService', ['getProject']);
        projectsServiceSpy.getProject.and.returnValue(of({ id: 'p1', name: 'Project 1' } as any));

        await TestBed.configureTestingModule({
            imports: [EnvironmentCreateComponent, RouterTestingModule, HttpClientTestingModule, ReactiveFormsModule],
            providers: [
                { provide: EnvironmentsService, useValue: envServiceSpy },
                { provide: ProjectsService, useValue: projectsServiceSpy },
                {
                    provide: ActivatedRoute,
                    useValue: {
                        snapshot: {
                            paramMap: convertToParamMap({ projectId: 'p1' })
                        }
                    }
                }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(EnvironmentCreateComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create and initialize', () => {
        expect(component).toBeTruthy();
        expect(component.projectId).toBe('p1');
        expect(projectsServiceSpy.getProject).toHaveBeenCalledWith('p1');
    });

    it('should submit valid form', () => {
        component.environmentForm.patchValue({ name: 'test-env', type: 'persistent' });
        envServiceSpy.createEnvironment.and.returnValue(of({ id: 'e1' } as any));

        component.onSubmit();
        expect(envServiceSpy.createEnvironment).toHaveBeenCalledWith('p1', jasmine.objectContaining({ name: 'test-env' }));
        expect(component.loading).toBeFalse();
    });

    it('should handle submission error', () => {
        component.environmentForm.patchValue({ name: 'test-env', type: 'persistent' });
        envServiceSpy.createEnvironment.and.returnValue(throwError(() => ({ error: { detail: 'Create failed' } })));

        component.onSubmit();
        expect(component.error).toBe('Create failed');
        expect(component.loading).toBeFalse();
    });

    it('should update showTtl based on type', () => {
        component.environmentForm.patchValue({ type: 'ephemeral' });
        expect(component.showTtl).toBeTrue();

        component.environmentForm.patchValue({ type: 'persistent' });
        expect(component.showTtl).toBeFalse();
    });
});
