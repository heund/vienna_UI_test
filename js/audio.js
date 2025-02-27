class EmotionSoundManager {
    constructor() {
        this.currentEmotion = null;
        this.isInitialized = false;
        this.players = null;
        this.effects = null;
        this.initializeTone();
    }

    async initializeTone() {
        await Tone.start();
        console.log('Tone.js initialized');

        // Initialize effects
        this.effects = {
            reverb: new Tone.Reverb({
                decay: 2.5,
                wet: 0.5
            }).toDestination(),
            delay: new Tone.FeedbackDelay({
                delayTime: 0.25,
                feedback: 0.3,
                wet: 0.2
            }).toDestination()
        };

        // Initialize players for each emotion
        this.players = {
            happy: new Tone.Player({
                url: "./sound/flute_1.wav",
                loop: false
            }).connect(this.effects.reverb),
            
            sad: new Tone.Player({
                url: "./sound/violin_1.wav",
                loop: false
            }).connect(this.effects.reverb),
            
            angry: new Tone.Player({
                url: "./sound/Inst 2_1.wav",
                loop: false
            }).connect(this.effects.delay),
            
            fearful: new Tone.Player({
                url: "./sound/piccolo_1.wav",
                loop: false
            }).connect(this.effects.reverb),
            
            disgusted: new Tone.Player({
                url: "./sound/Forest_1.wav",
                loop: false
            }).connect(this.effects.delay),
            
            surprised: new Tone.Player({
                url: "./sound/Brooklyn_1.wav",
                loop: false
            }).connect(this.effects.reverb),
            
            neutral: new Tone.Player({
                url: "./sound/Steinway Grand Piano_1.wav",
                loop: false
            }).connect(this.effects.reverb)
        };

        // Wait for all players to load
        await Promise.all(
            Object.values(this.players).map(player => 
                new Promise(resolve => {
                    player.load().then(resolve);
                })
            )
        );
        
        console.log('All audio players loaded');
        this.isInitialized = true;
    }

    async playEmotionSound(emotion) {
        if (!this.isInitialized) {
            console.warn('Tone.js not initialized yet');
            return;
        }

        if (!this.players || !this.players[emotion]) {
            console.warn(`No sound player found for emotion: ${emotion}`);
            return;
        }

        // Only play if emotion changes
        if (this.currentEmotion !== emotion) {
            this.currentEmotion = emotion;

            const player = this.players[emotion];
            
            // Stop if already playing
            if (player.state === 'started') {
                player.stop();
            }
            
            // Reset to start and play
            player.start();
        }
    }

    updateVisualization() {
        const canvas = document.getElementById('audio-visual');
        const ctx = canvas.getContext('2d');
        
        // Add visualization logic here
        // This is a placeholder for future implementation
    }
}

// Create global instance
window.emotionSoundManager = new EmotionSoundManager();
