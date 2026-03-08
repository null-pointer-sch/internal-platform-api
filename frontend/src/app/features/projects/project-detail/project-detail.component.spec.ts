import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProjectDetailComponent } from './project-detail.component';
import { ProjectsService } from '../projects.service';
import { of, throwError } from 'rxjs';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';

describe('ProjectDetailComponent', () => {
    let component: ProjectDetailComponent;
    let fixture: ComponentFixture<ProjectDetailComponent>;
    let projectsServiceSpy: jasmine.SpyObj<ProjectsService>;

    beforeEach(async () => {
        projectsServiceSpy = jasmine.createSpyObj('ProjectsService', ['getProject']);
        projectsServiceSpy.getProject.and.returnValue(of({ id: 'p1', name: 'Project 1', description: 'Desc' } as any));

        await TestBed.configureTestingModule({
            imports: [ProjectDetailComponent, RouterTestingModule, HttpClientTestingModule],
            providers: [
                { provide: ProjectsService, useValue: projectsServiceSpy },
                {
                    provide: ActivatedRoute,
                    useValue: {
                        snapshot: { paramMap: convertToParamMap({ id: 'p1' }) }
                    }
                }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(ProjectDetailComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should load project on init', () => {
        expect(component).toBeTruthy();
        expect(projectsServiceSpy.getProject).toHaveBeenCalledWith('p1');
        expect(component.project?.name).toBe('Project 1');
    });

    it('should handle load error', () => {
        projectsServiceSpy.getProject.and.returnValue(throwError(() => ({ error: { detail: 'Not found' } })));
        component.ngOnInit();
        expect(component.error).toBe('Not found');
    });
});
