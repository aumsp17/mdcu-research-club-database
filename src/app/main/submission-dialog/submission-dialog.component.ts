import { Component, OnInit, Inject, ViewChildren, QueryList, OnDestroy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormGroup } from '@angular/forms';
import { Entry } from 'src/app/shared/entry';
import { EntryService } from 'src/app/core/entry.service';
import { UploadTaskComponent } from 'src/app/shared/upload-task/upload-task.component';
import { forkJoin, Subscription, Observable } from 'rxjs';
import { AuthService } from 'src/app/core/auth.service';
import { AngularFireStorage, AngularFireUploadTask } from '@angular/fire/storage';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-submission-dialog',
  templateUrl: './submission-dialog.component.html',
  styleUrls: ['./submission-dialog.component.scss']
})
export class SubmissionDialogComponent implements OnInit, OnDestroy {

  subscriptions: Subscription[] = [];
  imgTask: AngularFireUploadTask;
  imgPercentage: Observable<number>;
  imgSnapshot: Observable<any>;
  errorOptions: {
    label: string,
    action: string,
    color: string
  }[] = [];

  @ViewChildren(UploadTaskComponent) uploadTasks: QueryList<UploadTaskComponent>
  entryID: string

  progress: { status: string, label: string, error?: string };
  
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { entry: Entry, files?: File[], image: FileList },
    private entryService: EntryService,
    private auth: AuthService,
    private storage: AngularFireStorage,
    private dialogRef: MatDialogRef<SubmissionDialogComponent>
  ) { }

  ngOnDestroy(): void {
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
  }

  ngOnInit(): void {
    this.progress = {
      status: 'create',
      label: 'Creating entry'
    };
    this.submit();
  }

  submit() {
    let authSubscription = this.auth.user$.subscribe(user => {
      this.entryService.createEntry({ authorID: user.uid, ...this.data.entry }).then(doc => {
        this.entryID = doc.id;
        if (this.data.files) {
          this.uploadFiles();
        } else if (this.data.image.length > 0) {
          this.uploadImage();
        } else {
          this.submissionComplete();
        }
      }).catch(e => {
        let message = `The following error has occured: ${e}. Form cannot be submitted. Please try again later`;
        this.submissionError(message);
        this.errorOptions = [
          {
            label: 'Cancel',
            color: null,
            action: 'cancel'
          },
          {
            label: 'Retry',
            color: null,
            action: 'retry'
          }
        ]
      })
    })
    this.subscriptions.push(authSubscription);
  }

  uploadFiles() {
    this.progress = {
      status: 'file',
      label: 'Uploading files'
    }
    let uploadFileSubscription = this.uploadTasks.changes.subscribe(tasks => {
      if (tasks.length == this.data.files.length) {
        forkJoin(this.uploadTasks.map(task => task.uploadStatus$)).subscribe(uploadStatuses => {
          if (uploadStatuses.every(status => status == true)) {
            if (this.data.image.length > 0) {
              this.uploadImage();
            } else {
              this.submissionComplete();
            }
          } else {
            let message = `Entry has been created but error occured while uploading files:\n`
            uploadStatuses.forEach(status => {
              if (status != true) {
                message += `${status}\n`
              }
            });
            message += 'Please try uploading these files later by editing the entry.'
            this.submissionError(message);
            if (this.data.image.length > 0) {
              this.errorOptions = [
                {
                  label: 'Proceed',
                  action: 'image',
                  color: null
                }
              ]
            } else {
              this.errorOptions = [
                {
                  label: 'Proceed',
                  action: 'cancel',
                  color: null
                }
              ]
            }
          }

        });
      } 
    });

    this.subscriptions.push(uploadFileSubscription);
  }

  uploadImage() {
    if (this.data.image.length > 0) {
      this.progress = {
        status: 'image',
        label: 'Uploading image'
      }
      let file = this.data.image.item(0);
      const path = `${this.entryID}/image/${Date.now()}_${file.name}`;
  
      // Reference to storage bucket
      const ref = this.storage.ref(path);
  
      // The main task
      this.imgTask = this.entryService.uploadFile(file, path);

      this.imgTask.catch(e => {
        let error = `Entry has been created but an error has occured: ${e}. Cannot upload chosen image. Please try uploading these files later by editing the entry.`
        this.submissionError(error);
        this.errorOptions = [
          {
            label: 'Proceed',
            action: 'cancel',
            color: null
          }
        ];
        return;
      })
  
      // Progress monitoring
      this.imgPercentage = this.imgTask.percentageChanges();
  
      this.imgSnapshot = this.imgTask.snapshotChanges().pipe(
        // The file's download URL
        finalize( async() =>  {
          let downloadURL = await ref.getDownloadURL().toPromise().catch(e => {
            let error = `Entry has been created but an error has occured: ${e}. Cannot retrieve download URL for chosen image. Please try uploading these files later by editing the entry.`
            this.submissionError(error);
            this.errorOptions = [
              {
                label: 'Proceed',
                action: 'cancel',
                color: null
              }
            ]
            return;
          })
          this.entryService.syncImageUpload(this.entryID, {
            url: downloadURL,
            path: path
          }).then(() => {
            this.submissionComplete();
          }).catch(e => {
            let error = `Entry has been created but an error has occured: ${e}. Cannot sync chosen image with entry database. Please try uploading these files later by editing the entry.`
            this.submissionError(error);
            this.errorOptions = [
              {
                label: 'Proceed',
                action: 'cancel',
                color: null
              }
            ];
            return;
          })
        }),
      );
    }
  }

  submissionComplete() {
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
    this.dialogRef.close(this.entryID);
  }

  submissionError(message: string) {
    this.progress = {
      label: 'Error',
      status: 'error',
      error: message
    }
  }

  errorButtonClicked(action: string) {
    switch (action) {
      case 'cancel':
        this.submissionComplete();
        break;
      case 'retry':
        this.ngOnInit();
        break;
      case 'image':
        this.uploadImage();
        break;
      default:
        this.submissionComplete();
    }
  }

}
