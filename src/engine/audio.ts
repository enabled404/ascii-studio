// Web Audio API reactive engine for ASCII Studio.
// Provides real-time microphone analysis and procedural synth beat fallback.
// Original code written for ASCII Studio.

export interface AudioMetrics {
  volume: number // 0..1 overall RMS
  bass: number // 0..1 bass (20 - 250 Hz)
  mid: number // 0..1 midrange (250 - 2500 Hz)
  treble: number // 0..1 highs (2500 - 12000 Hz)
  rawFft: Uint8Array
}

class AudioEngine {
  private ctx: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private micStream: MediaStream | null = null
  private mediaDest: MediaStreamAudioDestinationNode | null = null
  private synthTimer: number | null = null
  private isRunning = false
  private mode: 'idle' | 'mic' | 'beat' | 'file' = 'idle'
  private audioEl: HTMLAudioElement | null = null
  private audioSrcNode: MediaElementAudioSourceNode | null = null
  private audioGainNode: GainNode | null = null
  private audioUrl: string | null = null
  private trackTitle = ''
  private fftData: Uint8Array = new Uint8Array(64)
  private timeData: Uint8Array = new Uint8Array(64)
  private lastMetrics: AudioMetrics = {
    volume: 0,
    bass: 0,
    mid: 0,
    treble: 0,
    rawFft: new Uint8Array(64),
  }

  private initContext() {
    if (!this.ctx || this.ctx.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      this.ctx = new AudioCtx()
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume()
    }
    if (!this.analyser) {
      this.analyser = this.ctx.createAnalyser()
      this.analyser.fftSize = 128
      this.analyser.smoothingTimeConstant = 0.8
      this.fftData = new Uint8Array(this.analyser.frequencyBinCount)
      this.timeData = new Uint8Array(this.analyser.frequencyBinCount)
    }
  }

  async startMic(): Promise<boolean> {
    this.stop()
    try {
      this.initContext()
      if (!this.ctx || !this.analyser) return false
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      this.micStream = stream
      const source = this.ctx.createMediaStreamSource(stream)
      source.connect(this.analyser)
      this.isRunning = true
      this.mode = 'mic'
      return true
    } catch (e) {
      console.warn('Microphone permission denied or unavailable, falling back to beat synthesizer', e)
      return this.startBeat(120)
    }
  }

  startBeat(bpm = 120): boolean {
    return this.startSynth('beat', bpm)
  }

