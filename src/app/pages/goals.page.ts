import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BudgetGoalsComponent } from '../components/budget-goals.component';

@Component({
  selector: 'app-goals-page',
  standalone: true,
  imports: [CommonModule, BudgetGoalsComponent],
  template: `
    <div class="page-container">
      <h2>Goals</h2>
      <app-budget-goals></app-budget-goals>
    </div>
  `,
  styleUrls: ['./goals.page.css']
})
export class GoalsPage {}