<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ProfilePhotoController extends Controller
{
    public function upload(Request $request, string $type = 'user')
    {
        $request->validate([
            'photo' => ['required', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ]);

        $user = $request->user();
        $type = strtolower($type);

        if (!in_array($type, ['user', 'owner', 'admin'], true)) {
            return response()->json(['message' => 'Invalid profile type.'], 422);
        }

        if ($type === 'admin' && !in_array($user->role, ['admin', 'superadmin'], true)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        if ($type === 'owner' && !in_array($user->role, ['owner', 'superadmin'], true)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $folder = match ($type) {
            'admin' => 'avatars/admins',
            'owner' => 'avatars/owners',
            default => 'avatars/users',
        };

        $path = $request->file('photo')->store($folder, 'public');
        $url = Storage::url($path);

        if ($type === 'admin') {
            $profile = $user->adminProfile()->firstOrCreate(['user_id' => $user->user_id]);
            $profile->avatar_url = $url;
            $profile->save();
        } elseif ($type === 'owner') {
            $profile = $user->ownerProfile()->firstOrCreate(['user_id' => $user->user_id]);
            $profile->profile_photo_url = $url;
            $profile->save();
        } else {
            $profile = $user->userProfile()->firstOrCreate(['user_id' => $user->user_id]);
            $profile->profile_photo_url = $url;
            $profile->save();
        }

        return response()->json([
            'message' => 'Profile photo updated.',
            'avatar_url' => $url,
            'type' => $type,
        ]);
    }

    public function remove(Request $request, string $type = 'user')
    {
        $user = $request->user();
        $type = strtolower($type);

        if (!in_array($type, ['user', 'owner', 'admin'], true)) {
            return response()->json(['message' => 'Invalid profile type.'], 422);
        }

        if ($type === 'admin' && !in_array($user->role, ['admin', 'superadmin'], true)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        if ($type === 'owner' && !in_array($user->role, ['owner', 'superadmin'], true)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $currentUrl = null;

        if ($type === 'admin') {
            $profile = $user->adminProfile;
            $currentUrl = $profile?->avatar_url;
            if ($profile) {
                $profile->avatar_url = null;
                $profile->save();
            }
        } elseif ($type === 'owner') {
            $profile = $user->ownerProfile;
            $currentUrl = $profile?->profile_photo_url;
            if ($profile) {
                $profile->profile_photo_url = null;
                $profile->save();
            }
        } else {
            $profile = $user->userProfile;
            $currentUrl = $profile?->profile_photo_url;
            if ($profile) {
                $profile->profile_photo_url = null;
                $profile->save();
            }
        }

        if ($currentUrl && str_starts_with($currentUrl, '/storage/')) {
            $relative = str_replace('/storage/', '', $currentUrl);
            Storage::disk('public')->delete($relative);
        }

        return response()->json([
            'message' => 'Profile photo removed.',
            'type' => $type,
        ]);
    }
}