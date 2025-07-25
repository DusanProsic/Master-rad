import { Injectable } from '@angular/core';
import { Firestore, collection, collectionData, addDoc, deleteDoc, doc, updateDoc } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

export interface Goal {
  id?: string;
  name: string;
  target: number;
}

@Injectable({
  providedIn: 'root'
})
export class GoalService {
  private goalsCollection;

  constructor(private firestore: Firestore) {
    this.goalsCollection = collection(this.firestore, 'budgetGoals');
  }

  // Get all goals
  getGoals(): Observable<Goal[]> {
    return collectionData(this.goalsCollection, { idField: 'id' }) as Observable<Goal[]>;
  }

  // Add new goal
  addGoal(goal: Goal): Promise<any> {
    return addDoc(this.goalsCollection, goal);
  }

  // Update goal
  updateGoal(goalId: string, goal: Partial<Goal>): Promise<void> {
    const goalDoc = doc(this.firestore, `budgetGoals/${goalId}`);
    return updateDoc(goalDoc, goal);
  }

  // Delete goal
  deleteGoal(goalId: string): Promise<void> {
    const goalDoc = doc(this.firestore, `budgetGoals/${goalId}`);
    return deleteDoc(goalDoc);
  }
}
