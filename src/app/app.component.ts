import { Component, HostListener } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './services/theme.service';
import { ToastService, ToastMessage } from './services/toast.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'Master-rad';

  // Toast state
  showToast = false;
  toastMessage = '';
  toastType: ToastMessage['type'] = 'info';

  constructor(
    public themeService: ThemeService,
    private toastService: ToastService
  ) {
    // Subscribe to toast stream
    this.toastService.toast$.subscribe((toast: ToastMessage | null) => {
      if (toast) {
        this.toastMessage = toast.message;
        this.toastType = toast.type;
        this.showToast = true;

        // Auto-dismiss after 3 seconds
        setTimeout(() => {
          this.showToast = false;
        }, 3000);
      } else {
        this.showToast = false;
      }
    });
  }

  toggleDarkMode() {
    this.themeService.toggleDarkMode();

    this.toastService.show(
      this.themeService.isDarkMode()
        ? 'Dark mode enabled'
        : 'Light mode enabled',
      'info'
    );
  }

  // Keyboard shortcut: Ctrl + B for dark mode toggle
  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (event.ctrlKey && event.key.toLowerCase() === 'b') {
      event.preventDefault();
      this.toggleDarkMode();
    }
  }
}


