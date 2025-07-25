import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GoalServiceComponent } from './goal-service.component';

describe('GoalServiceComponent', () => {
  let component: GoalServiceComponent;
  let fixture: ComponentFixture<GoalServiceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GoalServiceComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GoalServiceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
