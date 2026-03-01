<?php

namespace App\Http\Controllers;

use App\Models\UserWorkoutPlan;
use App\Models\UserWorkoutPlanDay;
use App\Models\Gym;
use App\Services\UserWorkoutPlanGeneratorService;
use Illuminate\Http\Request;

class UserWorkoutPlanDayController extends Controller
{
    public function index(Request $request)
    {
        $userId = (int) $request->user()->user_id;
        $planId = $request->query('user_plan_id');

        $query = UserWorkoutPlanDay::query()
            ->with(['templateDay'])
            ->whereHas('plan', function ($q) use ($userId) {
                $q->where('user_id', $userId);
            });

        if ($planId !== null && $planId !== '') {
            $query->where('user_plan_id', (int) $planId);
        }

        return $query
            ->orderByRaw('COALESCE(weekday, day_number) asc')
            ->paginate(100);
    }

    public function show(Request $request, $id)
    {
        $userId = (int) $request->user()->user_id;

        $day = UserWorkoutPlanDay::query()
            ->with([
                'plan',
                'templateDay',
                'exercises' => function ($q) {
                    $q->orderBy('order_index', 'asc')
                        ->with([
                            'exercise.equipments',
                            'originalExercise',
                        ]);
                },
            ])
            ->whereHas('plan', function ($q) use ($userId) {
                $q->where('user_id', $userId);
            })
            ->where('user_plan_day_id', (int) $id)
            ->firstOrFail();

        return response()->json([
            'data' => $day,
        ]);
    }

    public function recalibrateGym(Request $request, int $id, UserWorkoutPlanGeneratorService $svc)
    {
        $userId = (int) $request->user()->user_id;

        $data = $request->validate([
            'gym_id' => ['required', 'integer', 'min:1', 'exists:gyms,gym_id'],
        ]);

        $gymId = (int) $data['gym_id'];

        $day = $svc->recalibrateSingleDayForGym(
            userId: $userId,
            userPlanDayId: (int) $id,
            gymId: $gymId
        );

        $gym = Gym::query()
            ->select(['gym_id', 'name', 'latitude', 'longitude'])
            ->where('gym_id', $gymId)
            ->first();

        return response()->json([
            'message' => 'Day recalibrated for selected gym.',
            'data' => $day,
            'gym' => $gym,
        ]);
    }

    public function store(Request $request)
    {
        $userId = (int) $request->user()->user_id;

        $data = $request->validate([
            'user_plan_id' => 'required|integer|exists:user_workout_plans,user_plan_id',
            'template_day_id' => 'nullable|integer|exists:workout_template_days,template_day_id',
            'day_number' => 'required|integer|min:1|max:7',
            'weekday' => 'nullable|integer|min:1|max:7',
            'weekday_name' => 'nullable|string|max:10',
            'focus' => 'nullable|string|max:30',
            'is_rest' => 'nullable|boolean',
        ]);

        UserWorkoutPlan::where('user_id', $userId)
            ->where('user_plan_id', (int) $data['user_plan_id'])
            ->firstOrFail();

        $isRest = (bool)($data['is_rest'] ?? false);

        if ($isRest && !empty($data['template_day_id'])) {
            return response()->json(['message' => 'Rest days must not have template_day_id.'], 422);
        }

        if (!$isRest && empty($data['template_day_id'])) {
            return response()->json([
                'message' => 'Workout days require template_day_id. If it is a rest day, set is_rest=true.',
            ], 422);
        }

        $existsDayNumber = UserWorkoutPlanDay::where('user_plan_id', (int) $data['user_plan_id'])
            ->where('day_number', (int) $data['day_number'])
            ->exists();

        if ($existsDayNumber) {
            return response()->json(['message' => 'This day_number already exists for this user plan.'], 422);
        }

        if (!empty($data['weekday'])) {
            $existsWeekday = UserWorkoutPlanDay::where('user_plan_id', (int) $data['user_plan_id'])
                ->where('weekday', (int) $data['weekday'])
                ->exists();

            if ($existsWeekday) {
                return response()->json(['message' => 'This weekday already exists for this user plan.'], 422);
            }
        }

        if ($isRest && empty($data['focus'])) {
            $data['focus'] = 'rest';
        }

        $day = UserWorkoutPlanDay::create($data);

        return response()->json([
            'message' => 'User workout plan day created.',
            'data' => $day,
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $userId = (int) $request->user()->user_id;

        $day = UserWorkoutPlanDay::whereHas('plan', function ($q) use ($userId) {
                $q->where('user_id', $userId);
            })
            ->where('user_plan_day_id', (int) $id)
            ->firstOrFail();

        $data = $request->validate([
            'day_number' => 'sometimes|required|integer|min:1|max:7',
            'template_day_id' => 'nullable|integer|exists:workout_template_days,template_day_id',
            'weekday' => 'nullable|integer|min:1|max:7',
            'weekday_name' => 'nullable|string|max:10',
            'focus' => 'nullable|string|max:30',
            'is_rest' => 'nullable|boolean',
            'completed_at' => 'nullable|date',
            'mark_completed' => 'nullable|boolean',
        ]);

        if (array_key_exists('mark_completed', $data)) {
            $data['completed_at'] = $data['mark_completed']
                ? now()
                : null;
        }

        $merged = array_merge($day->toArray(), $data);
        $isRest = (bool)($merged['is_rest'] ?? false);

        if ($isRest && !empty($merged['template_day_id'])) {
            return response()->json(['message' => 'Rest days must not have template_day_id.'], 422);
        }

        if (!$isRest && empty($merged['template_day_id'])) {
            return response()->json([
                'message' => 'Workout days require template_day_id. If it is a rest day, set is_rest=true.',
            ], 422);
        }

        if (isset($data['day_number'])) {
            $exists = UserWorkoutPlanDay::where('user_plan_id', $day->user_plan_id)
                ->where('day_number', (int) $data['day_number'])
                ->where('user_plan_day_id', '!=', $day->user_plan_day_id)
                ->exists();

            if ($exists) {
                return response()->json(['message' => 'This day_number already exists for this user plan.'], 422);
            }
        }

        if (array_key_exists('weekday', $data) && !empty($data['weekday'])) {
            $exists = UserWorkoutPlanDay::where('user_plan_id', $day->user_plan_id)
                ->where('weekday', (int) $data['weekday'])
                ->where('user_plan_day_id', '!=', $day->user_plan_day_id)
                ->exists();

            if ($exists) {
                return response()->json(['message' => 'This weekday already exists for this user plan.'], 422);
            }
        }

        if ($isRest && empty($merged['focus'])) {
            $data['focus'] = 'rest';
        }

        $day->update($data);

        return response()->json([
            'message' => 'User workout plan day updated.',
            'data' => $day->fresh(),
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $userId = (int) $request->user()->user_id;

        $day = UserWorkoutPlanDay::whereHas('plan', function ($q) use ($userId) {
                $q->where('user_id', $userId);
            })
            ->where('user_plan_day_id', (int) $id)
            ->firstOrFail();

        $day->delete();

        return response()->json([
            'message' => 'User workout plan day deleted.',
        ]);
    }
}