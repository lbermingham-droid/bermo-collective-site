// Lexi's review, Oct 20 – Nov 20 2026, exactly as she supplied it.
// Only entries with a date AND numbers are logged as lifts. Where the
// source gave a range, the conservative lower bound is used (her rule).
// kg dumbbells/kettlebells are converted to lb per hand, rounded.
// Sessions with no recorded numbers are logged by name (and minutes when
// given) so the day still counts, without inventing weights.
const L = (name, weight, reps, sets) => ({ name, type: "strength", weight, reps, sets: sets || 1 });
const W = (name, min) => ({ name, type: "wod", weight: 0, reps: 0, sets: 1, durationMin: min || null });
const C = (name, min) => ({ name, type: "cardio", durationMin: min || null });
module.exports = {
  goals: { cal: 1450, protein: 130, carbs: 120, fat: 50 },
  days: {
    "2026-10-20": [L("Back Squat", 115, 6, 3), L("Dumbbell RDL", 62, 10), L("Dumbbell RDL", 71, 8, 2)],
    "2026-10-21": [W("SKB Combine: kettlebell + core", 47)],
    "2026-11-02": [W("SKB Strength")],
    "2026-11-03": [W("Back, triceps and abs", 40), C("Incline treadmill", 20)],
    "2026-11-04": [C("Run", 45)],
    "2026-11-05": [L("Back Squat", 135, 6), L("Hip Abduction", 115, 10), L("Hip Abduction", 130, 10), L("Hip Abduction", 160, 10), L("Hip Abduction", 175, 10)],
    "2026-11-06": [W("SKB upper-body circuit", 32)],
    "2026-11-08": [C("Treadmill walk")],
    "2026-11-09": [L("Deadlift", 165, 2)],
    "2026-11-10": [W("Back and abs"), C("Incline treadmill", 20)],
    "2026-11-11": [W("SKB kettlebell endurance", 43)],
    "2026-11-12": [L("Back Squat", 95, 7), L("Back Squat", 115, 7), L("Back Squat", 125, 6), L("Back Squat", 135, 3), C("Walk", 60)],
    "2026-11-14": [W("SKB Combo: conditioning + strength")],
    "2026-11-16": [L("Deadlift", 125, 8), L("Deadlift", 155, 4), L("Deadlift", 175, 3), L("Elevated Reverse Lunge", 53, 7), L("Z-Press", 20, 8), L("Cable Pull-Through", 60, 10, 2), L("Cable Biceps Curl", 30, 10), L("Cable Biceps Curl", 40, 10), L("Cable Biceps Curl", 50, 10)],
    "2026-11-17": [W("SKB full-body lifting", 30)],
    "2026-11-18": [W("SKB HIIT", 39)],
    "2026-11-19": [L("Back Squat", 130, 6), L("Back Squat", 135, 4), L("Straight-Arm Lat Pulldown", 40, 10), L("Straight-Arm Lat Pulldown", 50, 10), C("Walk", 60)],
    "2026-11-20": [C("Treadmill")],
  },
};
