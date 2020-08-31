import { Component, OnInit, ViewChild, ElementRef, OnDestroy, HostListener } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormGroup, FormBuilder, Validators, FormArray, AsyncValidatorFn, AbstractControl, ValidationErrors, FormControl } from '@angular/forms';
import { Observable, Subscription, of } from 'rxjs';
import { map, switchMap, take, first, tap } from 'rxjs/operators';
import { MatChipInputEvent } from '@angular/material/chips';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { COMMA, ENTER } from '@angular/cdk/keycodes';

import { EntryService } from '../../core/entry.service';
import { UploaderComponent } from 'src/app/shared/uploader/uploader.component';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';
import { Entry, FileUrl, ImageUrl } from 'src/app/shared/entry';
import { MatTableDataSource, MatTable } from '@angular/material/table';
import { SelectionModel } from '@angular/cdk/collections';

@Component({
  selector: 'app-entry',
  templateUrl: './entry.component.html',
  styleUrls: ['./entry.component.scss']
})
export class EntryComponent implements OnInit, OnDestroy {

  entry$: Observable<Entry>;
  entryKey$: Observable<string>;
  isAuthor$: Observable<boolean>;
  fileUrls$: Observable<FileUrl[]>;
  imageUrl$: Observable<ImageUrl>;
  entry: Entry;

  isEditing = false;

  @HostListener('window:beforeunload')
  canDeactivate(): Observable<boolean> | boolean {
    return this.isEditing ? false : true
  }

  @ViewChild('uploader') uploader: UploaderComponent;
  @ViewChild('imgInput', { static: false }) imgInput: ElementRef<HTMLInputElement>;
  @ViewChild(MatTable, { static: false }) filesTable: MatTable<FileUrl>;

  reader: FileReader;
  subscriptions: Subscription[] = [];

  imgURL = '';
  imageFile: File;

  readonly separatorKeysCodes: number[] = [ENTER, COMMA];

  entryFormGroup: FormGroup;
  filesDataSource: MatTableDataSource<FileUrl>;
  selection = new SelectionModel<FileUrl>(true, []);
  displayedColumns = ['title', 'view']

  get projects(): FormArray { return this.entryFormGroup.get('projects') as FormArray; }
  get educations(): FormArray { return this.entryFormGroup.get('educations') as FormArray; }
  get publications(): FormArray { return this.entryFormGroup.get('publications') as FormArray; }
  get awards(): FormArray { return this.entryFormGroup.get('awards') as FormArray; }
  get links(): FormArray { return this.entryFormGroup.get('links') as FormArray; }

  get emails(): FormControl { return this.entryFormGroup.get('emails') as FormControl; }
  get phoneNumbers(): FormControl { return this.entryFormGroup.get('phoneNumbers') as FormControl; }
  get keywords(): FormControl { return this.entryFormGroup.get('keywords') as FormControl; }

  constructor(
    private route: ActivatedRoute,
    private formBuilder: FormBuilder,
    private entryService: EntryService,
    private snackBar: MatSnackBar,
    public dialog: MatDialog
  ) { }


  ngOnDestroy(): void {
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
  }

  ngOnInit(): void {
    this.entryKey$ = this.route.data.pipe(map(data => data.entryKey));
    this.entry$ = this.route.data.pipe(map(data => data.entry));
    this.isAuthor$ = this.route.data.pipe(map(data => data.isAuthor));
    this.fileUrls$ = this.entryKey$.pipe(
      switchMap(key => {
        return this.entryService.getEntry(key).pipe(
          map(entry => entry.fileUrls)
        )
      })
    );
    this.imageUrl$ = this.entryKey$.pipe(
      switchMap(key => {
        return this.entryService.getEntry(key).pipe(
          map(entry => entry.imageUrl)
        )
      })
    )

    this.entryFormGroup = this.formBuilder.group({
      titles: [[], [this.genderCheck]],
      position: ['', Validators.required],
      fullNameEN: ['', Validators.required, this.existingNameValidator('en')],
      fullNameTH: ['', Validators.required, this.existingNameValidator('th')],
      department: ['', Validators.required],
      division: [''],
      educations: this.formBuilder.array([]),
      projects: this.formBuilder.array([]),
      keywords: [[]],
      publications: this.formBuilder.array([]),
      awards: this.formBuilder.array([]),
      emails: [[]],
      phoneNumbers: [[]],
      links: this.formBuilder.array([]),
      remarks: ['']
    });

    this.entry$.subscribe(entry => {
      this.entry = entry;
      this.patchForm();
    });

    let fileUrlsSubscription = this.fileUrls$.subscribe(fileUrls => {
      this.filesDataSource = new MatTableDataSource<FileUrl>(fileUrls);
    })
    this.subscriptions.push(fileUrlsSubscription);

    this.reader = new FileReader();
    this.reader.onload = (_event) => {
      this.imgURL = _event.target.result as string;
    }
  }

