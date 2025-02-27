// Color palette
const colors = {
    background: '#31a68f', // Turquoise green
    flower: {
        base: '#FFE5B4',    // Peach base
        shadow: '#8B3A3A',  // Deep burgundy shadow
        highlight: '#FFF8DC', // Cream highlight
        edge: '#951c0d'     // Coral red for edges
    }
};

// Create a new p5 instance for the background
const sacredFlowerSketch = (p) => {
    let rotation = 0;
    let lastLayer = 0;
    const PETAL_ROWS = 10;      // Number of rows
    const PETALS_PER_ROW = 16; // Base number of petals per row
    const rotationSpeed = 0.1;  // Speed of overall rotation

    p.setup = () => {
        console.log('Setting up sacred flower...');
        // Create canvas at full window size
        const canvas = p.createCanvas(window.innerWidth, window.innerHeight);
        canvas.parent('sacred-flower-container');
        p.angleMode(p.DEGREES);
        p.noStroke();
        // Ensure we're using RGB color mode
        p.colorMode(p.RGB, 255);
        console.log('Sacred flower canvas created:', p.width, p.height);
    };

    p.draw = () => {
        p.clear();
        // Set background with alpha for slight transparency
        p.background(p.color(colors.background));
        p.translate(p.width/2, p.height/2);
        
        // Animate the build-up of layers
        lastLayer = p.min(lastLayer + 0.02, PETAL_ROWS);
        
        // Draw the flower pattern
        drawFlower(p);
        
        // Update rotation
        rotation += rotationSpeed;
    };

    p.windowResized = () => {
        p.resizeCanvas(window.innerWidth, window.innerHeight);
    };

    const drawFlower = (p) => {
        // Make flower size relative to the smaller screen dimension, but larger
        const baseSize = p.min(p.width, p.height) * 0.35; // Increased from 0.22
        
        p.push();
        p.rotate(rotation);
        
        // Draw from outer to inner to get proper overlapping
        for (let row = PETAL_ROWS - 1; row >= 0; row--) {
            if (row > lastLayer) continue;
            
            const rowRadius = baseSize * (1 - row * 0.12);
            const numPetals = PETALS_PER_ROW + row * 3;
            const angleStep = 360 / numPetals;
            
            for (let i = 0; i < numPetals; i++) {
                const angle = i * angleStep;
                const distanceFromCenter = rowRadius * 0.85;
                const x = p.cos(angle) * distanceFromCenter;
                const y = p.sin(angle) * distanceFromCenter;
                
                p.push();
                p.translate(x, y);
                p.rotate(angle + 90 + row * 2); // Slight rotation offset per row
                
                // Calculate colors based on row
                const progressToEdge = row / PETAL_ROWS;
                const shadowAmount = p.pow(1 - progressToEdge, 1.5);
                
                drawPetal(p, rowRadius * 0.95, progressToEdge, shadowAmount, row);
                
                p.pop();
            }
        }
        
        p.pop();
    };

    const drawPetal = (p, size, progressToEdge, shadowAmount, row) => {
        const petalWidth = size * 0.35;
        const petalLength = size * 0.9;
        
        p.push();
        // Add slight shadow for depth
        p.translate(1, 1);
        p.fill(0, 30);
        drawPetalShape(p, petalWidth, petalLength);
        p.translate(-1, -1);
        
        // Draw main petal with gradient
        const numSteps = 15;
        for (let i = 0; i <= numSteps; i++) {
            const t = i / numSteps;
            const currentWidth = petalWidth * (1 - t * 0.3);
            
            let currentColor;
            if (t > 0.8) {
                const tipBlend = p.map(t, 0.8, 1, 0, 1);
                const edgeColor = p.color(colors.flower.edge);
                const shadowColor = p.color(colors.flower.shadow);
                currentColor = p.lerpColor(edgeColor, shadowColor, tipBlend);
            } else {
                const baseColor = p.color(colors.flower.base);
                const edgeColor = p.color(colors.flower.edge);
                currentColor = p.lerpColor(baseColor, edgeColor, p.pow(t, 1.5));
            }
            p.fill(currentColor);
            
            const y = -petalLength * t;
            const x = currentWidth * p.sin(180 * t);
            
            p.beginShape();
            p.vertex(-x, y);
            p.vertex(x, y);
            const nextY = -petalLength * ((i + 1) / numSteps);
            const nextWidth = petalWidth * (1 - (i + 1) / numSteps * 0.3);
            p.vertex(nextWidth * p.sin(180 * ((i + 1) / numSteps)), nextY);
            p.vertex(-nextWidth * p.sin(180 * ((i + 1) / numSteps)), nextY);
            p.endShape(p.CLOSE);
        }
        
        // Add highlight
        if (row < PETAL_ROWS - 2) {
            const highlightWidth = petalWidth * 0.4;
            const highlightLength = petalLength * 0.5;
            p.push();
            p.translate(0, -petalLength * 0.1);
            p.fill(p.color(colors.flower.highlight));
            drawPetalShape(p, highlightWidth, highlightLength);
            p.pop();
        }
        
        p.pop();
    };

    const drawPetalShape = (p, width, length) => {
        p.beginShape();
        p.vertex(0, 0);
        p.bezierVertex(
            width * 0.5, -length * 0.2,
            width * 0.3, -length * 0.7,
            0, -length
        );
        p.bezierVertex(
            -width * 0.3, -length * 0.7,
            -width * 0.5, -length * 0.2,
            0, 0
        );
        p.endShape(p.CLOSE);
    };
};

// Create the background sketch instance when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('Creating sacred flower instance...');
    const container = document.getElementById('sacred-flower-container');
    if (!container) {
        console.error('Sacred flower container not found!');
        return;
    }
    new p5(sacredFlowerSketch);
});
