<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class OwnerApplicationRejected extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $name,
        public ?string $reason = null
    ) {}

    public function build()
    {
        return $this
            ->subject('Owner Application Rejected')
            ->view('emails.owner_application_rejected');
    }
}