# Cleanup script for Windows

# Remove node_modules directories
Write-Host "Cleaning up node_modules..."
Get-ChildItem -Path . -Include node_modules -Recurse -Directory | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue

# Remove build artifacts
Write-Host "Cleaning up build artifacts..."
Remove-Item -Path "dist", "build", "coverage" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "*.tsbuildinfo" -Force -ErrorAction SilentlyContinue

# Clean package caches
Write-Host "Cleaning package caches..."
pnpm store prune

Write-Host "Cleanup complete!"
