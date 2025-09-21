import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  addDoc,
  deleteDoc,
  doc,
  updateDoc
} from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { Observable } from 'rxjs';
import { combineLatest, map } from 'rxjs';
import { Timestamp } from 'firebase/firestore';

export interface NewGoal {
  name: string;
  target: number;
  currency: string;
}

export interface Goal extends NewGoal {
  id: string;
}

@Injectable({ providedIn: 'root' })
export class GoalService {
  constructor(private firestore: Firestore, private auth: Auth) {}

  /** Mirror of getUserRemindersCollection() → but for goals */
  private getUserGoalsCollection() {
    const uid = this.auth.currentUser?.uid;
    if (!uid) throw new Error('User not authenticated');
    return collection(this.firestore, `users/${uid}/goals`);
  }

  /** Real-time goals list for the signed-in user */
  getGoals(): Observable<Goal[]> {
    return collectionData(this.getUserGoalsCollection(), { idField: 'id' }) as Observable<Goal[]>;
  }

  /** Add a goal under users/{uid}/goals */
  async addGoal(goal: NewGoal) {
    const goalDoc = {
      ...goal,
      createdAt: Timestamp.now()
    };
    return addDoc(this.getUserGoalsCollection(), goalDoc);
  }

  /** Patch goal fields */
  async updateGoal(goalId: string, goal: Partial<NewGoal>): Promise<void> {
    const uid = this.auth.currentUser?.uid;
    if (!uid) throw new Error('User not authenticated');
    const goalRef = doc(this.firestore, `users/${uid}/goals/${goalId}`);
    return updateDoc(goalRef, goal);
  }

  /** Delete goal */
  async deleteGoal(goalId: string): Promise<void> {
    const uid = this.auth.currentUser?.uid;
    if (!uid) throw new Error('User not authenticated');
    const goalRef = doc(this.firestore, `users/${uid}/goals/${goalId}`);
    return deleteDoc(goalRef);
  }

  /** Keep your existing progress calc; entries$ can come from your entries service */
  getGoalsWithProgress(entries$: Observable<any[]>): Observable<any[]> {
    return combineLatest([this.getGoals(), entries$]).pipe(
      map(([goals, entries]) => {
        const incomeEntries = entries.filter(e => e.type === 'income');
        return goals.map(goal => {
          const goalIncome = incomeEntries
            .filter(entry => entry.goalId === goal.id)
            .reduce((sum, entry) => sum + (entry.amount || 0), 0);
          const percent = Math.min((goalIncome / (goal.target || 1)) * 100, 100);
          return { ...goal, percent, contributed: goalIncome };
        });
      })
    );
  }
}
