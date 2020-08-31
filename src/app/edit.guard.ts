import { Injectable } from '@angular/core';
import { CanDeactivate, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { EntryComponent } from './main/entry/entry.component';

@Injectable({
  providedIn: 'root'
})
export class EditGuard implements CanDeactivate<EntryComponent> {
  canDeactivate(
    component: EntryComponent,
    currentRoute: ActivatedRouteSnapshot,
    currentState: RouterStateSnapshot,
    nextState?: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {

    return component.canDeactivate() ? true : confirm('Your form has not been saved. Are you sure you want to leave?');
  }
}