  startSynth(type: 'beat' | 'synthwave' | 'chiptune' | 'ambient' | 'sweep' = 'beat', bpm = 120): boolean {
    this.stop()
    try {
      this.initContext()
      if (!this.ctx || !this.analyser) return false

      const gainNode = this.ctx.createGain()
      gainNode.gain.value = 0.4
      gainNode.connect(this.analyser)

      const speakerGain = this.ctx.createGain()
      speakerGain.gain.value = 0.08
      gainNode.connect(speakerGain)
      speakerGain.connect(this.ctx.destination)

      if (typeof this.ctx.createMediaStreamDestination === 'function') {
        this.mediaDest = this.ctx.createMediaStreamDestination()
        gainNode.connect(this.mediaDest)
      }

      this.isRunning = true
      this.mode = 'beat'

      if (type === 'ambient') {
        // Multi-oscillator drone
        const freqs = [110, 164.81, 220, 329.63]
        const oscs: OscillatorNode[] = []
        freqs.forEach((f, idx) => {
          if (!this.ctx) return
          const osc = this.ctx.createOscillator()
          const g = this.ctx.createGain()
          osc.type = idx % 2 === 0 ? 'sine' : 'triangle'
          osc.frequency.setValueAtTime(f, this.ctx.currentTime)
          g.gain.setValueAtTime(0.12 / freqs.length, this.ctx.currentTime)
          osc.connect(g)
          g.connect(gainNode)
          osc.start()
          oscs.push(osc)
        })
        return true
      }

      if (type === 'sweep') {
        let sweepPhase = 0
        const sweepOsc = this.ctx.createOscillator()
        sweepOsc.type = 'sawtooth'
        sweepOsc.frequency.setValueAtTime(80, this.ctx.currentTime)
        const sweepGain = this.ctx.createGain()
        sweepGain.gain.setValueAtTime(0.12, this.ctx.currentTime)
        sweepOsc.connect(sweepGain)
        sweepGain.connect(gainNode)
        sweepOsc.start()
        this.synthTimer = window.setInterval(() => {
          if (!this.ctx || !this.isRunning) return
          sweepPhase = (sweepPhase + 0.05) % (Math.PI * 2)
          const f = 100 + (Math.sin(sweepPhase) * 0.5 + 0.5) * 1800
          sweepOsc.frequency.setTargetAtTime(f, this.ctx.currentTime, 0.03)
        }, 30)
        return true
      }

      const intervalMs = type === 'synthwave' ? (60 / bpm / 4) * 1000 : type === 'chiptune' ? (60 / bpm / 4) * 1000 : (60 / bpm) * 1000
      let step = 0

      const synthNotes = [55, 110, 82.4, 110, 73.4, 110, 65.4, 98] // A1 bassline
      const chipMelody = [440, 554.37, 659.25, 880, 659.25, 554.37, 783.99, 987.77]

      const playTick = () => {
        if (!this.ctx || !this.isRunning) return
        const now = this.ctx.currentTime

        if (type === 'synthwave') {
          const osc = this.ctx.createOscillator()
          const filter = this.ctx.createBiquadFilter()
          const env = this.ctx.createGain()
          osc.type = 'sawtooth'
          const noteFreq = synthNotes[step % synthNotes.length]
          osc.frequency.setValueAtTime(noteFreq, now)
          filter.type = 'lowpass'
          filter.frequency.setValueAtTime(800 + (step % 4 === 0 ? 1200 : 200), now)
          filter.frequency.exponentialRampToValueAtTime(300, now + 0.12)
          filter.Q.value = 6
          env.gain.setValueAtTime(0.4, now)
          env.gain.exponentialRampToValueAtTime(0.001, now + 0.14)
          osc.connect(filter)
          filter.connect(env)
          env.connect(gainNode)
          osc.start(now)
          osc.stop(now + 0.15)
          step++
          return
        }

        if (type === 'chiptune') {
          const osc = this.ctx.createOscillator()
          const env = this.ctx.createGain()
          osc.type = 'square'
          const freq = chipMelody[step % chipMelody.length]
          osc.frequency.setValueAtTime(freq, now)
          env.gain.setValueAtTime(0.2, now)
          env.gain.exponentialRampToValueAtTime(0.01, now + 0.08)
          osc.connect(env)
          env.connect(gainNode)
          osc.start(now)
          osc.stop(now + 0.09)
          step++
          return
        }

        // Standard beat (kick + snare + hat)
        // Kick on every beat
        const kickOsc = this.ctx.createOscillator()
        const kickGain = this.ctx.createGain()
        kickOsc.type = 'sine'
        kickOsc.frequency.setValueAtTime(140, now)
        kickOsc.frequency.exponentialRampToValueAtTime(38, now + 0.12)
        kickGain.gain.setValueAtTime(1.0, now)
        kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22)
        kickOsc.connect(kickGain)
        kickGain.connect(gainNode)
        kickOsc.start(now)
        kickOsc.stop(now + 0.25)

        // Snare on 2 & 4
        if (step % 2 === 1) {
          const bufSize = this.ctx.sampleRate * 0.15
          const noiseBuffer = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate)
          const output = noiseBuffer.getChannelData(0)
          for (let i = 0; i < bufSize; i++) output[i] = Math.random() * 2 - 1
          const whiteNoise = this.ctx.createBufferSource()
          whiteNoise.buffer = noiseBuffer
          const snareFilter = this.ctx.createBiquadFilter()
          snareFilter.type = 'highpass'
          snareFilter.frequency.value = 1000
          const snareGain = this.ctx.createGain()
          snareGain.gain.setValueAtTime(0.6, now)
          snareGain.gain.exponentialRampToValueAtTime(0.01, now + 0.14)
          whiteNoise.connect(snareFilter)
          snareFilter.connect(snareGain)
          snareGain.connect(gainNode)
          whiteNoise.start(now)
          whiteNoise.stop(now + 0.16)
        }

        // Hat on 8ths
        const hatOsc = this.ctx.createOscillator()
        const hatGain = this.ctx.createGain()
        hatOsc.type = 'square'
        hatOsc.frequency.setValueAtTime(8000, now)
        hatGain.gain.setValueAtTime(0.15, now)
        hatGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05)
        hatOsc.connect(hatGain)
        hatGain.connect(gainNode)
        hatOsc.start(now)
        hatOsc.stop(now + 0.06)

