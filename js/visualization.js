console.log('Initializing visualization page...');
// emotionChannel is defined in shared.js
console.log('Using shared broadcast channel');

let currentEmotion = 'neutral';
let currentConfidence = 0;
let currentLandmarks = [];
let lastDrawTime = 0;
let p5Canvas;
let scaleFactor = 1;
let glowAmount = 0;
let fadeAmount = 0;

// p5.js setup function
function setup() {
    console.log('Setting up visualization...');
    const container = document.getElementById('visualization-container');
    if (!container) {
        console.error('Visualization container not found!');
        return;
    }
    
    p5Canvas = createCanvas(container.offsetWidth, container.offsetHeight);
    p5Canvas.parent(container);
    
    // Set initial styles
    clear();
    textFont('Futura-PT');
    textAlign(CENTER, CENTER);
    frameRate(30);
    colorMode(HSB, 360, 100, 100, 1);
    
    console.log('Canvas created:', width, height);
}

// p5.js draw function
function draw() {
    // Clear with slight fade for trail effect
    background(0, 0, 0, 0.1);
    
    if (window.emotionData && window.emotionData.hasNewData) {
        const { emotion, confidence, landmarks, timestamp } = window.emotionData;
        
        if (!lastDrawTime || timestamp > lastDrawTime) {
            currentEmotion = emotion;
            currentConfidence = confidence;
            currentLandmarks = landmarks.positions;
            scaleFactor = landmarks.scale || 1;
            lastDrawTime = timestamp;
            window.emotionData.hasNewData = false;
        }
    }

    // Update effects
    glowAmount = sin(frameCount * 0.05) * 0.5 + 1;
    fadeAmount = sin(frameCount * 0.03) * 0.2 + 0.8;
    
    // Draw landmarks if available
    if (currentLandmarks && currentLandmarks.length > 0) {
        push();
        translate(width/2, height/2);
        
        const s = scaleFactor;
        scale(s);
        
        // Calculate center of face
        let centerX = 0, centerY = 0;
        let count = 0;
        currentLandmarks.forEach(point => {
            if (point) {
                centerX += point.x;
                centerY += point.y;
                count++;
            }
        });
        centerX /= count;
        centerY /= count;
        
        const features = [
            [0, 16],    // Jaw line
            [17, 21],   // Left eyebrow
            [22, 26],   // Right eyebrow
            [27, 30],   // Nose bridge
            [31, 35],   // Lower nose
            [36, 41],   // Left eye
            [42, 47],   // Right eye
            [48, 59],   // Outer lip
            [60, 67]    // Inner lip
        ];

        // Outer glow effect for entire face
        for(let i = 0; i < 8; i++) { // More layers for stronger glow
            noStroke();
            // Golden glow with increasing size and decreasing opacity
            fill(45, 70, 95, (0.15 - i * 0.015) * fadeAmount);
            beginShape();
            for (let j = 0; j <= 16; j++) {
                if (currentLandmarks[j]) {
                    const x = currentLandmarks[j].x - centerX;
                    const y = currentLandmarks[j].y - centerY;
                    // Add subtle wave effect to the fill
                    const wave = sin(frameCount * 0.05 + j * 0.5) * 4;
                    // Increase spread for outer layers
                    vertex(x + (i * 4) + wave, y + (i * 4));
                }
            }
            if (currentLandmarks[0]) {
                const x = currentLandmarks[0].x - centerX;
                const y = currentLandmarks[0].y - centerY;
                const wave = sin(frameCount * 0.05) * 4;
                vertex(x + (i * 4) + wave, y + (i * 4));
            }
            endShape(CLOSE);
        }

        // Base golden fill with enhanced glow
        noStroke();
        fill(45, 80, 95, 0.5 * fadeAmount);
        beginShape();
        for (let i = 0; i <= 16; i++) {
            if (currentLandmarks[i]) {
                const x = currentLandmarks[i].x - centerX;
                const y = currentLandmarks[i].y - centerY;
                vertex(x, y);
            }
        }
        if (currentLandmarks[0]) {
            const x = currentLandmarks[0].x - centerX;
            const y = currentLandmarks[0].y - centerY;
            vertex(x, y);
        }
        endShape(CLOSE);
        
        // Draw glowing white feature lines
        noFill();
        features.forEach(([start, end]) => {
            // Draw multiple white lines with varying opacity and thickness
            for(let i = 0; i < 4; i++) { // Added an extra layer for more glow
                stroke(0, 0, 100, (0.4 - i * 0.1) * fadeAmount);
                strokeWeight((4 - i) / s);
                
                beginShape();
                for (let j = start; j <= end; j++) {
                    if (currentLandmarks[j]) {
                        const x = currentLandmarks[j].x - centerX;
                        const y = currentLandmarks[j].y - centerY;
                        // Enhanced flowing wave effect
                        const waveX = sin(frameCount * 0.05 + j * 0.5) * (3 - i);
                        const waveY = cos(frameCount * 0.05 + j * 0.5) * (3 - i);
                        vertex(x + waveX, y + waveY);
                    }
                }
                if (start >= 36) {
                    endShape(CLOSE);
                } else {
                    endShape();
                }
            }
        });

        // Add overall bloom effect
        blendMode(SCREEN);
        noStroke();
        for(let i = 0; i < 3; i++) {
            fill(45, 70, 100, 0.1 * fadeAmount);
            ellipse(0, 0, 
                   300 + sin(frameCount * 0.05) * 20 + i * 50, 
                   300 + cos(frameCount * 0.05) * 20 + i * 50);
        }
        blendMode(BLEND);
        
        pop();
    }
}

// Helper function to draw face features
function drawFeature(start, end, centerX, centerY) {
    beginShape();
    for (let i = start; i <= end; i++) {
        if (currentLandmarks[i]) {
            const x = currentLandmarks[i].x - centerX;
            const y = currentLandmarks[i].y - centerY;
            vertex(x, y);
        }
    }
    if (start >= 36) {
        endShape(CLOSE);
    } else {
        endShape();
    }
}

// Handle window resize
function windowResized() {
    const container = document.getElementById('visualization-container');
    if (container) {
        resizeCanvas(container.offsetWidth, container.offsetHeight);
    }
}
