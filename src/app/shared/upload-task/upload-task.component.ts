import { Component, OnInit, Input, ChangeDetectorRef, Output, EventEmitter } from '@angular/core';
import { AngularFireStorage, AngularFireUploadTask } from '@angular/fire/storage';
import { Observable, Subject } from 'rxjs';
import { finalize, tap } from 'rxjs/operators';

import { EntryService } from 'src/app/core/entry.service';

@Component({
  selector: 'app-upload-task',
  templateUrl: './upload-task.component.html',
  styleUrls: ['./upload-task.component.scss']
})
export class UploadTaskComponent implements OnInit {

  @Input() file: File;
  @Input() entryID: string;
  @Input() controllable: boolean;
  @Input() type: string = 'files';

  @Output() uploadCompleted = new EventEmitter<boolean | string>();

  private uploadStatusSource = new Subject<boolean | string>();
  uploadStatus$ = this.uploadStatusSource.asObservable();

  task: AngularFireUploadTask;
  
  percentage: Observable<number>;
  snapshot: Observable<any>;

  constructor(
    private entryService: EntryService,
    private storage: AngularFireStorage
  ) { }

  ngOnInit(): void {
    this.startUpload();
  }

  startUpload() {
    const path = `${this.entryID}/${this.type}/${Date.now()}_${this.file.name}`;

    // Reference to storage bucket
    const ref = this.storage.ref(path);

    // The main task
    this.task = this.entryService.uploadFile(this.file, path);
    
    this.task.catch(e => {
      let error = `An error has occured: ${e}. Cannot upload ${this.file.name}`;
      this.uploadCompleted.emit(error);
      this.uploadStatusSource.next(error);
      this.uploadStatusSource.complete();
      return;
    });

    // Progress monitoring
    this.percentage = this.task.percentageChanges();

    this.snapshot = this.task.snapshotChanges().pipe(
      // The file's download URL
      finalize( async() =>  {
        let downloadURL = await ref.getDownloadURL().toPromise().catch(e => {
          let error = `An error has occured: ${e}. Cannot retrieve download URL for ${this.file.name}.`
          this.uploadCompleted.emit(error);
          this.uploadStatusSource.next(error);
          this.uploadStatusSource.complete();
          return;
        });
        if (this.type == 'files') {
          this.entryService.syncFileUpload(this.entryID, {
            title: this.file.name,
            type: this.file.type,
            size: this.file.size,
            url: downloadURL,
            path: path
          }).then(() => {
            this.uploadCompleted.emit(true);
            this.uploadStatusSource.next(true);
            this.uploadStatusSource.complete();
          }).catch(e => {
            let error = `An error has occured: ${e}. Cannot sync ${this.file.name} with entry database.`
            this.uploadCompleted.emit(error);
            this.uploadStatusSource.next(error);
            this.uploadStatusSource.complete();
            return;
          });
        } else if (this.type == 'image') {
          this.entryService.syncImageUpload(this.entryID, {
            url: downloadURL,
            path: path
          }).then(() => {
            this.uploadCompleted.emit(true);
            this.uploadStatusSource.next(true);
            this.uploadStatusSource.complete();
          }).catch(e => {
            let error = `An error has occured: ${e}. Cannot sync ${this.file.name} with entry database.`
            this.uploadCompleted.emit(error);
            this.uploadStatusSource.next(error);
            this.uploadStatusSource.complete();
            return;
          });
        }

      }),
    );
  }

  isActive(snapshot) {
    return snapshot.state === 'running' && snapshot.bytesTransferred < snapshot.totalBytes;
  }

}
