import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EmailService } from '../services/email.service';
import { Auth } from '@angular/fire/auth';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './calendar.page.html',
  styleUrls: ['./calendar.page.css']
})
export class CalendarPage {
  email = '';
  reminderText = '';

  currentDate = new Date();
  reminders: { [date: string]: string[] } = {};
  newReminder = '';
  selectedDate: string | null = null;

  constructor(private emailService: EmailService, private auth: Auth) {}

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

  const userEmail = this.auth.currentUser?.email;

  if (userEmail) {
    const message = `Reminder for ${this.selectedDate}: ${this.newReminder.trim()}`;
    this.emailService.sendReminder(userEmail, message)
      .then(() => console.log('Reminder email sent to user:', userEmail))
      .catch((err) => console.error('Failed to send reminder email:', err.text));
  }

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

  sendEmailReminder() {
    if (!this.email || !this.reminderText) {
      alert('Please fill in both the email and message.');
      return;
    }

    this.emailService.sendReminder(this.email, this.reminderText)
      .then(() => alert('Email sent successfully!'))
      .catch((err) => alert('Email failed to send: ' + err.text));
  }
}

