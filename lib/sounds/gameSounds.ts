// Game MIDI-style sound generator using Web Audio API

export type GameSoundType =
  // UI Sounds
  | "hover"
  | "click"
  | "select"
  | "deselect"
  | "cancel"
  | "confirm"
  | "error"
  | "success"
  | "warning"
  | "notification"
  // Team Building
  | "addUnit"
  | "removeUnit"
  | "teamComplete"
  | "swapUnit"
  // Battle Sounds
  | "attack"
  | "defend"
  | "ability"
  | "critical"
  | "miss"
  | "damage"
  | "victory"
  | "defeat"
  | "roundStart"
  | "turnStart"
  | "turnEnd"
  | "heal"
  | "buff"
  | "debuff"
  | "statusEffect"
  // Timing System
  | "timingStart"
  | "timingPerfect"
  | "timingGood"
  | "timingMiss"
  | "timingLocked"
  | "timingTick"
  | "timingCountdown"
  | "timingExpired"
  // Timing Meters
  | "chargeTap"
  | "chargeBuilding"
  | "chargeComplete"
  | "spinnerActive"
  | "spinnerStop"
  // Menu
  | "menuNavigate"
  | "menuOpen"
  | "menuClose"
  | "tabSwitch"
  // Elements
  | "surge"
  | "code"
  | "metal"
  | "glitch"
  // Combat Feedback
  | "lowHealth"
  | "unitDefeat"
  | "unitSwitch"
  | "charge"
  | "targetSelect"
  | "targetConfirm"
  | "energyRestore"
  | "explosion"
  // Attack Variations
  | "attackWeak"
  | "attackNormal"
  | "attackStrong"
  | "attackDevastating"
  | "criticalSuper"
  | "criticalCombo"
  // Abilities
  | "abilityReady"
  | "abilityCooldown"
  | "abilitySelect"
  | "bladeSlash"
  | "electricBurst"
  | "airBurst"
  | "crushImpact"
  | "spinningSaw"
  | "aerialStrike"
  // Turn Sounds
  | "playerTurn"
  | "enemyTurn"
  | "turnCountdown"
  // Element Combos
  | "elementCombo"
  | "trinityBonus"
  | "elementAdvantage";

interface SoundConfig {
  notes: number[]; // MIDI note numbers
  duration: number; // in milliseconds
  decay: number; // envelope decay
  volume?: number; // volume override
}

