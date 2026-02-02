#!/usr/bin/env node
const fs = require('fs');
const { execSync } = require('child_process');

// Check if cert files already exist
if (fs.existsSync('./server.crt') && fs.existsSync('./server.key')) {
  console.log('✓ Certificate files already exist (server.crt, server.key)');
  process.exit(0);
}

console.log('Generating self-signed certificate...');

try {
  // Use PowerShell to generate certificate via .NET
  const command = `
$cert = New-SelfSignedCertificate -DnsName "10.231.80.1","localhost" -CertStoreLocation "cert:\\CurrentUser\\My" -FriendlyName "Attendance System Dev";
$password = ConvertTo-SecureString -String "temp" -Force -AsPlainText;
Export-PfxCertificate -Cert $cert -FilePath "./server.pfx" -Password $password;
`;

  execSync(`powershell -Command "${command}"`, { stdio: 'inherit' });

  // Convert PFX to PEM using openssl alternative or PowerShell
  // Actually, let's use a simpler approach: use npm package
  console.log('\nInstalling selfsigned package...');
  execSync('npm install selfsigned', { stdio: 'inherit' });

  const selfsigned = require('selfsigned');
  const attrs = [{ name: 'commonName', value: '10.231.80.1' }];
  const { private: key, cert } = selfsigned.generate(attrs, { 
    days: 365,
    keySize: 2048,
    algorithm: 'sha256'
  });

  fs.writeFileSync('./server.key', key);
  fs.writeFileSync('./server.crt', cert);

  console.log('✓ Certificate generated successfully!');
  console.log('✓ Files created: server.key, server.crt');
  console.log('\nYou can now run: node server.js');
} catch (error) {
  console.error('Error generating certificate:', error.message);
  process.exit(1);
}
