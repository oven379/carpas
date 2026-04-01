<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\DetailingAuthController;
use App\Http\Controllers\Api\CarController;
use App\Http\Controllers\Api\CarEventController;
use App\Http\Controllers\Api\CarDocController;
use App\Http\Controllers\Api\CarShareController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| is assigned the "api" middleware group. Enjoy building your API!
|
*/

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

Route::get('/health', fn () => response()->json(['ok' => true]));

Route::post('/detailings', [DetailingAuthController::class, 'register']);
Route::post('/detailings/login', [DetailingAuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [DetailingAuthController::class, 'me']);

    Route::get('/cars', [CarController::class, 'index']);
    Route::post('/cars', [CarController::class, 'store']);
    Route::get('/cars/{id}', [CarController::class, 'show']);
    Route::patch('/cars/{id}', [CarController::class, 'update']);
    Route::delete('/cars/{id}', [CarController::class, 'destroy']);

    Route::get('/cars/{carId}/events', [CarEventController::class, 'index']);
    Route::post('/cars/{carId}/events', [CarEventController::class, 'store']);
    Route::delete('/events/{id}', [CarEventController::class, 'destroy']);

    Route::get('/cars/{carId}/docs', [CarDocController::class, 'index']);
    Route::post('/cars/{carId}/docs', [CarDocController::class, 'store']);
    Route::delete('/docs/{id}', [CarDocController::class, 'destroy']);

    Route::post('/cars/{carId}/shares', [CarShareController::class, 'store']);
    Route::get('/cars/{carId}/shares', [CarShareController::class, 'index']);
    Route::delete('/shares/{token}', [CarShareController::class, 'revoke']);
});

Route::get('/share/{token}', [CarShareController::class, 'byToken']);
