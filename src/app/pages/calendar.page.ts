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
  currentMonth = new Date().getMonth();
currentYear = new Date().getFullYear();
  email = '';
  reminderText = '';
  reminderTime = '';
sendEmail = false;
  

  currentDate = new Date();
  reminders: { [date: string]: string[] } = {};
  newReminder = '';
  selectedDate: string | null = null;

  constructor(private emailService: EmailService, private auth: Auth) {}

  getDaysInMonth(): Date[] {
  const days = [];
  const date = new Date(this.currentYear, this.currentMonth, 1);
  while (date.getMonth() === this.currentMonth) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
}

previousMonth() {
  if (this.currentMonth === 0) {
    this.currentMonth = 11;
    this.currentYear--;
  } else {
    this.currentMonth--;
  }
}

nextMonth() {
  if (this.currentMonth === 11) {
    this.currentMonth = 0;
    this.currentYear++;
  } else {
    this.currentMonth++;
  }
}

  selectDate(date: Date) {
  this.selectedDate = date.toISOString().split('T')[0];
  this.newReminder = '';
  this.reminderTime = '';
  this.sendEmail = false;
}

  addReminder() {
  if (!this.selectedDate || !this.newReminder.trim()) return;

  const reminderEntry = `${this.reminderTime ? this.reminderTime + ' - ' : ''}${this.newReminder.trim()}`;

  const list = this.reminders[this.selectedDate] || [];
  list.push(reminderEntry);
  this.reminders[this.selectedDate] = list;

  if (this.sendEmail && this.auth.currentUser?.email) {
    const email = this.auth.currentUser.email;
    const message = `Reminder for ${this.selectedDate} at ${this.reminderTime || 'N/A'}:\n${this.newReminder.trim()}`;

    this.emailService.sendReminder(email, message)
      .then(() => console.log('Email reminder sent'))
      .catch(err => console.error('Failed to send email reminder:', err.text));
  }

  // Reset form
  this.newReminder = '';
  this.reminderTime = '';
  this.sendEmail = false;
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

