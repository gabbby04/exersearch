<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\URL;
use Illuminate\Http\Request;
use App\Http\Controllers\NewsController;
use App\Models\User;
use App\Models\Meal;

use App\Http\Controllers\Auth\UserAuthController;
use App\Http\Controllers\AmenityController;
use App\Http\Controllers\EquipmentController;
use App\Http\Controllers\GymAmenityController;
use App\Http\Controllers\GymController;
use App\Http\Controllers\GymEquipmentController;
use App\Http\Controllers\GymInteractionController;
use App\Http\Controllers\GymOwnerApplicationController;
use App\Http\Controllers\GymRecommendationController;
use App\Http\Controllers\MediaUploadController;
use App\Http\Controllers\MeController;
use App\Http\Controllers\ProfilePhotoController;
use App\Http\Controllers\UserPreferenceController;
use App\Http\Controllers\UserPreferredAmenityController;
use App\Http\Controllers\UserPreferredEquipmentController;
use App\Http\Controllers\EquipmentImportController;

use App\Http\Controllers\AdminUserController;
use App\Http\Controllers\AdminOwnerController;
use App\Http\Controllers\AdminProfileController;
use App\Http\Controllers\AdminAppSettingsController;
use App\Http\Controllers\AppSettingsPublicController;
use App\Http\Controllers\SavedGymController;
use App\Http\Controllers\Api\GeoController;

use App\Http\Controllers\AdminAdminController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\UserProfileController;

use App\Http\Controllers\ExerciseController;
use App\Http\Controllers\WorkoutTemplateController;
use App\Http\Controllers\WorkoutTemplateDayController;
use App\Http\Controllers\WorkoutTemplateDayExerciseController;

use App\Http\Controllers\UserWorkoutPlanController;
use App\Http\Controllers\UserWorkoutPlanDayController;
use App\Http\Controllers\UserWorkoutPlanDayExerciseController;

use App\Http\Controllers\OwnerProfileController;
use App\Http\Controllers\DatabaseBackupController;
use App\Http\Controllers\GymAnalyticsController;

use App\Http\Controllers\GymMembershipController;
use App\Http\Controllers\GymFreeVisitController;
use App\Http\Controllers\GymInquiryController;
use App\Http\Controllers\GymRatingController;
use App\Http\Controllers\OwnerManualMemberController;

use App\Http\Controllers\MealController;
use App\Http\Controllers\IngredientController;
use App\Http\Controllers\MacroPresetController;
use App\Http\Controllers\MealPlanController;

use App\Http\Controllers\GymActivityFeedController;
use App\Http\Controllers\UserWorkoutGoalController;
use App\Http\Controllers\FaqController;

use App\Http\Controllers\NotificationController;
use App\Http\Controllers\GymAnnouncementController;
use App\Http\Controllers\AdminDashboardController;

use App\Http\Controllers\ChatController;

