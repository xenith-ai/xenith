import { TestBed } from '@angular/core/testing';

import { AudioRecorderService } from './audio-recorder.service';

describe('AudioRecordingService', () => {
  let service: AudioRecorderService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AudioRecorderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
