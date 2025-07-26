import { Injectable } from '@angular/core';
import { Firestore, collection, collectionData, addDoc, deleteDoc, doc, updateDoc } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

/**
 * NewGoal – used when creating a new goal (no 'id' yet).
 */
export interface NewGoal {
  name: string;
  target: number;
}

/**
 * Goal – used for goals retrieved from Firestore (always has an 'id').
 */
export interface Goal extends NewGoal {
  id: string;
}

@Injectable({
  providedIn: 'root'
})
export class GoalService {
  private goalsCollection;

  constructor(private firestore: Firestore) {
    this.goalsCollection = collection(this.firestore, 'budgetGoals');
  }

  /**
   * Get all goals from Firestore.
   * Returns an Observable that updates in real time.
   */
  getGoals(): Observable<Goal[]> {
    return collectionData(this.goalsCollection, { idField: 'id' }) as Observable<Goal[]>;
  }

  /**
   * Add a new goal to Firestore.
   * @param goal NewGoal (without 'id').
   */
  addGoal(goal: NewGoal): Promise<any> {
    return addDoc(this.goalsCollection, goal);
  }

  /**
   * Update an existing goal.
   * @param goalId Firestore document ID of the goal.
   * @param goal Partial<NewGoal> – the fields you want to update.
   */
  updateGoal(goalId: string, goal: Partial<NewGoal>): Promise<void> {
    const goalDoc = doc(this.firestore, `budgetGoals/${goalId}`);
    return updateDoc(goalDoc, goal);
  }

  /**
   * Delete a goal from Firestore.
   * @param goalId Firestore document ID of the goal.
   */
  deleteGoal(goalId: string): Promise<void> {
    const goalDoc = doc(this.firestore, `budgetGoals/${goalId}`);
    return deleteDoc(goalDoc);
  }
}
