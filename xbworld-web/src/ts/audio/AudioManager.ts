/**
 * Audio manager using native Web Audio API.
 * Replaces the legacy audio.js library.
 */

import { supportsMp3 } from '../utils/helpers';

const MUSIC_LIST = [
  'battle-epic',
  'andrewbeck-ancient',
  'into_the_shadows',
  'andrewbeck-stings',
  'trap_a_space_odyssey_battle_for_the_planet',
  'elvish-theme',
  'cullambruce-lockhart-dawning_fanfare',
];

export class AudioManager {
  private musicElement: HTMLAudioElement | null = null;
  private soundsEnabled = true;
  private musicEnabled = true;
  private ext: string;

  constructor() {
    this.ext = supportsMp3() ? '.mp3' : '.ogg';
  }

  init(): void {
    this.soundsEnabled = localStorage.getItem('sndFX') !== 'false';
    this.musicEnabled = true;
  }

  playMusic(): void {
    if (!this.musicEnabled) return;

    if (!this.musicElement) {
      this.musicElement = new Audio();
      this.musicElement.addEventListener('ended', () => this.playNextTrack());
    }

    this.playNextTrack();
  }

  private playNextTrack(): void {
    if (!this.musicElement) return;
    const track = MUSIC_LIST[Math.floor(Math.random() * MUSIC_LIST.length)];
    this.musicElement.src = `/music/${track}${this.ext}`;
    this.musicElement.play().catch(() => {
      // Autoplay blocked — will retry on user interaction
    });
  }

  stopMusic(): void {
    if (this.musicElement) {
      this.musicElement.pause();
      this.musicElement.currentTime = 0;
    }
  }

  playSound(name: string): void {
    if (!this.soundsEnabled) return;
    const audio = new Audio(`/sounds/${name}${this.ext}`);
    audio.volume = 0.5;
    audio.play().catch(() => {});
  }

  setSoundsEnabled(enabled: boolean): void {
    this.soundsEnabled = enabled;
    localStorage.setItem('sndFX', String(enabled));
  }

  setMusicEnabled(enabled: boolean): void {
    this.musicEnabled = enabled;
    if (!enabled) this.stopMusic();
  }

  get isSoundsEnabled(): boolean {
    return this.soundsEnabled;
  }

  get isMusicEnabled(): boolean {
    return this.musicEnabled;
  }
}

export const audioManager = new AudioManager();
