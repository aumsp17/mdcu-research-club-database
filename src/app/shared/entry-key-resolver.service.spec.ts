import { TestBed } from '@angular/core/testing';

import { EntryKeyResolverService } from './entry-key-resolver.service';

describe('EntryKeyResolverService', () => {
  let service: EntryKeyResolverService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EntryKeyResolverService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
