import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StatusBadgeComponent } from './status-badge.component';

describe('StatusBadgeComponent', () => {
    let component: StatusBadgeComponent;
    let fixture: ComponentFixture<StatusBadgeComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [StatusBadgeComponent]
        }).compileComponents();

        fixture = TestBed.createComponent(StatusBadgeComponent);
        component = fixture.componentInstance;
    });

    it('should return correct class for status', () => {
        component.status = 'running';
        expect(component.getStatusClass()).toBe('badge-success');

        component.status = 'provisioning';
        expect(component.getStatusClass()).toBe('badge-warning');

        component.status = 'failed';
        expect(component.getStatusClass()).toBe('badge-error');

        component.status = 'unknown';
        expect(component.getStatusClass()).toBe('badge-default');
    });

    it('should return capitalized label', () => {
        component.status = 'running';
        expect(component.getStatusLabel()).toBe('Running');
    });
});
