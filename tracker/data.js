/* BERMO TRACKER — seed data */
window.BERMO_DATA = (function(){

const FOODS = [
  // breakfast / eggs / dairy
  ["Egg, large",            "1 egg",      72,  6,  0.4, 5],
  ["Egg whites",            "1 cup",      117, 26, 1.6, 0.4],
  ["Greek yogurt, plain",   "1 cup",      130, 23, 9,   0.7],
  ["Oatmeal, cooked",       "1 cup",      154, 6,  27,  3],
  ["Whole milk",            "1 cup",      149, 8,  12,  8],
  ["Almond milk, unsw.",    "1 cup",      30,  1,  1,   2.5],
  ["Cottage cheese, 2%",    "1 cup",      183, 24, 11,  5],
  ["Banana",                "1 medium",   105, 1.3,27,  0.4],
  ["Apple",                 "1 medium",   95,  0.5,25,  0.3],
  ["Blueberries",           "1 cup",      84,  1.1,21,  0.5],
  ["Strawberries",          "1 cup",      49,  1,  12,  0.5],
  ["Avocado",               "1 medium",   234, 2.9,12,  21],
  ["Peanut butter",         "2 tbsp",     188, 8,  6,   16],
  ["Almond butter",         "2 tbsp",     196, 7,  6,   18],
  // proteins
  ["Chicken breast",        "4 oz",       187, 35, 0,   4],
  ["Chicken thigh",         "4 oz",       235, 26, 0,   14],
  ["Ground beef 90/10",     "4 oz",       199, 23, 0,   11],
  ["Ground beef 85/15",     "4 oz",       240, 21, 0,   17],
  ["Salmon, atlantic",      "4 oz",       233, 25, 0,   14],
  ["Tuna, canned in water", "1 can (5oz)",100, 22, 0,   1],
  ["Shrimp",                "4 oz",       112, 23, 0,   1.6],
  ["Tofu, firm",            "4 oz",       95,  10, 2.5, 6],
  ["Tempeh",                "4 oz",       222, 21, 9,   13],
  ["Turkey breast",         "4 oz",       125, 26, 0,   2],
  ["Pork loin",             "4 oz",       170, 26, 0,   7],
  ["Steak, sirloin",        "4 oz",       207, 28, 0,   10],
  // carbs / starches
  ["Rice, white cooked",    "1 cup",      205, 4,  45,  0.4],
  ["Rice, brown cooked",    "1 cup",      218, 5,  46,  1.6],
  ["Quinoa, cooked",        "1 cup",      222, 8,  39,  3.6],
  ["Sweet potato",          "1 medium",   103, 2,  24,  0.2],
  ["Potato, baked",         "1 medium",   161, 4.3,37,  0.2],
  ["Pasta, cooked",         "1 cup",      220, 8,  43,  1.3],
  ["Bread, whole wheat",    "1 slice",    81,  4,  14,  1.1],
  ["Bagel, plain",          "1 medium",   245, 10, 48,  1.5],
  ["Tortilla, flour 8in",   "1 tortilla", 144, 4,  24,  4],
  ["Tortilla, corn 6in",    "1 tortilla", 50,  1.4,11,  0.5],
  ["Granola",               "1/2 cup",    251, 6,  37,  10],
  ["Cheerios",              "1 cup",      105, 3,  21,  1.7],
  // veg
  ["Broccoli, cooked",      "1 cup",      55,  3.7,11,  0.6],
  ["Spinach, raw",          "2 cups",     14,  1.7,2.2, 0.2],
  ["Kale, cooked",          "1 cup",      36,  2.5,7,   0.5],
  ["Carrots, raw",          "1 cup",      52,  1.2,12,  0.3],
  ["Bell pepper",           "1 medium",   31,  1,  7,   0.3],
  ["Zucchini",              "1 cup",      19,  1.5,3.5, 0.4],
  ["Cauliflower",           "1 cup",      27,  2,  5,   0.3],
  ["Asparagus",             "1 cup",      27,  3,  5,   0.2],
  ["Mushrooms, raw",        "1 cup",      15,  2.2,2.3, 0.2],
  // legumes
  ["Black beans",           "1/2 cup",    114, 7.6,20,  0.5],
  ["Chickpeas",             "1/2 cup",    134, 7,  22,  2],
  ["Lentils, cooked",       "1 cup",      230, 18, 40,  0.8],
  ["Edamame, shelled",      "1 cup",      188, 18, 14,  8],
  // snacks / sweets / drinks
  ["Almonds",               "1 oz",       164, 6,  6,   14],
  ["Walnuts",               "1 oz",       185, 4.3,3.9, 18.5],
  ["Cashews",               "1 oz",       157, 5,  9,   12],
  ["Dark chocolate 70%",    "1 oz",       170, 2,  13,  12],
  ["Protein bar",           "1 bar",      210, 20, 22,  8],
  ["Protein shake (whey)",  "1 scoop",    120, 24, 3,   1.5],
  ["Coffee, black",         "1 cup",      2,   0.3,0,   0],
  ["Latte, whole milk",     "12 oz",      180, 10, 16,  9],
  ["Beer, light",           "12 oz",      103, 0.7,5.8, 0],
  ["Wine, red",             "5 oz",       125, 0,  4,   0],
  ["Olive oil",             "1 tbsp",     119, 0,  0,   13.5],
  ["Butter",                "1 tbsp",     102, 0.1,0,   12],
  ["Honey",                 "1 tbsp",     64,  0.1,17,  0],
  // common combos
  ["Burrito bowl, chicken", "1 bowl",     650, 45, 65,  20],
  ["Caesar salad w/ chicken","1 entree",  470, 30, 18,  30],
  ["Cheeseburger, fast",    "1 burger",   535, 25, 41,  30],
  ["Pizza, cheese",         "1 slice",    285, 12, 36,  10],
  ["Sushi roll, salmon",    "8 pieces",   320, 18, 42,  9],
  ["Pad Thai, chicken",     "1 entree",   650, 30, 80,  22],
  ["Burrito, chicken",      "1 burrito",  720, 40, 75,  28],
  ["Acai bowl",             "1 bowl",     430, 8,  74,  14],
];

const QUICK_FOODS = [
  "Egg, large", "Greek yogurt, plain", "Oatmeal, cooked",
  "Chicken breast", "Salmon, atlantic", "Rice, white cooked",
  "Sweet potato", "Banana", "Avocado",
  "Protein shake (whey)", "Coffee, black", "Almonds"
];

// --- WOD library, SugarWOD-style format strings ---
const WODS = [
  { name:"Fran",        type:"For Time",       hero:true,  script:"21-15-9 reps for time:\n• Thrusters (95/65 lb)\n• Pull-ups" },
  { name:"Cindy",       type:"AMRAP 20",       hero:true,  script:"As many rounds as possible in 20 min:\n• 5 Pull-ups\n• 10 Push-ups\n• 15 Air Squats" },
  { name:"Helen",       type:"3 Rounds",       hero:true,  script:"3 rounds for time:\n• 400m Run\n• 21 KB Swings (53/35)\n• 12 Pull-ups" },
  { name:"Murph",       type:"For Time",       hero:true,  script:"For time (with 20 lb vest if you can):\n• 1-mile run\n• 100 Pull-ups\n• 200 Push-ups\n• 300 Air Squats\n• 1-mile run" },
  { name:"Annie",       type:"For Time",       hero:true,  script:"50-40-30-20-10 reps:\n• Double-Unders\n• Sit-ups" },
  { name:"DT",          type:"5 Rounds",       hero:true,  script:"5 rounds for time:\n• 12 Deadlifts (155/105)\n• 9 Hang Power Cleans\n• 6 Push Jerks" },
  { name:"Grace",       type:"For Time",       hero:true,  script:"30 Clean & Jerks for time (135/95)" },
  { name:"Karen",       type:"For Time",       hero:true,  script:"150 Wall-Ball shots for time (20/14 lb)" },
  { name:"Diane",       type:"For Time",       hero:true,  script:"21-15-9 reps:\n• Deadlifts (225/155)\n• Handstand Push-ups" },
  { name:"Open 22.1",   type:"AMRAP 15",       hero:false, script:"15 min AMRAP:\n• 3 Wall Walks\n• 12 DB Snatch (50/35)\n• 15 Box Jump-Overs (24/20)" },
  { name:"Engine Burn", type:"For Time",       hero:false, script:"For time:\n• 1000m Row\n• 50 Burpees\n• 1000m Row" },
  { name:"Strict Day",  type:"5 Rounds",       hero:false, script:"5 rounds NOT for time:\n• 5 Strict Pull-ups\n• 10 Strict Press (95/65)\n• 15 Strict Toes-to-Bar" },
  { name:"Squat Heavy", type:"Strength",       hero:false, script:"Back Squat — work to a heavy 3 in 15 min.\nThen: 3×8 @ 70% of today's heavy 3." },
  { name:"Bench Day",   type:"Strength",       hero:false, script:"Bench Press — 5×5 across.\nAccessory: 4×10 DB Row, 3×12 Curls." },
  { name:"EMOM 20",     type:"EMOM 20",        hero:false, script:"Every minute on the minute, 20 min, alternating:\n• 12/9 cal Row\n• 10 KB Swings (53/35)\n• 8 Burpees\n• 6 Pull-ups" },
  { name:"Conditioning",type:"AMRAP 12",       hero:false, script:"12 min AMRAP:\n• 200m Run\n• 10 Push-ups\n• 15 Air Squats\n• 20 Mountain Climbers" },
  { name:"Open Door",   type:"For Time",       hero:false, script:"For time, 21-15-9:\n• Calorie Bike\n• DB Thrusters (35/25)\n• Toes-to-Bar" },
  { name:"Tabata Mix",  type:"Tabata",         hero:false, script:"Tabata (8 rounds 20s on / 10s off) of each:\n• Air Squats\n• Push-ups\n• Sit-ups\n• Burpees" },
];

const MOVEMENTS = [
  "Back Squat","Front Squat","Overhead Squat","Deadlift","Sumo Deadlift",
  "Bench Press","Strict Press","Push Press","Push Jerk","Split Jerk",
  "Power Clean","Squat Clean","Power Snatch","Squat Snatch","Clean & Jerk",
  "Pull-up","Strict Pull-up","Chest-to-Bar","Muscle-up","Ring Dip",
  "Push-up","Handstand Push-up","Toes-to-Bar","Wall Ball","KB Swing",
  "Box Jump","Burpee","Row","Bike","Run","Double-Under","Thruster"
];

const PR_LIFTS = [
  "Back Squat","Front Squat","Deadlift","Bench Press","Strict Press",
  "Power Clean","Clean & Jerk","Snatch","Pull-up max","Mile run"
];

const DEFAULT_GOALS = {
  cal: 2200,
  protein: 165,
  carbs: 240,
  fat: 73,
  fiber: 30,
  water: 64,            // oz (imperial)
  weight: null
};

// Build food objects
const foodDB = FOODS.map(([name,serving,cal,p,c,f]) => ({
  id: "f-" + name.toLowerCase().replace(/[^a-z0-9]+/g,"-"),
  name, serving, cal, p, c, f, custom:false
}));

// --- PRE-BUILT PROGRAM TEMPLATES ---
// dayTemplates keys map to weekday index (0=Mon..6=Sun); value = workout type label matching WORKOUT_TYPES
const PROGRAMS = [
  {
    id: "fb3",
    name: "Full Body 3x",
    days: 3,
    focus: "Beginner-friendly. Compound lifts every session, three non-consecutive days.",
    sample: "Mon Full Body · Wed Full Body · Fri Full Body",
    dayTemplates: { 0:"Full Body", 2:"Full Body", 4:"Full Body" }
  },
  {
    id: "ul4",
    name: "Upper / Lower 4x",
    days: 4,
    focus: "Two upper, two lower. Solid intermediate split with built-in recovery.",
    sample: "Mon Upper · Tue Lower · Thu Upper · Fri Lower",
    dayTemplates: { 0:"Upper Body", 1:"Legs", 3:"Upper Body", 4:"Legs" }
  },
  {
    id: "ppl",
    name: "Push / Pull / Legs (6x)",
    days: 6,
    focus: "Hits each muscle group 2x/week. High-volume hypertrophy.",
    sample: "Mon Push · Tue Pull · Wed Legs · Thu Push · Fri Pull · Sat Legs",
    dayTemplates: { 0:"Push", 1:"Pull", 2:"Legs", 3:"Push", 4:"Pull", 5:"Legs" }
  },
  {
    id: "sl5x5",
    name: "StrongLifts 5x5",
    days: 3,
    focus: "Five compound lifts, 5 sets of 5, three days a week. Linear progression.",
    sample: "Mon A (Squat/Bench/Row) · Wed B (Squat/Press/Deadlift) · Fri A",
    dayTemplates: { 0:"Strength", 2:"Strength", 4:"Strength" }
  },
  {
    id: "pl3",
    name: "Powerlifting 3-day",
    days: 3,
    focus: "Squat / Bench / Deadlift focus with accessory volume. Powerlifting-style.",
    sample: "Mon Squat · Wed Bench · Fri Deadlift",
    dayTemplates: { 0:"Strength", 2:"Strength", 4:"Strength" }
  },
];

return {
  foodDB,
  quickFoods: QUICK_FOODS,
  wods: WODS,
  movements: MOVEMENTS,
  prLifts: PR_LIFTS,
  defaultGoals: DEFAULT_GOALS,
  programs: PROGRAMS
};

})();
