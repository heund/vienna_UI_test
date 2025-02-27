class EmotionSoundManager {
    constructor() {
        this.initialized = false;
        this.audioContext = null;
        this.masterGain = null;
        this.effects = null;
        this.sounds = {
            happy: {},
            surprised: {},
            neutral: {},
            sad: {},
            angry: {},
            fearful: {}
        };
        this.currentBuffers = {
            primary: [],
            secondary: []
        };
        this.thresholds = {
            primary: 0.8,
            secondary: 0.05
        };
        this.currentEmotion = null;
        this.currentSecondaryEmotion = null;
        
        // Longer crossfade for experimental overlap
        this.fadeInTime = 1.2;    // 1.2 second fade in
        this.fadeOutTime = 2.0;   // 2 second fade out
        this.crossFadeTime = 1.5; // 1.5 second crossfade
        
        // Volume settings for each emotion
        this.volumeLevels = {
            happy: { primary: 1.4, secondary: 0.5 },
            surprised: { primary: 1.3, secondary: 0.45 },
            neutral: { primary: 0.8, secondary: 0.25 },
            sad: { primary: 1.3, secondary: 0.45 },
            angry: { primary: 1.4, secondary: 0.5 },
            fearful: { primary: 1.3, secondary: 0.45 }
        };
    }

    async initialize() {
        if (this.initialized) return;

        try {
            await Tone.start();
            console.log('Tone.js started successfully');

            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.audioContext.createGain();
            this.masterGain.connect(this.audioContext.destination);

            // Initialize Tone.js effects with more reverb
            this.effects = {
                reverb: new Tone.Reverb({
                    decay: 3.2,    // Longer decay
                    wet: 0.65,     // More wet signal
                    preDelay: 0.1  // Slight pre-delay for space
                }).toDestination(),
                delay: new Tone.FeedbackDelay({
                    delayTime: 0.3,
                    feedback: 0.35,
                    wet: 0.25
                }).toDestination()
            };

            await this.loadSounds();
            this.initialized = true;
            
            document.body.classList.add('audio-enabled');
            document.getElementById('audio-status').textContent = 'ENABLED';
            
            console.log('Audio system fully initialized');
            return true;
        } catch (error) {
            console.error('Failed to initialize audio system:', error);
            document.getElementById('audio-status').textContent = 'ERROR';
            return false;
        }
    }

    async loadSounds() {
        try {
            // Load happy sounds
            const happyForestResponse = await fetch('sound/happy/forest1.wav');
            const happyFluteResponse = await fetch('sound/happy/flute_1.wav');
            
            this.sounds.happy.forest = await this.audioContext.decodeAudioData(
                await happyForestResponse.arrayBuffer()
            );
            this.sounds.happy.flute = await this.audioContext.decodeAudioData(
                await happyFluteResponse.arrayBuffer()
            );
            
            // Load surprised sounds
            const surprisedViolaResponse = await fetch('sound/surprised/surprised2_Viola 01.wav');
            const surprisedViolinResponse = await fetch('sound/surprised/surprised2_Violin 02.wav');
            
            this.sounds.surprised.viola = await this.audioContext.decodeAudioData(
                await surprisedViolaResponse.arrayBuffer()
            );
            this.sounds.surprised.violin = await this.audioContext.decodeAudioData(
                await surprisedViolinResponse.arrayBuffer()
            );

            // Load neutral sound
            const neutralResponse = await fetch('sound/neutral/neutral.wav');
            this.sounds.neutral.main = await this.audioContext.decodeAudioData(
                await neutralResponse.arrayBuffer()
            );

            // Load sad sounds
            const sadPianoResponse = await fetch('sound/sad/sad_piano_1.wav');
            const sadWaterResponse = await fetch('sound/sad/sad_Cave Water Drops_1.wav');
            
            this.sounds.sad.piano = await this.audioContext.decodeAudioData(
                await sadPianoResponse.arrayBuffer()
            );
            this.sounds.sad.water = await this.audioContext.decodeAudioData(
                await sadWaterResponse.arrayBuffer()
            );

            // Load angry sound
            const angryResponse = await fetch('sound/angry/angry_all.mp3');
            this.sounds.angry.main = await this.audioContext.decodeAudioData(
                await angryResponse.arrayBuffer()
            );

            // Load fearful sounds
            const fearfulTimpaniResponse = await fetch('sound/fearful/fearful_timpani.wav');
            const fearfulSequenceResponse = await fetch('sound/fearful/fearful_sequece.wav');
            
            this.sounds.fearful.timpani = await this.audioContext.decodeAudioData(
                await fearfulTimpaniResponse.arrayBuffer()
            );
            this.sounds.fearful.sequence = await this.audioContext.decodeAudioData(
                await fearfulSequenceResponse.arrayBuffer()
            );

            console.log('All sounds loaded successfully');
        } catch (error) {
            console.error('Error loading sounds:', error);
        }
    }

    playSound(buffers, isPrimary = true, emotion = 'neutral') {
        if (!this.initialized || !buffers) return;

        const sources = [];
        const currentTime = this.audioContext.currentTime;
        
        for (const buffer of Object.values(buffers)) {
            const source = this.audioContext.createBufferSource();
            source.buffer = buffer;

            const gainNode = this.audioContext.createGain();
            const panNode = this.audioContext.createStereoPanner();

            // Connect nodes
            source.connect(gainNode);
            gainNode.connect(panNode);
            panNode.connect(this.masterGain);

            // Start with zero gain for smooth fade-in
            gainNode.gain.setValueAtTime(0, currentTime);

            // Get emotion-specific volume
            const volumeSettings = this.volumeLevels[emotion] || this.volumeLevels.neutral;
            const targetVolume = isPrimary ? volumeSettings.primary : volumeSettings.secondary;
            const targetPan = isPrimary ? 0 : -0.8;

            // Smooth fade in
            gainNode.gain.linearRampToValueAtTime(
                targetVolume,
                currentTime + this.fadeInTime
            );

            // Set pan position with transition
            panNode.pan.setValueAtTime(targetPan, currentTime);

            source.start(currentTime);
            sources.push({ source, gain: gainNode, pan: panNode });
        }
        return sources;
    }

    stopSounds(buffers, immediate = false) {
        if (!buffers) return;
        
        const currentTime = this.audioContext.currentTime;
        const fadeOutDuration = immediate ? 0.1 : this.fadeOutTime;

        for (const buffer of buffers) {
            if (buffer && buffer.gain) {
                // Get current gain value
                const currentGain = buffer.gain.gain.value;
                
                // Start transition from current value
                buffer.gain.gain.setValueAtTime(currentGain, currentTime);
                
                // Smooth fade out using exponential ramp for more natural sound
                buffer.gain.gain.exponentialRampToValueAtTime(
                    0.001, // Can't go to 0 with exponentialRamp
                    currentTime + fadeOutDuration
                );
                
                // Finally set to 0
                buffer.gain.gain.setValueAtTime(0, currentTime + fadeOutDuration);

                // Stop the source after fade out
                setTimeout(() => {
                    if (buffer.source) {
                        buffer.source.stop();
                    }
                }, fadeOutDuration * 1000);
            }
        }
    }

    handleEmotions(primaryEmotion, primaryConfidence, secondaryEmotion, secondaryConfidence) {
        if (!this.initialized) {
            console.warn('Audio system not initialized');
            return;
        }

        const currentTime = this.audioContext.currentTime;

        // Handle primary emotion changes
        if (this.currentEmotion !== primaryEmotion) {
            // Stop current primary sounds
            if (this.currentBuffers.primary.length > 0) {
                this.stopSounds(this.currentBuffers.primary);
                this.currentBuffers.primary = [];
            }
            
            // Start new primary emotion if confidence is high enough
            if (this.sounds[primaryEmotion] && primaryConfidence >= this.thresholds.primary) {
                setTimeout(() => {
                    this.currentBuffers.primary = this.playSound(this.sounds[primaryEmotion], true, primaryEmotion);
                }, this.crossFadeTime * 500);
            }
            this.currentEmotion = primaryEmotion;
        }

        // Handle secondary emotion changes
        if (this.currentSecondaryEmotion !== secondaryEmotion) {
            // Stop current secondary sounds
            if (this.currentBuffers.secondary.length > 0) {
                this.stopSounds(this.currentBuffers.secondary);
                this.currentBuffers.secondary = [];
            }
            
            // Start new secondary emotion if within threshold range
            if (this.sounds[secondaryEmotion] && 
                secondaryConfidence >= this.thresholds.secondary && 
                secondaryConfidence < this.thresholds.primary) {
                setTimeout(() => {
                    this.currentBuffers.secondary = this.playSound(this.sounds[secondaryEmotion], false, secondaryEmotion);
                }, this.crossFadeTime * 500);
            }
            this.currentSecondaryEmotion = secondaryEmotion;
        }

        // Stop primary sounds if confidence drops below threshold
        if (primaryConfidence < this.thresholds.primary) {
            if (this.currentBuffers.primary.length > 0) {
                this.stopSounds(this.currentBuffers.primary);
                this.currentBuffers.primary = [];
                this.currentEmotion = null;  // Reset current emotion
            }
        }

        // Stop secondary sounds if confidence is outside valid range
        if (secondaryConfidence < this.thresholds.secondary || 
            secondaryConfidence >= this.thresholds.primary) {
            if (this.currentBuffers.secondary.length > 0) {
                this.stopSounds(this.currentBuffers.secondary);
                this.currentBuffers.secondary = [];
                this.currentSecondaryEmotion = null;  // Reset secondary emotion
            }
        }

        // Additional cleanup for when emotions become null or undefined
        if (!primaryEmotion && this.currentBuffers.primary.length > 0) {
            this.stopSounds(this.currentBuffers.primary);
            this.currentBuffers.primary = [];
            this.currentEmotion = null;
        }

        if (!secondaryEmotion && this.currentBuffers.secondary.length > 0) {
            this.stopSounds(this.currentBuffers.secondary);
            this.currentBuffers.secondary = [];
            this.currentSecondaryEmotion = null;
        }
    }
}

// Create global instance
window.emotionSoundManager = new EmotionSoundManager();

// Initialize audio system on user interaction
document.getElementById('audio-prompt').addEventListener('click', async () => {
    const prompt = document.getElementById('audio-prompt');
    const statusEl = document.getElementById('audio-status');
    
    prompt.style.pointerEvents = 'none';
    prompt.textContent = 'Initializing...';
    statusEl.textContent = 'INITIALIZING';
    
    try {
        const success = await window.emotionSoundManager.initialize();
        if (success) {
            prompt.style.display = 'none';
        } else {
            prompt.textContent = 'Failed to initialize audio. Click to retry.';
            prompt.style.pointerEvents = 'auto';
            statusEl.textContent = 'ERROR';
        }
    } catch (error) {
        console.error('Error initializing audio:', error);
        prompt.textContent = 'Failed to initialize audio. Click to retry.';
        prompt.style.pointerEvents = 'auto';
        statusEl.textContent = 'ERROR';
    }
});
