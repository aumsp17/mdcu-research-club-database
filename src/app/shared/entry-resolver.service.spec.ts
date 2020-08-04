import { TestBed } from '@angular/core/testing';

import { EntryResolverService } from './entry-resolver.service';

describe('EntryResolverService', () => {
  let service: EntryResolverService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EntryResolverService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
