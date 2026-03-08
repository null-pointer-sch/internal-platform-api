import { TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { EnvironmentsService } from './environments.service';
import { Environment } from '../../shared/models/environment.model';

describe('EnvironmentsService', () => {
    let service: EnvironmentsService;
    let httpMock: HttpTestingController;

    const mockEnvs: Environment[] = [
        { id: 'e1', project_id: 'p1', name: 'Env 1', type: 'ephemeral', status: 'running', created_at: new Date().toISOString() }
    ];

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [EnvironmentsService]
        });
        service = TestBed.inject(EnvironmentsService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('should get environments', () => {
        service.getEnvironments('p1').subscribe(envs => {
            expect(envs).toEqual(mockEnvs);
        });

        const req = httpMock.expectOne('/api/v1/environments/projects/p1');
        expect(req.request.method).toBe('GET');
        req.flush(mockEnvs);
    });

    it('should poll environments', fakeAsync(() => {
        let emissions = 0;
        const sub = service.pollEnvironments('p1', 3000).subscribe(envs => {
            emissions++;
        });

        // interval(3000) emits first at 3000ms
        tick(3000);
        let reqs = httpMock.match('/api/v1/environments/projects/p1');
        if (reqs.length === 0) {
            // maybe it needs a bit more time or a microtask
            tick(1);
            reqs = httpMock.match('/api/v1/environments/projects/p1');
        }

        expect(reqs.length).toBeGreaterThan(0);
        reqs[0].flush(mockEnvs);

        sub.unsubscribe();
        flush();
    }));

    it('should create environment', () => {
        service.createEnvironment('p1', { name: 'new' } as any).subscribe(env => {
            expect(env).toEqual(mockEnvs[0]);
        });

        const req = httpMock.expectOne('/api/v1/environments/projects/p1');
        expect(req.request.method).toBe('POST');
        req.flush(mockEnvs[0]);
    });

    it('should delete environment', () => {
        service.deleteEnvironment('e1').subscribe();
        const req = httpMock.expectOne('/api/v1/environments/e1');
        expect(req.request.method).toBe('DELETE');
        req.flush(null);
    });
});
