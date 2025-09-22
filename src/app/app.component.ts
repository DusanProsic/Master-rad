import { Component, HostListener } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './services/theme.service';

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



  constructor(
    public themeService: ThemeService,
    
  ) {
    
  }

  toggleDarkMode() {
    this.themeService.toggleDarkMode();

    
   
  }

 
}


