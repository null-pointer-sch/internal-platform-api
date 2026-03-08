import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ProjectsService } from './projects.service';
import { Project } from '../../shared/models/project.model';

describe('ProjectsService', () => {
    let service: ProjectsService;
    let httpMock: HttpTestingController;

    const mockProjects: Project[] = [
        { id: '1', name: 'Project 1', created_at: new Date().toISOString() },
        { id: '2', name: 'Project 2', created_at: new Date().toISOString() }
    ];

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [ProjectsService]
        });
        service = TestBed.inject(ProjectsService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should get projects', () => {
        service.getProjects().subscribe(projects => {
            expect(projects.length).toBe(2);
            expect(projects).toEqual(mockProjects);
        });

        const req = httpMock.expectOne('/api/v1/projects');
        expect(req.request.method).toBe('GET');
        req.flush(mockProjects);
    });

    it('should get a project', () => {
        service.getProject('1').subscribe(project => {
            expect(project).toEqual(mockProjects[0]);
        });

        const req = httpMock.expectOne('/api/v1/projects/1');
        expect(req.request.method).toBe('GET');
        req.flush(mockProjects[0]);
    });

    it('should create a project', () => {
        const newProject = { name: 'New Project' };
        service.createProject(newProject as any).subscribe(project => {
            expect(project).toEqual(mockProjects[0]);
        });

        const req = httpMock.expectOne('/api/v1/projects');
        expect(req.request.method).toBe('POST');
        req.flush(mockProjects[0]);
    });

    it('should delete a project', () => {
        service.deleteProject('1').subscribe();

        const req = httpMock.expectOne('/api/v1/projects/1');
        expect(req.request.method).toBe('DELETE');
        req.flush(null);
    });
});
