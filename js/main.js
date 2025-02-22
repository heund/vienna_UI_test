const video = document.getElementById('video');
const overlay = document.getElementById('overlay');
const overlayCtx = overlay.getContext('2d');
const binary = document.getElementById('binary');
const binaryCtx = binary.getContext('2d');
const statusElement = document.getElementById('status');

// Wait for the models to load before starting
Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('./models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('./models'),
    faceapi.nets.faceExpressionNet.loadFromUri('./models')
]).then(startVideo)
.catch(err => console.error('Error loading models:', err));

// Start video stream
async function startVideo() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        });
        video.srcObject = stream;
    } catch (err) {
        console.error('Error accessing webcam:', err);
    }
}

// Adjust canvas size when video loads
video.addEventListener('play', () => {
    overlay.width = video.videoWidth;
    overlay.height = video.videoHeight;
    binary.width = 1240; // Match container width minus padding
    binary.height = 80; // Match container height minus padding
    detectFaces();
});

// Main face detection function
let lastDetectionTime = 0;
const detectionTimeout = 1000; // 1 second timeout to consider no face detected

async function detectFaces() {
    const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceExpressions();

    // Clear previous drawings
    overlayCtx.clearRect(0, 0, overlay.width, overlay.height);

    if (detections.length > 0) {
        lastDetectionTime = Date.now();
        const detection = detections[0];
        drawCustomDetection(detection);
        updateStats(detection);
    }

    // Always draw status and binary data
    drawStatus(detections.length > 0);
    drawBinaryData(detections);

    requestAnimationFrame(detectFaces);
}

// Draw persistent status
function drawStatus(isPersonDetected) {
    // Check if we haven't seen a face for more than the timeout period
    const timeSinceLastDetection = Date.now() - lastDetectionTime;
    const status = timeSinceLastDetection < detectionTimeout ? 'DETECTED' : 'NOT DETECTED';
    
    // Update status element
    statusElement.textContent = 'PERSON: ' + status;
}

// Update emotion stats
function updateStats(detection) {
    const expressions = detection.expressions;
    const box = detection.detection.box;
    
    // Find top 3 emotions with confidence
    let emotionsArray = Object.entries(expressions)
        .map(([emotion, confidence]) => ({emotion, confidence}))
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 3);
    
    let primaryEmotion = emotionsArray[0];
    let confidence = Math.round(primaryEmotion.confidence * 100);
    
    // Draw primary emotion circle (left side)
    const circleRadius = 45;
    const padding = 100;
    
    // Position circle to the left of the face
    const circleX = box.x - padding - circleRadius;
    const circleY = box.y + box.height / 2;
    
    // Add glow effect
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
        (-Math.PI/2) + (2 * Math.PI * confidence/100));
    overlayCtx.stroke();
    
    // Reset shadow for text
    overlayCtx.shadowBlur = 0;
    
    // Draw percentage text
    overlayCtx.fillStyle = '#7fdbff';
    overlayCtx.font = '32px Futura-PT, Arial';
    overlayCtx.textAlign = 'center';
    overlayCtx.textBaseline = 'middle';
    overlayCtx.fillText(confidence + '%', circleX, circleY);
    
    // Draw emotion label
    overlayCtx.font = '11px Futura-PT, Arial';
    overlayCtx.letterSpacing = '2px';
    overlayCtx.fillStyle = '#7fdbff';
    overlayCtx.shadowColor = '#7fdbff';
    overlayCtx.shadowBlur = 10;
    overlayCtx.fillText(primaryEmotion.emotion.toUpperCase(), circleX, circleY + circleRadius + 20);

    // Non-primary emotions section
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
        
        // Draw label with enhanced visibility
        overlayCtx.fillStyle = '#7fdbff';
        overlayCtx.fillText(emotion.emotion.toUpperCase(), graphX, y);
        
        // Draw horizontal line
        overlayCtx.beginPath();
        overlayCtx.strokeStyle = 'rgba(127, 219, 255, 0.4)';
        overlayCtx.moveTo(graphX + 100, y - 4);
        overlayCtx.lineTo(graphX + graphWidth, y - 4);
        overlayCtx.stroke();
        
        // Draw arrow
        const arrowX = graphX + 100 + barWidth;
        overlayCtx.beginPath();
        overlayCtx.strokeStyle = '#7fdbff';
        overlayCtx.moveTo(arrowX - 6, y - 7);
        overlayCtx.lineTo(arrowX, y - 4);
        overlayCtx.lineTo(arrowX - 6, y - 1);
        overlayCtx.stroke();
    });
}

