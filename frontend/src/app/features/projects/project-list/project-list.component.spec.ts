import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProjectListComponent } from './project-list.component';
import { ProjectsService } from '../projects.service';
import { of, throwError } from 'rxjs';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('ProjectListComponent', () => {
    let component: ProjectListComponent;
    let fixture: ComponentFixture<ProjectListComponent>;
    let projectsServiceSpy: jasmine.SpyObj<ProjectsService>;

    const mockProjects = [
        { id: '1', name: 'Project 1', description: 'Desc 1', created_at: new Date().toISOString() },
        { id: '2', name: 'Project 2', description: 'Desc 2', created_at: new Date().toISOString() }
    ];

    beforeEach(async () => {
        projectsServiceSpy = jasmine.createSpyObj('ProjectsService', ['getProjects', 'deleteProject']);
        projectsServiceSpy.getProjects.and.returnValue(of(mockProjects));

        await TestBed.configureTestingModule({
            imports: [ProjectListComponent, RouterTestingModule, HttpClientTestingModule],
            providers: [
                { provide: ProjectsService, useValue: projectsServiceSpy }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(ProjectListComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create and load projects', () => {
        expect(component).toBeTruthy();
        expect(projectsServiceSpy.getProjects).toHaveBeenCalled();
        expect(component.projects.length).toBe(2);
    });

    it('should handle delete project', () => {
        spyOn(window, 'confirm').and.returnValue(true);
        projectsServiceSpy.deleteProject.and.returnValue(of(undefined as any));
        const loadSpy = spyOn(component, 'loadProjects').and.callThrough();

        component.deleteProject('1');
        expect(projectsServiceSpy.deleteProject).toHaveBeenCalledWith('1');
        expect(loadSpy).toHaveBeenCalled();
    });

    it('should handle delete error', () => {
        spyOn(window, 'confirm').and.returnValue(true);
        projectsServiceSpy.deleteProject.and.returnValue(throwError(() => ({ error: { detail: 'Delete failed' } })));
        component.deleteProject('1');
        expect(component.error).toBe('Delete failed');
    });
});
