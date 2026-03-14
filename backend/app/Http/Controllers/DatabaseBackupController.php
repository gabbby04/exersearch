<?php

// ✅ app/Http/Controllers/DatabaseBackupController.php
namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Services\DatabaseBackupService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class DatabaseBackupController extends Controller
{
    public function index(DatabaseBackupService $svc)
    {
        return response()->json(['data' => $svc->listBackups()]);
    }

    public function tables(DatabaseBackupService $svc)
    {
        return response()->json(['data' => $svc->listTables()]);
    }

    public function store(Request $request, DatabaseBackupService $svc)
    {
        $u = $request->user();
        $createdBy = $u ? ($u->email ?? $u->name ?? ('user#' . $u->id)) : null;

        $type = (string) $request->input('type', 'dump');
        $table = $request->input('table');
        $table = is_string($table) ? trim($table) : null;
        if ($table === '') $table = null;

        $backup = $svc->createBackup($createdBy, $type, $table);

        return response()->json([
            'message' => 'Backup created.',
            'backup' => $backup,
        ], 201);
    }

  public function download(Request $request, DatabaseBackupService $svc)
{
    if (!$request->user()) {
        return response()->json(['message' => 'Unauthenticated.'], 401);
    }

    $name = trim((string) $request->query('name', ''));

    if ($name === '') {
        return response()->json(['message' => 'Missing backup name.'], 422);
    }

    $path = $svc->downloadPath($name);

    return response()->download($path, $name, [
        'Content-Type' => 'application/octet-stream',
    ]);
}
    /**
     * ✅ NEW: Restore endpoint.
     * Accepts:
     * - file: uploaded .dump/.sql
     * OR
     * - name: existing backup filename in backups directory
     *
     * Requires:
     * - confirm: must match restore phrase
     */
    public function restore(Request $request, DatabaseBackupService $svc)
    {
        $request->validate([
            'confirm' => ['required', 'string'],
            'name' => ['nullable', 'string'],
            'file' => ['nullable', 'file'],
        ]);

        if (!$request->user()) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $confirm = (string) $request->input('confirm', '');

        // Option A: restore from server filename
        $name = $request->input('name');
        if (is_string($name) && trim($name) !== '') {
            $result = $svc->restoreFromServerBackup(trim($name), $confirm);
            return response()->json(['message' => 'Restore completed.', 'result' => $result]);
        }

        // Option B: restore from uploaded file
        $file = $request->file('file');
        if (!$file) {
            return response()->json(['message' => 'Provide either "name" or "file".'], 422);
        }

        $originalName = $file->getClientOriginalName();
        $tmpPath = $file->getRealPath();
        if (!$tmpPath) {
            return response()->json(['message' => 'Could not read uploaded file.'], 422);
        }

        $result = $svc->restoreFromUploadedTempPath($tmpPath, $originalName, $confirm);

        return response()->json(['message' => 'Restore completed.', 'result' => $result]);
    }
}