/*
  SamAi -- client-side port of app.py's flow.

  This runs entirely in the browser (localStorage instead of user_memory.txt,
  a small built-in word-scoring list instead of TextBlob) so it works today
  with zero backend and zero cost. When the real backend question gets
  sorted out, swap `analyzeSentiment()` and the name-save step for fetch()
  calls to your actual API -- everything else (the chat UI, the flow) can
  stay exactly as it is.
*/

const chat = document.getElementById("samai-chat");
const form = document.getElementById("samai-input-form");
const input = document.getElementById("samai-input");
const sendBtn = document.getElementById("samai-send-btn");
const loadingScreen = document.getElementById("samai-loading-screen");

const STORAGE_KEY = "samai_user_name";

let userName = localStorage.getItem(STORAGE_KEY) || null;
let lastReviewText = "";

// "conversation stage" state machine
// stages: askName -> review -> retryChoice -> review (loop) | done
let stage = userName ? "review" : "askName";

/* ---------------- NAME EXTRACTION (ported from app.py) ---------------- */

const JUNK_WORDS = new Set([
  "i","me","my","myself","you","your","yours","yourself","yourselves","he",
  "him","his","himself","she","her","hers","herself","it","its","itself","we",
  "us","our","ours","ourselves","they","them","their","theirs","themselves","who",
  "whom","whose","which","what","this","that","these","those","each","every",
  "either","neither","both","all","any","some","someone","somebody","something","anyone",
  "anybody","anything","everyone","everybody","everything","noone","nobody","nothing","none","one",
  "in","on","at","to","for","with","by","about","against","between",
  "into","through","during","before","after","above","below","from","up","down",
  "of","off","over","under","again","further","then","once","here","there",
  "when","where","why","how","across","along","behind","beside","beyond","inside",
  "outside","towards","upon","within","without",
  "is","am","are","was","were","be","been","being","have","has",
  "had","having","do","does","did","doing","can","could","will","would",
  "shall","should","may","might","must","go","went","gone","going","goes",
  "called","im","say","said","saying","says","make","made","making","makes",
  "get","got","getting","gets","know","knew","known","knowing","knows","take",
  "took","taken","taking","takes","see","saw","seen","seeing","sees","come",
  "came","coming","comes","think","thought","thinking","thinks","look","looked","looking",
  "looks","want","wanted","wanting","wants","give","gave","given","giving","gives",
  "use","used","using","uses","find","found","finding","finds",
  "the","a","an","good","bad","great","small","large","big","little",
  "long","short","new","old","young","high","low","right","wrong","true",
  "false","early","late","important","public","private","social","national","human","local",
  "different","same","able","unable","full","empty","free","busy","easy","hard",
  "and","but","or","because","as","until","while","if","so","than",
  "nor","yet","although","though","unless","since","whereas","not",
  "u","ur","urs","r","c","b","y","k","w/o","w/","b/c","bc","omg",
  "lol","idk","irl","btw","imho","tbh","fyi","brb","smh","afaik","jk",
  "txt","msg","pls","plz","thx","ty","np","rn","fr","ngl","imo","idc",
  "hbu","wbu","idgaf","tf","wtf","lmao","rofl","stfu","gtg","g2g","ttyl",
  "asap","diy","aka","eta","tba","tbd","nvm","dm","pm","ama","til",
  "tldr","tl;dr","gg","gl","hf","wp","foml","fomo","yolo","baif","ikr",
  "da","dem","dat","dere","wit","bout","gonna","wanna","gotta","imma",
  "i'm","youre","you're","hes","he's","shes","she's","it's",
  "we're","theyre","they're","ive","i've","youve","you've","weve","we've",
  "theyve","they've","id","i'd","youd","you'd","hed","he'd","shed","she'd",
  "wed","we'd","theyd","they'd","ill","i'll","youll","you'll","hell","he'll",
  "shell","she'll","well","we'll","theyll","they'll","cant","can't","dont","don't",
  "doesnt","doesn't","didnt","didn't","isnt","isn't","arent","aren't","wasnt","wasn't",
  "werent","weren't","havent","haven't","hasnt","hasn't","hadnt","wont","won't",
  "wouldnt","wouldn't","shant","shan't","shouldnt","shouldn't","mightnt","mightn't","mustnt","mustn't",
  "couldnt","couldn't","aint","ain't","whos","who's","whats","what's","wheres","where's",
  "whens","when's","whys","why's","hows","how's","thats","that's","theres","there's",
  "guys","call","calls","ohk","oohk","ooohk","name","fuck",
  "hey","wassup","yoo","bro","leave","shit","dude","awn","awnn","awnnn","!","!!",
]);

