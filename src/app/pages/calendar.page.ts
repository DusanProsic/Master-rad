import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EmailService } from '../services/email.service';
import { Auth } from '@angular/fire/auth';
import { ReminderService } from '../services/reminder.service';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './calendar.page.html',
  styleUrls: ['./calendar.page.css']
})

export class CalendarPage {
  reminderList: any[] = [];
  currentMonth = new Date().getMonth();
  currentYear = new Date().getFullYear();
  email = '';
  reminderText = '';
  reminderTime = '';
  sendEmail = false;

  currentDate = new Date();
  reminders: { [date: string]: { id: string, time?: string, message: string }[] } = {};

  newReminder = '';
  selectedDate: string | null = null;

  constructor(
    private emailService: EmailService,
    private auth: Auth,
    private reminderService: ReminderService
  ) {}

  ngOnInit(): void {
    this.reminderService.getReminders().subscribe(reminders => {
      this.reminderList = reminders;

      // Rebuild local dictionary for display
      this.reminders = {};
for (const r of reminders) {
  const key = r.date;
  const entry = {
    text: `${r.time ? r.time + ' - ' : ''}${r.message}`,
    id: r.id
  };
  this.reminders[key] = this.reminders[key] || [];
this.reminders[key].push({ id: r.id, time: r.time, message: r.message });
}

    });
  }

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

  

  async addReminder() {
    if (!this.selectedDate || !this.newReminder.trim()) return;

    const reminder = {
      date: this.selectedDate,
      time: this.reminderTime || '',
      message: this.newReminder.trim(),
      sendEmail: this.sendEmail
    };

    try {
      await this.reminderService.addReminder(reminder);

      if (this.sendEmail && this.auth.currentUser?.email) {
        const email = this.auth.currentUser.email;
        const message = `Reminder for ${reminder.date} at ${reminder.time}:\n${reminder.message}`;
        await this.emailService.sendReminder(email, message);
        console.log('Email reminder sent');
      }

      this.newReminder = '';
      this.reminderTime = '';
      this.sendEmail = false;
    } catch (err) {
      console.error('Failed to add reminder:', err);
    }
  }

  

 async deleteReminderById(id: string, date: string) {
  try {
    await this.reminderService.deleteReminder(id);

    // Remove from local display map
    this.reminders[date] = this.reminders[date].filter(r => r.id !== id);
    if (this.reminders[date].length === 0) {
      delete this.reminders[date];
    }
  } catch (err) {
    console.error('Failed to delete reminder:', err);
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

