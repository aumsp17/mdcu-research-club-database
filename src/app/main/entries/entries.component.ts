import { Component, OnInit, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { FormGroup, FormBuilder, Validators, FormControl } from '@angular/forms';
import { MatChipInputEvent } from '@angular/material/chips';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { EntryService } from 'src/app/core/entry.service';
import { MatTableDataSource } from '@angular/material/table';
import { MatSelectChange } from '@angular/material/select';
import { Observable, Subscription } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { DocumentChangeAction } from '@angular/fire/firestore';
import { Router, ActivatedRoute } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';
import {COMMA, ENTER} from '@angular/cdk/keycodes';

import { AuthService } from 'src/app/core/auth.service';
import { Entry } from 'src/app/shared/entry';


@Component({
  selector: 'app-entries',
  templateUrl: './entries.component.html',
  styleUrls: ['./entries.component.scss'],
  animations: [
    trigger(
      'filterExpand', [
        transition(':enter', [
          style({ height: '0px', minHeight: '0', display: 'none' }),
          animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)', style({ height: '*' }))
        ]),
        transition(':leave', [
          style({ height: '*' }),
          animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)', style({ height: '0px', minHeight: '0', display: 'none' }))
        ])
      ]
    )
  ]
})
export class EntriesComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  displayedColumns = ['title', 'position', 'fullNameEN', 'fullNameTH', 'keywords', 'lastUpdated'];
  displayedSearchColumns = ['titleSearch', 'positionSearch', 'fullNameENSearch', 'fullNameTHSearch', 'keywordsSearch', 'reset'];
  dataSource: MatTableDataSource<Entry>;

  department = 'biochemistry';
  showFilter = false;
  isAuthor = false;

  readonly separatorKeysCodes: number[] = [ENTER, COMMA];
  get keywords(): FormControl { return this.filterForm.get('keywords') as FormControl; }
  filterForm: FormGroup;

  entries$: Observable<( Entry & { $id: string })[]>;
  entrySubscription: Subscription;
  filterSubscription: Subscription;

  constructor(
    private entryService: EntryService,
    private router: Router,
    private route: ActivatedRoute,
    private formBuilder: FormBuilder,
    private auth: AuthService
  ) { }


  ngOnInit(): void {

    if (localStorage.getItem('department')) {
      this.department = localStorage.getItem('department');
    }

    this.filterForm = this.formBuilder.group({
      isAuthor: [false],
      start: [],
      end: [],
      titles: [[]],
      position: [],
      fullNameEN: [],
      fullNameTH: [],
      keywords: [[]]
    });

    this.filterSubscription = this.auth.user$.pipe(
      switchMap(user => {
        return this.filterForm.valueChanges.pipe(
          map(value => {
            return {
              uid: user.uid,
              ...value
            }
          })
        )
      })
    ).subscribe(value => {
      this.dataSource.filter = JSON.stringify(value);

    });
  }

  ngOnDestroy(): void {
    if (this.entrySubscription) {
      this.entrySubscription.unsubscribe();
    }
    if (this.filterSubscription) {
      this.filterSubscription.unsubscribe();
    }
  }

  ngAfterViewInit(): void {
    this.listEntries();
  }

  resetSearch() {
    this.filterForm.controls['titles'].reset();
    this.filterForm.controls['position'].reset();
    this.filterForm.controls['fullNameEN'].reset();
    this.filterForm.controls['fullNameTH'].reset();
    this.filterForm.controls['keywords'].reset();
    this.filterForm.updateValueAndValidity();
  }

  resetFilter() {
    this.filterForm.controls['isAuthor'].setValue(false);
    this.filterForm.controls['start'].reset();
    this.filterForm.controls['end'].reset();
    this.filterForm.updateValueAndValidity();
  }

  entryMapper(entries: DocumentChangeAction<Entry>[]) {
    return entries.map(entry => {
      return {
        $id: entry.payload.doc.id,
        ...entry.payload.doc.data()
      }
    })
  }

  departmentChanged() {
    localStorage.setItem('department', this.department);
    this.listEntries();
  }

  listEntries() {
    this.entries$ = this.entryService.listEntries(this.department).pipe(
      map(entries => this.entryMapper(entries))
    );
    
    if (this.entrySubscription) { this.entrySubscription.unsubscribe() }

    this.entrySubscription = this.entries$.subscribe(entries => {
      this.dataSource = new MatTableDataSource(entries);
      this.dataSource.sort = this.sort;
      this.dataSource.filterPredicate = this.dataSourcePredicate;
    })
  }

  rowClicked(entryID: string) {
    if (!(window.getSelection().toString().length > 0)) {
      this.router.navigate([entryID], { relativeTo: this.route })
    }
  }

  addKeyword(event: MatChipInputEvent): void {
    const input = event.input;
    const value = event.value;
    // Add our fruit
    if ((value || '').trim()) {
      this.keywords.value.push(value.trim());
      this.keywords.updateValueAndValidity();
    }

    // Reset the input value
    if (input) {
      input.value = '';
    }
  }

  removeKeyword(item: string): void {
    const index = this.keywords.value.indexOf(item);

    if (index >= 0) {
      this.keywords.value.splice(index, 1);
      this.keywords.updateValueAndValidity();
    }
  }

  dataSourcePredicate(data: Entry, filter: string): boolean {
    let searchTerms = JSON.parse(filter);
    return (searchTerms.titles ? searchTerms.titles.every(title => data.titles.includes(title)) : true) 
    && (searchTerms.position ? data.position == searchTerms.position : true)
    && (searchTerms.fullNameEN ? data.fullNameEN.toLowerCase().indexOf(searchTerms.fullNameEN.toLowerCase()) !== -1 : true)
    && (searchTerms.fullNameTH ? data.fullNameTH.toLowerCase().indexOf(searchTerms.fullNameTH.toLowerCase()) !== -1 : true) 
    && (searchTerms.keywords ? searchTerms.keywords.every(keyword => data.keywords.map(keyword => keyword.toLowerCase()).includes(keyword.toLowerCase())) : true)
    && (searchTerms.isAuthor ? (searchTerms.uid ? searchTerms.uid == data.authorID : true) : true)
    && (searchTerms.start ? data.lastUpdated.toDate() >= new Date(searchTerms.start) : true)
    && (searchTerms.end ? data.lastUpdated.toDate() < new Date(searchTerms.end) : true)
  }

}
