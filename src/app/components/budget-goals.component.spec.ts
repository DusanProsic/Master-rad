import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BudgetGoalsComponent } from './budget-goals.component';

describe('BudgetGoalsComponent', () => {
  let component: BudgetGoalsComponent;
  let fixture: ComponentFixture<BudgetGoalsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BudgetGoalsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BudgetGoalsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
