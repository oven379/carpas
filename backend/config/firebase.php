<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Firebase Cloud Messaging (HTTP v1)
    |--------------------------------------------------------------------------
    |
    | Сервисный аккаунт Firebase: Project settings → Service accounts → Generate key.
    | Укажите путь к JSON или переменную FIREBASE_CREDENTIALS_B64 (base64 всего файла).
    |
    */
    'project_id' => env('FIREBASE_PROJECT_ID', ''),

    'credentials_path' => env('FIREBASE_CREDENTIALS_PATH', ''),

    /** Base64-кодированное содержимое JSON (удобно в Docker / секретах). */
    'credentials_b64' => env('FIREBASE_CREDENTIALS_B64', ''),
];
