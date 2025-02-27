// DOM elements
const video = document.getElementById('video');
const overlay = document.getElementById('overlay');
const overlayCtx = overlay.getContext('2d');
const emotionPrimaryElement = document.getElementById('emotion-primary');
const emotionSecondaryElement = document.getElementById('emotion-secondary');
const statusElement = document.getElementById('status');
const binary = document.getElementById('binary');
const binaryCtx = binary.getContext('2d');

// Video elements setup
// Initialize global emotionChannel
console.log('Initializing main page...');
// emotionChannel is defined in shared.js
console.log('Using shared data object');

// Initialize face detection
Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('./models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('./models'),
    faceapi.nets.faceExpressionNet.loadFromUri('./models')
]).then(startVideo)
.catch(err => console.error('Error loading models:', err));

// Initialize emotion smoothing
let emotionHistory = {
    neutral: [],
    happy: [],
    sad: [],
    angry: [],
    fearful: [],
    disgusted: [],
    surprised: []
};
const smoothingWindow = 10;
const confidenceThreshold = 0.5;
let lastPrimaryValue = 0;
let lastSecondaryValue = 0;
let lastFrameTime = 0;
const FRAME_INTERVAL = 1000 / 30; // 30fps

// Initialize detection status tracking
let lastDetectionTime = Date.now();
const detectionTimeout = 1000; // 1 second timeout

// Start video stream
async function startVideo() {
    try {
        // List available devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        
        // Find Logitech camera
        const logitech = videoDevices.find(device => device.label.toLowerCase().includes('logi'));
        
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: {
                deviceId: logitech ? { exact: logitech.deviceId } : undefined,
                width: { ideal: 960 },
                height: { ideal: 540 }
            }
        });
        video.srcObject = stream;
        
        // Set video element styles
        video.style.mixBlendMode = 'normal';
        video.style.background = 'transparent';
        video.style.width = '960px';
        video.style.height = '540px';
    } catch (err) {
        console.error('Error accessing webcam:', err);
    }
}

// Initialize video size
video.addEventListener('play', () => {
    // Set canvas properties
    overlay.width = 960;   
    overlay.height = 540;  
    binary.width = 960;    
    binary.height = 60;    
    
    // Set canvas context properties
    overlayCtx.globalCompositeOperation = 'source-over';
    
    detectFaces();
});

// Main face detection function
async function detectFaces() {
    const currentTime = Date.now();
    if (currentTime - lastFrameTime < FRAME_INTERVAL) {
        requestAnimationFrame(detectFaces);
        return;
    }
    lastFrameTime = currentTime;

    const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({
        inputSize: 320,  // Keep the optimized input size
        scoreThreshold: 0.3
    }))
    .withFaceLandmarks()
    .withFaceExpressions();

    overlayCtx.clearRect(0, 0, overlay.width, overlay.height);

    if (detections && detections.length > 0) {
        lastDetectionTime = Date.now();
        const detection = detections[0];
        const landmarks = detection.landmarks;
        const expressions = detection.expressions;
        
        // Debug log expressions
        console.log('Detected expressions:', expressions);
        
        // Smooth emotions
        Object.keys(expressions).forEach(emotion => {
            emotionHistory[emotion].push(expressions[emotion]);
            if (emotionHistory[emotion].length > smoothingWindow) {
                emotionHistory[emotion].shift();
            }
        });

        // Update stats with smoothed emotions
        updateStats(detection);
        
        // Draw face detection visuals
        drawCustomDetection(detection);
        drawGeometricFaceMesh(landmarks.positions);
        updateBinaryData(detection);
    } else {
        console.log('No face detected');
    }

    // Update detection status
    updateDetectionStatus();

    requestAnimationFrame(detectFaces);
}

// Update detection status
function updateDetectionStatus() {
    const timeSinceLastDetection = Date.now() - lastDetectionTime;
    const isDetected = timeSinceLastDetection < detectionTimeout;
    
    if (statusElement) {
        statusElement.textContent = 'PERSON: ' + (isDetected ? 'DETECTED' : 'NOT DETECTED');
        statusElement.style.color = isDetected ? '#7fdbff' : '#ff4136';
    }
}

// Update emotion stats with optimized design
function updateStats(detection) {
    if (!detection) return;

    const expressions = detection.expressions;
    let primaryEmotion = { name: 'neutral', value: 0 };
    let secondaryEmotion = { name: 'neutral', value: 0 };

    // Single pass to find primary and secondary emotions
    Object.entries(expressions).forEach(([emotion, value]) => {
        const smoothedValue = smoothEmotion(emotion);
        if (smoothedValue > primaryEmotion.value) {
            secondaryEmotion = { ...primaryEmotion };
            primaryEmotion = { name: emotion, value: smoothedValue };
        } else if (smoothedValue > secondaryEmotion.value) {
            secondaryEmotion = { name: emotion, value: smoothedValue };
        }
    });

    // Debug log primary emotion
    console.log('Primary emotion:', primaryEmotion);

    // Update DOM elements only if values have changed significantly
    if (Math.abs(primaryEmotion.value - lastPrimaryValue) > 0.1) {
        emotionPrimaryElement.textContent = `${primaryEmotion.name} (${(primaryEmotion.value * 100).toFixed(0)}%)`;
        lastPrimaryValue = primaryEmotion.value;
        
        // Handle emotion sound with debug logging
        console.log('Primary emotion changed, calling handleEmotionSound:', primaryEmotion.name);
        handleEmotionSound(primaryEmotion.name, primaryEmotion.value);
    }
    if (Math.abs(secondaryEmotion.value - lastSecondaryValue) > 0.1) {
        emotionSecondaryElement.textContent = `${secondaryEmotion.name} (${(secondaryEmotion.value * 100).toFixed(0)}%)`;
        lastSecondaryValue = secondaryEmotion.value;
    }

    // Update shared data for visualization
    window.emotionData = {
        emotion: primaryEmotion.name,
        confidence: primaryEmotion.value,
        landmarks: {
            positions: detection.landmarks.positions,
            scale: 1
        },
        timestamp: Date.now(),
        hasNewData: true
    };
}

