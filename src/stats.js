// ── STAT DEFINITIONS ─────────────────────────────────────────────────────────
export const STATS = [
  { id: "strength",      label: "Strength",      icon: "💪", color: "#FF6B6B", desc: "Physical power and muscle" },
  { id: "speed",         label: "Speed",         icon: "⚡", color: "#FFD93D", desc: "Quickness and agility" },
  { id: "endurance",     label: "Endurance",     icon: "🏃", color: "#FF9F43", desc: "Stamina and persistence" },
  { id: "health",        label: "Health",        icon: "❤️", color: "#FF6B9D", desc: "Overall wellbeing" },
  { id: "athletics",     label: "Athletics",     icon: "🏅", color: "#FFA07A", desc: "Sports and physical skill" },
  { id: "intelligence",  label: "Intelligence",  icon: "🧠", color: "#A29BFE", desc: "Reasoning and learning" },
  { id: "math",          label: "Math",          icon: "∑",  color: "#74B9FF", desc: "Numerical mastery" },
  { id: "science",       label: "Science",       icon: "🔬", color: "#55EFC4", desc: "Scientific understanding" },
  { id: "history",       label: "History",       icon: "📜", color: "#FDCB6E", desc: "Knowledge of the past" },
  { id: "language",      label: "Language",      icon: "🗣️", color: "#81ECEC", desc: "Linguistics and fluency" },
  { id: "writing",       label: "Writing",       icon: "✍️", color: "#DFE6E9", desc: "Expression through words" },
  { id: "creativity",    label: "Creativity",    icon: "🎨", color: "#FD79A8", desc: "Artistic imagination" },
  { id: "music",         label: "Music",         icon: "🎵", color: "#E17055", desc: "Musical ability" },
  { id: "wisdom",        label: "Wisdom",        icon: "🦉", color: "#BADC58", desc: "Judgment and insight" },
  { id: "charisma",      label: "Charisma",      icon: "✨", color: "#F9CA24", desc: "Social magnetism" },
  { id: "relationships", label: "Relationships", icon: "🤝", color: "#6C5CE7", desc: "Bonds with others" },
  { id: "leadership",    label: "Leadership",    icon: "👑", color: "#FDCB6E", desc: "Guiding and inspiring" },
  { id: "focus",         label: "Focus",         icon: "🎯", color: "#00CEC9", desc: "Concentration and flow" },
  { id: "discipline",    label: "Discipline",    icon: "🔒", color: "#636E72", desc: "Self-control and habits" },
  { id: "finance",       label: "Finance",       icon: "💰", color: "#55EFC4", desc: "Money and investing" },
  { id: "cooking",       label: "Cooking",       icon: "🍳", color: "#FF7675", desc: "Culinary skill" },
  { id: "mindfulness",   label: "Mindfulness",   icon: "🧘", color: "#A29BFE", desc: "Presence and calm" },
  { id: "technology",    label: "Technology",    icon: "💻", color: "#74B9FF", desc: "Tech and programming" },
  { id: "nature",        label: "Nature",        icon: "🌿", color: "#00B894", desc: "Connection to nature" },
];

export const STAT_IDS = STATS.map(s => s.id);

// XP needed to go from level N to N+1 (exponential scale)
export function xpForLevel(level) {
  return Math.floor(100 * Math.pow(1.15, level));
}

export function getTotalXpForLevel(level) {
  let total = 0;
  for (let i = 0; i < level; i++) total += xpForLevel(i);
  return total;
}

export function getLevelFromXp(totalXp) {
  let level = 0;
  let spent = 0;
  while (spent + xpForLevel(level) <= totalXp) {
    spent += xpForLevel(level);
    level++;
  }
  return { level, currentXp: totalXp - spent, neededXp: xpForLevel(level) };
}

export function initStats(baseValues = {}) {
  const s = {};
  STATS.forEach(stat => {
    const base = baseValues[stat.id] || 0;
    s[stat.id] = getTotalXpForLevel(base);
  });
  return s;
}

// ── QUESTIONNAIRE ────────────────────────────────────────────────────────────
export const QUESTIONS = [
  { stat: "strength",     q: "How would you rate your physical strength?",       min: "I rarely lift anything", max: "I'm very strong / train regularly" },
  { stat: "speed",        q: "How fast / agile are you physically?",             min: "Slow mover",             max: "Very quick and nimble" },
  { stat: "endurance",    q: "How is your endurance / stamina?",                 min: "Get winded quickly",     max: "Can go for hours" },
  { stat: "health",       q: "How healthy do you feel overall?",                 min: "Often unwell",           max: "Excellent health" },
  { stat: "athletics",    q: "How athletic are you?",                            min: "Not sporty at all",      max: "Competitive athlete" },
  { stat: "intelligence", q: "How would you rate your raw intelligence?",        min: "Struggle with complex ideas", max: "Pick things up very fast" },
  { stat: "math",         q: "How comfortable are you with math?",               min: "Avoid numbers",          max: "Love advanced math" },
  { stat: "science",      q: "How deep is your scientific knowledge?",           min: "Very little",            max: "Deep expertise" },
  { stat: "history",      q: "How well do you know history?",                    min: "Know very little",       max: "Deep historical knowledge" },
  { stat: "language",     q: "How many languages do you speak / how fluently?",  min: "Only my native tongue",  max: "Fluent in several languages" },
  { stat: "writing",      q: "How strong is your writing?",                      min: "Rarely write",           max: "Excellent writer" },
  { stat: "creativity",   q: "How creative are you?",                            min: "Very logical / literal", max: "Wildly creative" },
  { stat: "music",        q: "How musical are you?",                             min: "Can't hold a tune",      max: "Play instruments / compose" },
  { stat: "wisdom",       q: "How wise and reflective are you?",                 min: "Act impulsively",        max: "Very thoughtful and measured" },
  { stat: "charisma",     q: "How charismatic / socially magnetic are you?",     min: "Shy / reserved",         max: "Light up every room" },
  { stat: "relationships",q: "How strong are your relationships?",               min: "Few close connections",  max: "Deep, rich relationships" },
  { stat: "leadership",   q: "How often do you lead others?",                    min: "Prefer to follow",       max: "Natural leader" },
  { stat: "focus",        q: "How focused and concentrated can you be?",         min: "Very easily distracted", max: "Deep focus for hours" },
  { stat: "discipline",   q: "How disciplined are you with habits / goals?",     min: "Struggle to stick to things", max: "Highly disciplined" },
  { stat: "finance",      q: "How well do you manage money / investing?",        min: "Live paycheck to paycheck", max: "Expert money manager" },
  { stat: "cooking",      q: "How well can you cook?",                           min: "Microwave only",         max: "Gourmet chef level" },
  { stat: "mindfulness",  q: "How mindful / present are you?",                   min: "Always in my head",      max: "Very calm and present" },
  { stat: "technology",   q: "How comfortable are you with tech / coding?",      min: "Tech-averse",            max: "Expert programmer" },
  { stat: "nature",       q: "How connected are you to nature / outdoors?",      min: "Indoor person",          max: "Deep outdoors person" },
];