  patchForm() {
    if (this.entry) {
      this.entryFormGroup.reset();

      this.entryFormGroup.patchValue(this.entry);

      this.entry.projects.forEach(project => this.projects.push(this.formBuilder.control(project, Validators.required)));
      this.entry.publications.forEach(publication => this.publications.push(this.formBuilder.control(publication, Validators.required)));
      this.entry.educations.forEach(education => {
        let group = this.addGroup('educations');
        group.patchValue(education);
        this.educations.push(group);
      })
      this.entry.awards.forEach(award => {
        let group = this.addGroup('awards');
        group.patchValue(award);
        this.awards.push(group);
      })
      this.entry.links.forEach(link => {
        let group = this.addGroup('links');
        group.patchValue(link);
        this.links.push(group);
      });
    }
  }

  uploadCompleted(event) {
    if (event == true) {
      this.snackBar.open('Files have been successfully uploaded', 'OK', {
        duration: 5000
      });
    } else {
      this.snackBar.open(event, 'OK')
    }
  }

  deleteFile() {
    if (this.selection.isSelected) {

      let title = this.selection.selected.length > 1 ? 'Remove files' : 'Remove file';
      let message = this.selection.selected.length > 1 ? "Are you sure you want to remove these files? This action can't be undone." : "Are you sure you want to remove this file? This action can't be undone."
      let dialogRef = this.dialog.open(ConfirmDialogComponent, {
        data: {
          title: title,
          message: message,
          options: [
            {
              label: 'Cancel',
              value: false,
              color: 'warn'
            },
            {
              label: 'Confirm',
              value: true,
              color: 'primary'
            }
          ]
        }
      })

      dialogRef.afterClosed().subscribe(confirmed => {
        if (confirmed) {
          this.entryKey$.subscribe(key => {
            if (this.isAllSelected()) {
              this.entryService.syncFileRemove(key, null, true);
              this.selection.selected.forEach(file => {
                this.entryService.removeFile(file);
                this.selection.toggle(file)
              });
            } else {
              this.selection.selected.forEach(file => {
                this.entryService.removeFile(file);
                this.entryService.syncFileRemove(key, file)
                this.selection.toggle(file)
              })
            }
            this.filesTable.renderRows();
          })
        }
      });
    }
  }

  addImage() {
    if (this.imgInput.nativeElement.files.length > 0) {
      this.imageUrl$.pipe(
        first()
      ).subscribe(imageUrl => {
        if (imageUrl) {
          this.entryService.removeImage(imageUrl);
        }
        this.imageFile = this.imgInput.nativeElement.files.item(0);
      });
    }
  }

  imageUploaded(event: boolean | string) {
    this.imageFile = null;
    this.imgInput.nativeElement.value = '';
    this.imgURL = '';
  }

