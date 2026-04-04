<?php

namespace App\Http\Middleware;

use App\Models\Owner;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureOwner
{
    public function handle(Request $request, Closure $next): Response
    {
        if (!$request->user() instanceof Owner) {
            abort(403, 'owner_token_required');
        }

        return $next($request);
    }
}
