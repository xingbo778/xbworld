#!/usr/bin/env bash
set -e

# macOS native install script for Freeciv-web
# Requires: brew install openjdk@17 maven mariadb meson ninja jansson icu4c imagemagick pngcrush pkg-config lua tomcat@10 nginx

BASEDIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$BASEDIR"

export PATH="/usr/local/opt/openjdk@17/bin:/usr/local/opt/tomcat@10/bin:$PATH"
export JAVA_HOME="/usr/local/opt/openjdk@17"

TOMCAT_HOME="/usr/local/opt/tomcat@10/libexec"
DATA_DIR="$TOMCAT_HOME/webapps/data"
DB_NAME="freeciv_web"
DB_USER="$(whoami)"
DB_PASSWORD="freeciv123"

echo "========================================="
echo "Freeciv-web macOS Native Install"
echo "========================================="

# Step 1: Config file
echo "==== Step 1: Creating config ===="
cat > "$BASEDIR/config/config" << CFGEOF
FCW_HOST=localhost
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_ROOT_PASSWORD=
TOMCATMANAGER=N
TOMCATMANAGER_USER=
TOMCATMANAGER_PASSWORD=
NGINX_DISABLE_ON_SHUTDOW=N
SMTP_LOGIN=
SMTP_PASSWORD=
SMTP_HOST=
SMTP_PORT=
SMTP_SENDER=
CAPTCHA_SECRET=
CAPTCHA_PUBLIC=
GOOGLE_SIGNIN=
GADS=
TRACKJS=
MAP_TOKEN=
CFGEOF

# Step 2: Generate config from templates
echo "==== Step 2: Generating configs from templates ===="
"$BASEDIR/config/gen-from-templates.sh"

# Fix tomcat paths in generated files (Linux /var/lib/tomcat10 -> macOS Homebrew path)
if [ -f "$BASEDIR/freeciv-web/src/main/webapp/WEB-INF/config.properties" ]; then
  sed -i '' "s|/var/lib/tomcat10|$TOMCAT_HOME|g" "$BASEDIR/freeciv-web/src/main/webapp/WEB-INF/config.properties"
fi
if [ -f "$BASEDIR/publite2/settings.ini" ]; then
  sed -i '' "s|/var/lib/tomcat10|$TOMCAT_HOME|g" "$BASEDIR/publite2/settings.ini"
else
  cp "$BASEDIR/publite2/settings.ini.dist" "$BASEDIR/publite2/settings.ini"
  sed -i '' "s|/var/lib/tomcat10|$TOMCAT_HOME|g" "$BASEDIR/publite2/settings.ini"
fi

# Step 3: Setup MariaDB
echo "==== Step 3: Setting up MariaDB ===="
brew services start mariadb 2>/dev/null || true
sleep 3

mariadb -u root -e "CREATE DATABASE IF NOT EXISTS $DB_NAME;" 2>/dev/null || true
mariadb -u root -e "CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASSWORD';" 2>/dev/null || true
mariadb -u root -e "GRANT ALL ON $DB_NAME.* TO '$DB_USER'@'localhost';" 2>/dev/null || true
mariadb -u root -e "FLUSH PRIVILEGES;" 2>/dev/null || true
echo "MariaDB configured."

# Step 4: Build Freeciv C server
echo "==== Step 4: Building Freeciv C server ===="
cd "$BASEDIR/freeciv"

# Ensure PKG_CONFIG can find Homebrew packages
export PKG_CONFIG_PATH="/usr/local/lib/pkgconfig:/usr/local/opt/icu4c/lib/pkgconfig:/usr/local/opt/jansson/lib/pkgconfig:$PKG_CONFIG_PATH"
export CFLAGS="-I/usr/local/include -I/usr/local/opt/icu4c/include"
export LDFLAGS="-L/usr/local/lib -L/usr/local/opt/icu4c/lib"

./prepare_freeciv.sh
cd build && ninja install
echo "Freeciv C server built."

