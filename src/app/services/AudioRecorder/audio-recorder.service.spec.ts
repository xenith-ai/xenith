import { TestBed } from '@angular/core/testing';

import { AudioRecorder } from './audio-recorder.service';

describe('AudioRecordingService', () => {
  let service: AudioRecorder;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AudioRecorder);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
