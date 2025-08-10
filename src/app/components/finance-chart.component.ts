import { Component, Input, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartConfiguration, ChartType } from 'chart.js';
import { NgChartsModule, BaseChartDirective } from 'ng2-charts';
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
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  public pieChartLabels: string[] = ['Expenses', 'Savings'];
  public pieChartData: ChartConfiguration<'pie'>['data'] = {
    labels: this.pieChartLabels,
    datasets: [{ data: [0, 0] }]
  };
  public pieChartType: ChartType = 'pie';

  private totalsSub!: Subscription;

  ngOnInit() {
    this.totalsSub = this.totals$.subscribe(totals => {
      this.pieChartData = {
        ...this.pieChartData,
        datasets: [{ data: [totals.expense, totals.savings] }]
      };
      this.chart?.update(); // force redraw
    });
  }

  ngOnDestroy() {
    this.totalsSub?.unsubscribe();
  }
}
