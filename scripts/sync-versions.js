#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

function readToml(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  const versionMatch = content.match(/^\s*version\s*=\s*"([^"]+)"/m)
  if (!versionMatch) {
    throw new Error(`Could not find version in ${filePath}`)
  }
  return versionMatch[1]
}

function updatePackageJson(filePath, version) {
  const content = fs.readFileSync(filePath, 'utf8')
  const packageData = JSON.parse(content)

  const oldVersion = packageData.version
  packageData.version = version

  fs.writeFileSync(filePath, JSON.stringify(packageData, null, 2) + '\n')

  return oldVersion
}

function main() {
  try {
    // Read version from Cargo.toml
    const cargoTomlPath = path.join(__dirname, '..', 'Cargo.toml')
    const rustVersion = readToml(cargoTomlPath)

    console.log(`🦀 Found Rust version: ${rustVersion}`)

    // Update root package.json
    const rootPackageJsonPath = path.join(__dirname, '..', 'package.json')
    const oldRootVersion = updatePackageJson(rootPackageJsonPath, rustVersion)
    console.log(`📦 Updated root package.json: ${oldRootVersion} → ${rustVersion}`)

    // Update sample package.json
    const samplePackageJsonPath = path.join(__dirname, '..', 'sample', 'package.json')
    const oldSampleVersion = updatePackageJson(samplePackageJsonPath, rustVersion)
    console.log(`📦 Updated sample package.json: ${oldSampleVersion} → ${rustVersion}`)

    console.log('✅ Version sync completed successfully!')
  } catch (error) {
    console.error('❌ Version sync failed:', error.message)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

module.exports = { readToml, updatePackageJson }
