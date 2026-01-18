import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthSession, User, Session } from '@supabase/supabase-js';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private _session = new BehaviorSubject<Session | null | undefined>(undefined);
  private _user = new BehaviorSubject<User | null>(null);

  constructor(private supabase: SupabaseService) {
    this.loadSession();
    this.supabase.client.auth.onAuthStateChange((event, session) => {
      this._session.next(session);
      this._user.next(session?.user ?? null);
    });
  }

  async loadSession() {
    const { data } = await this.supabase.client.auth.getSession();
    this._session.next(data.session);
    this._user.next(data.session?.user ?? null);
  }

  get session$(): Observable<Session | null | undefined> {
    return this._session.asObservable();
  }

  get user$(): Observable<User | null> {
    return this._user.asObservable();
  }

  async signIn(email: string, password: string) {
    return this.supabase.client.auth.signInWithPassword({ email, password });
  }

  async signUp(email: string, password: string, data: any) {
    return this.supabase.client.auth.signUp({
      email,
      password,
      options: { data }
    });
  }

  async signOut() {
    return this.supabase.client.auth.signOut();
  }

  get currentUser() {
    return this._user.value;
  }
}
