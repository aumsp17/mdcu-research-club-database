import { Injectable, Query } from '@angular/core';
import { AngularFirestore, QueryFn, CollectionReference } from '@angular/fire/firestore';
import { AngularFireStorage, AngularFireUploadTask, AngularFireStorageReference } from '@angular/fire/storage';
import { Entry, FileUrl, ImageUrl } from '../shared/entry';
import { map, take } from 'rxjs/operators';
import * as firebase from 'firebase';
import { Timestamp } from '@firebase/firestore-types';

@Injectable({
  providedIn: 'root'
})
export class EntryService {

  constructor(
    private afs: AngularFirestore,
    private storage: AngularFireStorage
  ) { }

  checkEntryExists(name: string, language: string) {
    return this.afs
    .collection<Entry>('entries', ref => {
      switch (language) {
        case 'en':
          return ref.where('deleted', '==', false).where('fullNameEN', '==', name);
        case 'th':
          return ref.where('deleted', '==', false).where('fullNameTH', '==', name);
        default:
          return ref;
      }
    })
    .snapshotChanges()
    .pipe(
      take(1),
      map(entries => {
        return entries ? entries.length > 0 : false
      })
    )
  }

  listEntries(
    department: string, 
    authorID: string = null, 
    emails: string[] = null, 
    keywords: string[] = null, 
    date: { start: Date, end: Date } = null
  ) {
    let queryFn: QueryFn = (ref: CollectionReference) => {
      var query = ref.where('deleted', '==', false).where('department', '==', department);
      if (authorID) { query = ref.where('authorID', '==', authorID) };
      if (emails) { query = ref.where('emails', 'array-contains-any', emails) };
      if (keywords) { query = ref.where('keywords', 'array-contains', keywords) };
      if (date) {
        if (date.start) { query = ref.where('lastUpdated', '>=', date.start) };
        if(date.end) { query = ref.where('lastUpdated', '<', date.end) };
      }
      return query.orderBy('lastUpdated');
    }

    return this.afs
    .collection<Entry>('entries', ref => queryFn(ref))
    .snapshotChanges();
  }

  getEntry(entryID) {
    return this.afs
    .collection('entries')
    .doc<Entry>(entryID)
    .valueChanges();
  }

  createEntry(entry: Entry) {
    return this.afs
    .collection('entries')
    .add({ 
      deleted: false, 
      dateAdded: firebase.firestore.FieldValue.serverTimestamp(),
      lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
      ...entry 
    });
  }

  updateEntry(entryID: string, data: Partial<Entry>) {
    return this.afs
    .collection('entries')
    .doc<Entry>(entryID)
    .update({
      lastUpdated: firebase.firestore.FieldValue.serverTimestamp() as Timestamp,
      ...data
    });
  }

  removeEntry(entryID: string) {
    return this.afs
    .collection('entries')
    .doc<Entry>(entryID)
    .update({ deleted: true });
  }

  uploadImage(file: File, path: string = null): AngularFireUploadTask {
    if (!path) { path = `images/${Date.now()}_${file.name}`; }

    return this.storage.upload(path, file);
  }

  removeImage(imageUrl: ImageUrl) {
    return this.storage.ref(imageUrl.path).delete();
  }

  syncImageUpload(entryID: string, imageUrl: ImageUrl) {
    return this.afs
    .collection('entries')
    .doc(entryID)
    .update({
      imageUrl: imageUrl
    });
  }

  syncImageRemove(entryID: string) {
    return this.afs
    .collection('entries')
    .doc(entryID)
    .update({
      imageUrl: firebase.firestore.FieldValue.delete()
    })
  }

  uploadFile(file: File, path: string = null): AngularFireUploadTask {
    if (!path) { path = `files/${Date.now()}_${file.name}`; }

    return this.storage.upload(path, file);
  }

  removeFile(fileUrl: FileUrl) {
    return this.storage.ref(fileUrl.path).delete();
  }
  
  syncFileUpload(entryID: string, fileUrl: FileUrl) {
    return this.afs
    .collection('entries')
    .doc(entryID)
    .update({
      fileUrls: firebase.firestore.FieldValue.arrayUnion(fileUrl)
    });
  }

  syncFileRemove(entryID: string, fileUrl: FileUrl, all: boolean = false) {
    if (all) {
      return this.afs
      .collection('entries')
      .doc(entryID)
      .update({
        fileUrls: firebase.firestore.FieldValue.delete()
      })
    } else {
      return this.afs
      .collection('entries')
      .doc(entryID)
      .update({
        fileUrls: firebase.firestore.FieldValue.arrayRemove(fileUrl)
      });
    }
  }
}