function extractName(text) {
  const words = text.toLowerCase().split(/\s+/);
  const cleaned = words.filter((w) => w && !JUNK_WORDS.has(w));
  if (cleaned.length) {
    return cleaned
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }
  return "Friend";
}

/* ---------------- SENTIMENT SCORING ----------------
   A small hand-built lexicon standing in for TextBlob. Each word carries
   a polarity from -1 (very negative) to 1 (very positive); the sentence
   score is the average across matched words -- same idea as TextBlob's
   polarity, same thresholds as your Python script. */

const LEXICON = {
  amazing: 0.9, excellent: 0.9, incredible: 0.9, perfect: 1, wonderful: 0.9,
  love: 0.8, loved: 0.8, fantastic: 0.85, great: 0.7, awesome: 0.85,
  good: 0.5, nice: 0.4, happy: 0.6, beautiful: 0.6, best: 0.8,
  comfortable: 0.5, quality: 0.4, fast: 0.3, recommend: 0.6, satisfied: 0.5,
  impressed: 0.6, delightful: 0.7, smooth: 0.3, friendly: 0.4, worth: 0.4,
  stylish: 0.4, elegant: 0.5, premium: 0.4, gorgeous: 0.7, flawless: 0.8,

  terrible: -0.9, awful: -0.9, horrible: -0.9, worst: -1, bad: -0.5,
  hate: -0.8, hated: -0.8, disappointing: -0.6, disappointed: -0.6, poor: -0.5,
  slow: -0.3, broken: -0.6, defective: -0.7, scam: -0.9, fake: -0.7,
  rude: -0.6, late: -0.3, damaged: -0.6, cheap: -0.3, uncomfortable: -0.5,
  never: -0.3, waste: -0.6, refund: -0.4, wrong: -0.4, ugly: -0.6,
  overpriced: -0.4, ripped: -0.6, torn: -0.6, delayed: -0.3, disgusting: -0.8,

  ok: 0.1, okay: 0.1, fine: 0.15, decent: 0.3, average: 0,
};

function analyzeSentiment(text) {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  let total = 0;
  let matched = 0;

  words.forEach((w) => {
    if (w in LEXICON) {
      total += LEXICON[w];
      matched++;
    }
    // simple negation flip: "not good", "not happy"
  });

  // crude negation handling: if "not"/"never" appears right before a
  // matched word, flip that word's contribution
  for (let i = 0; i < words.length - 1; i++) {
    if (
      (words[i] === "not" || words[i] === "never" || words[i] === "no") &&
      words[i + 1] in LEXICON
    ) {
      total -= 2 * LEXICON[words[i + 1]];
    }
  }

  const score = matched ? total / matched : 0;
  return Math.max(-1, Math.min(1, score));
}

function verdictFor(score) {
  if (score > 0.3) return { label: "Highly POSITIVE!", emoji: "😄", color: "#3ddc84" };
  if (score > 0) return { label: "Slightly positive or okay.", emoji: "🙂", color: "#8fd98f" };
  if (score < -0.3) return { label: "Highly NEGATIVE!", emoji: "😡", color: "#ff5c5c" };
  if (score < 0) return { label: "Slightly negative.", emoji: "🙁", color: "#e08a8a" };
  return { label: "Completely NEUTRAL.", emoji: "😐", color: "#c9c9c9" };
}

function getVibeReply(score) {
  if (score > 0.3) {
    return "That sounds genuinely upbeat — I can feel the good energy in that review ✨";
  }
  if (score > 0) {
    return "That one leans positive, and it gives me a nice warm impression 🙂";
  }
  if (score < -0.3) {
    return "That feedback is clear and honest — thank you for sharing it so directly 💛";
  }
  if (score < 0) {
    return "That reads a little mixed, but it still gives me something useful to work with 🤝";
  }
  return "That feels balanced and thoughtful — I appreciate the nuance.";
}

/* ---------------- CHAT RENDERING ---------------- */

function scrollToBottom() {
  chat.scrollTop = chat.scrollHeight;
}

function addBotMessage(text) {
  const row = document.createElement("div");
  row.className = "samai-msg-row bot";
  row.innerHTML = `
    <div class="samai-msg-avatar"><i class="fa-solid fa-wand-magic-sparkles"></i></div>
    <div class="samai-bubble"></div>
  `;
  row.querySelector(".samai-bubble").textContent = text;
  chat.appendChild(row);
  scrollToBottom();
}

function addUserMessage(text) {
  const row = document.createElement("div");
  row.className = "samai-msg-row user";
  row.innerHTML = `
    <div class="samai-msg-avatar"><i class="fa-solid fa-user"></i></div>
    <div class="samai-bubble"></div>
  `;
  row.querySelector(".samai-bubble").textContent = text;
  chat.appendChild(row);
  scrollToBottom();
}

