import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';
import { map, take, filter } from 'rxjs/operators';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.session$.pipe(
    filter(session => session !== undefined),
    take(1),
    map(session => {
      if (session) {
        return true;
      } else {
        return router.createUrlTree(['/login']);
      }
    })
  );
};
