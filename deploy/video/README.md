# In-House Video Infrastructure Setup

This guide covers deploying the custom WebRTC signaling server and `coturn` TURN relay on the existing Hostinger VPS.

## 1. DNS Setup
Create the following A records pointing to your Hostinger VPS IP:
- `signal.openordo.com`
- `turn.openordo.com`

## 2. Secrets Generation
Generate two 32-byte secure random strings.
```bash
openssl rand -hex 32
# Generate twice, one for SIGNAL_JWT_SECRET, one for TURN_SECRET
```
Add them to the `.env` file of the Next.js app, and the `.env` file for docker-compose or PM2.

## 3. Firewall Ports
You must open these ports in BOTH the **Hostinger hPanel VPS Firewall** and `ufw` on the server itself.

```bash
ufw allow 443/tcp
ufw allow 3478/tcp
ufw allow 3478/udp
ufw allow 5349/tcp
ufw allow 49152:65535/udp
```
*Verify that port 443 and your Next.js app block in nginx are untouched.*

## 4. Certificates
Run certbot to acquire Let's Encrypt certificates. The renewal hook is essential to reload coturn when the cert updates.
```bash
certbot certonly --standalone -d turn.openordo.com --deploy-hook "systemctl restart coturn || docker restart chartwell-coturn"
certbot --nginx -d signal.openordo.com
```

## 5. Deployment
### Using Docker Compose (Recommended)
Edit `turnserver.conf` and replace `YOUR_VPS_PUBLIC_IP` with your actual VPS IP address.
`docker-compose.video.yml` is now configured to automatically load the `.env` file from the repository root `../../.env`.
Ensure your root `.env` file contains:
```
SIGNAL_JWT_SECRET=your_video_jwt_secret_here
TURN_SECRET=your_turn_secret_here
```
Run:
```bash
docker-compose -f docker-compose.video.yml up -d
```

### Or using PM2 (for Signaling) and native coturn
```bash
apt install coturn
cp turnserver.conf /etc/turnserver.conf
systemctl restart coturn

cd ../../signaling
npm install
npm run build
pm2 start dist/index.js --name "signaling"
```

## 6. Bandwidth Usage
Only relayed calls (TURN) use server bandwidth (approx. 1-3 Mbps per call). P2P calls do not.
You can monitor this usage in the Hostinger hPanel under VPS > Network > Bandwidth to ensure you don't exceed your monthly allowance.
