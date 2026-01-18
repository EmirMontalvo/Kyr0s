import { Routes } from '@angular/router';
import { Login } from './pages/auth/login/login';
import { Register } from './pages/auth/register/register';
import { Dashboard } from './pages/dashboard/dashboard';
import { Calendar } from './pages/dashboard/calendar/calendar';
import { Services } from './pages/dashboard/services/services';
import { Employees } from './pages/dashboard/employees/employees';
import { Branches } from './pages/dashboard/branches/branches';
import { Clients } from './pages/dashboard/clients/clients';
import { Profile } from './pages/dashboard/profile/profile';
import { Statistics } from './pages/dashboard/statistics/statistics';
import { Reception } from './pages/reception/reception';
import { ChatbotPage } from './pages/chatbot/chatbot';
import { authGuard } from './guards/auth-guard';

import { Onboarding } from './pages/onboarding/onboarding';

export const routes: Routes = [
    // Public chatbot route (no auth required)
    { path: 'chat/:sucursalId', component: ChatbotPage },

    { path: 'login', component: Login },
    { path: 'register', component: Register },
    { path: 'onboarding', component: Onboarding, canActivate: [authGuard] },
    {
        path: 'dashboard',
        component: Dashboard,
        canActivate: [authGuard],
        children: [
            { path: 'calendar', component: Calendar },
            { path: 'services', component: Services },
            { path: 'employees', component: Employees },
            { path: 'branches', component: Branches },
            { path: 'clients', component: Clients },
            { path: 'statistics', component: Statistics },
            { path: 'profile', component: Profile },
            { path: '', redirectTo: 'calendar', pathMatch: 'full' }
        ]
    },
    {
        path: 'reception',
        component: Reception,
        canActivate: [authGuard]
    },
    { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    { path: '**', redirectTo: 'dashboard' }
];
