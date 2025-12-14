import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnInit, OnDestroy, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { OfflineStorageService } from '../../services/offline-storage.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-navigation',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navigation.component.html',
  styleUrl: './navigation.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NavigationComponent implements OnInit, OnDestroy {
  private subscription?: Subscription;
  isOnline = signal<boolean>(true);
  mobileMenuOpen = signal<boolean>(false);

  constructor(
    public authService: AuthService,
    private offlineStorage: OfflineStorageService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Subscribe to auth changes
    this.subscription = this.authService.currentUser$.subscribe(() => {
      this.cdr.markForCheck();
    });

    // Subscribe to online status
    this.offlineStorage.getOnlineStatus().subscribe(status => {
      this.isOnline.set(status);
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  logout(): void {
    this.authService.logout();
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen.set(!this.mobileMenuOpen());
    this.cdr.markForCheck();
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
    this.cdr.markForCheck();
  }

  getUserInitials(): string {
    const user = this.authService.getCurrentUser();
    if (!user?.name) return 'U';
    return user.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }
}

