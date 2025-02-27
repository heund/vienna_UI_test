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
        glowAmount = p.sin(p.frameCount * 0.05) * 0.5 + 1;
        fadeAmount = p.sin(p.frameCount * 0.03) * 0.2 + 0.8;
        
        // Draw landmarks if available
        if (currentLandmarks && currentLandmarks.length > 0) {
            p.push();
            p.translate(p.width/2, p.height/2);
            
            const s = scaleFactor * 1.8; // More moderate scale
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

            // Add overall bloom effect with more subtle glow
            p.blendMode(p.SCREEN);
            p.noStroke();
            for(let i = 0; i < 3; i++) {
                p.fill(45, 70, 100, 0.015 * fadeAmount);
                p.ellipse(0, 0, 
                       300 + p.sin(p.frameCount * 0.05) * 20 + i * 40, 
                       300 + p.cos(p.frameCount * 0.05) * 20 + i * 40);
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
