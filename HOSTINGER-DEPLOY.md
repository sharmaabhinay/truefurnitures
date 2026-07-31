# Hosting True Furniture's on Hostinger

This app is a **full-stack** TanStack Start app: it renders on the server and runs
server functions (Razorpay orders + webhook, Resend emails, Firebase Admin, MCP).
That means it needs a **Node.js process**, so it must run on a **Hostinger VPS**
(or Hostinger Cloud with Node support). Plain shared/Web hosting that only serves
static files cannot run checkout, payments, emails or the admin panel.

---

## 1. Build for Node

Locally or on the server:

```bash
npm install
npm run build:node        # NITRO_PRESET=node-server vite build
npm start                 # node .output/server/index.mjs  -> http://127.0.0.1:3000
```

The deployable artifact is the `.output/` folder (`.output/server` = Node server,
`.output/public` = static assets).

## 2. Prepare the VPS (Ubuntu template)

```bash
ssh root@YOUR_VPS_IP
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs nginx git
npm i -g pm2
```

## 3. Deploy the code

```bash
mkdir -p /var/www/truefurnitures && cd /var/www/truefurnitures
git clone <your-github-repo-url> .
cp .env.production.example .env   # then fill in real values
npm ci
npm run build:node
```

## 4. Keep it running with PM2

```bash
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 startup        # run the command it prints
pm2 logs true-furnitures
```

## 5. Nginx reverse proxy + SSL

`/etc/nginx/sites-available/truefurnitures`:

```nginx
server {
    listen 80;
    server_name truefurnitures.com www.truefurnitures.com;

    client_max_body_size 25m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /_build/ {
        alias /var/www/truefurnitures/.output/public/_build/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
ln -s /etc/nginx/sites-available/truefurnitures /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d truefurnitures.com -d www.truefurnitures.com
```

## 6. DNS (Hostinger hPanel)

In **Domains → DNS Zone**, point the domain at the VPS:

| Type | Name | Value        |
| ---- | ---- | ------------ |
| A    | @    | YOUR_VPS_IP  |
| A    | www  | YOUR_VPS_IP  |

## 7. Post-deploy checklist

- Firebase Console → Authentication → **Authorized domains**: add `truefurnitures.com`
  (phone OTP + Google sign-in fail otherwise).
- Razorpay dashboard → Webhooks → URL
  `https://truefurnitures.com/api/public/webhooks/razorpay`, same secret as
  `RAZORPAY_WEBHOOK_SECRET`.
- Resend → verify the sending domain.
- Health check: `curl https://truefurnitures.com/api/public/health`.

## 8. Redeploying after changes

```bash
cd /var/www/truefurnitures
git pull
npm ci
npm run build:node
pm2 restart true-furnitures
```

---

### If you only have shared hosting

Upload `.output/public/*` into `public_html` and add the `.htaccess` in this repo.
You get the marketing pages only — SSR data, checkout, payments, emails and admin
will not work. Upgrade to a VPS for the full app.