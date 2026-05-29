<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DetailingClientNote extends Model
{
    protected $fillable = [
        'detailing_id',
        'owner_id',
        'client_key',
        'note',
    ];
}
