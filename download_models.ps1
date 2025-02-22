$modelFiles = @(
    "tiny_face_detector_model-shard1",
    "tiny_face_detector_model-weights_manifest.json",
    "face_landmark_68_model-shard1",
    "face_landmark_68_model-weights_manifest.json",
    "face_expression_model-shard1",
    "face_expression_model-weights_manifest.json"
)

$baseUrl = "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights"
$modelsDir = ".\models"

foreach ($file in $modelFiles) {
    $url = "$baseUrl/$file"
    $output = "$modelsDir\$file"
    Write-Host "Downloading $file..."
    Invoke-WebRequest -Uri $url -OutFile $output
}
