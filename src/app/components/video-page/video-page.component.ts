import {
  Component,
  ViewChild,
  ElementRef,
  OnDestroy,
  ChangeDetectorRef,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ClipService } from '../../services/clip/clip.service';
import { Clip } from '../../models/clip.model';
import { WhisperSegment } from '../../models/whisper-segment.model';
import { IndexedDBService } from '../../services/indexed-db/indexed-db.service';
import { HttpHandlerService } from '../../services/http-handler/http-handler.service';
import { WhisperOneShotService } from '../../services/whisper-one-shot/whisper-one-shot.service';
import { ModelKey } from '../../enums/model-key.enum';
import { ModelUrl } from '../../enums/model-url.enum';

const VIDEO_WHISPER_MODEL_KEY = ModelKey.WhisperTinyEn;
const VIDEO_WHISPER_MODEL_URL = ModelUrl.WhisperTinyEn;

const PLAY_GAP_DELTA_S = 0.2;
/** ±buffer (seconds) around each play interval so playback starts/ends slightly before/after words. */
const PLAY_BUFFER_S = 0.5;
/** Cap segment duration so one word can't span long silence (e.g. bad t1 from older Whisper). */
const MAX_SEGMENT_DURATION_S = 2.5;

export interface PlayInterval {
  start: number;
  end: number;
}

@Component({
  selector: 'app-video-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './video-page.component.html',
  styleUrl: './video-page.component.scss',
})
export class VideoPageComponent implements OnInit, OnDestroy {
  @ViewChild('videoEl') videoRef: ElementRef<HTMLVideoElement> | null = null;

  /** Clip currently shown (from ClipService). */
  videoPageClip: Clip | null = null;
  transcription: string | null = null;
  segments: WhisperSegment[] = [];
  playIntervals: PlayInterval[] = [];
  videoObjectUrl: string | null = null;
  videoDuration = 0;
  currentTime = 0;

  downloading = false;
  downloadProgress: number | null = null;
  downloadError: string | null = null;
  modelCached = false;

