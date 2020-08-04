import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/core/auth.service';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss']
})
export class MainComponent implements OnInit {

  links = [
    {
      label: 'Entries',
      link: './entries',
      icon: 'view_list'
    }, 
    {
      label: 'Add Entry',
      link: './add-entry',
      icon: 'post_add'
    }
  ];
  activeLink = this.links[0];

  constructor(public auth: AuthService) { }

  ngOnInit(): void {
  }

}
