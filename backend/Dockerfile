FROM php:8.2-fpm-alpine

WORKDIR /var/www/html

RUN apk add --no-cache \
    bash \
    icu-dev \
    libzip-dev \
    oniguruma-dev \
    postgresql-dev \
    unzip \
    zip \
  && docker-php-ext-install \
    intl \
    mbstring \
    opcache \
    pdo \
    pdo_pgsql \
    zip

# Composer (copied from official image)
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

CMD ["php-fpm"]

