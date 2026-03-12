<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\RateLimiter;
use App\Models\ChatHistory;
use App\Models\Gym;

class ChatController extends Controller
{
    public function sendMessage(Request $request)
    {
        $key = 'chat:' . ($request->user() ? $request->user()->id : $request->ip());
        
        if (RateLimiter::tooManyAttempts($key, 30)) {
            return response()->json([
                'success' => false,
                'error' => 'Slow down! Please wait a moment before sending more messages.'
            ], 429);
        }
        
        RateLimiter::hit($key, 60);

        $request->validate([
            'message' => 'required|string|max:2000',
        ]);

        $userMessage = $request->input('message');
        $user = $request->user();

        $systemPrompt = $this->buildSystemPrompt($user);
        $conversationHistory = $this->getConversationHistory($user, $request->ip());

        $messages = [['role' => 'system', 'content' => $systemPrompt]];

        foreach ($conversationHistory as $msg) {
            $messages[] = ['role' => $msg->role, 'content' => $msg->content];
        }

        $messages[] = ['role' => 'user', 'content' => $userMessage];

        try {
            // Try models in order until one works
            $models = [
                env('OPENROUTER_MODEL', 'openrouter/auto'),
                'openrouter/auto',
            ];

            $response = null;

            foreach ($models as $model) {
                $response = Http::timeout(30)
                    ->withHeaders([
                        'Authorization' => 'Bearer ' . env('OPENROUTER_API_KEY'),
                        'HTTP-Referer' => config('app.url'),
                        'X-Title' => 'ExerSearch'
                    ])
                    ->post('https://openrouter.ai/api/v1/chat/completions', [
                        'model' => $model,
                        'messages' => $messages,
                        'temperature' => 0.7,
                        'max_tokens' => 800,
                        'provider' => [
                            'require_parameters' => true,
                        ]
                    ]);

                if ($response->successful()) break;
            }

            if ($response->successful()) {
                $data = $response->json();
                
                \Log::info('OpenRouter response', ['data' => $data]);
                
                $aiMessage = $data['choices'][0]['message']['content'] ?? null;

                // Reasoning models put response in reasoning_details instead of content
                if (!$aiMessage) {
                    $reasoningDetails = $data['choices'][0]['message']['reasoning_details'] ?? [];
                    foreach ($reasoningDetails as $detail) {
                        if ($detail['type'] === 'reasoning.summary' && !empty($detail['summary'])) {
                            $aiMessage = $detail['summary'];
                            break;
                        }
                    }
                }

                $this->saveToHistory($user, $request->ip(), $userMessage, $aiMessage);

                return response()->json([
                    'success' => true,
                    'message' => $aiMessage,
                    'model' => env('OPENROUTER_MODEL')
                ]);

            } else {
                \Log::error('OpenRouter API Error', [
                    'status' => $response->status(),
                    'body' => $response->body()
                ]);

                $statusCode = $response->status();
                $errorMsg = match(true) {
                    $statusCode === 429 => "I'm a bit overwhelmed right now, please try again in a few seconds! 🙏",
                    $statusCode === 401 => "Authentication error. Please contact support.",
                    default => "Sorry, I'm having trouble thinking right now. Please try again in a moment."
                };

                return response()->json([
                    'success' => false,
                    'error' => $errorMsg
                ], $statusCode === 429 ? 429 : 500);
            }

        } catch (\Exception $e) {
            \Log::error('ChatController Exception: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'error' => 'Oops! Something went wrong. Please try again.'
            ], 500);
        }
    }

    /**
     * Build comprehensive system prompt with ExerSearch knowledge
     */
    private function buildSystemPrompt($user)
    {
        $gymCount = Gym::count();
        
        $prompt = "You are ExerBot, an AI fitness assistant for ExerSearch - the #1 platform helping Filipinos find gyms, plan workouts, and track nutrition.\n\n";

        // Personalization if user is logged in
        if ($user) {
            $prompt .= "CURRENT USER:\n";
            $prompt .= "- Name: {$user->name}\n";
            $prompt .= "- Status: Registered Member\n";
            
            if (isset($user->fitness_goal)) {
                $prompt .= "- Fitness Goal: {$user->fitness_goal}\n";
            }
            if (isset($user->experience_level)) {
                $prompt .= "- Experience Level: {$user->experience_level}\n";
            }
            
            $prompt .= "\nAddress the user as '{$user->name}' and personalize responses based on their goals.\n\n";
        } else {
            $prompt .= "CURRENT USER: Guest (not logged in)\n";
            $prompt .= "Encourage them to create a free account to unlock personalized features.\n\n";
        }

        $prompt .= "EXERSEARCH PLATFORM:\n";
        $prompt .= "- Total Gyms: {$gymCount}+ verified partner gyms\n";
        $prompt .= "- Cost: 100% FREE FOREVER - no hidden fees, no premium tiers\n";
        $prompt .= "- Features: Gym finder, Personalized workout plans, meal planner, macro tracker, progress tracking\n\n";

        $prompt .= "AVAILABLE FEATURES:\n";
        $prompt .= "1. GYM FINDER: Browse {$gymCount}+ verified gyms with real photos, honest reviews, transparent pricing\n";
        $prompt .= "2. WORKOUT PLANNER: Personalized workout plans based on goals and experience\n";
        $prompt .= "3. MEAL PLANNER: Custom meal plans with macro tracking and Filipino recipes\n";
        $prompt .= "4. NUTRITION TRACKER: Track calories, protein, carbs, fats with searchable food database\n";
        $prompt .= "5. PROGRESS TRACKING: Log workouts, track weight, monitor improvements\n\n";

        $prompt .= "YOUR PERSONALITY:\n";
        $prompt .= "- Friendly, motivating, and encouraging\n";
        $prompt .= "- Use Filipino context (pesos ₱, local areas, Filipino fitness culture)\n";
        $prompt .= "- Be honest and realistic - no false promises\n";
        $prompt .= "- Format your responses properly so it's easily readable\n";
        $prompt .= "- If the response is consisting of a list, present it in a listed way\n";
        $prompt .= "- Keep responses concise (2-4 sentences) unless details are requested\n";
        $prompt .= "- Use emojis sparingly for motivation (💪, 🔥, ⚡)\n\n";

        $prompt .= "WHEN USERS ASK ABOUT:\n";
        $prompt .= "- Gyms: Mention our {$gymCount}+ verified gyms and suggest browsing the Gym Finder\n";
        $prompt .= "- Workouts: Offer to help create a plan or direct them to our Workout Planner\n";
        $prompt .= "- Nutrition: Reference our Meal Planner and macro tracking features\n";
        $prompt .= "- Pricing: Emphasize that EVERYTHING is 100% free, no credit card needed\n\n";

        $prompt .= "PRICING INFO:\n";
        $prompt .= "- Gym browsing: FREE\n";
        $prompt .= "- Workout plans: FREE\n";
        $prompt .= "- Meal planning: FREE\n";
        $prompt .= "- Progress tracking: FREE\n";
        $prompt .= "- Everything: FREE FOREVER\n\n";

        $prompt .= "COMMON QUESTIONS:\n";
        $prompt .= "Q: How much does it cost?\n";
        $prompt .= "A: ExerSearch is 100% free! No subscription, no hidden fees, no premium tier. Gyms pay us so you don't have to.\n\n";

        $prompt .= "Q: How do you make money?\n";
        $prompt .= "A: Gyms pay us a small fee to be listed. You use ExerSearch completely free.\n\n";

        $prompt .= "Q: Do I need to sign up?\n";
        $prompt .= "A: You can browse gyms as a guest, but creating a free account unlocks workout plans, meal planning, and progress tracking.\n\n";

        $prompt .= "RESPONSE GUIDELINES:\n";
        $prompt .= "- Always be helpful and motivating\n";
        $prompt .= "- If you don't know something specific about a gym, suggest they search on our platform\n";
        $prompt .= "- For workout advice, provide solid fundamentals (progressive overload, consistency, form)\n";
        $prompt .= "- For nutrition, focus on sustainable eating (calorie deficit/surplus, protein intake, whole foods)\n";
        $prompt .= "- Encourage users to use our platform features rather than just chatting\n";
        $prompt .= "- Never claim medical expertise - suggest consulting professionals for injuries/medical issues\n";

        return $prompt;
    }

    /**
     * Get conversation history from database
     */
    private function getConversationHistory($user, $ip)
    {
        $query = ChatHistory::query();

        if ($user) {
            $query->where('user_id', $user->id);
        } else {
            $query->where('ip_address', $ip)->whereNull('user_id');
        }

        return $query->where('created_at', '>', now()->subDays(7))
                     ->orderBy('created_at', 'desc')
                     ->take(10)
                     ->get()
                     ->reverse()
                     ->values();
    }

    /**
     * Save conversation to database
     */
    private function saveToHistory($user, $ip, $userMessage, $aiMessage)
    {
        // Save user message
        ChatHistory::create([
            'user_id' => $user ? $user->id : null,
            'ip_address' => $ip,
            'role' => 'user',
            'content' => $userMessage
        ]);

        // Save AI response
        ChatHistory::create([
            'user_id' => $user ? $user->id : null,
            'ip_address' => $ip,
            'role' => 'assistant',
            'content' => $aiMessage
        ]);
    }

    /**
     * Clear chat history
     */
    public function clearHistory(Request $request)
    {
        $user = $request->user();
        
        if ($user) {
            // Clear for logged-in user
            ChatHistory::where('user_id', $user->id)->delete();
            
            \Log::info('Chat history cleared for user', ['user_id' => $user->id]);
        } else {
            // Clear for guest by IP
            ChatHistory::where('ip_address', $request->ip())
                    ->whereNull('user_id')
                    ->delete();
            
            \Log::info('Chat history cleared for guest', ['ip' => $request->ip()]);
        }
        
        return response()->json([
            'success' => true,
            'message' => 'Chat history cleared successfully'
        ]);
    }

    /**
     * Get user's chat history (auth required)
     */
    public function getUserHistory(Request $request)
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'error' => 'Please login to view chat history'
            ], 401);
        }

        $history = ChatHistory::where('user_id', $user->id)
                              ->orderBy('created_at', 'desc')
                              ->take(50)
                              ->get();

        return response()->json([
            'success' => true,
            'history' => $history
        ]);
    }


    public function cleanupOldChats()
    {
        $deleted = ChatHistory::where('created_at', '<', now()->subDays(30))->delete();
        
        \Log::info('Old chats cleaned up', ['deleted' => $deleted]);
        
        return response()->json([
            'success' => true,
            'message' => 'Old chats cleaned up',
            'deleted' => $deleted
        ]);
    }

    // ✅ Admin: list chat history across users/guests
