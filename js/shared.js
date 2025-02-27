// Create a shared object for communication
window.emotionData = {
    emotion: 'neutral',
    confidence: 0,
    landmarks: { positions: [] },
    timestamp: 0,
    hasNewData: false
};

console.log('Shared data object created');
