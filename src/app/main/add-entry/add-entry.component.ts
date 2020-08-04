import { Component, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormGroup, FormBuilder, Validators, FormArray, ValidatorFn, AsyncValidatorFn, AbstractControl, ValidationErrors, FormControl } from '@angular/forms';
import { Observable, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { MatChipInputEvent } from '@angular/material/chips';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { COMMA, ENTER } from '@angular/cdk/keycodes';

import { EntryService } from '../../core/entry.service';
import { UploaderComponent } from 'src/app/shared/uploader/uploader.component';
import { SubmissionDialogComponent } from '../submission-dialog/submission-dialog.component';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';
import { Entry } from 'src/app/shared/entry';

@Component({
  selector: 'app-add-entry',
  templateUrl: './add-entry.component.html',
  styleUrls: ['./add-entry.component.scss']
})
export class AddEntryComponent implements OnInit, OnDestroy {

  @ViewChild('uploader') uploader: UploaderComponent;
  @ViewChild('imgInput', { static: false }) imgInput: ElementRef<HTMLInputElement>;

  reader: FileReader;
  subscriptions: Subscription[] = [];

  imgURL = '';
  imageFiles: FileList;

  readonly separatorKeysCodes: number[] = [ENTER, COMMA];

  entryFormGroup: FormGroup;

  get educations(): FormArray { return this.entryFormGroup.get('educations') as FormArray; }
  get publications(): FormArray { return this.entryFormGroup.get('publications') as FormArray; }
  get awards(): FormArray { return this.entryFormGroup.get('awards') as FormArray; }
  get links(): FormArray { return this.entryFormGroup.get('links') as FormArray; }

  get emails(): FormControl { return this.entryFormGroup.get('emails') as FormControl; }
  get phoneNumbers(): FormControl { return this.entryFormGroup.get('phoneNumbers') as FormControl; }
  get keywords(): FormControl { return this.entryFormGroup.get('keywords') as FormControl; }

  constructor(
    private formBuilder: FormBuilder,
    private entryService: EntryService,
    private snackBar: MatSnackBar,
    public dialog: MatDialog,
    private router: Router,
    private route: ActivatedRoute
  ) { }

  ngOnDestroy(): void {
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
  }

  ngOnInit(): void {
    this.entryFormGroup = this.formBuilder.group({
      titles: [[], [this.genderCheck]],
      position: ['', Validators.required],
      fullNameEN: ['', Validators.required, this.existingNameValidator('en')],
      fullNameTH: ['', Validators.required, this.existingNameValidator('th')],
      department: ['', Validators.required],
      division: [''],
      educations: this.formBuilder.array([]),
      background: [''],
      keywords: [[]],
      publications: this.formBuilder.array([]),
      awards: this.formBuilder.array([]),
      emails: [[]],
      phoneNumbers: [[]],
      links: this.formBuilder.array([]),
      remarks: ['']
    });

    this.reader = new FileReader();
    this.reader.onload = (_event) => { 
      this.imgURL = _event.target.result as string;
    }
  }

  addControl(control: string) {
    const formArray = this.entryFormGroup.get(control) as FormArray;
    switch (control) {
      case 'educations':
        formArray.push(this.formBuilder.group({
          certification: ['', Validators.required],
          place: ['', Validators.required],
          year: [null, Validators.required]
        }));
        break;
      case 'publications':
        formArray.push(this.formBuilder.control('', Validators.required));
        break;
      case 'awards':
        formArray.push(this.formBuilder.group({
          year: [null, Validators.required],
          name: ['', Validators.required]
        }));
        break;
      case 'links':
        formArray.push(this.formBuilder.group({
          title: ['', Validators.required],
          url: ['', Validators.required]
        }))
        break;
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
      return this.entryService.checkEntryExists(control.value, language).pipe(
        map(exists => {
          return exists ? { 'entryExists' : true } : null;
        })
      )
    }
  }

  resetPrompt() {
    let dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Confirm Reset',
        message: 'Are you sure you want to reset? This action cannot be undone.',
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

    let dialogSubscription = dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.reset();
        this.snackBar.open("Form has been reset", "OK", {
          duration: 5000
        })
      }
    });
    this.subscriptions.push(dialogSubscription);
  }

  reset() {
    this.entryFormGroup.reset();
    this.uploader.reset();
    this.imgInput.nativeElement.value = '';
    this.imgURL = '';
  }

  submitForm() {
    let dialogRef = this.dialog.open(SubmissionDialogComponent, {
      disableClose: true,
      height: '80vh',
      width: '90vw',
      data: {
        entry: { complete: this.entryFormGroup.valid, ...this.entryFormGroup.value },
        files: this.uploader.filesSelect?.selectedOptions.selected.map(selection => selection.value),
        image: this.imgInput.nativeElement.files
      }
    })

    let dialogSubscription = dialogRef.afterClosed().subscribe(entryID => {
      let snackBarRef = this.snackBar.open("Entry has successfully been submitted. Thank you!", "View Entry", {
        duration: 5000
      })

      let snackbarSubscription = snackBarRef.onAction().subscribe(() => {
        this.router.navigate(['entries', entryID], { relativeTo: this.route.parent })
      })

      this.subscriptions.push(snackbarSubscription);
      this.reset();
    })

    this.subscriptions.push(dialogSubscription);
  }

  checkForm() {

    if (this.entryFormGroup.valid) {
      this.submitForm()
    } else {
      let snackBarRef = this.snackBar.open("Form is still invalid. Please check for any missing fields", "Submit Anyway", {
        duration: 5000
      });

      let snackbarSubscription = snackBarRef.onAction().subscribe(() => {
        var invalidity = [];
        var invalidityString = '';
        for(let [key, value] of Object.entries(this.entryFormGroup.controls)) {
          if (!value.valid) {
            invalidity.push({
              'key': key,
              'value': value.value,
              'status': value.status,
              'error': value.errors
            })
          }
        }
        if (invalidity.length > 0) {
          invalidityString = JSON.stringify(invalidity);
        }
        this.entryFormGroup.get('remarks').setValue(invalidityString + '\n' + this.entryFormGroup.controls['remarks'].value);

        this.submitForm();
      });
      
      this.subscriptions.push(snackbarSubscription);
    }

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
