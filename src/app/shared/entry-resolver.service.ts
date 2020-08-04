import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { EntryService } from '../core/entry.service';
import { first } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class EntryResolverService {

  constructor(
    private entryService: EntryService
  ) { }

  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    return this.entryService
      .getEntry(route.paramMap.get('entryKey'))
      .pipe(first());
  }
}
