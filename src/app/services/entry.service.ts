import { Injectable } from '@angular/core';
import {
  Firestore, collection, collectionData, addDoc, deleteDoc, doc, updateDoc, query, orderBy
} from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { Observable } from 'rxjs';
import { Timestamp } from 'firebase/firestore';

export type EntryType = 'income' | 'expense';
export interface NewEntry {
  amount: number;
  type: EntryType;
  description?: string;
  goalId?: string;
   currency: CurrencyCode; 
}
export interface Entry extends NewEntry { id: string; createdAt?: any; }
export type CurrencyCode = 'RSD' | 'EUR' | 'USD' ; 

@Injectable({ providedIn: 'root' })
export class EntryService {
  constructor(private firestore: Firestore, private auth: Auth) {}

  private getUserEntriesCollection() {
    const uid = this.auth.currentUser?.uid;
    if (!uid) throw new Error('User not authenticated');
    return collection(this.firestore, `users/${uid}/entries`);
  }

  /** Drop undefined fields so Firestore doesn't throw */
  private dropUndefined<T extends Record<string, any>>(obj: T): T {
    const out: any = {};
    for (const k of Object.keys(obj)) {
      const v = (obj as any)[k];
      if (v !== undefined) out[k] = v;
    }
    return out as T;
  }

  /** Real-time list ordered by creation time */
  getEntries(): Observable<Entry[]> {
    const q = query(this.getUserEntriesCollection(), orderBy('createdAt', 'desc'));
    return collectionData(q, { idField: 'id' }) as Observable<Entry[]>;
  }

  async addEntry(entry: NewEntry) {
    const payload = this.dropUndefined({
      ...entry,
      amount: Number(entry.amount) || 0,
      createdAt: Timestamp.now(),
    });
    return addDoc(this.getUserEntriesCollection(), payload);
  }

  async updateEntry(entryId: string, patch: Partial<NewEntry>): Promise<void> {
    const uid = this.auth.currentUser?.uid;
    if (!uid) throw new Error('User not authenticated');
    const ref = doc(this.firestore, `users/${uid}/entries/${entryId}`);
    return updateDoc(ref, this.dropUndefined(patch as any));
  }

  async deleteEntry(entryId: string): Promise<void> {
    const uid = this.auth.currentUser?.uid;
    if (!uid) throw new Error('User not authenticated');
    const ref = doc(this.firestore, `users/${uid}/entries/${entryId}`);
    return deleteDoc(ref);
  }
}
