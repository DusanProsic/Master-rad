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
  category?: string;
  description?: string;
  date?: any;
  goalId?: string;
}
export interface Entry extends NewEntry { id: string; }

@Injectable({ providedIn: 'root' })
export class EntryService {
  constructor(private firestore: Firestore, private auth: Auth) {}

  private getUserEntriesCollection() {
    const uid = this.auth.currentUser?.uid;
    if (!uid) throw new Error('User not authenticated');
    return collection(this.firestore, `users/${uid}/entries`);
  }

  getEntries(): Observable<Entry[]> {
    const q = query(this.getUserEntriesCollection(), orderBy('date', 'desc'));
    return collectionData(q, { idField: 'id' }) as Observable<Entry[]>;
  }

  async addEntry(entry: NewEntry) {
    const entryDoc = { ...entry, createdAt: Timestamp.now(), date: entry.date ?? Timestamp.now() };
    return addDoc(this.getUserEntriesCollection(), entryDoc);
  }

  async updateEntry(entryId: string, patch: Partial<NewEntry>): Promise<void> {
    const uid = this.auth.currentUser?.uid;
    if (!uid) throw new Error('User not authenticated');
    const ref = doc(this.firestore, `users/${uid}/entries/${entryId}`);
    return updateDoc(ref, patch as any);
  }

  async deleteEntry(entryId: string): Promise<void> {
    const uid = this.auth.currentUser?.uid;
    if (!uid) throw new Error('User not authenticated');
    const ref = doc(this.firestore, `users/${uid}/entries/${entryId}`);
    return deleteDoc(ref);
  }
}