  removeImage() {
    let dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Remove Image',
        message: "Are you sure you want to remove this image? This action can't be undone.",
        options: [
          {
            label: 'Cancel',
            value: false,
            color: 'warn'
          },
          {
            label: 'Confirm',
            value: true,
            color: 'primary'
          }
        ]
      }
    })

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.entryService.removeImage(this.entry.imageUrl);
        this.entryKey$.subscribe(key => {
          this.entryService.syncImageRemove(key);
        })
      }
    });
  }

  /** Whether the number of selected elements matches the total number of rows. */
  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.filesDataSource.data.length;
    return numSelected === numRows;
  }

  /** Selects all rows if they are not all selected; otherwise clear selection. */
  masterToggle() {
    this.isAllSelected() ? this.selection.clear() : this.filesDataSource.data.forEach(row => this.selection.select(row));
  }

  /** The label for the checkbox on the passed row */
  checkboxLabel(row?: FileUrl): string {
    if (!row) {
      return `${this.isAllSelected() ? 'select' : 'deselect'} all`;
    }
    return `${this.selection.isSelected(row) ? 'deselect' : 'select'} row ${row.title}`;
  }

  addControl(control: string) {
    const formArray = this.entryFormGroup.get(control) as FormArray;
    switch (control) {
      case 'projects':
        formArray.push(this.formBuilder.control('', Validators.required));
        break;
      case 'educations':
        formArray.push(this.addGroup(control));
        break;
      case 'publications':
        formArray.push(this.formBuilder.control('', Validators.required));
        break;
      case 'awards':
        formArray.push(this.addGroup(control));
        break;
      case 'links':
        formArray.push(this.addGroup(control))
        break;
    }
  }

  addGroup(control: string): FormGroup {

    switch (control) {
      case 'educations':
        return this.formBuilder.group({
          certification: ['', Validators.required],
          place: ['', Validators.required],
          year: [null, Validators.required]
        });
      case 'awards':
        return this.formBuilder.group({
          year: [null, Validators.required],
          name: ['', Validators.required]
        })
      case 'links':
        return this.formBuilder.group({
          title: ['', Validators.required],
          url: ['', Validators.required]
        })
    }
  }

  add(event: MatChipInputEvent, to: string): void {
    const input = event.input;
    const value = event.value;

    var formControl: FormControl
    switch (to) {
      case 'keywords':
        formControl = this.keywords;
        break;
      case 'emails':
        formControl = this.emails;
        break;
      case 'phoneNumbers':
        formControl = this.phoneNumbers;
    }

    if (formControl) {
      // Add our fruit
      if ((value || '').trim()) {
        formControl.value.push(value.trim());
        formControl.updateValueAndValidity();
      }

      // Reset the input value
      if (input) {
        input.value = '';
      }
    }
  }

  remove(item: string, from: string): void {
    var formControl: FormControl
    switch (from) {
      case 'keywords':
        formControl = this.keywords;
        break;
      case 'emails':
        formControl = this.emails;
        break;
      case 'phoneNumbers':
        formControl = this.phoneNumbers;
    }
    if (formControl) {
      const index = formControl.value.indexOf(item);

      if (index >= 0) {
        formControl.value.splice(index, 1);
        formControl.updateValueAndValidity();
      }
    }
  }

  genderCheck(control: AbstractControl): ValidationErrors | null {
    if (control.value?.includes('พญ.') && control.value?.includes('นพ.')) {
      return {
        'gender': true
      }
    }
    return null;
  }

  existingNameValidator(language: string): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      if (this.entry) {
        if (control.value === this.entry.fullNameEN || control.value === this.entry.fullNameTH) {
          return of(null);
        } else {
          return this.entryService.checkEntryExists(control.value, language).pipe(
            map(exists => {
              return exists ? { 'entryExists' : true } : null;
            })
          )
        }
      } else {
        return of(null);
      }
    }
  }

  edit() {
    this.isEditing = true;
    this.displayedColumns = ['select', 'title', 'view'];
  }

  cancelEdit() {
    let dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Cancel Edit',
        message: "Are you sure you want to cancel your edits? Any changes you've made will be lost.",
        options: [
          {
            label: 'Cancel',
            value: false,
            color: 'warn'
          },
          {
            label: 'Confirm',
            value: true,
            color: 'primary'
          }
        ]
      }
    })

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.isEditing = false;
        this.displayedColumns = ['title', 'view'];
        this.patchForm();
      }
    });
  }

  save() {
    this.entryKey$.subscribe(key => {
      this.entryService.updateEntry(key, this.entryFormGroup.value).then(() => {
        this.entry = this.entryFormGroup.value;
        this.isEditing = false;
        this.displayedColumns = ['title', 'view'];
        this.snackBar.open('Entry has successfully been updated', 'OK', { duration: 5000 });
      }).catch(e => {
        this.snackBar.open(`An error has occured: ${e}. Please try again later`, 'OK');
      })
    })
  }

  preview(files: FileList) {
    this.imgURL = '';
    if (files.length > 0) {
      var mimeType = files[0].type;
      if (mimeType.match(/image\/*/) == null) {
        return;
      } else {
        this.reader.readAsDataURL(files[0]);
      }
    }
    return;
  }
}
