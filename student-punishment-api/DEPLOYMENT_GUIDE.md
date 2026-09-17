# Panduan Lengkap Deployment ke VPS (Student Punishment System)

Dokumen ini berisi panduan langkah demi langkah untuk mengunggah dan menjalankan aplikasi **Student Punishment System** (Backend Laravel + Frontend React) pada server **VPS Ubuntu 22.04 / 24.04 LTS**.

---

## 1. Arsitektur Single-Domain (Rekomendasi)

- **Frontend (React + Vite)**: Disajikan sebagai file statis dari direktori `dist/` pada root URL: `https://domainanda.com`
- **Backend (Laravel API)**: Menangani request endpoint `/api/*` diarahkan ke `public/index.php`.
- **Keuntungan**: Bebas masalah CORS, konfigurasi SSL cukup 1 domain.

---

## 2. Persiapan Server VPS

Login ke server via SSH:

```bash
ssh root@IP_VPS_ANDA
```

Update repositori dan instal paket dasar:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx git unzip curl ufw
```

---

## 3. Instalasi PHP 8.2, Composer, MySQL & Redis

### A. PHP 8.2 & Ekstensi Laravel

```bash
sudo apt install -y software-properties-common
sudo add-apt-repository ppa:ondrej/php -y
sudo apt update

sudo apt install -y php8.2 php8.2-fpm php8.2-mysql php8.2-mbstring \
php8.2-xml php8.2-bcmath php8.2-curl php8.2-zip php8.2-redis
```

### B. Composer

```bash
curl -sS https://getcomposer.org/installer -o composer-setup.php
sudo php composer-setup.php --install-dir=/usr/local/bin --filename=composer
rm composer-setup.php
```

### C. MySQL Server

```bash
sudo apt install -y mysql-server
sudo systemctl start mysql
```

Buat database dan user:

```bash
sudo mysql
```

```sql
CREATE DATABASE student_punishment CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'punishment_user'@'localhost' IDENTIFIED BY 'PasswordKuatAnda123!';
GRANT ALL PRIVILEGES ON student_punishment.* TO 'punishment_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### D. Redis Server

```bash
sudo apt install -y redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server
```

---

## 4. Struktur Folder & Upload Source Code

Buat folder proyek di VPS:

```bash
sudo mkdir -p /var/www/student-punishment/api
sudo mkdir -p /var/www/student-punishment/web
sudo chown -R $USER:$USER /var/www/student-punishment
```

### Upload dari Komputer Lokal (PowerShell):

```powershell
# Upload Backend (tanpa vendor agar ringan)
scp -r student-punishment-api root@IP_VPS_ANDA:/var/www/student-punishment/api

# Upload Hasil Build Frontend (cukup folder dist)
scp -r student-punishment-web/dist root@IP_VPS_ANDA:/var/www/student-punishment/web/dist
```

---

## 5. Konfigurasi Backend (Laravel) di VPS

Masuk ke folder backend:

```bash
cd /var/www/student-punishment/api
composer install --no-dev --optimize-autoloader
```

Konfigurasi file `.env`:

```bash
cp .env.example .env
nano .env
```

Atur nilai konfigurasi berikut:

```env
APP_NAME="Student Punishment"
APP_ENV=production
APP_KEY=
APP_DEBUG=false
APP_URL=https://domainanda.com

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=student_punishment
DB_USERNAME=punishment_user
DB_PASSWORD=PasswordKuatAnda123!

CACHE_STORE=redis
REDIS_CLIENT=phpredis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

Jalankan perintah inisialisasi:

```bash
php artisan key:generate
php artisan migrate --seed --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

Atur izin akses file:

```bash
sudo chown -R www-data:www-data storage bootstrap/cache
sudo chmod -R 775 storage bootstrap/cache
```

---

## 6. Konfigurasi Nginx

Buat file konfigurasi virtual host:

```bash
sudo nano /etc/nginx/sites-available/student-punishment
```

Isi dengan konfigurasi berikut:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name domainanda.com www.domainanda.com;

    # 1. Frontend React (Static Files)
    root /var/www/student-punishment/web/dist;
    index index.html;

    client_max_body_size 10M;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # 2. Backend Laravel API
    location /api {
        alias /var/www/student-punishment/api/public;
        try_files $uri $uri/ @api;

        location ~ \.php$ {
            include fastcgi_params;
            fastcgi_param SCRIPT_FILENAME /var/www/student-punishment/api/public/index.php;
            fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        }
    }

    location @api {
        rewrite /api/(.*)$ /api/index.php last;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }
}
```

Aktifkan konfigurasi Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/student-punishment /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

---

## 7. Pasang Sertifikat SSL Gratis (HTTPS)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d domainanda.com -d www.domainanda.com
```

---

## 8. Fitur yang Telah Diterapkan

1. **Role-Based Authentication & Permissions**: Admin, PC1 (Wali Kelas), Subject (Guru Mapel).
2. **Classroom Assignments**: Admin dapat mengatur kelas yang diajar oleh guru mapel.
3. **Change Password**: Semua guru (PC1 & Subject) dapat mengganti kata sandi mandiri.
4. **Student Punishment Scoring**:
   - Base score 150 poin.
   - Redis caching untuk skor instan.
5. **Bulk Import & Export CSV**:
   - Import/Export Data Siswa.
   - Import/Export Data Guru (dengan penugasan kelas).
   - Import/Export Data Hukuman/Poin Pelanggaran (_Demerits_).
