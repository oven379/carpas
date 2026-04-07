<?php

return [

    'admin_login' => env('ADMIN_SUPPORT_LOGIN', 'carpasss379tm'),

    'admin_password' => env('ADMIN_SUPPORT_PASSWORD', '379Tmgroup2026'),

    /**
     * Статический Bearer для API админки поддержки после успешного POST /admin/support/login.
     * Обязательно задайте в .env на проде (длинная случайная строка).
     */
    'admin_bearer_token' => env('ADMIN_SUPPORT_BEARER_TOKEN', 'dev-admin-support-bearer-change-in-env'),

    'ticket_body_max' => (int) env('SUPPORT_TICKET_BODY_MAX', 8000),

    'attachment_max_kb' => (int) env('SUPPORT_ATTACHMENT_MAX_KB', 4096),
];
