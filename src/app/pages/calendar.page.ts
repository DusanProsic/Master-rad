import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './calendar.page.html',
  styleUrls: ['./calendar.page.css']
})
export class CalendarPage {
  currentDate = new Date();
  reminders: { [date: string]: string[] } = {};
  newReminder = '';
  selectedDate: string | null = null;

  getDaysInMonth(): Date[] {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const days = [];
    const date = new Date(year, month, 1);
    while (date.getMonth() === month) {
      days.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    return days;
  }

  selectDate(date: Date) {
    this.selectedDate = date.toISOString().split('T')[0];
    this.newReminder = '';
  }

  addReminder() {
    if (!this.selectedDate || !this.newReminder.trim()) return;
    const list = this.reminders[this.selectedDate] || [];
    list.push(this.newReminder.trim());
    this.reminders[this.selectedDate] = list;
    this.newReminder = '';
  }

  deleteReminder(date: string, index: number) {
    this.reminders[date].splice(index, 1);
    if (this.reminders[date].length === 0) {
      delete this.reminders[date];
    }
  }

  format(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}
