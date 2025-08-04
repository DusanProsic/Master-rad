import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, getDocs, doc, deleteDoc, collectionData, Timestamp } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ReminderService {
  constructor(private firestore: Firestore, private auth: Auth) {}

  private getUserRemindersCollection() {
    const uid = this.auth.currentUser?.uid;
    if (!uid) throw new Error('User not authenticated');
    return collection(this.firestore, `users/${uid}/reminders`);
  }

  getReminders(): Observable<any[]> {
    return collectionData(this.getUserRemindersCollection(), { idField: 'id' }) as Observable<any[]>;
  }

  async addReminder(reminder: {
    date: string;
    time: string;
    message: string;
    sendEmail: boolean;
  }) {
    const reminderDoc = {
      ...reminder,
      createdAt: Timestamp.now()
    };
    return addDoc(this.getUserRemindersCollection(), reminderDoc);
  }

  async deleteReminder(reminderId: string) {
    const uid = this.auth.currentUser?.uid;
    if (!uid) throw new Error('User not authenticated');
    const reminderRef = doc(this.firestore, `users/${uid}/reminders/${reminderId}`);
    return deleteDoc(reminderRef);
  }
}