# Step 5: Sync JS/assets from Freeciv to Freeciv-web
echo "==== Step 5: Syncing JS and assets ===="
cd "$BASEDIR"
mkdir -p "$DATA_DIR/savegames/pbem" "$DATA_DIR/scorelogs" "$DATA_DIR/ranklogs"
mkdir -p "$BASEDIR/freeciv-web/src/derived/webapp"

"$BASEDIR/scripts/sync-js-hand.sh" \
  -b "$BASEDIR" \
  -f "$BASEDIR/freeciv/freeciv" \
  -i "$HOME/freeciv" \
  -o "$BASEDIR/freeciv-web/src/derived/webapp" \
  -d "$DATA_DIR"

# Step 6: Install Node.js deps and build freeciv-web
echo "==== Step 6: Building freeciv-web Java webapp ===="
cd "$BASEDIR/freeciv-web"
npm install --no-bin-links 2>/dev/null || npm install

# Create flyway.properties
cat > flyway.properties << FLYEOF
flyway.user=$DB_USER
flyway.password=$DB_PASSWORD
flyway.url=jdbc:mysql://localhost:3306/$DB_NAME?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC
FLYEOF

mvn -B -Dflyway.configFiles=flyway.properties flyway:migrate package

# Step 7: Deploy WAR to Tomcat
echo "==== Step 7: Deploying to Tomcat ===="
cp target/freeciv-web.war "$TOMCAT_HOME/webapps/"
echo "WAR deployed."

# Step 8: Install Python deps
echo "==== Step 8: Installing Python dependencies ===="
pip3 install --user tornado mysqlclient Pillow requests 2>/dev/null || \
pip3 install tornado mysql-connector-python Pillow requests

# Step 9: Setup nginx
echo "==== Step 9: Configuring nginx ===="
NGINX_CONF="/usr/local/etc/nginx/servers/freeciv-web.conf"
mkdir -p /usr/local/etc/nginx/servers
cat > "$NGINX_CONF" << 'NGXEOF'
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

server {
    listen 8000;
    server_name localhost;
    tcp_nodelay on;

    gzip on;
    gzip_comp_level 8;
    gzip_proxied any;
    gzip_types text/css application/json application/javascript text/javascript text/xml application/xml;

    location ~ /civsocket/7([0-9][0-9][0-9]) {
        proxy_pass http://127.0.0.1:7$1;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_connect_timeout 90;
        proxy_send_timeout 90;
        proxy_read_timeout 90;
    }

    location ~ /data/.*\.(gif|log)$ {
        proxy_pass http://localhost:8080;
        proxy_redirect off;
        proxy_set_header Host $host;
    }

    location ~ /data/ {
        return 403;
    }

    location ~* \.(js|css|png|jpg|dae)$ {
        rewrite ^(.*)$ /freeciv-web/$1 break;
        proxy_pass http://localhost:8080;
        proxy_redirect off;
        expires 7d;
        proxy_set_header Host $host;
    }

    location ~ /pubstatus {
        proxy_pass http://localhost:4002;
        proxy_redirect off;
        proxy_set_header Host $host;
    }

    location = / {
        proxy_pass http://localhost:8080/freeciv-web/;
        proxy_redirect off;
    }

    location = /meta/metaserver {
        deny all;
    }

    location ~ / {
        rewrite ^(.*)$ /freeciv-web/$1 break;
        proxy_pass http://localhost:8080;
        proxy_redirect off;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        client_max_body_size 3m;
    }
}
NGXEOF

echo "nginx configured."

# Step 10: Migration checkpoint
echo "==== Step 10: Setting migration checkpoint ===="
cd "$BASEDIR/scripts/migration"
mig_scripts=([0-9]*)
echo "${mig_scripts[-1]}" > checkpoint

echo ""
echo "========================================="
echo "Installation complete!"
echo "========================================="
echo ""
echo "To start Freeciv-web, run:"
echo "  $BASEDIR/start-macos.sh"
echo ""
echo "Then open http://localhost in your browser."
