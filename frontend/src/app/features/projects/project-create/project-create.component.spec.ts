import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProjectCreateComponent } from './project-create.component';
import { ProjectsService } from '../projects.service';
import { of, throwError } from 'rxjs';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ReactiveFormsModule } from '@angular/forms';

describe('ProjectCreateComponent', () => {
    let component: ProjectCreateComponent;
    let fixture: ComponentFixture<ProjectCreateComponent>;
    let projectsServiceSpy: jasmine.SpyObj<ProjectsService>;

    beforeEach(async () => {
        projectsServiceSpy = jasmine.createSpyObj('ProjectsService', ['createProject']);

        await TestBed.configureTestingModule({
            imports: [ProjectCreateComponent, RouterTestingModule, HttpClientTestingModule, ReactiveFormsModule],
            providers: [
                { provide: ProjectsService, useValue: projectsServiceSpy }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(ProjectCreateComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create and initialize form', () => {
        expect(component).toBeTruthy();
        expect(component.projectForm).toBeDefined();
    });

    it('should submit valid form', () => {
        component.projectForm.patchValue({ name: 'New Project', description: 'Desc' });
        projectsServiceSpy.createProject.and.returnValue(of({ id: 'p1' } as any));

        component.onSubmit();
        expect(projectsServiceSpy.createProject).toHaveBeenCalled();
        expect(component.loading).toBeFalse();
    });

    it('should handle error', () => {
        component.projectForm.patchValue({ name: 'New Project' });
        projectsServiceSpy.createProject.and.returnValue(throwError(() => ({ error: { detail: 'Error' } })));

        component.onSubmit();
        expect(component.error).toBe('Error');
    });
});
