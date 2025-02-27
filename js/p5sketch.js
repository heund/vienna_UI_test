let fans = [];
let binaryMatrix;
let overlayCanvas;
let backgroundCanvas;
let p5Instance;

let emotionColors = {
    happy: ['#00E5B7', '#008B72'],    
    angry: ['#FF4D4D', '#800000'],    
    sad: ['#4D4DFF', '#000080'],      
    neutral: ['#7fdbff', '#2a5566'],  
    surprised: ['#FFD700', '#B8860B'], 
    fearful: ['#800080', '#4B0082'],   
    disgusted: ['#32CD32', '#006400']  
};

let currentEmotion = 'neutral';
let currentConfidence = 0;
const MAX_FANS = 15;
const NUM_LINES = 25;
const COLS = 80;  
const ROWS = 40;  
const UPDATE_INTERVAL = 5; 
const CHUNK_SIZE = 10; 

class BinaryMatrix {
    constructor(p) {
        this.p = p;
        this.matrix = [];
        this.cellSize = 12;
        this.fadeSpeed = 0.98;
        this.frameCount = 0;
        this.updateIndex = 0;
        this.initMatrix();
        
        const bufferSize = Math.max(
            Math.ceil(p.windowWidth / (this.cellSize * 1.2)),
            Math.ceil(p.windowHeight / (this.cellSize * 1.2))
        );
        this.offscreenGraphics = p.createGraphics(
            bufferSize * this.cellSize,
            bufferSize * this.cellSize
        );
        
        this.offscreenGraphics.textFont('Futura-PT');
        this.offscreenGraphics.textSize(8);
        this.offscreenGraphics.textAlign(p.CENTER, p.CENTER);
        this.baseTextColor = p.color('#F2F0F0');
    }

    initMatrix() {
        for (let i = 0; i < ROWS; i++) {
            this.matrix[i] = [];
            for (let j = 0; j < COLS; j++) {
                this.matrix[i][j] = {
                    value: this.p.random() > 0.7 ? '1' : '0', 
                    alpha: this.p.random(50, 200),
                    color: this.p.color(emotionColors[currentEmotion][0])
                };
            }
        }
    }

    updateChunk() {
        const startIdx = this.updateIndex * CHUNK_SIZE;
        const totalCells = ROWS * COLS;
        const endIdx = Math.min(startIdx + CHUNK_SIZE, totalCells);

        for (let idx = startIdx; idx < endIdx; idx++) {
            const i = Math.floor(idx / COLS);
            const j = idx % COLS;
            let cell = this.matrix[i][j];
            
            if (this.p.random() < 0.02) {
                cell.value = this.p.random() > 0.7 ? '1' : '0';
            }
            
            cell.alpha *= this.fadeSpeed;
            if (cell.alpha < 20) {
                cell.alpha = this.p.random(150, 255);
                cell.color = this.p.color(
                    this.p.random() > 0.5 ? 
                    emotionColors[currentEmotion][0] : 
                    emotionColors[currentEmotion][1]
                );
            }
        }

        this.updateIndex = (this.updateIndex + 1) % Math.ceil(totalCells / CHUNK_SIZE);
    }

    update() {
        this.frameCount++;
        if (this.frameCount % UPDATE_INTERVAL !== 0) return;

        this.updateChunk();
        
        this.offscreenGraphics.clear();
        
        for (let i = 0; i < ROWS; i++) {
            for (let j = 0; j < COLS; j++) {
                let cell = this.matrix[i][j];
                let x = j * this.cellSize;
                let y = i * this.cellSize;
                
                if (cell.alpha > 5) {
                    cell.color.setAlpha(cell.alpha);
                    this.offscreenGraphics.fill(cell.color);
                    this.offscreenGraphics.noStroke();
                    this.offscreenGraphics.text(cell.value, x + this.cellSize/2, y + this.cellSize/2);
                }
            }
        }
    }

    display() {
        const time = this.frameCount * 0.001;
        const scale = 1.1 + Math.sin(time * 0.5) * 0.05; 
        
        this.p.push();
        this.p.translate(this.p.width/2, this.p.height/2);
        this.p.rotate(Math.sin(time) * 0.02);
        this.p.scale(scale);
        this.p.translate(-this.offscreenGraphics.width/2, -this.offscreenGraphics.height/2);
        
        this.p.imageMode(this.p.CENTER);
        this.p.image(this.offscreenGraphics, 0, 0);
        this.p.pop();
    }
}

