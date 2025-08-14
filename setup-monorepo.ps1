# Create package directories
$packages = @(
    "core",
    "protocol-connectors/websocket",
    "protocol-connectors/sse",
    "protocol-connectors/mqtt",
    "protocol-connectors/graphql-subscriptions",
    "frontend/react",
    "frontend/vue",
    "frontend/svelte",
    "frontend/forms",
    "backend/redis",
    "backend/kafka",
    "backend/postgres"
)

# Create each directory
foreach ($pkg in $packages) {
    $dir = "packages\$pkg"
    Write-Host "Creating directory: $dir"
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
}

Write-Host "Monorepo structure created successfully!" -ForegroundColor Green
