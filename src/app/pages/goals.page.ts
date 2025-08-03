import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BudgetGoalsComponent } from '../components/budget-goals.component'; // Adjust path if needed

@Component({
  selector: 'app-goals',
  standalone: true,
  imports: [CommonModule, BudgetGoalsComponent],
  templateUrl: './goals.page.html',
  styleUrls: ['./goals.page.css']
})
export class GoalsPage {}
