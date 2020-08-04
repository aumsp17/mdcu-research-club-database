import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { first, map, switchMap } from 'rxjs/operators';

import { EntryService } from '../core/entry.service';
import { AuthService } from '../core/auth.service';
import { of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EntryAuthorResolverService {

  constructor(
    private entryService: EntryService,
    private auth: AuthService
  ) { }

  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    return this.auth.user$.pipe(
      first(),
      switchMap(user => {
        if (user.roles.admin == true) {
          return of(true);
        }
        return this.entryService.getEntry(route.paramMap.get('entryKey')).pipe(
          first(),
          map(entry => entry.authorID === user.uid)
        );
      }),
    )
  }
}
