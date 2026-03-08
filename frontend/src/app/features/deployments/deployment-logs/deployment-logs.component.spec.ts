import { ComponentFixture, TestBed, fakeAsync, tick, discardPeriodicTasks } from '@angular/core/testing';
import { DeploymentLogsComponent } from './deployment-logs.component';
import { DeploymentsService } from '../deployments.service';
import { ActivatedRoute } from '@angular/router';
import { of, throwError, Subject } from 'rxjs';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('DeploymentLogsComponent', () => {
    let component: DeploymentLogsComponent;
    let fixture: ComponentFixture<DeploymentLogsComponent>;
    let deploymentsServiceSpy: jasmine.SpyObj<DeploymentsService>;
    let logsSubject: Subject<any>;

    beforeEach(async () => {
        logsSubject = new Subject();
        deploymentsServiceSpy = jasmine.createSpyObj('DeploymentsService', ['getDeploymentLogs']);
        deploymentsServiceSpy.getDeploymentLogs.and.returnValue(logsSubject.asObservable());

        await TestBed.configureTestingModule({
            imports: [
                DeploymentLogsComponent,
                RouterTestingModule,
                NoopAnimationsModule,
                HttpClientTestingModule
            ],
            providers: [
                { provide: DeploymentsService, useValue: deploymentsServiceSpy },
                {
                    provide: ActivatedRoute,
                    useValue: {
                        paramMap: of({ get: (key: string) => key === 'envId' ? 'env-1' : 'dep-1' })
                    }
                }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(DeploymentLogsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create and start polling', fakeAsync(() => {
        expect(component).toBeTruthy();
        logsSubject.next({
            deployment_logs: 'initial dep logs',
            app_logs: 'initial app logs'
        });
        tick();
        expect(component.deploymentLogs).toBe('initial dep logs');
        discardPeriodicTasks();
    }));

    it('should handle error in logs', fakeAsync(() => {
        deploymentsServiceSpy.getDeploymentLogs.and.returnValue(throwError(() => new Error('API Error')));

        // This will be called by ngOnInit -> startPolling
        // startPolling calls getDeploymentLogs
        component.ngOnInit();
        tick(); // Process first poll

        expect(component.error).toBe('Failed to load logs');
        component.ngOnDestroy();
    }));

    it('should switch tabs', () => {
        component.activeTab = 'deployment';
        fixture.detectChanges();
        expect(component.activeTab).toBe('deployment');

        component.activeTab = 'app';
        fixture.detectChanges();
        expect(component.activeTab).toBe('app');
    });

    it('should highlight search query', () => {
        component.deploymentLogs = 'line one\nline two\nsome target here';
        component.activeTab = 'deployment';
        component.searchQuery = 'target';

        const highlighted = component.highlightedLogs;
        expect(highlighted).toContain('<span class="highlight">target</span>');
    });

    it('should handle search with no matches', () => {
        component.deploymentLogs = 'line one\nline two';
        component.activeTab = 'deployment';
        component.searchQuery = 'nonexistent';

        const highlighted = component.highlightedLogs;
        expect(highlighted).toContain('no-matches');
    });

    it('should escape HTML in logs', () => {
        component.deploymentLogs = '<script>alert(1)</script>';
        component.activeTab = 'deployment';
        component.searchQuery = '';

        const highlighted = component.highlightedLogs;
        expect(highlighted).toContain('&lt;script&gt;');
        expect(highlighted).not.toContain('<script>');
    });

    it('should handle polling errors gracefully and keep old logs', fakeAsync(() => {
        // Initial success
        logsSubject.next({ deployment_logs: 'old logs', app_logs: '' });
        tick();
        expect(component.deploymentLogs).toBe('old logs');

        // Error on next interval
        tick(3000);
        logsSubject.error(new Error('API Error'));
        tick();

        expect(component.deploymentLogs).toBe('old logs');
        expect(component.loading).toBeFalse();
        discardPeriodicTasks();
    }));

    it('should update logs and toggle hasNewLogs if not following', fakeAsync(() => {
        // Initial success
        logsSubject.next({ deployment_logs: 'initial', app_logs: '' });
        tick();

        component.followLogs = false;

        // Next interval
        tick(3000);
        logsSubject.next({
            deployment_logs: 'new logs',
            app_logs: 'new app logs'
        });
        tick();

        expect(component.deploymentLogs).toBe('new logs');
        expect(component.hasNewLogs).toBeTrue();
        discardPeriodicTasks();
    }));

    it('should handle onScroll and toggle followLogs', () => {
        const mockEvent = {
            target: {
                scrollHeight: 1000,
                scrollTop: 900,
                clientHeight: 100
            }
        } as any;

        component.onScroll(mockEvent);
        expect(component.followLogs).toBeTrue();
        expect(component.hasNewLogs).toBeFalse();

        mockEvent.target.scrollTop = 500;
        component.onScroll(mockEvent);
        expect(component.followLogs).toBeFalse();
    });

    it('should handle scrollToBottom', fakeAsync(() => {
        component.followLogs = false;
        component.hasNewLogs = true;
        (component as any).scrollContainer = {
            nativeElement: {
                scrollTop: 0,
                scrollHeight: 1000
            }
        };

        component.scrollToBottom();
        expect(component.followLogs).toBeTrue();
        expect(component.hasNewLogs).toBeFalse();
        tick();
        expect((component as any).scrollContainer.nativeElement.scrollTop).toBe(1000);
    }));

    it('should handle onSearchChange with matches', () => {
        component.deploymentLogs = 'test link test';
        component.activeTab = 'deployment';
        component.searchQuery = 'test';

        component.onSearchChange();
        expect(component.matchesCount).toBe(2);
        expect(component.currentMatchIndex).toBe(0);

        component.searchQuery = '';
        component.onSearchChange();
        expect(component.matchesCount).toBe(0);
    });

    it('should handle invalid deployment ID', () => {
        // Use a brand new Testbed creation for this case or use re-init
        const route = TestBed.inject(ActivatedRoute);
        (route.paramMap as any) = of({ get: () => null });

        component.ngOnInit();
        expect(component.error).toBe('Invalid deployment ID.');
        expect(component.loading).toBeFalse();
    });

    it('should unsubscribe on destroy', () => {
        const subSpy = jasmine.createSpyObj('Subscription', ['unsubscribe']);
        (component as any).pollSubscription = subSpy;
        component.ngOnDestroy();
        expect(subSpy.unsubscribe).toHaveBeenCalled();
    });
});
