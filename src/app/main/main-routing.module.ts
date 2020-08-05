import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AuthGuard } from '../auth.guard';
import { EditGuard } from '../edit.guard';
import { EntryKeyResolverService } from '../shared/entry-key-resolver.service';
import { EntryResolverService } from '../shared/entry-resolver.service';
import { EntryAuthorResolverService } from '../shared/entry-author-resolver.service';
import { MainComponent } from './main/main.component';
import { AddEntryComponent } from './add-entry/add-entry.component';
import { EntriesComponent } from './entries/entries.component';
import { EntryComponent } from './entry/entry.component';


const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'entries'
  },
  {
    path: '',
    component: MainComponent,
    canActivate: [AuthGuard],
    children: [
      {
        path: 'add-entry',
        component: AddEntryComponent
      },
      {
        path: 'entries',
        component: EntriesComponent
      },
      {
        path: 'entries/:entryKey',
        component: EntryComponent,
        resolve: {
          entry: EntryResolverService,
          entryKey: EntryKeyResolverService,
          isAuthor: EntryAuthorResolverService
        },
        canDeactivate: [EditGuard]
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MainRoutingModule { }
