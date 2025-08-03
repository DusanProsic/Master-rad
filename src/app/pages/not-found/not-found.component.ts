import { Component } from '@angular/core';

@Component({
  selector: 'app-not-found',
  standalone: true,
  template: `
    <div style="text-align: center; padding: 2rem;">
      <h1>404 - Page Not Found</h1>
      <p>The page you're looking for doesn't exist.</p>
      <a routerLink="/dashboard">Go to Dashboard</a>
    </div>
  `
})
export class NotFoundPage {}
