import { Injectable } from '@angular/core';
import emailjs from 'emailjs-com';

@Injectable({ providedIn: 'root' })
export class EmailService {
  private serviceId = 'service_n75lmzi';
  private templateId = 'template_ecetiaq';
  private userId = 'EKMK9Km-cc8aerECV';

  sendReminder(email: string, message: string) {
    const templateParams = {
      user_email: email,
      message: message,
    };

    return emailjs.send(this.serviceId, this.templateId, templateParams, this.userId);
  }
}
