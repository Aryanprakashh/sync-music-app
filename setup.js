#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🎵 Sync Music App Setup\n');
console.log('This script will help you configure your Spotify API credentials.\n');

console.log('To get your Spotify API credentials:');
console.log('1. Go to https://developer.spotify.com/dashboard');
console.log('2. Create a new application');
console.log('3. Add redirect URI to your app:');
console.log('   - Development: http://localhost:3000/callback');
console.log('   - Production: https://yourdomain.com/callback');
console.log('4. Copy your Client ID and Client Secret\n');

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setup() {
  try {
    const clientId = await question('Enter your Spotify Client ID: ');
    const clientSecret = await question('Enter your Spotify Client Secret: ');
    
    if (!clientId || !clientSecret) {
      console.log('\n❌ Client ID and Client Secret are required!');
      rl.close();
      return;
    }

    console.log('\n🔒 Security Configuration:');
    console.log('1. Development (HTTP) - for local testing');
    console.log('2. Production (HTTPS) - for secure deployment');
    
    const environment = await question('Choose environment (1 or 2): ');
    
    let redirectUri, useHttps, sslKeyPath, sslCertPath;
    
    if (environment === '2') {
      // Production setup
      redirectUri = await question('Enter your production domain (e.g., https://myapp.com): ');
      if (!redirectUri.startsWith('https://')) {
        redirectUri = 'https://' + redirectUri;
      }
      redirectUri += '/callback';
      useHttps = 'true';
      
      console.log('\n📜 SSL Certificate Setup:');
      console.log('For production, you need SSL certificates.');
      console.log('You can get free certificates from Let\'s Encrypt.');
      
      const hasCertificates = await question('Do you have SSL certificates? (y/n): ');
      
      if (hasCertificates.toLowerCase() === 'y') {
        sslKeyPath = await question('Enter path to private key file: ');
        sslCertPath = await question('Enter path to certificate file: ');
      } else {
        console.log('\n⚠️  You\'ll need to configure SSL certificates later for HTTPS to work.');
        console.log('For now, the app will run in HTTP mode.');
        useHttps = 'false';
      }
    } else {
      // Development setup
      redirectUri = 'http://localhost:3000/callback';
      useHttps = 'false';
    }
    
    let envContent = `# Spotify API Credentials
SPOTIFY_CLIENT_ID=${clientId}
SPOTIFY_CLIENT_SECRET=${clientSecret}
SPOTIFY_REDIRECT_URI=${redirectUri}

# Server Configuration
PORT=3000

# HTTPS Configuration
USE_HTTPS=${useHttps}
`;

    if (sslKeyPath && sslCertPath) {
      envContent += `SSL_KEY_PATH=${sslKeyPath}
SSL_CERT_PATH=${sslCertPath}
`;
    }

    envContent += `
# Environment
NODE_ENV=${environment === '2' ? 'production' : 'development'}
`;
    
    const envPath = path.join(__dirname, '.env');
    fs.writeFileSync(envPath, envContent);
    
    console.log('\n✅ Configuration saved to .env file!');
    console.log(`\n📋 Configuration Summary:`);
    console.log(`- Redirect URI: ${redirectUri}`);
    console.log(`- HTTPS: ${useHttps === 'true' ? 'Enabled' : 'Disabled'}`);
    console.log(`- Environment: ${environment === '2' ? 'Production' : 'Development'}`);
    
    console.log('\n🚀 Next steps:');
    console.log('1. Run: npm start');
    console.log(`2. Open: ${redirectUri.replace('/callback', '')}`);
    console.log('3. Connect with Spotify and start listening together!');
    
    if (environment === '2') {
      console.log('\n🔒 Production Security Notes:');
      console.log('- Ensure your domain has proper DNS configuration');
      console.log('- Verify SSL certificates are valid and trusted');
      console.log('- Update your Spotify app dashboard with the production redirect URI');
      console.log('- Remove development redirect URIs from Spotify dashboard for security');
    }
    
  } catch (error) {
    console.error('\n❌ Error during setup:', error.message);
  } finally {
    rl.close();
  }
}

setup(); 