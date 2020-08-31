import { Component, ViewChild, Input, ViewChildren, QueryList, Output, EventEmitter } from '@angular/core';
import { MatSelectionList } from '@angular/material/list';
import { UploadTaskComponent } from '../upload-task/upload-task.component';
import { Subscription, forkJoin } from 'rxjs';

@Component({
  selector: 'app-uploader',
  templateUrl: './uploader.component.html',
  styleUrls: ['./uploader.component.scss']
})
export class UploaderComponent {

  @ViewChild('filesSelect', { static: false }) filesSelect: MatSelectionList;
  @ViewChildren(UploadTaskComponent) uploadTasks: QueryList<UploadTaskComponent>;

  @Output() uploadCompleted = new EventEmitter<string | boolean>();

  @Input() upload = false;
  @Input() entryID;

  subscriptions: Subscription[] = [];
  
  isHovering: boolean;

  files: File[] = [];

  toggleHover(event: boolean) {
    this.isHovering = event;
  }

  onDrop(files: FileList) {
    for (let i = 0; i < files.length; i++) {
      this.files.push(files.item(i));
    }
    if (this.upload) {
      let uploadFileSubscription = this.uploadTasks.changes.subscribe(tasks => {
        if (tasks.length == this.files.length) {
          forkJoin(this.uploadTasks.map(task => task.uploadStatus$)).subscribe(uploadStatuses => {
            if (uploadStatuses.every(status => status == true)) {
              
              this.uploadCompleted.emit(true);
              this.reset();
            } else {
              let message = `An error occured while uploading files:\n`
              uploadStatuses.forEach(status => {
                if (status != true) {
                  message += `${status}\n`
                }
              });
              message += 'Please try again later.'
              this.uploadCompleted.emit(message);
            }
          });
        } 
      });
  
      this.subscriptions.push(uploadFileSubscription);
    }
  }

  parseFileSize(size: number): string {
    var unitSize: number;
    var unit: string;
    switch(true) {
      case size >= 1073741824:
        unitSize = 1073741824
        unit = 'GB'
        break;
      case size >= 1048576:
        unitSize = 1048576
        unit = 'MB'
        break;
      case size >= 1024:
        unitSize = 1024
        unit = 'KB'
        break;
    }

    if (unitSize && unit) {
      var newSize = Math.round((size / unitSize) * 100) / 100;
      return newSize + ' ' + unit;
    } else {
      return size + ' bytes'
    }
  }
  
  reset() {
    this.files = [];
  }
}
