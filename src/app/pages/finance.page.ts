import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, map } from 'rxjs';
import { FormsModule } from '@angular/forms';

import { EntryService, Entry, NewEntry } from '../services/entry.service';
import { FinanceChartComponent } from '../components/finance-chart.component';

type Totals = { income: number; expense: number; savings: number };

@Component({
  selector: 'app-finance',
  standalone: true,
  imports: [CommonModule, FormsModule, FinanceChartComponent],
  templateUrl: './finance.page.html',
  styleUrls: ['./finance.page.css']
})
export class FinancePage {
  // Streams
  entries$: Observable<Entry[]>;
  totals$: Observable<Totals>;

  // Simple add/edit form state (adapt to your existing forms)
  form: NewEntry = { amount: 0, type: 'expense', category: '', note: '', date: undefined, currency: 'RSD', goalId: undefined };
  editingId: string | null = null;

  constructor(private entryService: EntryService) {
    this.entries$ = this.entryService.getEntries();
    this.totals$ = this.entries$.pipe(map(this.calcTotals));
  }

  // --- Helpers ---

  private calcTotals(entries: Entry[]): Totals {
    const income = entries.filter(e => e.type === 'income').reduce((s, e) => s + (e.amount || 0), 0);
    const expense = entries.filter(e => e.type === 'expense').reduce((s, e) => s + (e.amount || 0), 0);
    return { income, expense, savings: income - expense };
  }

  // --- CRUD ---

  async addOrUpdate() {
    const payload: NewEntry = { ...this.form };

    if (this.editingId) {
      await this.entryService.updateEntry(this.editingId, payload);
      this.cancelEdit();
    } else {
      await this.entryService.addEntry(payload);
      this.resetForm();
    }
  }

  edit(entry: Entry) {
    this.editingId = entry.id;
    this.form = {
      amount: entry.amount,
      type: entry.type,
      category: entry.category,
      note: entry.note,
      date: entry.date,         // keep as-is; EntryService defaults if empty
      currency: entry.currency,
      goalId: entry.goalId
    };
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async remove(entry: Entry) {
    await this.entryService.deleteEntry(entry.id);
    if (this.editingId === entry.id) this.cancelEdit();
  }

  cancelEdit() {
    this.editingId = null;
    this.resetForm();
  }

  private resetForm() {
    this.form = { amount: 0, type: 'expense', category: '', note: '', date: undefined, currency: 'RSD', goalId: undefined };
  }
}
