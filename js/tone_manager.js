// Web Audio API sound manager
let audioContext = null;
let neutralBuffer = null;
let currentEmotion = null;
let isAudioInitialized = false;

// Initialize Web Audio API and load sounds
async function initializeSounds() {
    // Add click handler to start audio
    document.body.addEventListener('click', async () => {
        if (!isAudioInitialized) {
            try {
                // Create audio context
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                isAudioInitialized = true;
                console.log('Audio context created');

                // Play test beep
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                oscillator.frequency.value = 440;
                gainNode.gain.value = 0.1;
                oscillator.start();
                oscillator.stop(audioContext.currentTime + 0.1);

                // Load neutral sound
                const response = await fetch('sound/neutral/neutral.wav');
                const arrayBuffer = await response.arrayBuffer();
                neutralBuffer = await audioContext.decodeAudioData(arrayBuffer);
                console.log('Neutral sound loaded');

                // Test play the neutral sound
                playSound(neutralBuffer);
                console.log('Test playing neutral sound');

            } catch (error) {
                console.error('Error initializing audio:', error);
            }
        }
    });
}

// Function to play a sound buffer
function playSound(buffer) {
    if (!audioContext || !buffer) return;
    
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start();
    console.log('Playing sound buffer');
}

// Handle emotion changes and play corresponding sounds
function handleEmotionSound(emotion, confidence) {
    console.log('Handling emotion sound:', emotion, 'Audio initialized:', isAudioInitialized, 'Buffer loaded:', !!neutralBuffer);
    
    if (!isAudioInitialized || !neutralBuffer) {
        console.log('Audio not ready yet');
        return;
    }

    // Only process if emotion has changed and confidence is high enough
    if (emotion !== currentEmotion && confidence > 0.8) {
        console.log('Emotion changed from', currentEmotion, 'to', emotion, 'with confidence', confidence);

        // Play neutral sound if emotion is neutral
        if (emotion === 'neutral') {
            try {
                console.log('Playing neutral sound...');
                playSound(neutralBuffer);
                
                // Also play a quick beep as indicator
                const osc = audioContext.createOscillator();
                const gain = audioContext.createGain();
                osc.connect(gain);
                gain.connect(audioContext.destination);
                gain.gain.value = 0.1;
                osc.start();
                osc.stop(audioContext.currentTime + 0.1);
            } catch (error) {
                console.error('Error playing neutral sound:', error);
            }
        }

        currentEmotion = emotion;
    }
}

// Initialize sounds when document is ready
document.addEventListener('DOMContentLoaded', initializeSounds);