        step = (step + 1) % 4
      }

      playTick()
      this.synthTimer = window.setInterval(playTick, intervalMs)
      return true
    } catch (e) {
      console.warn('Failed to start beat synthesizer', e)
      return false
    }
  }

  async startAudioFile(file: File): Promise<boolean> {
    this.stop()
    try {
      this.initContext()
      if (!this.ctx || !this.analyser) return false

      if (this.ctx.state === 'suspended') {
        await this.ctx.resume()
      }

      const url = URL.createObjectURL(file)
      this.audioUrl = url
      this.trackTitle = file.name

      const audio = new Audio()
      audio.src = url
      audio.loop = true
      audio.crossOrigin = 'anonymous'
      this.audioEl = audio

      const gainNode = this.ctx.createGain()
      gainNode.gain.value = 0.8
      gainNode.connect(this.analyser)
      gainNode.connect(this.ctx.destination)
      this.audioGainNode = gainNode

      if (typeof this.ctx.createMediaStreamDestination === 'function') {
        this.mediaDest = this.ctx.createMediaStreamDestination()
        gainNode.connect(this.mediaDest)
      }

      const source = this.ctx.createMediaElementSource(audio)
      source.connect(gainNode)
      this.audioSrcNode = source

      await audio.play()
      this.isRunning = true
      this.mode = 'file'
      return true
    } catch (e) {
      this.stop()
      console.warn('Failed to load audio file', e)
      return false
    }
  }

  toggleFilePlayback(): boolean {
    if (this.mode !== 'file' || !this.audioEl) return false
    if (this.audioEl.paused) {
      void this.audioEl.play()
      return true
    } else {
      this.audioEl.pause()
      return false
    }
  }

  isFilePlaying(): boolean {
    return this.mode === 'file' && !!this.audioEl && !this.audioEl.paused
  }

  getTrackTitle(): string {
    return this.trackTitle
  }

  stop() {
    this.isRunning = false
    this.mode = 'idle'
    if (this.synthTimer !== null) {
      clearInterval(this.synthTimer)
      this.synthTimer = null
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach((t) => t.stop())
      this.micStream = null
    }
    if (this.audioEl) {
      this.audioEl.pause()
      this.audioEl.removeAttribute('src')
      this.audioEl.load()
      this.audioEl = null
    }
    if (this.audioUrl) {
      URL.revokeObjectURL(this.audioUrl)
      this.audioUrl = null
    }
    if (this.audioSrcNode) {
      try {
        this.audioSrcNode.disconnect()
      } catch {
        // ignore
      }
      this.audioSrcNode = null
    }
    if (this.audioGainNode) {
      try {
        this.audioGainNode.disconnect()
      } catch {
        // ignore
      }
      this.audioGainNode = null
    }
    this.trackTitle = ''
    this.mediaDest = null
    if (this.ctx && this.ctx.state !== 'closed') {
      try {
        void this.ctx.suspend()
      } catch {
        // ignore
      }
    }
    this.lastMetrics = {
      volume: 0,
      bass: 0,
      mid: 0,
      treble: 0,
      rawFft: new Uint8Array(64),
    }
  }

  getMetrics(): AudioMetrics {
    if (!this.isRunning || !this.analyser) {
      return this.lastMetrics
    }

    this.analyser.getByteFrequencyData(this.fftData as any)
    this.analyser.getByteTimeDomainData(this.timeData as any)

    const len = this.fftData.length
    if (len === 0) return this.lastMetrics

    // RMS volume from time domain
    let sumSquares = 0
    for (let i = 0; i < len; i++) {
      const norm = (this.timeData[i] - 128) / 128
      sumSquares += norm * norm
    }
    const volume = Math.min(1, Math.sqrt(sumSquares / len) * 2.2)

    // Bass: bins 0 to 4 (~20Hz to 300Hz with 128 fftSize @ 44.1/48kHz)
    let bSum = 0
    const bCount = Math.max(1, Math.floor(len * 0.15))
    for (let i = 0; i < bCount; i++) bSum += this.fftData[i]
    const bass = Math.min(1, (bSum / bCount / 255) * 1.5)

    // Mid: bins ~15% to 60%
    let mSum = 0
    const mStart = bCount
    const mEnd = Math.floor(len * 0.6)
    const mCount = Math.max(1, mEnd - mStart)
    for (let i = mStart; i < mEnd; i++) mSum += this.fftData[i]
    const mid = Math.min(1, (mSum / mCount / 255) * 1.4)

    // Treble: bins ~60% to 100%
    let tSum = 0
    const tStart = mEnd
    const tCount = Math.max(1, len - tStart)
    for (let i = tStart; i < len; i++) tSum += this.fftData[i]
    const treble = Math.min(1, (tSum / tCount / 255) * 1.4)

    this.lastMetrics = {
      volume,
      bass,
      mid,
      treble,
      rawFft: this.fftData,
    }
    return this.lastMetrics
  }

  getTimeData(): Uint8Array {
    if (!this.isRunning || !this.analyser) return this.timeData
    this.analyser.getByteTimeDomainData(this.timeData as any)
    return this.timeData
  }

  getFftData(): Uint8Array {
    if (!this.isRunning || !this.analyser) return this.fftData
    this.analyser.getByteFrequencyData(this.fftData as any)
    return this.fftData
  }

  getMode() {
    return this.mode
  }

  isActive() {
    return this.isRunning
  }

  getAudioStream(): MediaStream | null {
    if (this.mode === 'mic' && this.micStream) return this.micStream
    if ((this.mode === 'beat' || this.mode === 'file') && this.mediaDest) return this.mediaDest.stream
    return null
  }
}

export const audioEngine = new AudioEngine()