const GAME_SOUNDS: Record<GameSoundType, SoundConfig> = {
  // UI Sounds - subtle and quick
  hover: {
    notes: [72], // Single high C
    duration: 30,
    decay: 0.1,
    volume: 0.02,
  },
  click: {
    notes: [60, 67], // C and G
    duration: 50,
    decay: 0.2,
    volume: 0.05,
  },
  select: {
    notes: [60, 64, 67], // C major triad
    duration: 100,
    decay: 0.3,
  },
  deselect: {
    notes: [67, 64, 60], // Reverse triad
    duration: 100,
    decay: 0.3,
  },
  cancel: {
    notes: [60, 58], // Descending
    duration: 100,
    decay: 0.2,
  },
  confirm: {
    notes: [60, 64, 67, 72], // Major arpeggio
    duration: 120,
    decay: 0.3,
  },

  // Team Building
  addUnit: {
    notes: [60, 67, 72], // Rising fifth + octave
    duration: 150,
    decay: 0.4,
  },
  removeUnit: {
    notes: [72, 67, 60], // Falling
    duration: 150,
    decay: 0.4,
  },
  teamComplete: {
    notes: [60, 64, 67, 72, 79], // Major scale
    duration: 200,
    decay: 0.5,
  },

  // Battle Sounds
  attack: {
    notes: [48, 48, 55], // Low punch
    duration: 100,
    decay: 0.2,
  },
  defend: {
    notes: [43, 48], // Low shield
    duration: 150,
    decay: 0.4,
  },
  ability: {
    notes: [60, 63, 67, 72], // Mystic chord
    duration: 200,
    decay: 0.5,
  },
  critical: {
    notes: [72, 76, 79, 84], // High impact
    duration: 150,
    decay: 0.3,
  },
  miss: {
    notes: [60, 59], // Whiff sound
    duration: 80,
    decay: 0.1,
  },
  damage: {
    notes: [36, 35], // Very low hit
    duration: 100,
    decay: 0.1,
  },
  victory: {
    notes: [60, 64, 67, 72, 76, 79, 84], // Victory fanfare
    duration: 300,
    decay: 0.6,
  },
  defeat: {
    notes: [60, 56, 53, 48], // Defeat theme
    duration: 400,
    decay: 0.8,
  },
  roundStart: {
    notes: [48, 60, 48, 60], // Battle bell
    duration: 200,
    decay: 0.5,
  },

  // Menu
  menuNavigate: {
    notes: [67], // Single note
    duration: 30,
    decay: 0.1,
    volume: 0.03,
  },
  menuOpen: {
    notes: [60, 65, 67], // Rising
    duration: 100,
    decay: 0.3,
  },
  menuClose: {
    notes: [67, 65, 60], // Falling
    duration: 100,
    decay: 0.3,
  },

  // Element Sounds
  surge: {
    notes: [72, 79, 72, 79], // Electric zap
    duration: 80,
    decay: 0.1,
  },
  code: {
    notes: [60, 63, 67, 70], // Digital chord
    duration: 150,
    decay: 0.4,
  },
  metal: {
    notes: [36, 43, 48], // Heavy metal
    duration: 200,
    decay: 0.3,
  },
  glitch: {
    notes: [60, 61, 59, 62, 58], // Chaotic
    duration: 100,
    decay: 0.2,
  },

  // Additional UI Sounds
  error: {
    notes: [48, 47, 46], // Descending chromatic
    duration: 150,
    decay: 0.3,
    volume: 0.1,
  },
  success: {
    notes: [60, 64, 67, 72], // Major chord
    duration: 200,
    decay: 0.4,
  },
  warning: {
    notes: [63, 63], // Repeated note
    duration: 100,
    decay: 0.2,
    volume: 0.08,
  },
  notification: {
    notes: [72, 67], // Bell-like
    duration: 150,
    decay: 0.5,
    volume: 0.06,
  },

  // Team Building
  swapUnit: {
    notes: [67, 60, 67], // Swap motion
    duration: 120,
    decay: 0.3,
  },

  // Battle Feedback
  turnStart: {
    notes: [60, 72], // Turn chime
    duration: 100,
    decay: 0.3,
    volume: 0.08,
  },
  turnEnd: {
    notes: [72, 60], // Reverse chime
    duration: 100,
    decay: 0.3,
    volume: 0.08,
  },
  heal: {
    notes: [60, 64, 67, 64, 60], // Healing melody
    duration: 200,
    decay: 0.5,
    volume: 0.1,
  },
  buff: {
    notes: [60, 65, 69, 72], // Power up
    duration: 150,
    decay: 0.4,
  },
  debuff: {
    notes: [72, 68, 65, 60], // Power down
    duration: 150,
    decay: 0.4,
  },
  statusEffect: {
    notes: [65, 65, 65], // Status pulse
    duration: 80,
    decay: 0.2,
    volume: 0.05,
  },

  // Timing System
  timingStart: {
    notes: [72], // Single beep
    duration: 50,
    decay: 0.1,
    volume: 0.1,
  },
  timingPerfect: {
    notes: [72, 76, 79, 84], // Perfect hit
    duration: 100,
    decay: 0.2,
    volume: 0.15,
  },
  timingGood: {
    notes: [72, 76], // Good hit
    duration: 80,
    decay: 0.2,
    volume: 0.1,
  },
  timingMiss: {
    notes: [60, 58], // Miss
    duration: 100,
    decay: 0.1,
    volume: 0.05,
  },

  // Menu
  tabSwitch: {
    notes: [67, 72], // Tab change
    duration: 80,
    decay: 0.2,
    volume: 0.05,
  },

  // Combat Feedback
  lowHealth: {
    notes: [48, 48], // Warning beep
    duration: 200,
    decay: 0.3,
    volume: 0.1,
  },
  unitDefeat: {
    notes: [60, 56, 53, 48, 43], // Unit falls
    duration: 300,
    decay: 0.5,
  },
  unitSwitch: {
    notes: [60, 67, 60], // Switch sound
    duration: 150,
    decay: 0.3,
  },
  charge: {
    notes: [48, 50, 52, 53, 55, 57, 59, 60], // Charging up
    duration: 400,
    decay: 0.6,
  },

  // Abilities
  abilityReady: {
    notes: [72, 79, 84], // Ready chime
    duration: 150,
    decay: 0.4,
    volume: 0.08,
  },
  abilityCooldown: {
    notes: [60, 58], // Not ready
    duration: 80,
    decay: 0.1,
    volume: 0.05,
  },
  abilitySelect: {
    notes: [67, 72, 79], // Ability selected
    duration: 120,
    decay: 0.3,
  },

  // New Timing Meter Sounds
  timingLocked: {
    notes: [60, 72], // Lock confirmation
    duration: 80,
    decay: 0.2,
    volume: 0.08,
  },
  timingTick: {
    notes: [72], // Single tick
    duration: 30,
    decay: 0.05,
    volume: 0.04,
  },
  timingCountdown: {
    notes: [67, 67], // Countdown beep
    duration: 100,
    decay: 0.2,
    volume: 0.06,
  },
  timingExpired: {
    notes: [60, 56, 53], // Time's up
    duration: 200,
    decay: 0.3,
    volume: 0.08,
  },

  // Charge Meter Sounds
  chargeTap: {
    notes: [84], // Quick high tap
    duration: 20,
    decay: 0.05,
    volume: 0.03,
  },
  chargeBuilding: {
    notes: [60, 62, 64, 65, 67, 69, 71, 72], // Rising sequence
    duration: 300,
    decay: 0.4,
    volume: 0.06,
  },
  chargeComplete: {
    notes: [72, 76, 79, 84], // Charge ready
    duration: 150,
    decay: 0.3,
    volume: 0.1,
  },

  // Spinner Sounds
  spinnerActive: {
    notes: [60, 62, 60, 62], // Spinning loop
    duration: 100,
    decay: 0.1,
    volume: 0.02,
  },
  spinnerStop: {
    notes: [72, 60], // Stop click
    duration: 60,
    decay: 0.15,
    volume: 0.08,
  },

  // Target Selection
  targetSelect: {
    notes: [67], // Cursor move
    duration: 40,
    decay: 0.1,
    volume: 0.04,
  },
  targetConfirm: {
    notes: [60, 67, 72], // Lock on
    duration: 100,
    decay: 0.2,
    volume: 0.08,
  },

  // Energy
  energyRestore: {
    notes: [60, 64, 67, 72, 67], // Power restore
    duration: 200,
    decay: 0.4,
    volume: 0.08,
  },

  // Explosion Impact
  explosion: {
    notes: [24, 28, 26], // Very low rumble
    duration: 150,
    decay: 0.2,
    volume: 0.12,
  },

  // Attack Power Variations
  attackWeak: {
    notes: [60], // Light tap
    duration: 50,
    decay: 0.1,
    volume: 0.04,
  },
  attackNormal: {
    notes: [48, 48, 55], // Standard (same as attack)
    duration: 100,
    decay: 0.2,
    volume: 0.08,
  },
  attackStrong: {
    notes: [36, 43, 48, 55], // Heavy hit
    duration: 150,
    decay: 0.3,
    volume: 0.12,
  },
  attackDevastating: {
    notes: [24, 36, 43, 48, 55, 60], // Epic crash
    duration: 250,
    decay: 0.5,
    volume: 0.15,
  },

  // Critical Variations
  criticalSuper: {
    notes: [72, 76, 79, 84, 88, 91], // Extended fanfare
    duration: 200,
    decay: 0.4,
    volume: 0.15,
  },
  criticalCombo: {
    notes: [60, 72, 60, 72, 84, 96], // Combo sound
    duration: 250,
    decay: 0.5,
    volume: 0.15,
  },

  // Ability Specific Sounds
  bladeSlash: {
    notes: [79, 77, 75, 72], // Metal slice
    duration: 80,
    decay: 0.1,
    volume: 0.1,
  },
  electricBurst: {
    notes: [84, 91, 84, 91, 84], // Electric zap
    duration: 120,
    decay: 0.15,
    volume: 0.12,
  },
  airBurst: {
    notes: [55, 58, 60, 55], // Whoosh
    duration: 150,
    decay: 0.25,
    volume: 0.08,
  },
  crushImpact: {
    notes: [36, 36, 43], // Heavy clang
    duration: 200,
    decay: 0.3,
    volume: 0.15,
  },
  spinningSaw: {
    notes: [72, 74, 72, 74, 72, 74], // Mechanical whir
    duration: 200,
    decay: 0.2,
    volume: 0.08,
  },
  aerialStrike: {
    notes: [48, 55, 60, 67, 72, 79], // Rocket sound
    duration: 250,
    decay: 0.4,
    volume: 0.12,
  },

  // Turn Distinction
  playerTurn: {
    notes: [60, 64, 67, 72], // Uplifting
    duration: 150,
    decay: 0.3,
    volume: 0.08,
  },
  enemyTurn: {
    notes: [60, 58, 55, 53], // Ominous
    duration: 150,
    decay: 0.3,
    volume: 0.08,
  },
  turnCountdown: {
    notes: [72, 72], // Clock tick
    duration: 100,
    decay: 0.1,
    volume: 0.05,
  },

  // Element Combos
  elementCombo: {
    notes: [60, 64, 67, 72, 79], // Harmony
    duration: 200,
    decay: 0.4,
    volume: 0.1,
  },
  trinityBonus: {
    notes: [48, 60, 64, 67, 72, 76, 79, 84], // Epic chord
    duration: 300,
    decay: 0.6,
    volume: 0.12,
  },
  elementAdvantage: {
    notes: [60, 67, 72, 79], // Power surge
    duration: 150,
    decay: 0.3,
    volume: 0.08,
  },
};

