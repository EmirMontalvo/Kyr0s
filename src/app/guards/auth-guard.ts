import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';
import { SupabaseService } from '../services/supabase.service';
import { map, take, filter, switchMap, from, of } from 'rxjs';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const supabase = inject(SupabaseService);
  const router = inject(Router);

  return authService.session$.pipe(
    filter(session => session !== undefined),
    take(1),
    switchMap(session => {
      if (session) {
        // Check if email is verified
        if (!session.user.email_confirmed_at) {
          // Email not verified - sign out and redirect
          return from(supabase.client.auth.signOut()).pipe(
            map(() => router.createUrlTree(['/login'], {
              queryParams: { error: 'email_not_verified' }
            }))
          );
        }
        return of(true);
      } else {
        return of(router.createUrlTree(['/login']));
      }
    })
  );
};
