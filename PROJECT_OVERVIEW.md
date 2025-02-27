# Emotions in Binary

## Project Description

'Emotions in Binary' explores the delicate threshold where human vulnerability meets digital interpretation, examining our growing tendency to seek emotional refuge in artificial spaces. Through Face-API.js's neural networks, the installation captures and translates human expressions into an evolving audiovisual landscape. As participants engage with the work, their emotional states are analyzed by pre-trained deep learning models and transformed into abstract visual elements and musical compositions, creating a digital mirror where raw human feeling meets algorithmic understanding.

The work repurposes facial recognition technology not for surveillance, but as a meditation on digital intimacy. In this space where flesh meets code, participants witness their emotional landscape being decomposed and recomposed through streams of binary data, each pixel and sound a fragment of their inner world. The installation becomes a reflection on our contemporary existence, where the boundaries between authentic feeling and digital expression blur into a new form of emotional articulation—questioning whether something sacred and human persists when our most intimate expressions flow through digital channels.

## Technical Implementation

### Core Technologies
- **Face-API.js**: Neural network-based face detection and emotion recognition
  - TinyFaceDetector for efficient face detection
  - FaceLandmark68Net for facial feature mapping
  - FaceExpressionNet for emotion analysis
- **Custom Visualization Engine**: Real-time translation of emotional data into visual elements
- **Web Audio API**: Dynamic sound generation based on emotional states

### Emotion Detection
The system analyzes seven primary emotions:
- Neutral
- Happy
- Sad
- Angry
- Fearful
- Disgusted
- Surprised

### Visual Elements
- Real-time geometric face mesh visualization
- Binary data representation of emotional states
- Abstract visual patterns generated from facial landmarks
- Dynamic color schemes responding to emotional intensity

### Audio Components
- Emotion-driven sound synthesis
- Real-time audio parameter modulation
- Spatial audio positioning based on facial movement

## Installation Requirements

### Hardware
- Webcam with minimum 720p resolution
- Display monitor (minimum 1280x720)
- Audio output device/speakers
- Computer with modern web browser

### Software Dependencies
- Modern web browser with WebGL support
- Face-API.js and required models
- Web Audio API compatibility

## Interaction Flow
1. Participant approaches the installation
2. Facial detection initiates
3. Emotional state analysis begins
4. Real-time visual translation appears
5. Audio elements respond to emotional changes
6. Binary data visualization updates continuously

## Privacy Considerations
- No facial data or emotional states are stored
- All processing happens client-side
- No external data transmission
- Real-time analysis only

## Credits and Acknowledgments
- Face-API.js by Vincent Mühler
- Development: Custom implementation using web technologies
- Created for [ARTIFICIAL] TERRITORIES exhibition
