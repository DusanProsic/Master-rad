import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { RouterModule } from '@angular/router';
import { HostListener } from '@angular/core';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.css']
})
export class LayoutComponent {
  constructor(private authService: AuthService) {}

  sidebarOpen = false;
  logout() {
    this.authService.logout();
  }
  toggleSidebar() {
  this.sidebarOpen = !this.sidebarOpen;
}

closeSidebar() {
  this.sidebarOpen = false;
}
@HostListener('document:click', ['$event'])
onClickOutside(event: Event) {
  if (
    this.sidebarOpen &&
    !(
      (event.target as HTMLElement).closest('.sidebar') ||
      (event.target as HTMLElement).closest('.hamburger')
    )
  ) {
    this.sidebarOpen = false;
  }
}
}
