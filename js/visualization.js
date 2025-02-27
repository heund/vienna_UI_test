// Create a new p5 instance for visualization
console.log('Initializing visualization page...');

new p5((p) => {
    let currentEmotion = 'neutral';
    let currentConfidence = 0;
    let currentLandmarks = [];
    let lastDrawTime = 0;
    let scaleFactor = 1;
    let glowAmount = 0;
    let fadeAmount = 0;
    let lastEmotion = 'neutral';
    let lastLandmarks = [];
    let movementAmount = 0;
    let useWhiteGlow = false;
    
    // Smoothing variables
    let smoothedPrimaryConfidence = 0;
    let smoothedSecondaryConfidence = 0;
    let targetPrimaryConfidence = 0;
    let targetSecondaryConfidence = 0;
    const smoothingSpeed = 0.1; // Adjust this to control transition speed

    // Function to calculate movement
    function calculateMovement(currentLandmarks, lastLandmarks) {
        if (!currentLandmarks || !lastLandmarks || currentLandmarks.length !== lastLandmarks.length) {
            return 0;
        }
        
        let totalMovement = 0;
        for (let i = 0; i < currentLandmarks.length; i++) {
            const dx = currentLandmarks[i].x - lastLandmarks[i].x;
            const dy = currentLandmarks[i].y - lastLandmarks[i].y;
            totalMovement += Math.sqrt(dx * dx + dy * dy);
        }
        return totalMovement / currentLandmarks.length;
    }

    function smoothValue(current, target) {
        return current + (target - current) * smoothingSpeed;
    }

    p.setup = () => {
        console.log('Setting up visualization...');
        const container = document.getElementById('visualization-container');
        if (!container) {
            console.error('Visualization container not found!');
            return;
        }
        
        p.createCanvas(container.offsetWidth, container.offsetHeight);
        
        // Set initial styles
        p.clear();
        p.textFont('Futura-PT');
        p.textAlign(p.CENTER, p.CENTER);
        p.frameRate(30);
        p.colorMode(p.HSB, 360, 100, 100, 1);
        
        console.log('Canvas created:', p.width, p.height);
    };

    p.draw = () => {
        // Clear with slight fade for trail effect
        p.background(0, 0, 0, 0);
        
        if (window.emotionData && window.emotionData.hasNewData) {
            const { emotion, confidence, landmarks, timestamp, secondaryEmotion } = window.emotionData;
            
            if (!lastDrawTime || timestamp > lastDrawTime) {
                // Calculate movement
                movementAmount = calculateMovement(landmarks.positions, lastLandmarks);
                movementAmount = Math.min(movementAmount * 2, 1); // Scale and clamp movement
                lastLandmarks = JSON.parse(JSON.stringify(landmarks.positions)); // Deep copy
                
                if (emotion !== lastEmotion) {
                    useWhiteGlow = !useWhiteGlow;
                    lastEmotion = emotion;
                    // Reset smoothing for new emotion
                    smoothedPrimaryConfidence = confidence;
                    if (secondaryEmotion) {
                        smoothedSecondaryConfidence = secondaryEmotion.value;
                    }
                } else {
                    // Smooth transition for existing emotion
                    targetPrimaryConfidence = confidence;
                    smoothedPrimaryConfidence = smoothValue(smoothedPrimaryConfidence, targetPrimaryConfidence);
                    
                    if (secondaryEmotion) {
                        targetSecondaryConfidence = secondaryEmotion.value;
                        smoothedSecondaryConfidence = smoothValue(smoothedSecondaryConfidence, targetSecondaryConfidence);
                    }
                }

                currentEmotion = emotion;
                currentConfidence = smoothedPrimaryConfidence;
                currentLandmarks = landmarks.positions;
                scaleFactor = landmarks.scale || 1;
                lastDrawTime = timestamp;
                window.emotionData.hasNewData = false;

                // Update HTML elements
                document.getElementById('primary-emotion-type').textContent = emotion.toUpperCase();
                document.getElementById('primary-emotion-confidence').textContent = 
                    Math.round(smoothedPrimaryConfidence * 100) + '%';
                
                if (secondaryEmotion) {
                    document.getElementById('secondary-emotion-type').textContent = 
                        secondaryEmotion.name.toUpperCase();
                    document.getElementById('secondary-emotion-confidence').textContent = 
                        Math.round(smoothedSecondaryConfidence * 100) + '%';
                }
                
                document.getElementById('landmarks-value').textContent = landmarks.positions.length;
                document.getElementById('fps-value').textContent = Math.round(p.frameRate());
                document.getElementById('person-status').textContent = 
                    landmarks.positions.length > 0 ? 'DETECTED' : 'NOT DETECTED';
            }
        }

        // Update effects
        glowAmount = p.sin(p.frameCount * 0.05) * 0.5 + 1;
        fadeAmount = p.sin(p.frameCount * 0.03) * 0.2 + 0.8;
        
        // Draw landmarks if available
        if (currentLandmarks && currentLandmarks.length > 0) {
            p.push();
            p.translate(p.width/2, p.height/2);
            
            const s = scaleFactor * 1.5; // More moderate scale
            p.scale(s);
            
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
            for(let i = 0; i < 5; i++) { 
                p.noStroke();
                // Golden glow with increasing size and decreasing opacity
                p.fill(45, 70, 95, (0.04 - i * 0.005) * fadeAmount);
                p.beginShape();
                for (let j = 0; j <= 16; j++) {
                    if (currentLandmarks[j]) {
                        const x = currentLandmarks[j].x - centerX;
                        const y = currentLandmarks[j].y - centerY;
                        // Add subtle wave effect to the fill
                        const wave = p.sin(p.frameCount * 0.05 + j * 0.5) * 4;
                        // Increase spread for outer layers
                        p.vertex(x + (i * 3) + wave, y + (i * 3));
                    }
                }
                if (currentLandmarks[0]) {
                    const x = currentLandmarks[0].x - centerX;
                    const y = currentLandmarks[0].y - centerY;
                    const wave = p.sin(p.frameCount * 0.05) * 4;
                    p.vertex(x + (i * 3) + wave, y + (i * 3));
                }
                p.endShape(p.CLOSE);
            }

            // Base golden fill with enhanced glow
            p.noStroke();
            p.fill(45, 80, 95, 0.08 * fadeAmount);  
            p.beginShape();
            for (let i = 0; i <= 16; i++) {
                if (currentLandmarks[i]) {
                    const x = currentLandmarks[i].x - centerX;
                    const y = currentLandmarks[i].y - centerY;
                    p.vertex(x, y);
                }
            }
            if (currentLandmarks[0]) {
                const x = currentLandmarks[0].x - centerX;
                const y = currentLandmarks[0].y - centerY;
                p.vertex(x, y);
            }
            p.endShape(p.CLOSE);
            
            // Draw glowing black feature lines
            p.noFill();
            features.forEach(([start, end]) => {
                // Draw multiple black lines with varying opacity and thickness
                for(let i = 0; i < 4; i++) { 
                    p.stroke(0, 0, 0, (0.8 - i * 0.15) * fadeAmount);
                    p.strokeWeight((4 - i) / s);
                    
                    p.beginShape();
                    for (let j = start; j <= end; j++) {
                        if (currentLandmarks[j]) {
                            const x = currentLandmarks[j].x - centerX;
                            const y = currentLandmarks[j].y - centerY;
                            // Enhanced flowing wave effect
                            const waveX = p.sin(p.frameCount * 0.05 + j * 0.5) * (2 - i);
                            const waveY = p.cos(p.frameCount * 0.05 + j * 0.5) * (2 - i);
                            p.vertex(x + waveX, y + waveY);
                        }
                    }
                    if (start >= 36) {
                        p.endShape(p.CLOSE);
                    } else {
                        p.endShape();
                    }
                }
            });

            p.blendMode(p.SCREEN);
            p.noStroke();
            
            // Outer yellow glow
            for(let i = 0; i < 3; i++) {
                p.fill(45, 70, 100, 0.015 * fadeAmount);
                p.ellipse(0, 0, 
                       250 + p.sin(p.frameCount * 0.05) * 20 + i * 40, 
                       250 + p.cos(p.frameCount * 0.05) * 20 + i * 40);
            }
            
            // Inner white glow based on movement
            if (movementAmount > 0.1) {
                for(let i = 0; i < 2; i++) {
                    p.fill(0, 0, 100, 0.01 * fadeAmount * movementAmount);
                    p.ellipse(0, 0, 
                           150 + p.sin(p.frameCount * 0.08) * 10 + i * 20, 
                           150 + p.cos(p.frameCount * 0.08) * 10 + i * 20);
                }
            }
            
            p.blendMode(p.BLEND);
            p.pop();
        }
    };

    // Handle window resize
    p.windowResized = () => {
        const container = document.getElementById('visualization-container');
        if (container) {
            p.resizeCanvas(container.offsetWidth, container.offsetHeight);
        }
    };
}, 'visualization-container');
