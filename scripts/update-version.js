#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { readToml, updatePackageJson } = require('./sync-versions.js')

function updateCargoToml(filePath, newVersion) {
  const content = fs.readFileSync(filePath, 'utf8')
  const oldVersionMatch = content.match(/^\s*version\s*=\s*"([^"]+)"/m)

  if (!oldVersionMatch) {
    throw new Error(`Could not find version in ${filePath}`)
  }

  const oldVersion = oldVersionMatch[1]
  const updatedContent = content.replace(/^(\s*version\s*=\s*)"[^"]+"/m, `$1"${newVersion}"`)

  fs.writeFileSync(filePath, updatedContent)

  return oldVersion
}

function updateWorkspaceDependencyVersion(filePath, newVersion) {
  const content = fs.readFileSync(filePath, 'utf8')
  const updatedContent = content.replace(
    /^(axum_napi_bridge\s*=\s*{\s*path\s*=\s*"[^"]+"\s*,\s*version\s*=\s*)"[^"]+"(\s*})/m,
    `$1"${newVersion}"$2`,
  )

  fs.writeFileSync(filePath, updatedContent)
}

function main() {
  const newVersion = process.argv[2]

  if (!newVersion) {
    console.error('❌ Usage: node scripts/update-version.js <new-version>')
    console.error('   Example: node scripts/update-version.js 1.2.3')
    process.exit(1)
  }

  // Validate semver format
  if (!/^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?$/.test(newVersion)) {
    console.error('❌ Invalid version format. Use semver (e.g., 1.2.3 or 1.2.3-alpha.1)')
    process.exit(1)
  }

  try {
    // Update Cargo.toml
    const cargoTomlPath = path.join(__dirname, '..', 'Cargo.toml')
    const oldRustVersion = updateCargoToml(cargoTomlPath, newVersion)
    console.log(`🦀 Updated Rust version: ${oldRustVersion} → ${newVersion}`)

    // Update workspace dependency version
    updateWorkspaceDependencyVersion(cargoTomlPath, newVersion)
    console.log(`🔧 Updated workspace dependency version to ${newVersion}`)

    // Update root package.json
    const rootPackageJsonPath = path.join(__dirname, '..', 'package.json')
    const oldRootVersion = updatePackageJson(rootPackageJsonPath, newVersion)
    console.log(`📦 Updated root package.json: ${oldRootVersion} → ${newVersion}`)

    // Update sample package.json
    const samplePackageJsonPath = path.join(__dirname, '..', 'sample', 'package.json')
    const oldSampleVersion = updatePackageJson(samplePackageJsonPath, newVersion)
    console.log(`📦 Updated sample package.json: ${oldSampleVersion} → ${newVersion}`)

    console.log(`✅ All versions updated to ${newVersion}!`)
    console.log("💡 Don't forget to commit these changes and create a git tag:")
    console.log(`    git add -A && git commit -m "chore: bump version to ${newVersion}"`)
    console.log(`    git tag v${newVersion}`)
  } catch (error) {
    console.error('❌ Version update failed:', error.message)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}
