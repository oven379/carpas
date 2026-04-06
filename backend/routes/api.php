<?php

use App\Http\Controllers\Api\CarClaimController;
use App\Http\Controllers\Api\CarController;
use App\Http\Controllers\Api\CarDocController;
use App\Http\Controllers\Api\CarEventController;
use App\Http\Controllers\Api\CarSearchController;
use App\Http\Controllers\Api\CarShareController;
use App\Http\Controllers\Api\DetailingAuthController;
use App\Http\Controllers\Api\DetailingYandexOAuthController;
use App\Http\Controllers\Api\OwnerAuthController;
use App\Http\Controllers\Api\OwnerCarController;
use App\Http\Controllers\Api\OwnerCarDocController;
use App\Http\Controllers\Api\OwnerCarEventController;
use App\Http\Controllers\Api\OwnerCarShareController;
use App\Http\Controllers\Api\PublicShowcaseController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

Route::get('/health', fn () => response()->json(['ok' => true]));

Route::get('/public/stats', [PublicShowcaseController::class, 'stats']);
Route::get('/public/cars/recent', [PublicShowcaseController::class, 'recentCars']);
Route::get('/public/detailings/{id}', [PublicShowcaseController::class, 'detailing']);
Route::get('/public/garages/{slug}', [PublicShowcaseController::class, 'ownerGarage']);

Route::post('/detailings', [DetailingAuthController::class, 'register']);
Route::post('/detailings/login', [DetailingAuthController::class, 'login']);
Route::get('/detailings/oauth/yandex/url', [DetailingYandexOAuthController::class, 'url']);
Route::post('/detailings/oauth/yandex/callback', [DetailingYandexOAuthController::class, 'callback']);

Route::post('/owners/register', [OwnerAuthController::class, 'register']);
Route::post('/owners/login', [OwnerAuthController::class, 'login']);

Route::get('/share/{token}', [CarShareController::class, 'byToken']);

Route::middleware(['auth:sanctum', 'ensure.owner'])->group(function () {
    Route::get('/owners/me', [OwnerAuthController::class, 'me']);
    Route::patch('/owners/me', [OwnerAuthController::class, 'updateMe']);

    Route::get('/owners/cars/search-by-vin', [CarSearchController::class, 'byVin']);
    Route::get('/owners/cars/search-by-plate', [CarSearchController::class, 'byPlate']);

    Route::delete('/owners/docs/{id}', [OwnerCarDocController::class, 'destroyByDocId']);

    Route::get('/owners/cars', [OwnerCarController::class, 'index']);
    Route::post('/owners/cars', [OwnerCarController::class, 'store']);

    Route::get('/owners/cars/{carId}/events', [OwnerCarEventController::class, 'index']);
    Route::post('/owners/cars/{carId}/events', [OwnerCarEventController::class, 'store']);
    Route::patch('/owners/cars/{carId}/events/{id}', [OwnerCarEventController::class, 'update']);
    Route::delete('/owners/cars/{carId}/events/{id}', [OwnerCarEventController::class, 'destroy']);

    Route::get('/owners/cars/{carId}/docs', [OwnerCarDocController::class, 'index']);
    Route::post('/owners/cars/{carId}/docs', [OwnerCarDocController::class, 'store']);
    Route::delete('/owners/cars/{carId}/docs/{id}', [OwnerCarDocController::class, 'destroy']);

    Route::get('/owners/cars/{id}', [OwnerCarController::class, 'show']);
    Route::patch('/owners/cars/{id}', [OwnerCarController::class, 'update']);
    Route::delete('/owners/cars/{id}', [OwnerCarController::class, 'destroy']);

    Route::post('/owners/cars/{carId}/shares', [OwnerCarShareController::class, 'store']);
    Route::get('/owners/cars/{carId}/shares', [OwnerCarShareController::class, 'index']);
    Route::delete('/owners/shares/{token}', [OwnerCarShareController::class, 'revoke']);

    Route::post('/owners/claims', [CarClaimController::class, 'store']);
    Route::get('/owners/claims', [CarClaimController::class, 'mine']);
});

Route::middleware(['auth:sanctum', 'ensure.detailing'])->group(function () {
    Route::get('/me', [DetailingAuthController::class, 'me']);
    Route::patch('/detailings/me', [DetailingAuthController::class, 'updateMe']);

    Route::get('/cars/search-duplicate', [CarSearchController::class, 'duplicateCandidatesForDetailing']);
    Route::post('/cars/link-from-personal-garage', [CarController::class, 'linkFromPersonalGarage']);

    Route::get('/cars', [CarController::class, 'index']);
    Route::post('/cars', [CarController::class, 'store']);
    Route::get('/cars/{id}', [CarController::class, 'show']);
    Route::patch('/cars/{id}', [CarController::class, 'update']);
    Route::delete('/cars/{id}', [CarController::class, 'destroy']);

    Route::get('/cars/{carId}/events', [CarEventController::class, 'index']);
    Route::post('/cars/{carId}/events', [CarEventController::class, 'store']);
    Route::patch('/events/{id}', [CarEventController::class, 'update']);
    Route::delete('/events/{id}', [CarEventController::class, 'destroy']);

    Route::get('/cars/{carId}/docs', [CarDocController::class, 'index']);
    Route::post('/cars/{carId}/docs', [CarDocController::class, 'store']);
    Route::delete('/docs/{id}', [CarDocController::class, 'destroy']);

    Route::post('/cars/{carId}/shares', [CarShareController::class, 'store']);
    Route::get('/cars/{carId}/shares', [CarShareController::class, 'index']);
    Route::delete('/shares/{token}', [CarShareController::class, 'revoke']);

    Route::get('/claims/inbox', [CarClaimController::class, 'inbox']);
    Route::patch('/claims/{id}', [CarClaimController::class, 'review']);
});