function addResultCard(score, verdict) {
  const row = document.createElement("div");
  row.className = "samai-msg-row bot";

  const pct = Math.round(((score + 1) / 2) * 100); // -1..1 -> 0..100

  row.innerHTML = `
    <div class="samai-msg-avatar"><i class="fa-solid fa-wand-magic-sparkles"></i></div>
    <div class="samai-result-card">
        <div class="samai-result-score">Raw sentiment score: <span>${score.toFixed(2)}</span></div>
        <div class="samai-result-verdict" style="color:${verdict.color}">
            <span>${verdict.emoji}</span> ${verdict.label}
        </div>
        <div class="samai-result-bar">
            <div class="samai-result-bar-fill" style="left:0; width:${pct}%; background:${verdict.color};"></div>
        </div>
    </div>
  `;
  chat.appendChild(row);
  scrollToBottom();
}

function showTyping() {
  const row = document.createElement("div");
  row.className = "samai-msg-row bot samai-typing";
  row.id = "samai-typing-indicator";
  row.innerHTML = `
    <div class="samai-msg-avatar"><i class="fa-solid fa-wand-magic-sparkles"></i></div>
    <div class="samai-bubble"><span></span><span></span><span></span></div>
  `;
  chat.appendChild(row);
  scrollToBottom();
}

function hideTyping() {
  document.getElementById("samai-typing-indicator")?.remove();
}

function botSay(text, delay = 550) {
  return new Promise((resolve) => {
    showTyping();
    setTimeout(() => {
      hideTyping();
      addBotMessage(text);
      resolve();
    }, delay);
  });
}

function addQuickReplies(options) {
  const wrap = document.createElement("div");
  wrap.className = "samai-quick-replies";
  wrap.id = "samai-quick-replies";

  options.forEach(({ label, value }) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "samai-quick-btn";
    btn.textContent = label;
    btn.addEventListener("click", () => handleQuickReply(value));
    wrap.appendChild(btn);
  });

  chat.appendChild(wrap);
  scrollToBottom();
}

function removeQuickReplies() {
  document.getElementById("samai-quick-replies")?.remove();
}

/* ---------------- CONVERSATION FLOW ---------------- */

async function startConversation() {
  if (userName) {
    await botSay(`🤖 Welcome back, ${userName}! You’re in good hands.`, 700);
    await promptForReview(true);
  } else {
    await botSay("Welcome to SamAi ✨ I’m here to help you test a review in a more natural chat flow.", 650);
    await botSay("What is your name?", 500);
    stage = "askName";
    input.disabled = false;
    input.placeholder = "Type your name...";
    input.focus();
  }
}

async function promptForReview(firstTime) {
  stage = "review";
  const memoryHint = lastReviewText
    ? ` I’ll keep your last note in mind as we continue.`
    : "";

  await botSay(
    firstTime
      ? `Hi ${userName}, send me a review and I’ll analyze it for you.${memoryHint}`
      : `Absolutely ${userName} — give me another review and I’ll read the vibe.${memoryHint}`,
    550
  );
  input.disabled = false;
  input.placeholder = "Type your review...";
  input.focus();
}

async function handleNameSubmission(rawText) {
  const name = extractName(rawText);
  userName = name;
  localStorage.setItem(STORAGE_KEY, name);

  await botSay(`🤖 Nice to meet you, ${name}! I’ve saved your profile and I’m ready to help.`, 650);
  await promptForReview(true);
}

async function handleReviewSubmission(rawText) {
  input.disabled = true;
  lastReviewText = rawText;

  const score = analyzeSentiment(rawText);
  const verdict = verdictFor(score);

  await botSay("I’m reading the tone of that review now...", 550);
  addResultCard(score, verdict);
  await botSay(getVibeReply(score), 650);

  await botSay("Want to try another one?", 500);
  stage = "retryChoice";
  addQuickReplies([
    { label: "Another review", value: "yes" },
    { label: "That’s enough", value: "no" },
  ]);
}

async function handleQuickReply(value) {
  removeQuickReplies();
  addUserMessage(value === "yes" ? "Yes" : "No");

  if (value === "yes") {
    await promptForReview(false);
  } else {
    await botSay(`Thank you for using SamAi, ${userName}!`, 500);
    input.placeholder = "Conversation ended";
    input.disabled = true;
    sendBtn.disabled = true;
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const text = input.value.trim();
  if (!text) return;

  addUserMessage(text);
  input.value = "";
  input.disabled = true;

  if (stage === "askName") {
    await handleNameSubmission(text);
  } else if (stage === "review") {
    await handleReviewSubmission(text);
  }
});

/* ---------------- BOOT ---------------- */

window.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    loadingScreen.classList.add("hide");
    startConversation();
  }, 1100);
});