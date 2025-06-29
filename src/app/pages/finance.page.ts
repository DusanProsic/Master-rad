import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { Firestore, collection, addDoc, collectionData } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

@Component({
  standalone: true,
  selector: 'app-finance',
  templateUrl: './finance.page.html',
  styleUrls: ['./finance.page.css'],
  imports: [CommonModule, ReactiveFormsModule],
})
export class FinancePage {
  entries$: Observable<any[]>;
  financeForm: FormGroup;


  constructor(private fb: FormBuilder, private firestore: Firestore) {
    const entriesRef = collection(this.firestore, 'entries');
    this.entries$ = collectionData(entriesRef, { idField: 'id' });
    this.financeForm = this.fb.group({
      description: ['', Validators.required],
      amount: [null, [Validators.required, Validators.min(0.01)]],
      type: ['expense', Validators.required],
    });
  }

 onSubmit() {
  if (this.financeForm.valid) {
    const formData = this.financeForm.value;
    const entriesRef = collection(this.firestore, 'entries');

    addDoc(entriesRef, {
      ...formData,
      timestamp: new Date()
    }).then(() => {
      console.log('Data saved to Firestore');
      this.financeForm.reset({ type: 'expense' }); // Reset and default to expense
    }).catch((error) => {
      console.error('Error saving data:', error);
    });
  } else {
    console.warn('Form is invalid');
  }
 }
}