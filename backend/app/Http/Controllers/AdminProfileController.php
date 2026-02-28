<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\AdminProfile;
use Illuminate\Support\Facades\Validator;

class AdminProfileController extends Controller
{
    // GET /api/v1/admin/profile
    public function show(Request $request)
    {
        $user = $request->user();
        if (!$user) return response()->json(['message' => 'Unauthenticated'], 401);

        if (!in_array($user->role, ['admin', 'superadmin'], true)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $profile = AdminProfile::firstOrCreate(
            ['user_id' => $user->user_id],
            ['permission_level' => 'full']
        );

        return response()->json([
            'user' => [
                'user_id' => $user->user_id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
            ],
            'admin_profile' => [
                'admin_profile_id' => $profile->admin_profile_id,
                'user_id' => $profile->user_id,
                'permission_level' => $profile->permission_level,
                'notes' => $profile->notes,
                'avatar_url' => $profile->avatar_url,
                'created_at' => $profile->created_at,
                'updated_at' => $profile->updated_at,
            ],
        ]);
    }

    // PUT /api/v1/admin/profile
    // ✅ Updates ONLY: name, permission_level, notes
    // ❌ Does NOT accept avatar_url (avatar is handled ONLY by POST /me/avatar/admin)
    public function update(Request $request)
    {
        $user = $request->user();
        if (!$user) return response()->json(['message' => 'Unauthenticated'], 401);

        if (!in_array($user->role, ['admin', 'superadmin'], true)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => ['sometimes', 'string', 'max:255'],
            'permission_level' => ['sometimes', 'in:full,limited,readonly'],
            'notes' => ['nullable', 'string'],
            // ✅ avatar_url removed on purpose
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $profile = AdminProfile::firstOrCreate(
            ['user_id' => $user->user_id],
            ['permission_level' => 'full']
        );

        // Update base user name if provided
        if ($request->has('name')) {
            $user->name = $request->input('name');
            $user->save();
        }

        if ($request->has('permission_level')) {
            $profile->permission_level = $request->input('permission_level');
        }

        // Use exists so notes can be set to null to clear it
        if ($request->exists('notes')) {
            $profile->notes = $request->input('notes');
        }

        $profile->save();

        return response()->json([
            'message' => 'Admin profile updated.',
            'user' => [
                'user_id' => $user->user_id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
            ],
            'admin_profile' => [
                'admin_profile_id' => $profile->admin_profile_id,
                'user_id' => $profile->user_id,
                'permission_level' => $profile->permission_level,
                'notes' => $profile->notes,
                'avatar_url' => $profile->avatar_url, // still returned for display
                'created_at' => $profile->created_at,
                'updated_at' => $profile->updated_at,
            ],
        ]);
    }
}