import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import * as firebase from 'firebase';
import { AngularFireAuth } from '@angular/fire/auth';
import { AngularFirestore, AngularFirestoreDocument, AngularFirestoreCollection } from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { User } from '../shared/user';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  userRef$: Observable<AngularFirestoreDocument<User>>;
  user$: Observable<User>;
  loaded = false;


  constructor(
    private afAuth: AngularFireAuth,
    private router: Router,
    private afs: AngularFirestore
  ) {
    this.user$ = this.afAuth.authState.pipe(
      switchMap(user => {
        if (user) {
          return this.afs.doc<User>(`users/${user.uid}`).valueChanges();
        } else {
          return of(null);
        }
      })
    );

    this.afAuth.onAuthStateChanged(user => {
      this.loaded = true;
    });
    this.afAuth.getRedirectResult().then(credential => {
      if(credential.user) {
        this.updateUserData(credential.user);
      }
    })
  }

  googleSignin() {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({
      hd: 'docchula.com',
      prompt: 'select_account'
    });
    return this.oAuthLogin(provider)
  }

  private oAuthLogin(provider) {
    return this.afAuth.signInWithRedirect(provider)
  }

  signOut() {
    return this.afAuth.signOut().then(() => {
      this.router.navigate(['/login']);
    });
  }

  private updateUserData(user: firebase.User) {
    const userRef: AngularFirestoreDocument<any> = this.afs.doc(`users/${user.uid}`);
    const data = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      roles: {
        editor: true
      }
    }
    return userRef.set(data, { merge: true }).then(() => {
      this.router.navigate(['/'])
    })
  }

  checkAuthorization(user: User, allowedRoles: string[]): boolean {
    if (!user) return false
    if (!allowedRoles) return true
    for (const role of allowedRoles) {
      if (user.roles[role]) {
        return true
      }
    }
    return false
  }

  canEdit(user: User, authorID: string = null) {
    const allowed = ['admin'];
    return this.checkAuthorization(user, allowed) || this.isAuthor(user, authorID);
  }


  isAuthor(user: User, authorID: string) {
    return (user.uid === authorID);
  }
}
