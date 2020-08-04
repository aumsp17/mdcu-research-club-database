import { TestBed } from '@angular/core/testing';

import { EntryAuthorResolverService } from './entry-author-resolver.service';

describe('EntryAuthorResolverService', () => {
  let service: EntryAuthorResolverService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EntryAuthorResolverService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
