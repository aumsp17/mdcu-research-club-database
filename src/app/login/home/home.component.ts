import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {

  loggingIn = false;

  constructor(
    public auth: AuthService
  ) { }

  ngOnInit(): void {
  }

  onLogin() {
    this.loggingIn = true;
  }
}
