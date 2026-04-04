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
    ${PHPIZE_DEPS} \
  && docker-php-ext-install \
    intl \
    mbstring \
    opcache \
    pdo \
    pdo_pgsql \
    zip \
  && pecl install redis \
  && docker-php-ext-enable redis \
  && apk del ${PHPIZE_DEPS}

RUN printf '%s\n' \
    'upload_max_filesize = 32M' \
    'post_max_size = 32M' \
    > /usr/local/etc/php/conf.d/zz-uploads.ini

# Composer (copied from official image)
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

COPY docker/php-fpm/docker-entrypoint.sh /usr/local/bin/laravel-php-entrypoint.sh
# Windows CRLF в репозитории ломает shebang в контейнере («no such file or directory»)
RUN sed -i 's/\r$//' /usr/local/bin/laravel-php-entrypoint.sh \
  && chmod +x /usr/local/bin/laravel-php-entrypoint.sh

ENTRYPOINT ["/usr/local/bin/laravel-php-entrypoint.sh"]
CMD ["php-fpm"]