  private lastClipId: string | null = null;
  private timeupdateBound = () => this.onTimeUpdate();
  private playBound = () => this.onPlayAttempt();
  private loadedMetaBound = () => this.onLoadedMetadata();
  private pollInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private clipService: ClipService,
    private cdr: ChangeDetectorRef,
    private indexedDB: IndexedDBService,
    private httpHandler: HttpHandlerService,
    private whisperOneShot: WhisperOneShotService
  ) {}

  ngOnInit(): void {
    this.checkModelCached();
    this.pollInterval = setInterval(() => {
      this.syncFromClipService();
      this.cdr.detectChanges();
    }, 300);
  }

  async checkModelCached(): Promise<void> {
    const model = await this.indexedDB.readModel(VIDEO_WHISPER_MODEL_KEY);
    this.modelCached = model != null && model.length > 0;
    this.cdr.detectChanges();
  }

  async downloadModels(): Promise<void> {
    this.downloadError = null;
    this.downloading = true;
    this.downloadProgress = 0;
    this.cdr.detectChanges();
    try {
      const data = await this.httpHandler.fetchOctetStream(
        VIDEO_WHISPER_MODEL_URL,
        (loaded, total) => {
          this.downloadProgress = total != null ? Math.round((loaded / total) * 100) : null;
          this.cdr.detectChanges();
        }
      );
      await this.indexedDB.insertModel(VIDEO_WHISPER_MODEL_KEY, data);
      this.whisperOneShot.resetInstance();
      this.modelCached = true;
      this.downloadProgress = 100;
    } catch (err) {
      this.downloadError = err instanceof Error ? err.message : String(err);
    } finally {
      this.downloading = false;
      this.cdr.detectChanges();
    }
  }

  ngOnDestroy(): void {
    if (this.pollInterval) clearInterval(this.pollInterval);
    this.revokeVideoUrl();
  }

  private syncFromClipService(): void {
    const clip = this.clipService.getVideoPageClip();
    const clipId = clip?.id ?? null;
    const segmentCount = clip?.segments?.length ?? 0;
    const sameClip = clipId === this.lastClipId && segmentCount === this.segments.length;
    if (sameClip && clipId != null) return;
    this.lastClipId = clipId;
    this.revokeVideoUrl();
    this.videoPageClip = clip;
    if (!clip) {
      this.transcription = null;
      this.segments = [];
      this.playIntervals = [];
      this.videoDuration = 0;
      this.currentTime = 0;
      this.cdr.detectChanges();
      return;
    }
    this.transcription = clip.transcription ?? null;
    this.segments = clip.segments ?? [];
    this.playIntervals = this.buildPlayIntervals(this.segments, PLAY_GAP_DELTA_S);
    this.logTimings();
    if (clip.file) {
      this.videoObjectUrl = URL.createObjectURL(clip.file);
    }
    this.cdr.detectChanges();
    this.attachVideoListeners();
  }

  private logTimings(): void {
    console.log('[VideoPage] segments (per-word):', this.segments.length);
    this.segments.forEach((s, i) => {
      console.log(`  [${i}] t0=${s.t0.toFixed(2)}s t1=${s.t1.toFixed(2)}s "${(s.text || '').trim()}"`);
    });
    console.log('[VideoPage] playIntervals (merge delta=', PLAY_GAP_DELTA_S, 's):', this.playIntervals.length);
    this.playIntervals.forEach((iv, i) => {
      console.log(`  [${i}] ${iv.start.toFixed(2)}s --> ${iv.end.toFixed(2)}s`);
    });
  }

  private buildPlayIntervals(
    segments: WhisperSegment[],
    deltaS: number
  ): PlayInterval[] {
    if (segments.length === 0) return [];
    const sorted = [...segments].sort((a, b) => a.t0 - b.t0);
    const cap = (t0: number, t1: number) =>
      Math.min(t1, t0 + MAX_SEGMENT_DURATION_S);
    const out: PlayInterval[] = [
      { start: sorted[0].t0, end: cap(sorted[0].t0, sorted[0].t1) },
    ];
    for (let i = 1; i < sorted.length; i++) {
      const prev = out[out.length - 1];
      const seg = sorted[i];
      const segEnd = cap(seg.t0, seg.t1);
      if (seg.t0 - prev.end <= deltaS) {
        prev.end = Math.max(prev.end, segEnd);
      } else {
        out.push({ start: seg.t0, end: segEnd });
      }
    }
    return out.map((iv) => ({
      start: Math.max(0, iv.start - PLAY_BUFFER_S),
      end: iv.end + PLAY_BUFFER_S,
    }));
  }

  private revokeVideoUrl(): void {
    if (this.videoObjectUrl) {
      URL.revokeObjectURL(this.videoObjectUrl);
      this.videoObjectUrl = null;
    }
    this.detachVideoListeners();
  }

  private get video(): HTMLVideoElement | null {
    return this.videoRef?.nativeElement ?? null;
  }

  private attachVideoListeners(): void {
    const v = this.video;
    if (!v) return;
    v.addEventListener('timeupdate', this.timeupdateBound);
    v.addEventListener('play', this.playBound);
    v.addEventListener('loadedmetadata', this.loadedMetaBound);
  }

  private detachVideoListeners(): void {
    const v = this.video;
    if (!v) return;
    v.removeEventListener('timeupdate', this.timeupdateBound);
    v.removeEventListener('play', this.playBound);
    v.removeEventListener('loadedmetadata', this.loadedMetaBound);
  }

  private onLoadedMetadata(): void {
    const v = this.video;
    if (v) {
      this.videoDuration = v.duration;
      console.log('[VideoPage] video duration:', this.videoDuration.toFixed(2), 's');
      this.cdr.detectChanges();
    }
  }

  private getCurrentIntervalIndex(time: number): number {
    for (let i = 0; i < this.playIntervals.length; i++) {
      const iv = this.playIntervals[i];
      if (time >= iv.start && time <= iv.end) return i;
      if (time < iv.start) return -1;
    }
    return -1;
  }

  private getNextIntervalStart(afterTime: number): number | null {
    for (const iv of this.playIntervals) {
      if (iv.start > afterTime) return iv.start;
    }
    return null;
  }

  private getSeekTime(clickFraction: number): number {
    const t = clickFraction * this.videoDuration;
    const idx = this.getCurrentIntervalIndex(t);
    if (idx >= 0) return t;
    const next = this.getNextIntervalStart(t);
    return next ?? t;
  }

  private onPlayAttempt(): void {
    if (this.playIntervals.length === 0) return;
    const v = this.video;
    if (!v) return;
    const t = v.currentTime;
    const idx = this.getCurrentIntervalIndex(t);
    if (idx === -1) {
      const next = this.getNextIntervalStart(t);
      if (next != null) {
        console.log('[VideoPage] play: in gap at', t.toFixed(2), 's, seeking to next interval at', next.toFixed(2), 's');
        v.currentTime = next;
      }
    }
  }

  private lastLogTime = 0;
  private onTimeUpdate(): void {
    const v = this.video;
    if (!v) return;
    this.currentTime = v.currentTime;
    if (this.playIntervals.length === 0) return;
    if (v.paused) {
      this.cdr.detectChanges();
      return;
    }
    const t = v.currentTime;
    const idx = this.getCurrentIntervalIndex(t);
    if (idx === -1) {
      const next = this.getNextIntervalStart(t);
      if (next != null) {
        console.log('[VideoPage] timeupdate: in gap at', t.toFixed(2), 's, seeking to', next.toFixed(2), 's');
        v.currentTime = next;
      } else {
        console.log('[VideoPage] timeupdate: in gap at', t.toFixed(2), 's, no next interval, pausing');
        v.pause();
      }
    } else {
      const iv = this.playIntervals[idx];
      if (t > iv.end) {
        const next = this.getNextIntervalStart(iv.end);
        if (next != null) {
          console.log('[VideoPage] timeupdate: passed interval end', iv.end.toFixed(2), 's, seeking to', next.toFixed(2), 's');
          v.currentTime = next;
        } else {
          console.log('[VideoPage] timeupdate: passed last interval end, pausing');
          v.pause();
        }
      } else if (t - this.lastLogTime >= 1) {
        this.lastLogTime = t;
        console.log('[VideoPage] timeupdate: t=', t.toFixed(2), 's, interval', idx, iv.start.toFixed(2), '-', iv.end.toFixed(2));
      }
    }
    this.cdr.detectChanges();
  }

  onBarClick(event: MouseEvent): void {
    const v = this.video;
    const bar = event.currentTarget as HTMLElement;
    if (!v || !bar || this.videoDuration <= 0) return;
    const rect = bar.getBoundingClientRect();
    const fraction = (event.clientX - rect.left) / rect.width;
    const seek = this.getSeekTime(fraction);
    v.currentTime = seek;
    this.currentTime = seek;
    this.cdr.detectChanges();
  }

  togglePlay(): void {
    const v = this.video;
    if (!v) return;
    if (v.paused) {
      if (this.playIntervals.length > 0) {
        const idx = this.getCurrentIntervalIndex(v.currentTime);
        if (idx === -1) {
          const next = this.getNextIntervalStart(v.currentTime);
          if (next != null) v.currentTime = next;
        }
      }
      v.play();
    } else {
      v.pause();
    }
    this.cdr.detectChanges();
  }

  /** Fraction 0–1 for playhead position. */
  get playheadFraction(): number {
    if (this.videoDuration <= 0) return 0;
    return this.currentTime / this.videoDuration;
  }

  get isPaused(): boolean {
    const v = this.video;
    return v ? v.paused : true;
  }
}