public function adminIndex(Request $request)
{
    $limit = (int) $request->query('limit', 2000);
    if ($limit < 1) $limit = 1;
    if ($limit > 5000) $limit = 5000;

    $q = trim((string) $request->query('q', ''));
    $role = trim((string) $request->query('role', '')); // user | assistant | (empty=all)
    $days = (int) $request->query('days', 7);
    if (!in_array($days, [1, 7, 30, 90, 365], true)) $days = 7;

    $userId = $request->query('user_id'); // optional filter
    $from = now()->subDays($days);

    $query = \DB::table('chat_histories as ch')
        ->leftJoin('users as u', 'u.user_id', '=', 'ch.user_id')
        ->where('ch.created_at', '>=', $from)
        ->select([
            'ch.user_id',
            'ch.ip_address',
            'ch.role',
            'ch.content',
            'ch.created_at',
            'u.name as user_name',
            'u.email as user_email',

            // row key (since table may not have id)
            \DB::raw("CONCAT(COALESCE(ch.user_id::text,''),'|',COALESCE(ch.ip_address,''),'|',ch.role,'|',ch.created_at::text) as row_key"),
        ])
        ->orderByDesc('ch.created_at')
        ->limit($limit);

    if ($role !== '' && $role !== 'All') {
        $query->where('ch.role', $role);
    }

    if ($userId !== null && $userId !== '') {
        $query->where('ch.user_id', (int) $userId);
    }

    if ($q !== '') {
        $like = '%' . str_replace('%', '\\%', $q) . '%';
        $query->where(function ($w) use ($like) {
            $w->where('ch.content', 'ilike', $like)
              ->orWhere('ch.ip_address', 'ilike', $like)
              ->orWhere('ch.role', 'ilike', $like)
              ->orWhere('u.name', 'ilike', $like)
              ->orWhere('u.email', 'ilike', $like);
        });
    }

    return response()->json($query->get(), 200);
}

// ✅ Admin: clear chat history (all, by user_id, or by ip)
public function adminClear(Request $request)
{
    $request->validate([
        'user_id' => ['nullable', 'integer'],
        'ip_address' => ['nullable', 'string', 'max:64'],
        'days' => ['nullable', 'integer'],
    ]);

    $userId = $request->input('user_id');
    $ip = $request->input('ip_address');
    $days = $request->input('days');

    $query = ChatHistory::query();

    if ($userId) $query->where('user_id', (int) $userId);
    if ($ip) $query->where('ip_address', (string) $ip);

    if ($days) {
        $query->where('created_at', '>=', now()->subDays((int) $days));
    }

    $deleted = $query->delete();

    return response()->json([
        'success' => true,
        'deleted' => $deleted,
        'message' => 'Chat history cleared.',
    ]);
}
}