class Fan {
    constructor(p, x, y) {
        this.p = p;
        this.x = x;
        this.y = y;
        this.size = p.random(30, 80);
        this.rotation = p.random(360);
        this.spreadAngle = p.random(20, 40);
        this.alpha = 200;
        this.rotationSpeed = p.random(-0.2, 0.2);
        this.growth = p.random(1.001, 1.002);
        
        this.angles = new Array(NUM_LINES);
        this.colors = new Array(NUM_LINES);
        for (let i = 0; i < NUM_LINES; i++) {
            this.angles[i] = p.map(i, 0, NUM_LINES - 1, -this.spreadAngle, this.spreadAngle);
            this.colors[i] = p.lerpColor(
                p.color(emotionColors[currentEmotion][0]), 
                p.color(emotionColors[currentEmotion][1]), 
                i / NUM_LINES
            );
        }
    }

    update() {
        this.rotation += this.rotationSpeed;
        this.size *= this.growth;
        this.alpha *= 0.99;
    }

    display() {
        this.p.push();
        this.p.translate(this.x, this.y);
        this.p.rotate(this.rotation);

        for (let i = 0; i < NUM_LINES; i += 3) {
            const c = this.colors[i];
            c.setAlpha(this.alpha);
            this.p.stroke(c);
            this.p.strokeWeight(2);
            this.p.push();
            this.p.rotate(this.angles[i]);
            this.p.line(0, 0, 0, -this.size);
            this.p.pop();
        }
        this.p.pop();
    }
}

let mainSketch = new p5((p) => {
    p.setup = () => {
        overlayCanvas = p.createCanvas(1280, 720);
        overlayCanvas.parent('p5-container');
        p.clear();
    };

    p.draw = () => {
        p.clear();

        if (p.frameCount % 30 === 0 && currentConfidence > 0.5 && fans.length < MAX_FANS) {
            fans.push(new Fan(p, p.random(p.width), p.random(p.height)));
        }

        for (let i = fans.length - 1; i >= 0; i--) {
            fans[i].update();
            fans[i].display();
            if (fans[i].alpha < 0 || fans[i].size > 300) {
                fans.splice(i, 1);
            }
        }
    };
});

let backgroundSketch = new p5((p) => {
    p.setup = () => {
        p5Instance = p;
        backgroundCanvas = p.createCanvas(p.windowWidth, p.windowHeight);
        backgroundCanvas.parent('background-container');
        p.pixelDensity(1); 
        binaryMatrix = new BinaryMatrix(p);
        p.frameRate(30); 
    };

    p.draw = () => {
        p.clear();
        p.background(0);
        binaryMatrix.update();
        binaryMatrix.display();
    };

    p.windowResized = () => {
        p.resizeCanvas(p.windowWidth, p.windowHeight);
    };
});

function updateEmotionVisualization(emotion, confidence) {
    currentEmotion = emotion;
    currentConfidence = confidence;
    
    // Only broadcast if emotionChannel exists
    if (typeof emotionChannel !== 'undefined') {
        try {
            emotionChannel.postMessage({ emotion, confidence });
        } catch (error) {
            console.warn('Error broadcasting emotion:', error);
        }
    }
    
    // Play emotion sound
    if (window.emotionSoundManager) {
        window.emotionSoundManager.playEmotionSound(emotion);
    }
    
    // Update binary matrix colors less frequently
    if (binaryMatrix.frameCount % (UPDATE_INTERVAL * 2) === 0) {
        for (let i = 0; i < ROWS; i++) {
            for (let j = 0; j < COLS; j++) {
                if (p5Instance.random() < 0.5) continue; // Only update half the cells
                binaryMatrix.matrix[i][j].color = p5Instance.color(
                    p5Instance.random() > 0.5 ? 
                    emotionColors[currentEmotion][0] : 
                    emotionColors[currentEmotion][1]
                );
            }
        }
    }
    
    if (fans.length > MAX_FANS / 2) {
        fans.splice(0, fans.length - MAX_FANS / 2);
    }
    
    if (confidence > 0.5) {
        for (let i = 0; i < 2; i++) {
            fans.push(new Fan(p5Instance, p5Instance.random(1280), p5Instance.random(720)));
        }
    }
}
