import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoadingSpinnerComponent } from './loading-spinner.component';

describe('LoadingSpinnerComponent', () => {
    let component: LoadingSpinnerComponent;
    let fixture: ComponentFixture<LoadingSpinnerComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [LoadingSpinnerComponent]
        }).compileComponents();

        fixture = TestBed.createComponent(LoadingSpinnerComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should render the spinner', () => {
        const compiled = fixture.nativeElement as HTMLElement;
        expect(compiled.querySelector('.spinner-container')).toBeTruthy();
        expect(compiled.querySelector('.spinner')).toBeTruthy();
        expect(compiled.querySelector('.spinner-text')).toBeTruthy();
    });
});
