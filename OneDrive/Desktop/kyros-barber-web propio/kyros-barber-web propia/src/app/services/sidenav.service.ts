import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class SidenavService {
    private _sidenavHidden = new BehaviorSubject<boolean>(false);

    sidenavHidden$ = this._sidenavHidden.asObservable();

    hideSidenav() {
        this._sidenavHidden.next(true);
    }

    showSidenav() {
        this._sidenavHidden.next(false);
    }
}
