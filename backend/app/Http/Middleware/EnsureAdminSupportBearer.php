<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAdminSupportBearer
{
    public function handle(Request $request, Closure $next): Response
    {
        $expected = (string) config('support.admin_bearer_token', '');
        $got = (string) ($request->bearerToken() ?? '');
        if ($expected === '' || $got === '' || ! hash_equals($expected, $got)) {
            abort(401, 'admin_token_required');
        }

        return $next($request);
    }
}
