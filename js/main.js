// Video elements setup
const video = document.getElementById('video');
const overlay = document.getElementById('overlay');
const overlayCtx = overlay.getContext('2d');
const binary = document.getElementById('binary');
const binaryCtx = binary.getContext('2d');
const statusElement = document.getElementById('status');
const emotionPrimaryElement = document.querySelector('.emotion-primary');
const emotionSecondaryElement = document.querySelector('.emotion-secondary');

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
const emotionHistory = {
    angry: [],
    disgusted: [],
    fearful: [],
    happy: [],
    neutral: [],
    sad: [],
    surprised: []
};
const smoothingWindow = 10; // Number of frames to average
const confidenceThreshold = 0.5; // Minimum confidence to register emotion

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
    const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceExpressions();

    overlayCtx.clearRect(0, 0, overlay.width, overlay.height);

    if (detections && detections.length > 0) {
        lastDetectionTime = Date.now();
        const detection = detections[0];
        const landmarks = detection.landmarks;
        const expressions = detection.expressions;
        
        // Smooth emotions
        Object.keys(expressions).forEach(emotion => {
            emotionHistory[emotion].push(expressions[emotion]);
            if (emotionHistory[emotion].length > smoothingWindow) {
                emotionHistory[emotion].shift();
            }
            expressions[emotion] = smoothEmotion(emotion);
        });
        
        // Find primary emotion with smoothed values
        let emotionsArray = Object.entries(expressions)
            .map(([emotion, confidence]) => ({emotion, confidence}))
            .sort((a, b) => b.confidence - a.confidence);
        
        let primaryEmotion = emotionsArray[0];

        // Only update if confidence exceeds threshold
        if (primaryEmotion.confidence > confidenceThreshold) {
            // Convert landmarks to simple x,y objects and normalize scale
            const positions = landmarks.positions.map(point => ({
                x: point._x !== undefined ? point._x : point.x,
                y: point._y !== undefined ? point._y : point.y
            }));

            // Calculate face size for scale normalization
            const box = detection.detection.box;
            const faceSize = Math.min(box.width, box.height);
            const targetSize = 400; 
            const scale = (targetSize / faceSize) * 1.2; 

            // Update shared data
            window.emotionData = {
                emotion: primaryEmotion.emotion,
                confidence: primaryEmotion.confidence,
                landmarks: {
                    positions: positions,
                    box: detection.detection.box,
                    scale: scale 
                },
                expressions: expressions,
                timestamp: Date.now(),
                hasNewData: true
            };

            // Draw custom detection
            drawCustomDetection(detection);
            
            // Comment out binary data drawing
            // drawBinaryData(detection);
        }
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

// Smooth emotion values using moving average
function smoothEmotion(emotion) {
    if (emotionHistory[emotion].length === 0) return 0;
    
    const sum = emotionHistory[emotion].reduce((a, b) => a + b, 0);
    return sum / emotionHistory[emotion].length;
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

// Draw binary data at the bottom
function drawBinaryData(detection) {
    if (!detection) return;
    
    const binaryData = generateEmotionBinaryData(detection.expressions);
    const cellWidth = binary.width / binaryData.length;
    const cellHeight = binary.height;
    
    binaryCtx.clearRect(0, 0, binary.width, binary.height);
    
    // Draw each binary digit
    binaryData.forEach((digit, i) => {
        binaryCtx.fillStyle = '#7fdbff';
        binaryCtx.font = '11px Futura-PT, Arial';
        binaryCtx.textAlign = 'center';
        binaryCtx.fillText(digit, i * cellWidth + cellWidth/2, cellHeight/2);
    });
}

// Generate binary data from emotions
function generateEmotionBinaryData(expressions) {
    const emotionValues = Object.values(expressions);
    return emotionValues.map(value => Math.round(value)).join('');
}

// Update emotion stats with original design
function updateStats(detection) {
    if (!detection) return;

    const expressions = detection.expressions;
    const box = detection.detection.box;
    
    // Find top 3 emotions
    let emotionsArray = Object.entries(expressions)
        .map(([emotion, confidence]) => ({emotion, confidence}))
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 3);
    
    let primaryEmotion = emotionsArray[0];
    let confidence = primaryEmotion.confidence;

    // Draw primary emotion circle (left side)
    const circleRadius = 45;
    const padding = 100;
    
    // Position circle to the left of the face
    const circleX = box.x - padding - circleRadius;
    const circleY = box.y + box.height / 2;
    
    // Add glow effect
    const overlayCtx = overlay.getContext('2d');
    overlayCtx.shadowColor = '#7fdbff';
    overlayCtx.shadowBlur = 10;
    
    // Draw outer circle
    overlayCtx.strokeStyle = 'rgba(127, 219, 255, 0.3)';
    overlayCtx.lineWidth = 2;
    overlayCtx.beginPath();
    overlayCtx.arc(circleX, circleY, circleRadius, 0, Math.PI * 2);
    overlayCtx.stroke();
    
    // Draw progress arc
    overlayCtx.strokeStyle = '#7fdbff';
    overlayCtx.lineWidth = 2;
    overlayCtx.beginPath();
    overlayCtx.arc(circleX, circleY, circleRadius, -Math.PI/2, 
        (-Math.PI/2) + (2 * Math.PI * confidence));
    overlayCtx.stroke();
    
    // Reset shadow for text
    overlayCtx.shadowBlur = 0;
    
    // Draw percentage text
    overlayCtx.fillStyle = '#7fdbff';
    overlayCtx.font = '32px Futura-PT, Arial';
    overlayCtx.textAlign = 'center';
    overlayCtx.textBaseline = 'middle';
    overlayCtx.fillText(Math.round(confidence * 100) + '%', circleX, circleY);
    
    // Draw emotion label
    overlayCtx.font = '11px Futura-PT, Arial';
    overlayCtx.letterSpacing = '2px';
    overlayCtx.fillStyle = '#7fdbff';
    overlayCtx.shadowColor = '#7fdbff';
    overlayCtx.shadowBlur = 10;
    overlayCtx.fillText(primaryEmotion.emotion.toUpperCase(), circleX, circleY + circleRadius + 20);

    // Non-primary emotions section (right side)
    const graphX = box.x + box.width + padding + 20;
    const graphY = box.y + box.height / 2 - 40;
    const graphWidth = 200;
    
    // Section title
    overlayCtx.fillStyle = '#7fdbff';
    overlayCtx.shadowBlur = 10;
    overlayCtx.fillText('NON-PRIMARY EMOTIONS', graphX, graphY);
    
    // Draw ruler graph for secondary emotions
    emotionsArray.slice(1).forEach((emotion, index) => {
        const y = graphY + 30 + (index * 30);
        const barWidth = graphWidth * emotion.confidence;
        
        // Draw label
        overlayCtx.fillStyle = '#7fdbff';
        overlayCtx.fillText(emotion.emotion.toUpperCase(), graphX, y);
        
        // Draw percentage
        overlayCtx.fillText(Math.round(emotion.confidence * 100) + '%', 
            graphX + graphWidth + 20, y);
        
        // Draw bar
        overlayCtx.strokeStyle = '#7fdbff';
        overlayCtx.lineWidth = 1;
        overlayCtx.beginPath();
        overlayCtx.moveTo(graphX, y + 10);
        overlayCtx.lineTo(graphX + barWidth, y + 10);
        overlayCtx.stroke();
    });
}

// Helper function to generate binary data
function generateEmotionBinaryData(expressions) {
    return Object.values(expressions)
        .map(confidence => Math.round(confidence * 255))
        .map(value => toBinary(value))
        .join('').split('');
}

// Helper function to convert number to binary
function toBinary(number) {
    return (number >>> 0).toString(2).padStart(8, '0');
}

// Update binary data visualization
function updateBinaryData() {
    const binaryData = generateEmotionBinaryData(window.emotionData.expressions);
    const cellWidth = binary.width / binaryData.length;
    const cellHeight = binary.height;
    
    binaryCtx.clearRect(0, 0, binary.width, binary.height);
    
    // Draw each binary digit
    binaryData.forEach((digit, i) => {
        binaryCtx.fillStyle = '#7fdbff';
        binaryCtx.font = '11px Futura-PT, Arial';
        binaryCtx.textAlign = 'center';
        binaryCtx.fillText(digit, i * cellWidth + cellWidth/2, cellHeight/2);
    });
}