// Custom drawing function
function drawCustomDetection(detection) {
    const landmarks = detection.landmarks;
    const points = landmarks.positions;
    const box = detection.detection.box;
    
    // Draw corner brackets
    const cornerSize = 30;
    const padding = 20;
    
    // Add glow effect
    overlayCtx.shadowColor = '#7fdbff';
    overlayCtx.shadowBlur = 10;
    overlayCtx.strokeStyle = '#7fdbff'; // Lighter, glowy blue
    overlayCtx.lineWidth = 2;
    
    // Top-left corner
    drawCorner(box.x - padding, box.y - padding, cornerSize, 0);
    // Top-right corner
    drawCorner(box.x + box.width + padding, box.y - padding, cornerSize, 90);
    // Bottom-right corner
    drawCorner(box.x + box.width + padding, box.y + box.height + padding, cornerSize, 180);
    // Bottom-left corner
    drawCorner(box.x - padding, box.y + box.height + padding, cornerSize, 270);

    // Reset shadow for mesh
    overlayCtx.shadowBlur = 0;
    
    // Draw geometric face mesh
    drawGeometricFaceMesh(points);
}

// Draw geometric face mesh
function drawGeometricFaceMesh(points) {
    overlayCtx.strokeStyle = 'rgba(127, 219, 255, 0.4)';
    overlayCtx.lineWidth = 1.2;

    // Map to reference image points using faceAPI landmarks
    const referencePoints = {
        forehead: [21, 22], // Two points above eyebrows
        eyebrows: [19, 24], // Center of each eyebrow
        eyes: [36, 45], // Outer corners of eyes
        temples: [0, 16], // Side corners
        cheeks: [2, 14], // Side cheeks
        noseAndCenter: [30, 33], // Nose bridge and tip
        mouthCorners: [48, 54], // Mouth corners
        mouthTop: [51], // Top lip center
        mouthBottom: [57], // Bottom lip center
        chinLine: [6, 8, 10] // Chin points
    };

    // Clear previous drawings
    overlayCtx.beginPath();

    // Draw face mesh exactly like reference
    // Top triangles connecting forehead points
    connectPoints([points[0], points[21], points[22], points[16]]); // Top line with forehead points

    // Temple to cheekbone connections
    connectPoints([points[0], points[2]]); // Left temple to cheekbone
    connectPoints([points[16], points[14]]); // Right temple to cheekbone

    // Temple to eye corner connections
    connectPoints([points[0], points[36]]); // Left temple to left eye corner
    connectPoints([points[16], points[45]]); // Right temple to right eye corner

    // Eyebrow geometric structure
    connectPoints([points[19], points[24]]); // Eyebrow horizontal line
    connectPoints([points[21], points[19]]); // Left forehead to left eyebrow
    connectPoints([points[22], points[24]]); // Right forehead to right eyebrow
    connectPoints([points[19], points[0]]); // Left eyebrow to left temple
    connectPoints([points[24], points[16]]); // Right eyebrow to right temple
    
    // All eyebrow points to nose tip
    connectPoints([points[19], points[33]]); // Left inner eyebrow to nose tip
    connectPoints([points[24], points[33]]); // Right inner eyebrow to nose tip
    connectPoints([points[21], points[33]]); // Left outer eyebrow to nose tip
    connectPoints([points[22], points[33]]); // Right outer eyebrow to nose tip

    // Eye structure integration
    connectPoints([points[36], points[30]]); // Left eye to nose bridge
    connectPoints([points[45], points[30]]); // Right eye to nose bridge
    connectPoints([points[36], points[2]]); // Left eye to cheek
    connectPoints([points[45], points[14]]); // Right eye to cheek

    // Nose line
    connectPoints([points[30], points[33]]);

    // Cheek to nose connections
    connectPoints([points[2], points[33]]);
    connectPoints([points[14], points[33]]);

    // Mouth structure
    connectPoints([points[48], points[51], points[54]]); // Upper mouth
    connectPoints([points[48], points[57], points[54]]); // Lower mouth

    // Chin connections
    connectPoints([points[2], points[6], points[8]]); // Left chin
    connectPoints([points[14], points[10], points[8]]); // Right chin

    // Draw points
    overlayCtx.fillStyle = 'rgba(127, 219, 255, 0.6)';
    
    // Draw all points from our reference mapping
    Object.values(referencePoints).flat().forEach(index => {
        drawGeometricPoint(points[index].x, points[index].y);
    });
}

