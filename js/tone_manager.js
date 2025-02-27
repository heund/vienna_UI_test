// Web Audio API sound manager
let audioContext = null;
let neutralBuffer = null;
let currentEmotion = null;
let isAudioInitialized = false;
let reverbNode = null;
let dryGainNode = null;
let wetGainNode = null;

// Initialize Web Audio API and load sounds
async function initializeSounds() {
    const audioPrompt = document.getElementById('audio-prompt');
    
    // Add click handler to start audio
    const initAudio = async () => {
        if (!isAudioInitialized) {
            try {
                // Create audio context
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                isAudioInitialized = true;

                // Create reverb
                reverbNode = audioContext.createConvolver();
                // Create gain nodes
                dryGainNode = audioContext.createGain();
                wetGainNode = audioContext.createGain();
                // Set initial mix
                dryGainNode.gain.value = 0.7;
                wetGainNode.gain.value = 0.3;

                // Load neutral sound
                if (!neutralBuffer) {
                    const response = await fetch('sound/neutral/neutral.wav');
                    const arrayBuffer = await response.arrayBuffer();
                    neutralBuffer = await audioContext.decodeAudioData(arrayBuffer);
                }

                // Hide the prompt after successful initialization
                if (audioPrompt) {
                    audioPrompt.style.opacity = '0';
                    setTimeout(() => {
                        audioPrompt.style.display = 'none';
                    }, 1000);
                }

            } catch (error) {
                console.error('Error initializing audio:', error);
            }
        }
    };

    // Add multiple event listeners for better interaction
    document.body.addEventListener('click', initAudio);
    document.body.addEventListener('touchstart', initAudio);
    document.body.addEventListener('keydown', initAudio);
}

// Function to play a sound buffer
function playBuffer(buffer) {
    if (!buffer || !audioContext) return;

    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    
    // Connect through reverb
    source.connect(dryGainNode);
    source.connect(wetGainNode);
    dryGainNode.connect(audioContext.destination);
    wetGainNode.connect(reverbNode);
    reverbNode.connect(audioContext.destination);
    
    source.start();
}

// Handle emotion changes and play corresponding sounds
function handleEmotionSound(emotion, confidence) {
    if (!isAudioInitialized || !neutralBuffer) {
        return;
    }

    // Only play sound if emotion changes and confidence is high enough
    if (emotion !== currentEmotion && confidence > 0.8) {
        currentEmotion = emotion;
        
        if (emotion === 'neutral') {
            playBuffer(neutralBuffer);
        }
    }
}

// Initialize sounds when document is ready
document.addEventListener('DOMContentLoaded', initializeSounds);