// Smooth emotion values using moving average
function smoothEmotion(emotion) {
    const history = emotionHistory[emotion];
    if (history.length === 0) return 0;
    
    // Use simple average instead of complex calculations
    const sum = history.reduce((a, b) => a + b, 0);
    return sum / history.length;
}

// Draw custom detection box and emotion data
function drawCustomDetection(detection) {
    // Clear the overlay before drawing
    overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
    
    // Set composite operation to not affect background
    overlayCtx.globalCompositeOperation = 'source-over';
    
    const box = detection.detection.box;
    const drawBox = {
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height
    };

    // Draw corners
    const cornerLength = 20;
    overlayCtx.strokeStyle = '#7fdbff';
    overlayCtx.lineWidth = 2;

    // Top left
    overlayCtx.beginPath();
    overlayCtx.moveTo(drawBox.x, drawBox.y + cornerLength);
    overlayCtx.lineTo(drawBox.x, drawBox.y);
    overlayCtx.lineTo(drawBox.x + cornerLength, drawBox.y);
    overlayCtx.stroke();

    // Top right
    overlayCtx.beginPath();
    overlayCtx.moveTo(drawBox.x + drawBox.width - cornerLength, drawBox.y);
    overlayCtx.lineTo(drawBox.x + drawBox.width, drawBox.y);
    overlayCtx.lineTo(drawBox.x + drawBox.width, drawBox.y + cornerLength);
    overlayCtx.stroke();

    // Bottom right
    overlayCtx.beginPath();
    overlayCtx.moveTo(drawBox.x + drawBox.width, drawBox.y + drawBox.height - cornerLength);
    overlayCtx.lineTo(drawBox.x + drawBox.width, drawBox.y + drawBox.height);
    overlayCtx.lineTo(drawBox.x + drawBox.width - cornerLength, drawBox.y + drawBox.height);
    overlayCtx.stroke();

    // Bottom left
    overlayCtx.beginPath();
    overlayCtx.moveTo(drawBox.x + cornerLength, drawBox.y + drawBox.height);
    overlayCtx.lineTo(drawBox.x, drawBox.y + drawBox.height);
    overlayCtx.lineTo(drawBox.x, drawBox.y + drawBox.height - cornerLength);
    overlayCtx.stroke();

    // Draw emotion text and percentage
    const emotion = Object.entries(detection.expressions)
        .reduce((a, b) => (a[1] > b[1] ? a : b))[0];
    const percentage = Math.round(Math.max(...Object.values(detection.expressions)) * 100);
    
    const text = `${emotion.toUpperCase()} ${percentage}%`;
    overlayCtx.font = '16px Futura-PT';
    overlayCtx.fillStyle = '#7fdbff';
    overlayCtx.fillText(text, drawBox.x + 10, drawBox.y - 10);

    // Update status display
    if (statusElement) {
        statusElement.textContent = text;
    }
}

// Draw geometric face mesh
function drawGeometricFaceMesh(positions) {
    // Skip drawing the face mesh outline
    // Instead, just update binary data visualization
    updateBinaryData();
}

// Function to generate binary data from emotions
function generateEmotionBinaryData(expressions) {
    if (!expressions) {
        return new Array(64).fill(0);
    }

    // Convert emotion values to binary representation
    const binaryData = [];
    const emotions = Object.entries(expressions);
    const totalEmotions = emotions.length;
    const bitsPerEmotion = Math.floor(64 / totalEmotions);

    emotions.forEach(([emotion, value]) => {
        const bits = Math.floor(value * bitsPerEmotion);
        for (let i = 0; i < bitsPerEmotion; i++) {
            binaryData.push(i < bits ? 1 : 0);
        }
    });

    // Fill remaining bits
    while (binaryData.length < 64) {
        binaryData.push(0);
    }

    return binaryData;
}

// Update binary data visualization
function updateBinaryData(detection) {
    if (!detection || !detection.expressions) {
        return;
    }

    const binaryData = generateEmotionBinaryData(detection.expressions);
    const cellWidth = binary.width / 64;
    const cellHeight = binary.height;

    binaryCtx.clearRect(0, 0, binary.width, binary.height);
    binaryCtx.fillStyle = '#31a68f';

    binaryData.forEach((bit, index) => {
        if (bit === 1) {
            binaryCtx.fillRect(
                index * cellWidth,
                0,
                cellWidth - 1,
                cellHeight
            );
        }
    });
}

// Handle emotion sound
function handleEmotionSound(emotion, confidence) {
    // TO DO: implement sound handling logic here
    console.log(`Emotion sound: ${emotion} with confidence ${confidence}`);
}
