// goal.service.ts
import { Injectable } from '@angular/core';
import {
  Firestore, collection, collectionData, addDoc, deleteDoc, doc, updateDoc
} from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { Observable, combineLatest, map } from 'rxjs';
import { Timestamp } from 'firebase/firestore';

// 👇 add these
import { CurrencyService, CurrencyCode } from '../services/currency.service';
import { Entry } from '../services/entry.service'; // so entries$ can be typed if you want

export interface NewGoal {
  name: string;
  target: number;
  currency: string; // (optional) you can switch to CurrencyCode
}

export interface Goal extends NewGoal { id: string; }

@Injectable({ providedIn: 'root' })
export class GoalService {
  constructor(
    private firestore: Firestore,
    private auth: Auth,
    private currency: CurrencyService,              // 👈 inject
  ) {}

  private getUserGoalsCollection() {
    const uid = this.auth.currentUser?.uid;
    if (!uid) throw new Error('User not authenticated');
    return collection(this.firestore, `users/${uid}/goals`);
  }

  getGoals(): Observable<Goal[]> {
    return collectionData(this.getUserGoalsCollection(), { idField: 'id' }) as Observable<Goal[]>;
  }

  async addGoal(goal: NewGoal) {
    const goalDoc = { ...goal, createdAt: Timestamp.now() };
    return addDoc(this.getUserGoalsCollection(), goalDoc);
  }

  async updateGoal(goalId: string, goal: Partial<NewGoal>): Promise<void> {
    const uid = this.auth.currentUser?.uid;
    if (!uid) throw new Error('User not authenticated');
    const goalRef = doc(this.firestore, `users/${uid}/goals/${goalId}`);
    return updateDoc(goalRef, goal);
  }

  async deleteGoal(goalId: string): Promise<void> {
    const uid = this.auth.currentUser?.uid;
    if (!uid) throw new Error('User not authenticated');
    const goalRef = doc(this.firestore, `users/${uid}/goals/${goalId}`);
    return deleteDoc(goalRef);
  }

  /**
   * entries$ should be Entry[] that include .currency on each entry.
   * We convert each income entry amount FROM entry.currency TO goal.currency before summing.
   */
  getGoalsWithProgress(entries$: Observable<Entry[]>): Observable<Array<Goal & {
    percent: number; contributed: number; remaining: number;
  }>> {
    return combineLatest([this.getGoals(), entries$]).pipe(
      map(([goals, entries]) => {
        const incomeEntries = (entries || []).filter(e => e.type === 'income');

        return goals.map(goal => {
          const goalCurr = goal.currency as CurrencyCode;

          const contributedInGoalCurrency = incomeEntries
            .filter(e => e.goalId === goal.id)
            .reduce((sum, e) => {
              const from = (e.currency as CurrencyCode) || this.currency.base;
              const amtInGoal = this.currency.convert(Number(e.amount) || 0, from, goalCurr);
              return sum + amtInGoal;
            }, 0);

          const target = Number(goal.target) || 0;
          const percent = target > 0 ? Math.min(100, (contributedInGoalCurrency / target) * 100) : 0;
          const remaining = Math.max(0, target - contributedInGoalCurrency);

          return {
            ...goal,
            contributed: Math.round(contributedInGoalCurrency * 100) / 100,
            remaining: Math.round(remaining * 100) / 100,
            percent: Math.round(percent * 100) / 100,
          };
        });
      })
    );
  }
}
