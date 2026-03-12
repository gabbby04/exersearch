<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class OwnerApplicationApproved extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $name,
        public string $gymName
    ) {}

    public function build()
    {
        return $this
            ->subject('Owner Application Approved')
            ->view('emails.owner_application_approved');
    }
}