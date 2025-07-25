import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Firestore, collection, addDoc, collectionData, deleteDoc, doc, updateDoc  } from '@angular/fire/firestore';
import { Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { FinanceChartComponent } from '../components/finance-chart.component';

@Component({
  standalone: true,
  selector: 'app-finance',
  templateUrl: './finance.page.html',
  styleUrls: ['./finance.page.css'],
  imports: [CommonModule, ReactiveFormsModule, FormsModule, FinanceChartComponent],
})
export class FinancePage {
  entries$: Observable<any[]>;
  financeForm: FormGroup;
  filterType$ = new BehaviorSubject<string>('all');

  filteredEntries$!: Observable<any[]>;
  totals$!: Observable<{ income: number; expense: number; savings: number }>;

  budgetGoals$!: Observable<any[]>;

  constructor(private fb: FormBuilder, private firestore: Firestore) {
    const entriesRef = collection(this.firestore, 'entries');
     const budgetGoalsRef = collection(this.firestore, 'budgetGoals');
  this.budgetGoals$ = collectionData(budgetGoalsRef, { idField: 'id' });
    this.entries$ = collectionData(entriesRef, { idField: 'id' });
    this.financeForm = this.fb.group({
      description: ['', Validators.required],
      amount: [null, [Validators.required, Validators.min(0.01)]],
      type: ['expense', Validators.required],
      goalId: ['']
    });
  }

  ngOnInit() {
    this.setupFilteredEntries();
    this.entries$.subscribe(entries => {
  const months = new Set<string>();

  for (const entry of entries) {
    const date = new Date(entry.timestamp?.seconds * 1000);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    months.add(month);
  }

  this.availableMonths = Array.from(months).sort().reverse(); // Latest month first
});

    this.totals$ = this.filteredEntries$.pipe(
      map(entries => {
        const income = entries
          .filter(e => e.type === 'income')
          .reduce((sum, e) => sum + e.amount, 0);
        const expense = entries
          .filter(e => e.type === 'expense')
          .reduce((sum, e) => sum + e.amount, 0);
        return {
          income,
          expense,
          savings: income - expense
        };
      })
    );
  }

monthFilter$ = new BehaviorSubject<string>('all');
availableMonths: string[] = [];

  setupFilteredEntries() {
  this.filteredEntries$ = combineLatest([
    this.entries$,
    this.filterType$,
    this.monthFilter$
  ]).pipe(
    map(([entries, typeFilter, monthFilter]) => {
      let filtered = entries;

      if (typeFilter !== 'all') {
        filtered = filtered.filter(e => e.type === typeFilter);
      }

      if (monthFilter !== 'all') {
        filtered = filtered.filter(e => {
          const date = new Date(e.timestamp?.seconds * 1000); // Firestore timestamp
          const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          return month === monthFilter;
        });
      }

      return filtered;
    })
  );
}


onMonthChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value;
  this.monthFilter$.next(value);
}

  onFilterChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.setFilter(select.value);
  }

  setFilter(value: string) {
    this.filterType$.next(value);
  }
  editingId: string | null = null;

 editEntry(entry: any) {
  this.editingId = entry.id;
  this.financeForm.setValue({
    description: entry.description,
    amount: entry.amount,
    type: entry.type,
    goalId: entry.goalId || ''
  });
}

cancelEdit() {
  this.editingId = null;
  this.financeForm.reset({ type: 'expense' });
}

  onSubmit() {
  if (this.financeForm.valid) {
    const formData = this.financeForm.value;
    const entriesRef = collection(this.firestore, 'entries');

    // Ensure goalId is null if empty
    const entryData = {
      ...formData,
      goalId: formData.goalId || null,
      timestamp: new Date()
    };

    if (this.editingId) {
      const docRef = doc(this.firestore, `entries/${this.editingId}`);
      updateDoc(docRef, entryData).then(() => {
        console.log('Entry updated');
        this.financeForm.reset({ type: 'expense' });
        this.editingId = null;
      }).catch(err => console.error('Update error:', err));
    } else {
      addDoc(entriesRef, entryData).then(() => {
        console.log('Data saved to Firestore');
        this.financeForm.reset({ type: 'expense' });
      }).catch((error) => {
        console.error('Error saving data:', error);
      });
    }
  } else {
    console.warn('Form is invalid');
  }
}


  deleteEntry(id: string) {
    const docRef = doc(this.firestore, `entries/${id}`);
    deleteDoc(docRef)
      .then(() => console.log('Entry deleted'))
      .catch((err) => console.error('Delete error:', err));
  }
}
