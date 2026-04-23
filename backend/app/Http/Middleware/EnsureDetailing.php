<?php

namespace App\Http\Middleware;

use App\Http\Support\PendingOwnerPool;
use App\Models\Detailing;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureDetailing
{
    public function handle(Request $request, Closure $next): Response
    {
        $u = $request->user();
        if (!$u instanceof Detailing) {
            abort(403, 'detailing_token_required');
        }
        if ($u->email === PendingOwnerPool::DETAILING_EMAIL) {
            abort(403, 'detailing_token_required');
        }
        if ($u->verification_approved_at === null) {
            abort(403, 'detailing_pending_verification');
        }

        return $next($request);
    }
}
