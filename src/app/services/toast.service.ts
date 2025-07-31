import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  message: string;
  type: ToastType;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastSubject = new BehaviorSubject<ToastMessage | null>(null);
  toast$ = this.toastSubject.asObservable();

  show(message: string, type: ToastType = 'info') {
    this.toastSubject.next({ message, type });

    // Auto-dismiss after 2.5s
    setTimeout(() => {
      this.toastSubject.next(null);
    }, 2500);
  }

  clear() {
    this.toastSubject.next(null);
  }
}
