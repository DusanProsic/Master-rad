import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GoalService } from './goal-service.component';

describe('GoalServiceComponent', () => {
  let component: GoalService;
  let fixture: ComponentFixture<GoalService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GoalService]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GoalService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