// Helper function to connect points in a line
function connectPoints(points) {
    if (points.length < 2) return;
    
    overlayCtx.beginPath();
    overlayCtx.moveTo(points[0].x, points[0].y);
    
    for (let i = 1; i < points.length; i++) {
        overlayCtx.lineTo(points[i].x, points[i].y);
    }
    
    overlayCtx.stroke();
}

// Draw geometric point
function drawGeometricPoint(x, y) {
    const size = 2.5;
    overlayCtx.beginPath();
    overlayCtx.arc(x, y, size, 0, Math.PI * 2);
    overlayCtx.fill();
}

// Draw corner bracket
function drawCorner(x, y, size, rotation) {
    overlayCtx.save();
    overlayCtx.translate(x, y);
    overlayCtx.rotate((rotation * Math.PI) / 180);
    
    overlayCtx.beginPath();
    overlayCtx.moveTo(0, 0);
    overlayCtx.lineTo(size, 0);
    overlayCtx.moveTo(0, 0);
    overlayCtx.lineTo(0, size);
    overlayCtx.stroke();
    
    overlayCtx.restore();
}

// Convert number to 8-bit binary string
function toBinary(number) {
    return (number * 255).toFixed(0)
        .toString(2)
        .padStart(8, '0');
}

// Generate binary data from actual emotion values
function generateEmotionBinaryData(expressions) {
    if (!expressions) return Array(6).fill('0'.repeat(48));
    
    const emotionData = [
        expressions.neutral,
        expressions.happy,
        expressions.sad,
        expressions.angry,
        expressions.fearful,
        expressions.disgusted,
        expressions.surprised
    ];

    // Convert each emotion value to binary and combine them
    return emotionData.map(value => {
        // Convert confidence value to binary
        const mainBits = toBinary(value);
        // Add some processing bits to make it look more complex
        const processBits = Array(40).fill(0)
            .map((_, i) => ((value * 1000 + i) % 2).toString())
            .join('');
        return mainBits + processBits;
    });
}

function drawBinaryData(detections) {
    const lines = 6;
    const lineHeight = 18;
    const padding = 10;
    
    // Clear previous binary data
    binaryCtx.clearRect(0, 0, binary.width, binary.height);
    
    binaryCtx.font = '12px Consolas, monospace';
    binaryCtx.fillStyle = '#7fdbff';
    binaryCtx.textAlign = 'left';
    binaryCtx.textBaseline = 'top';
    
    // Get actual emotion data if available
    const expressions = detections.length > 0 ? detections[0].expressions : null;
    const binaryLines = generateEmotionBinaryData(expressions);
    
    // Draw binary lines
    for (let i = 0; i < lines; i++) {
        binaryCtx.fillText(binaryLines[i], padding, padding + i * lineHeight);
    }
}
