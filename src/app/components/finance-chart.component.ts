import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartConfiguration, ChartType } from 'chart.js';
import { NgChartsModule } from 'ng2-charts';
import { Observable, Subscription } from 'rxjs';

@Component({
  selector: 'app-finance-chart',
  standalone: true,
  imports: [CommonModule, NgChartsModule],
  templateUrl: './finance-chart.component.html',
  styleUrls: ['./finance-chart.component.css']
})
export class FinanceChartComponent implements OnInit, OnDestroy {
  @Input() totals$!: Observable<{ income: number; expense: number; savings: number }>;

  public pieChartLabels: string[] = ['Expenses', 'Savings'];
  public pieChartData: ChartConfiguration<'pie'>['data'] = {
  labels: ['Expenses', 'Savings'],
  datasets: [
    {
      data: [0, 0],
    }
  ]
};
  public pieChartType: ChartConfiguration<'pie'>['type'] = 'pie';

  private totalsSub!: Subscription;
ngOnInit() {
  this.totalsSub = this.totals$.subscribe(totals => {
    this.pieChartData.datasets[0].data = [
      totals.expense,
      totals.savings
    ];
  });
}

  ngOnDestroy() {
    this.totalsSub?.unsubscribe();
  }
}
