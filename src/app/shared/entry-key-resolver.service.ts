import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class EntryKeyResolverService {

  constructor() { }

  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    return route.paramMap.get('entryKey');
  }
}
