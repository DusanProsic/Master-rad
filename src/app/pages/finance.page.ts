import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Firestore, collection, addDoc, collectionData, deleteDoc, doc, updateDoc  } from '@angular/fire/firestore';
import { Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  standalone: true,
  selector: 'app-finance',
  templateUrl: './finance.page.html',
  styleUrls: ['./finance.page.css'],
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
})
export class FinancePage {
  entries$: Observable<any[]>;
  financeForm: FormGroup;
  filterType$ = new BehaviorSubject<string>('all');

  filteredEntries$!: Observable<any[]>;
  totals$!: Observable<{ income: number; expense: number; savings: number }>;

  constructor(private fb: FormBuilder, private firestore: Firestore) {
    const entriesRef = collection(this.firestore, 'entries');
    this.entries$ = collectionData(entriesRef, { idField: 'id' });
    this.financeForm = this.fb.group({
      description: ['', Validators.required],
      amount: [null, [Validators.required, Validators.min(0.01)]],
      type: ['expense', Validators.required],
    });
  }

  ngOnInit() {
    this.setupFilteredEntries();

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

  setupFilteredEntries() {
    this.filteredEntries$ = combineLatest([
      this.entries$,
      this.filterType$
    ]).pipe(
      map(([entries, filter]) => {
        if (filter === 'all') return entries;
        return entries.filter(entry => entry.type === filter);
      })
    );
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
    type: entry.type
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

    if (this.editingId) {
      const docRef = doc(this.firestore, `entries/${this.editingId}`);
      updateDoc(docRef, formData).then(() => {
        console.log('Entry updated');
        this.financeForm.reset({ type: 'expense' });
        this.editingId = null;
      }).catch(err => console.error('Update error:', err));
    } else {
      addDoc(entriesRef, {
        ...formData,
        timestamp: new Date()
      }).then(() => {
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