class GameSoundPlayer {
  private audioContext: AudioContext | null = null;
  private isEnabled: boolean = true;
  private masterVolume: number = 0.5;

  constructor() {
    // Load settings from localStorage
    if (typeof window !== "undefined") {
      const savedEnabled = localStorage.getItem("roboto_rumble_sound");
      const savedVolume = localStorage.getItem("roboto_rumble_volume");

      this.isEnabled = savedEnabled !== "false";
      this.masterVolume = savedVolume ? parseFloat(savedVolume) : 0.5;

      this.initAudioContext();
    }
  }

  private initAudioContext() {
    if (!this.audioContext && typeof window !== "undefined") {
      this.audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();

      // Resume on user interaction
      const resumeContext = () => {
        if (this.audioContext?.state === "suspended") {
          this.audioContext.resume();
        }
        // Remove listeners after first interaction
        document.removeEventListener("click", resumeContext);
        document.removeEventListener("keydown", resumeContext);
      };

      document.addEventListener("click", resumeContext);
      document.addEventListener("keydown", resumeContext);
    }
  }

  private midiToFrequency(midiNote: number): number {
    return 440 * Math.pow(2, (midiNote - 69) / 12);
  }

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    localStorage.setItem("roboto_rumble_sound", enabled.toString());
  }

  public setVolume(volume: number) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    localStorage.setItem("roboto_rumble_volume", this.masterVolume.toString());
  }

  public getEnabled(): boolean {
    return this.isEnabled;
  }

  public getVolume(): number {
    return this.masterVolume;
  }

  public async play(sound: GameSoundType) {
    if (!this.isEnabled || !this.audioContext) return;

    try {
      // Resume context if suspended
      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume();
      }

      const config = GAME_SOUNDS[sound];
      const startTime = this.audioContext.currentTime;

      config.notes.forEach((note, index) => {
        this.playNote(
          note,
          startTime + (index * config.duration) / 1000,
          config.duration / 1000,
          config.decay,
          config.volume,
        );
      });
    } catch (error) {
      console.warn("Could not play sound:", error);
    }
  }

  private playNote(
    midiNote: number,
    startTime: number,
    duration: number,
    decay: number,
    volumeOverride?: number,
  ) {
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    // Use square wave for retro feel
    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(
      this.midiToFrequency(midiNote),
      startTime,
    );

    // Calculate volume - ensure masterVolume is properly applied
    const baseVolume = volumeOverride || 0.1;
    const finalVolume = baseVolume * this.masterVolume;

    // Create envelope with proper volume scaling
    gainNode.gain.setValueAtTime(finalVolume, startTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.001,
      startTime + duration * decay,
    );

    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    // Play note
    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
  }

  // Convenience methods for common patterns
  public playHover() {
    this.play("hover");
  }

  public playClick() {
    this.play("click");
  }

  public playSelect() {
    this.play("select");
  }

  public playConfirm() {
    this.play("confirm");
  }

  public playCancel() {
    this.play("cancel");
  }

  public playElementSound(element: string) {
    const elementLower = element.toLowerCase();
    if (elementLower in GAME_SOUNDS) {
      this.play(elementLower as GameSoundType);
    }
  }

  public playAbilitySound(abilityAnimation?: string) {
    // Map ability animations to sounds
    const animationSoundMap: Record<string, GameSoundType> = {
      blade_slash: "bladeSlash",
      electric_burst: "electricBurst",
      air_burst: "airBurst",
      crush: "crushImpact",
      spinning_saw: "spinningSaw",
      aerial_strike: "aerialStrike",
      electric_wave: "electricBurst",
      heavy_blade: "bladeSlash",
      spinning_blades: "spinningSaw",
    };

    if (abilityAnimation && animationSoundMap[abilityAnimation]) {
      this.play(animationSoundMap[abilityAnimation]);
    } else {
      this.play("ability"); // Default ability sound
    }
  }

  public playAttackSound(
    damage: number,
    isCritical: boolean = false,
    isPerfectTiming: boolean = false,
  ) {
    if (damage === 0) {
      this.play("miss");
    } else if (isCritical) {
      if (damage >= 100) {
        this.play("criticalSuper");
      } else if (isPerfectTiming) {
        this.play("criticalCombo");
      } else {
        this.play("critical");
      }
    } else if (damage < 30) {
      this.play("attackWeak");
    } else if (damage < 60) {
      this.play("attackNormal");
    } else if (damage < 100) {
      this.play("attackStrong");
    } else {
      this.play("attackDevastating");
    }
  }
}

// Singleton instance
export const gameSounds = new GameSoundPlayer();
