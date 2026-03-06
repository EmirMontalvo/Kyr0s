import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ThemeService {
    private readonly STORAGE_KEY = 'darkMode';
    private darkModeSubject = new BehaviorSubject<boolean>(this.getStoredPreference());

    isDarkMode$ = this.darkModeSubject.asObservable();

    constructor() {
        // Apply stored preference immediately on service init
        this.applyTheme(this.darkModeSubject.value);
    }

    get isDarkMode(): boolean {
        return this.darkModeSubject.value;
    }

    toggle(): void {
        const newValue = !this.darkModeSubject.value;
        this.darkModeSubject.next(newValue);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(newValue));
        this.applyTheme(newValue);
    }

    private getStoredPreference(): boolean {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        return stored ? JSON.parse(stored) : false;
    }

    private applyTheme(isDark: boolean): void {
        if (isDark) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
    }
}
