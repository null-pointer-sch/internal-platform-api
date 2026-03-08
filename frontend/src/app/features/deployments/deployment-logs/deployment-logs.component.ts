import { Component, OnInit, OnDestroy, NgZone, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DeploymentsService } from '../deployments.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { Subscription, interval, of } from 'rxjs';
import { switchMap, startWith, timeout, catchError } from 'rxjs/operators';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
    selector: 'app-deployment-logs',
    standalone: true,
    imports: [CommonModule, RouterLink, LoadingSpinnerComponent, FormsModule],
    templateUrl: './deployment-logs.component.html',
    styleUrls: ['./deployment-logs.component.css'],
    animations: [
        trigger('fadeInOut', [
            transition(':enter', [
                style({ opacity: 0, transform: 'translateY(10px)' }),
                animate('200ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
            ]),
            transition(':leave', [
                animate('200ms ease-in', style({ opacity: 0, transform: 'translateY(10px)' })),
            ]),
        ])
    ]
})
export class DeploymentLogsComponent implements OnInit, OnDestroy {
    @ViewChild('scrollContainer') private readonly scrollContainer!: ElementRef;

    envId: string | null = null;
    depId: string | null = null;
    deploymentLogs: string = '';
    appLogs: string = '';
    activeTab: 'deployment' | 'app' = 'app';
    loading = true;
    error: string | null = null;

    // Search & Filter
    searchQuery: string = '';
    matchesCount: number = 0;
    currentMatchIndex: number = 0;

    // Auto-scroll
    followLogs: boolean = true;
    hasNewLogs: boolean = false;

    private pollSubscription?: Subscription;

    constructor(
        private readonly route: ActivatedRoute,
        private readonly deploymentsService: DeploymentsService,
        private readonly ngZone: NgZone,
        private readonly cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        this.route.paramMap.subscribe(params => {
            this.envId = params.get('envId');
            this.depId = params.get('depId');
            console.log('DeploymentLogsComponent initialized with:', { envId: this.envId, depId: this.depId });

            if (this.depId) {
                this.ngZone.run(() => {
                    this.startPolling();
                });
            } else {
                this.ngZone.run(() => {
                    this.error = 'Invalid deployment ID.';
                    this.loading = false;
                    this.cdr.detectChanges();
                });
            }
        });
    }

    get highlightedLogs(): string {
        const text = this.activeTab === 'deployment' ? this.deploymentLogs : this.appLogs;
        if (!this.searchQuery) return this.escapeHtml(text);

        const escapedSearch = this.searchQuery.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
        const regex = new RegExp(`(${escapedSearch})`, 'gi');

        const lines = text.split('\n');
        const filteredLines = lines.filter(line => line.toLowerCase().includes(this.searchQuery.toLowerCase()));

        if (filteredLines.length === 0) {
            return `<div class="no-matches">No lines matches: "${this.escapeHtml(this.searchQuery)}"</div>`;
        }

        return filteredLines
            .map(line => {
                const escapedLine = this.escapeHtml(line);
                return escapedLine.replaceAll(regex, '<span class="highlight">$1</span>');
            })
            .join('\n');
    }

    private escapeHtml(text: string): string {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    onScroll(event: Event): void {
        const element = event.target as HTMLElement;
        const threshold = 50;
        const atBottom = element.scrollHeight - element.scrollTop - element.clientHeight < threshold;

        this.followLogs = atBottom;
        if (atBottom) {
            this.hasNewLogs = false;
        }
    }

    scrollToBottom(): void {
        this.followLogs = true;
        this.hasNewLogs = false;
        this.ngZone.runOutsideAngular(() => {
            setTimeout(() => {
                if (this.scrollContainer) {
                    this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
                }
            }, 0);
        });
    }

    onSearchChange(): void {
        const text = this.activeTab === 'deployment' ? this.deploymentLogs : this.appLogs;
        if (!this.searchQuery) {
            this.matchesCount = 0;
            this.currentMatchIndex = 0;
            return;
        }

        try {
            const escapedSearch = this.searchQuery.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
            const regex = new RegExp(escapedSearch, 'gi');
            const matches = text.match(regex);
            this.matchesCount = matches ? matches.length : 0;
            this.currentMatchIndex = 0;
        } catch (ignored) {
            this.matchesCount = 0;
        }
    }

    private startPolling(): void {
        this.pollSubscription?.unsubscribe();
        this.pollSubscription = interval(3000)
            .pipe(
                startWith(0),
                switchMap(() => {
                    return this.deploymentsService.getDeploymentLogs(this.depId!).pipe(
                        timeout(5000),
                        catchError(err => {
                            console.error('Request timeout or error:', err);
                            return of({ deployment_logs: this.deploymentLogs, app_logs: this.appLogs });
                        })
                    );
                })
            )
            .subscribe({
                next: (data: any) => {
                    this.ngZone.run(() => {
                        const newDeploymentLogs = data.deployment_logs || 'No deployment logs available yet...';
                        const newAppLogs = data.app_logs || 'No app logs available yet...';

                        const logsChanged = newDeploymentLogs !== this.deploymentLogs || newAppLogs !== this.appLogs;

                        this.deploymentLogs = newDeploymentLogs;
                        this.appLogs = newAppLogs;
                        this.loading = false;

                        if (logsChanged) {
                            if (this.followLogs) {
                                this.scrollToBottom();
                            } else {
                                this.hasNewLogs = true;
                            }
                        }

                        this.cdr.detectChanges();
                    });
                },
                error: (err) => {
                    console.error('Error fetching logs:', err);
                    this.ngZone.run(() => {
                        this.error = 'Failed to load deployment logs.';
                        this.loading = false;
                        this.cdr.detectChanges();
                    });
                }
            });
    }

    ngOnDestroy(): void {
        if (this.pollSubscription) {
            this.pollSubscription.unsubscribe();
        }
    }
}