Route::prefix('v1')->group(function () {
    Route::get('/geo/search', [GeoController::class, 'search']);
Route::get('/geo/reverse', [GeoController::class, 'reverse']);
    Route::get('/mail-test', function () {
        set_time_limit(120);

        try {
            Log::info('mail-test route hit', [
                'mailer' => config('mail.default'),
                'host' => config('mail.mailers.smtp.host'),
                'port' => config('mail.mailers.smtp.port'),
                'username' => config('mail.mailers.smtp.username'),
                'from' => config('mail.from.address'),
            ]);

            Mail::raw('SMTP test email from ExerSearch via Resend.', function ($message) {
                $message->to('exersearch5@gmail.com')
                    ->subject('SMTP Test - ExerSearch');
            });

            Log::info('mail-test sent successfully');

            return response()->json([
                'success' => true,
                'message' => 'Mail sent successfully',
            ]);
        } catch (\Throwable $e) {
            Log::error('mail-test failed', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);

            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ], 500);
        }
    });

    Route::get('/mail-config-check', function () {
        return response()->json([
            'default' => config('mail.default'),
            'host' => config('mail.mailers.smtp.host'),
            'port' => config('mail.mailers.smtp.port'),
            'username' => config('mail.mailers.smtp.username'),
            'from_address' => config('mail.from.address'),
            'from_name' => config('mail.from.name'),
        ]);
    });

    Route::get('/settings/public', [AppSettingsPublicController::class, 'show']);

    
    Route::get('/faqs', [FaqController::class, 'index']);
    Route::get('/faqs/active', [FaqController::class, 'active']);
    Route::get('/faqs/{faq}', [FaqController::class, 'show']);

    Route::post('/auth/login', [UserAuthController::class, 'login']);
    Route::post('/auth/register', [UserAuthController::class, 'register']);
    Route::post('/auth/google', [UserAuthController::class, 'google']);

    Route::get('/gyms', [GymController::class, 'index']);
    Route::get('/gyms/{gym}', [GymController::class, 'show'])->whereNumber('gym');

    Route::get('/gyms/{gym}/equipments', [GymController::class, 'equipments'])->whereNumber('gym');
    Route::get('/gyms/{gym}/equipments/{equipment}', [GymController::class, 'equipmentDetail'])
        ->whereNumber('gym')->whereNumber('equipment');

    Route::get('/gyms/{gym}/amenities', [GymController::class, 'amenities'])->whereNumber('gym');
    Route::get('/gyms/{gym}/amenities/{amenity}', [GymController::class, 'amenityDetail'])
        ->whereNumber('gym')->whereNumber('amenity');

    Route::get('/gyms/{gym}/ratings', [GymRatingController::class, 'gymRatings'])->whereNumber('gym');

    Route::get('/gyms/{gymId}/announcements', [GymAnnouncementController::class, 'publicList'])
        ->whereNumber('gymId');

    Route::get('/gyms/free-first-visits', [GymFreeVisitController::class, 'listEnabledGyms']);

    Route::get('/equipments', [EquipmentController::class, 'index']);
    Route::get('/equipments/{id}', [EquipmentController::class, 'show'])->whereNumber('id');

    Route::get('/amenities', [AmenityController::class, 'index']);
    Route::get('/amenities/{id}', [AmenityController::class, 'show'])->whereNumber('id');

    Route::get('/gym-equipments', [GymEquipmentController::class, 'index']);
    Route::get('/gym-amenities', [GymAmenityController::class, 'index']);
    Route::get('/gym-amenities/{id}', [GymAmenityController::class, 'show'])->whereNumber('id');

    Route::prefix('meals')->group(function () {
        Route::get('/', [MealController::class, 'index']);
        Route::get('/stats', [MealController::class, 'stats']);
        Route::get('/filter', [MealController::class, 'filterByDiet']);
        Route::get('/type/{type}', [MealController::class, 'getByType']);
        Route::get('/{id}', [MealController::class, 'show']);
    });

    Route::prefix('ingredients')->group(function () {
        Route::get('/', [IngredientController::class, 'index']);
        Route::get('/categories', [IngredientController::class, 'categories']);
        Route::get('/{id}', [IngredientController::class, 'show']);
    });

    Route::prefix('macro-presets')->group(function () {
        Route::get('/', [MacroPresetController::class, 'index']);
        Route::get('/{id}', [MacroPresetController::class, 'show']);
        Route::post('/{id}/calculate', [MacroPresetController::class, 'calculate']);
    });

    Route::prefix('meal-plan')->group(function () {
        Route::post('/generate', [MealPlanController::class, 'generate']);
    });

    Route::post('/chat', [ChatController::class, 'sendMessage']);
    Route::get('/news/fitness', [\App\Http\Controllers\NewsController::class, 'fitness']);
    Route::get('/fitness-news', [NewsController::class, 'fitness']);
    Route::get('/fitness-trends', [NewsController::class, 'trends']);
    Route::get('/fitness-discussions', [NewsController::class, 'discussions']);

    Route::get('/email/verify/{id}/{hash}', function (Request $request, $id, $hash) {
        if (!URL::hasValidSignature($request)) {
            return response()->view('email-verify-result', [
                'ok' => false,
                'title' => 'Invalid or expired link',
                'message' => 'This verification link is invalid or has expired. Please request a new verification email from the app.',
            ], 403);
        }

        $user = User::findOrFail((int) $id);

        if (!hash_equals(sha1($user->getEmailForVerification()), (string) $hash)) {
            return response()->view('email-verify-result', [
                'ok' => false,
                'title' => 'Invalid link',
                'message' => 'This verification link is invalid. Please request a new verification email from the app.',
            ], 403);
        }

        if (!$user->hasVerifiedEmail()) {
            $user->markEmailAsVerified();
        }

        return response()->view('email-verify-result', [
            'ok' => true,
            'title' => 'Email verified',
            'message' => 'Your email has been verified successfully. You can now go back and log in.',
        ], 200);
    })->middleware('signed')->name('verification.verify');

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/chat/history', [ChatController::class, 'getUserHistory']);
        Route::delete('/chat/clear', [ChatController::class, 'clearHistory']);

        Route::post('/email/verification-notification', function (Request $request) {
            if ($request->user()->hasVerifiedEmail()) {
                return response()->json(['message' => 'Email already verified.'], 200);
            }

            $request->user()->sendEmailVerificationNotification();

            return response()->json(['message' => 'Verification link sent.'], 200);
        })->middleware('throttle:6,1')->name('verification.send');

        Route::get('/me', MeController::class);

        Route::middleware('verified')->group(function () {
            Route::get('/notifications', [NotificationController::class, 'index']);
            Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
            Route::post('/notifications/{id}/read', [NotificationController::class, 'markRead'])->whereNumber('id');
            Route::post('/notifications/read-all', [NotificationController::class, 'markAllRead']);

            Route::get('/gyms/{gym}/analytics', [GymAnalyticsController::class, 'show'])->whereNumber('gym');
            Route::get('/owner/activities', [GymAnalyticsController::class, 'activities']);

            Route::post('/me/avatar/{type}', [ProfilePhotoController::class, 'upload'])
                ->whereIn('type', ['user', 'owner', 'admin']);
            Route::delete('/me/avatar/{type}', [ProfilePhotoController::class, 'remove'])
                ->whereIn('type', ['user', 'owner', 'admin']);

            Route::get('/owner/home/cards', [\App\Http\Controllers\OwnerHomeCardsController::class, 'index']);
            Route::get('/gyms/ratings/summary', [\App\Http\Controllers\GymRatingSummaryController::class, 'index']);
            Route::get('/ratings/latest', [GymRatingController::class, 'latest']);

            Route::post('/media/upload', [MediaUploadController::class, 'upload']);
            Route::delete('/media/delete', [MediaUploadController::class, 'delete']);

            Route::get('/gyms/recommend', [GymRecommendationController::class, 'index']);
            Route::post('/gym-interactions', [GymInteractionController::class, 'store']);

            Route::post('/owner-applications', [GymOwnerApplicationController::class, 'applyOrUpdate']);
            Route::get('/owner-applications/me', [GymOwnerApplicationController::class, 'myApplication']);

            Route::get('/user/preferences', [UserPreferenceController::class, 'show']);
            Route::post('/user/preferences', [UserPreferenceController::class, 'storeOrUpdate']);

            Route::get('/user/preferred-equipments', [UserPreferredEquipmentController::class, 'index']);
            Route::post('/user/preferred-equipments', [UserPreferredEquipmentController::class, 'store']);

            Route::get('/user/preferred-amenities', [UserPreferredAmenityController::class, 'index']);
            Route::post('/user/preferred-amenities', [UserPreferredAmenityController::class, 'store']);

            Route::get('/user/profile', [UserProfileController::class, 'show']);
            Route::put('/user/profile', [UserProfileController::class, 'update']);

            Route::get('/owner/profile', [OwnerProfileController::class, 'show']);
            Route::put('/owner/profile', [OwnerProfileController::class, 'update']);
            Route::post('/owner/profile', [OwnerProfileController::class, 'storeOrUpdate']);

            Route::post('/user/onboarding/complete', [UserController::class, 'markOnboarded']);

            Route::get('/user/saved-gyms', [SavedGymController::class, 'index']);
            Route::post('/user/saved-gyms', [SavedGymController::class, 'store']);
            Route::delete('/user/saved-gyms/{gym_id}', [SavedGymController::class, 'destroy'])->whereNumber('gym_id');

            Route::get('/exercises', [ExerciseController::class, 'index']);
            Route::get('/exercises/{id}', [ExerciseController::class, 'show'])->whereNumber('id');

            Route::get('/workout-templates', [WorkoutTemplateController::class, 'index']);
            Route::get('/workout-templates/{id}', [WorkoutTemplateController::class, 'show'])->whereNumber('id');

            Route::post('/user/workout-plans/generate', [UserWorkoutPlanController::class, 'generate']);
            Route::post('/user/workout-plans/{id}/recalibrate-gym', [UserWorkoutPlanController::class, 'recalibrateGym'])->whereNumber('id');

            Route::get('/user/workout-plans', [UserWorkoutPlanController::class, 'index']);
            Route::get('/user/workout-plans/{id}', [UserWorkoutPlanController::class, 'show'])->whereNumber('id');
            Route::post('/user/workout-plans', [UserWorkoutPlanController::class, 'store']);
            Route::match(['put', 'patch'], '/user/workout-plans/{id}', [UserWorkoutPlanController::class, 'update'])->whereNumber('id');
            Route::delete('/user/workout-plans/{id}', [UserWorkoutPlanController::class, 'destroy'])->whereNumber('id');

            Route::get('/user/workout-plan-days', [UserWorkoutPlanDayController::class, 'index']);
            Route::get('/user/workout-plan-days/{id}', [UserWorkoutPlanDayController::class, 'show'])->whereNumber('id');
            Route::post('/user/workout-plan-days', [UserWorkoutPlanDayController::class, 'store']);
            Route::match(['put', 'patch'], '/user/workout-plan-days/{id}', [UserWorkoutPlanDayController::class, 'update'])->whereNumber('id');
            Route::delete('/user/workout-plan-days/{id}', [UserWorkoutPlanDayController::class, 'destroy'])->whereNumber('id');
            Route::post('/user/workout-plan-days/{id}/recalibrate-gym', [UserWorkoutPlanDayController::class, 'recalibrateGym'])->whereNumber('id');

            Route::get('/user/workout-plan-day-exercises', [UserWorkoutPlanDayExerciseController::class, 'index']);
            Route::get('/user/workout-plan-day-exercises/{id}', [UserWorkoutPlanDayExerciseController::class, 'show'])->whereNumber('id');
            Route::post('/user/workout-plan-day-exercises', [UserWorkoutPlanDayExerciseController::class, 'store']);
            Route::match(['put', 'patch'], '/user/workout-plan-day-exercises/{id}', [UserWorkoutPlanDayExerciseController::class, 'update'])->whereNumber('id');
            Route::delete('/user/workout-plan-day-exercises/{id}', [UserWorkoutPlanDayExerciseController::class, 'destroy'])->whereNumber('id');
            Route::get('/user/workout-plan-day-exercises/{id}/replacement-options', [UserWorkoutPlanDayExerciseController::class, 'replacementOptions'])->whereNumber('id');
            Route::post('/user/workout-plan-day-exercises/{id}/replace', [UserWorkoutPlanDayExerciseController::class, 'replaceWithChoice'])->whereNumber('id');

            Route::get('/my-gyms', [GymController::class, 'myGyms']);
            Route::post('/gyms', [GymController::class, 'store']);
            Route::match(['put', 'patch'], '/gyms/{gym}', [GymController::class, 'update'])->whereNumber('gym');
            Route::delete('/gyms/{gym}', [GymController::class, 'destroy'])->whereNumber('gym');

            Route::post('/gyms/{gym}/equipments', [GymEquipmentController::class, 'store'])->whereNumber('gym');
            Route::match(['put', 'patch'], '/gyms/{gym}/equipments/{equipment}', [GymEquipmentController::class, 'update'])
                ->whereNumber('gym')->whereNumber('equipment');
            Route::delete('/gyms/{gym}/equipments/{equipment}', [GymEquipmentController::class, 'destroy'])
                ->whereNumber('gym')->whereNumber('equipment');

            Route::post('/gyms/{gym}/amenities', [GymAmenityController::class, 'store'])->whereNumber('gym');
            Route::match(['put', 'patch'], '/gyms/{gym}/amenities/{amenity}', [GymAmenityController::class, 'update'])
                ->whereNumber('gym')->whereNumber('amenity');
            Route::delete('/gyms/{gym}/amenities/{amenity}', [GymAmenityController::class, 'destroy'])
                ->whereNumber('gym')->whereNumber('amenity');

            Route::get('/gyms/{gymId}/membership/me', [GymMembershipController::class, 'myForGym'])->whereNumber('gymId');
            Route::post('/gyms/{gymId}/membership/intent', [GymMembershipController::class, 'intent'])->whereNumber('gymId');
            Route::get('/me/memberships', [GymMembershipController::class, 'myMemberships']);

            Route::post('/gyms/{gymId}/free-visit/claim', [GymFreeVisitController::class, 'claim'])->whereNumber('gymId');
            Route::get('/me/free-visits', [GymFreeVisitController::class, 'myFreeVisits']);

            Route::get('/user/activity', [GymActivityFeedController::class, 'index']);
            Route::get('/user/workout-goal', [UserWorkoutGoalController::class, 'show']);

            Route::post('/gyms/{gymId}/inquiries', [GymInquiryController::class, 'ask'])->whereNumber('gymId');
            Route::get('/me/inquiries', [GymInquiryController::class, 'myInquiries']);
            Route::post('/me/inquiries/{inquiryId}/read', [GymInquiryController::class, 'userMarkRead'])->whereNumber('inquiryId');

            Route::get('/owner/inquiries/summary', [GymInquiryController::class, 'ownerSummary']);

            Route::get('/me/ratings', [GymRatingController::class, 'myRatings']);
            Route::get('/gyms/{gymId}/ratings/can-rate', [GymRatingController::class, 'canRate'])->whereNumber('gymId');
            Route::post('/gyms/{gymId}/ratings', [GymRatingController::class, 'upsertMyRating'])->whereNumber('gymId');

            Route::get('/owner/gyms/{gymId}/ratings', [GymRatingController::class, 'ownerGymRatings'])->whereNumber('gymId');

            Route::post('/owner/gyms/{gymId}/memberships/expire-check', [GymMembershipController::class, 'expireCheck']);

            Route::get('/owner/gyms/{gymId}/memberships', [GymMembershipController::class, 'ownerList'])->whereNumber('gymId');
            Route::post('/owner/memberships/{membershipId}/activate', [GymMembershipController::class, 'ownerActivate'])->whereNumber('membershipId');
            Route::patch('/owner/memberships/{membershipId}', [GymMembershipController::class, 'ownerUpdateStatus'])->whereNumber('membershipId');

            Route::get('/owner/gyms/{gymId}/free-visits', [GymFreeVisitController::class, 'ownerList'])->whereNumber('gymId');
            Route::post('/owner/free-visits/{freeVisitId}/use', [GymFreeVisitController::class, 'ownerMarkUsed'])->whereNumber('freeVisitId');
            Route::patch('/owner/gyms/{gymId}/free-visit-enabled', [GymFreeVisitController::class, 'ownerToggleEnabled'])->whereNumber('gymId');

            Route::get('/owner/gyms/{gymId}/members/combined', [OwnerManualMemberController::class, 'combined'])->whereNumber('gymId');
            Route::post('/owner/gyms/{gymId}/manual-members/import', [OwnerManualMemberController::class, 'import'])->whereNumber('gymId');
            Route::get('/owner/gyms/{gymId}/manual-members', [OwnerManualMemberController::class, 'index'])->whereNumber('gymId');
            Route::post('/owner/gyms/{gymId}/manual-members', [OwnerManualMemberController::class, 'store'])->whereNumber('gymId');
            Route::get('/owner/gyms/{gymId}/manual-members/{manualMemberId}', [OwnerManualMemberController::class, 'show'])
                ->whereNumber('gymId')->whereNumber('manualMemberId');
            Route::patch('/owner/gyms/{gymId}/manual-members/{manualMemberId}', [OwnerManualMemberController::class, 'update'])
                ->whereNumber('gymId')->whereNumber('manualMemberId');
            Route::delete('/owner/gyms/{gymId}/manual-members/{manualMemberId}', [OwnerManualMemberController::class, 'destroy'])
                ->whereNumber('gymId')->whereNumber('manualMemberId');

            Route::get('/owner/gyms/{gymId}/inquiries', [GymInquiryController::class, 'ownerList'])->whereNumber('gymId');
            Route::post('/owner/inquiries/{inquiryId}/answer', [GymInquiryController::class, 'ownerAnswer'])->whereNumber('inquiryId');
            Route::post('/owner/inquiries/{inquiryId}/close', [GymInquiryController::class, 'ownerClose'])->whereNumber('inquiryId');
            Route::post('/owner/inquiries/{inquiryId}/read', [GymInquiryController::class, 'ownerMarkRead'])->whereNumber('inquiryId');

            Route::get('/owner/gyms/{gymId}/announcements', [GymAnnouncementController::class, 'ownerList'])->whereNumber('gymId');
            Route::post('/owner/gyms/{gymId}/announcements', [GymAnnouncementController::class, 'ownerCreate'])->whereNumber('gymId');
            Route::delete('/owner/announcements/{announcementId}', [GymAnnouncementController::class, 'ownerDelete'])->whereNumber('announcementId');

            Route::middleware('admin')->group(function () {
                Route::post('/faqs', [FaqController::class, 'store']);
                Route::put('/faqs/{faq}', [FaqController::class, 'update']);
                Route::patch('/faqs/{faq}', [FaqController::class, 'update']);
                Route::patch('/faqs/{faq}/toggle', [FaqController::class, 'toggle']);
                Route::delete('/faqs/{faq}', [FaqController::class, 'destroy']);

                Route::get('/admin/activities', [GymInteractionController::class, 'adminIndex']);
                Route::get('/admin/settings', [AdminAppSettingsController::class, 'show']);
                Route::put('/admin/settings', [AdminAppSettingsController::class, 'update']);
                Route::get('/admin/dashboard', [AdminDashboardController::class, 'show']);
                Route::get('/admin/profile', [AdminProfileController::class, 'show']);
                Route::put('/admin/profile', [AdminProfileController::class, 'update']);
                Route::get('/admin/chat-history', [ChatController::class, 'adminIndex']);
                Route::post('/admin/chat-history/clear', [ChatController::class, 'adminClear']);

                Route::get('/admin/ingredients', [IngredientController::class, 'adminIndex']);
                Route::post('/admin/ingredients', [IngredientController::class, 'store']);
                Route::patch('/admin/ingredients/{id}', [IngredientController::class, 'update'])->whereNumber('id');
                Route::delete('/admin/ingredients/{id}', [IngredientController::class, 'destroy'])->whereNumber('id');
                Route::patch('/admin/ingredients/{id}/toggle', [IngredientController::class, 'toggle'])->whereNumber('id');

                Route::get('/admin/macro-presets', [MacroPresetController::class, 'adminIndex']);
                Route::post('/admin/macro-presets', [MacroPresetController::class, 'store']);
                Route::match(['put', 'patch'], '/admin/macro-presets/{id}', [MacroPresetController::class, 'update'])->whereNumber('id');
                Route::delete('/admin/macro-presets/{id}', [MacroPresetController::class, 'destroy'])->whereNumber('id');
                Route::patch('/admin/macro-presets/{id}/toggle', [MacroPresetController::class, 'toggle'])->whereNumber('id');

                Route::get('/admin/meals', [MealController::class, 'adminIndex']);
                Route::get('/admin/meals/{id}', [MealController::class, 'adminShow'])->whereNumber('id');
                Route::post('/admin/meals', [MealController::class, 'store']);
                Route::match(['put', 'patch'], '/admin/meals/{id}', [MealController::class, 'update'])->whereNumber('id');
                Route::delete('/admin/meals/{id}', [MealController::class, 'destroy'])->whereNumber('id');
                Route::patch('/admin/meals/{id}/toggle', [MealController::class, 'toggle'])->whereNumber('id');

                Route::get('/admin/admins', [AdminAdminController::class, 'index']);
                Route::get('/admin/admins/{user}', [AdminAdminController::class, 'show']);
                Route::post('/admin/admins', [AdminAdminController::class, 'store']);
                Route::put('/admin/admins/{user}', [AdminAdminController::class, 'update']);
                Route::delete('/admin/admins/{user}', [AdminAdminController::class, 'destroy']);

                Route::post('/equipments', [EquipmentController::class, 'store']);
                Route::match(['put', 'patch'], '/equipments/{id}', [EquipmentController::class, 'update'])->whereNumber('id');
                Route::delete('/equipments/{id}', [EquipmentController::class, 'destroy'])->whereNumber('id');
                Route::post('/equipments/import-csv', [EquipmentImportController::class, 'import']);

                Route::post('/amenities', [AmenityController::class, 'store']);
                Route::match(['put', 'patch'], '/amenities/{id}', [AmenityController::class, 'update'])->whereNumber('id');
                Route::delete('/amenities/{id}', [AmenityController::class, 'destroy'])->whereNumber('id');

                Route::get('/gyms/map', [GymController::class, 'mapGyms']);
                Route::get('/owner-applications/map', [GymOwnerApplicationController::class, 'mapPoints']);

                Route::get('/admin/owner-applications', [GymOwnerApplicationController::class, 'index']);
                Route::get('/admin/owner-applications/{id}', [GymOwnerApplicationController::class, 'show'])->whereNumber('id');
                Route::patch('/admin/owner-applications/{id}/approve', [GymOwnerApplicationController::class, 'approve'])->whereNumber('id');
                Route::patch('/admin/owner-applications/{id}/reject', [GymOwnerApplicationController::class, 'reject'])->whereNumber('id');

                Route::get('/admin/gyms', [GymController::class, 'adminIndex']);
                Route::get('/admin/gyms/unowned', [GymController::class, 'adminUnownedGyms']);
                Route::get('/admin/gyms/{gym}', [GymController::class, 'adminShow'])->whereNumber('gym');
                Route::patch('/admin/gyms/{gym}/approve', [GymController::class, 'adminApprove'])->whereNumber('gym');
                Route::patch('/admin/gyms/{gym}/reject', [GymController::class, 'adminReject'])->whereNumber('gym');
                Route::patch('/admin/gyms/{gym}/assign-owner', [GymController::class, 'assignOwner'])->whereNumber('gym');

                Route::get('/admin/owners/search', [GymController::class, 'searchableOwners']);

                Route::patch('/admin/owner-profiles/{user_id}/verify', [OwnerProfileController::class, 'verify'])->whereNumber('user_id');

                Route::get('/admin/users', [AdminUserController::class, 'index']);
                Route::get('/admin/users/{user}', [AdminUserController::class, 'show']);
                Route::get('/admin/users/{user}/preferences', [AdminUserController::class, 'preferences']);
                Route::put('/admin/users/{user}/preferences', [AdminUserController::class, 'updatePreferences']);

                Route::get('/admin/owners', [AdminOwnerController::class, 'index']);
                Route::get('/admin/owners/{owner}', [AdminOwnerController::class, 'show']);
                Route::get('/admin/owners/{owner}/gyms', [AdminOwnerController::class, 'gyms']);

                Route::post('/exercises', [ExerciseController::class, 'store']);
                Route::match(['put', 'patch'], '/exercises/{id}', [ExerciseController::class, 'update'])->whereNumber('id');
                Route::delete('/exercises/{id}', [ExerciseController::class, 'destroy'])->whereNumber('id');

                Route::match(['put', 'patch'], '/workout-templates/{id}', [WorkoutTemplateController::class, 'update'])->whereNumber('id');
                Route::delete('/workout-templates/{id}', [WorkoutTemplateController::class, 'destroy'])->whereNumber('id');
                Route::post('/workout-templates', [WorkoutTemplateController::class, 'store']);

                Route::get('/workout-template-days', [WorkoutTemplateDayController::class, 'index']);
                Route::get('/workout-template-days/{id}', [WorkoutTemplateDayController::class, 'show'])->whereNumber('id');
                Route::post('/workout-template-days', [WorkoutTemplateDayController::class, 'store']);
                Route::match(['put', 'patch'], '/workout-template-days/{id}', [WorkoutTemplateDayController::class, 'update'])->whereNumber('id');
                Route::delete('/workout-template-days/{id}', [WorkoutTemplateDayController::class, 'destroy'])->whereNumber('id');

                Route::get('/workout-template-day-exercises', [WorkoutTemplateDayExerciseController::class, 'index']);
                Route::get('/workout-template-day-exercises/{id}', [WorkoutTemplateDayExerciseController::class, 'show'])->whereNumber('id');
                Route::post('/workout-template-day-exercises', [WorkoutTemplateDayExerciseController::class, 'store']);
                Route::match(['put', 'patch'], '/workout-template-day-exercises/{id}', [WorkoutTemplateDayExerciseController::class, 'update'])->whereNumber('id');
                Route::delete('/workout-template-day-exercises/{id}', [WorkoutTemplateDayExerciseController::class, 'destroy'])->whereNumber('id');

                Route::get('/admin/db/backups', [DatabaseBackupController::class, 'index']);
                Route::get('/admin/db/tables', [DatabaseBackupController::class, 'tables']);
                Route::post('/admin/db/backup', [DatabaseBackupController::class, 'store']);
                Route::post('/admin/db/restore', [DatabaseBackupController::class, 'restore']);
Route::get('/admin/db/backups/download', [DatabaseBackupController::class, 'download']);
                Route::get('/admin/announcements', [GymAnnouncementController::class, 'adminList']);
                Route::delete('/admin/announcements/{announcementId}', [GymAnnouncementController::class, 'adminDelete'])
                    ->whereNumber('announcementId');
                Route::post('/admin/gyms/{gymId}/announcements/block', [GymAnnouncementController::class, 'adminBlockGym'])
                    ->whereNumber('gymId');
                Route::post('/admin/gyms/{gymId}/announcements/unblock', [GymAnnouncementController::class, 'adminUnblockGym'])
                    ->whereNumber('gymId');
            });
        });
    });
});