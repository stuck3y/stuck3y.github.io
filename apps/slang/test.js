// Tests for the S-lang compiler.  Run:  node apps/slang/test.js
'use strict';

const fs = require('fs');
const path = require('path');
const Slang = require('./slang.js');

let passed = 0;
const failures = [];

function test(name, fn) {
  try { fn(); passed++; }
  catch (e) { failures.push(name + '\n    ' + String(e.message).split('\n').join('\n    ')); }
}

function same(got, want) {
  const a = JSON.stringify(got), b = JSON.stringify(want);
  if (a !== b) throw new Error('got  ' + a + '\nwant ' + b);
}

// Run a program, return what it spat.
function out(src, host) {
  const lines = [];
  Slang.run(src, Object.assign({ spit: (t) => lines.push(t) }, host));
  return lines;
}

// Run a program that must fail; return its problems as "line: message".
function problems(src) {
  try { out(src); }
  catch (e) {
    if (!(e instanceof Slang.SlangError)) throw e;
    return e.problems.map((p) => p.line + ': ' + p.msg);
  }
  throw new Error('expected an error, but it ran fine');
}

const fails = (name, src, line, fragment) => test(name, () => {
  const got = problems(src);
  if (!got.some((p) => p.startsWith(line + ': ') && p.includes(fragment))) {
    throw new Error('wanted line ' + line + ' mentioning "' + fragment + '"\ngot ' + JSON.stringify(got));
  }
});

const example = (name) => fs.readFileSync(path.join(__dirname, 'examples', name + '.slang'), 'utf8');

// --- The v1.0 manual, verbatim ---------------------------------------------

test('v1: variables and spit', () => {
  same(out(`
    // peep this: This is a comment in S-lang
    cop myMoney = 100        // mutable digits
    locked myName = "G"      // immutable bars
    cop facts = no cap       // boolean true
    cop emptyWallet = ghost  // null
    spit "We out here!"
    spit myMoney
    spit facts
    spit emptyWallet
  `), ['We out here!', '100', 'no cap', 'ghost']);
});

test('v1: vibe checks', () => {
  const src = (score) => `
    cop creditScore = ${score}
    vibe check (creditScore twins 800) {
        spit "You good to go."
    } nah vibe check (creditScore > 600) {
        spit "You cutting it close, but bet."
    } nah {
        spit "Bro you broke."
    }`;
  same(out(src(800)), ['You good to go.']);
  same(out(src(700)), ['You cutting it close, but bet.']);
  same(out(src(300)), ['Bro you broke.']);
});

test('v1: spin the block', () => {
  same(out(`
    cop hustle = 0
    spin the block while (hustle < 5) {
        spit "Grinding... day " up hustle
        hustle = hustle up 1
    }
  `), [0, 1, 2, 3, 4].map((n) => 'Grinding... day ' + n));
});

test('v1: run through', () => {
  same(out(`
    cop homies = ["Dre", "Snoop", "Pac"]
    run through homie in homies {
        spit "Shoutout to " up homie
    }
  `), ['Shoutout to Dre', 'Shoutout to Snoop', 'Shoutout to Pac']);
});

test('v1: moves', () => {
  same(out(`
    the move getPaid(hours, rate) {
        vibe check (hours twins 0) {
            cash out ghost
        }

        cop bag = hours times rate
        cash out bag
    }

    // Calling the function
    cop myCheck = getPaid(40, 25)
    spit "Secured the bag: $" up myCheck
    spit getPaid(0, 25)
  `), ['Secured the bag: $1000', 'ghost']);
});

test('v1: FizzBuzz', () => {
  same(out(example('fizzbuzz')), [
    'Starting the FizzBuzz test...',
    '1', '2', 'Fizz', '4', 'Buzz', 'Fizz', '7', '8', 'Fizz', 'Buzz', '11', 'Fizz', '13', '14', 'FizzBuzz',
    'We done here.',
  ]);
});

// --- The language -----------------------------------------------------------

test('precedence', () => {
  same(out(`
    spit 2 up 3 times 4
    spit (2 up 3) times 4
    spit 10 down 2 down 3
    spit 1 up 1 twins 2 and not 3 < 2
    spit -2 times -3
    spit no cap or cap and cap
  `), ['14', '20', '5', 'no cap', '6', 'no cap']);
});

test('floats print clean', () => same(out('spit 0.1 up 0.2\nspit 10 split 4'), ['0.3', '2.5']));

test('bars: escapes and joining', () => {
  same(out('spit "a\\"b\\\\c"\nspit "n=" up 1 up ghost up no cap up [1, "x"]'), ['a"b\\c', 'n=1ghostno cap[1, "x"]']);
});

test('crews', () => {
  same(out(`
    cop crew = [1, 2, 3]
    crew[0] = 10
    pullUp(crew, 4)
    spit bounce(crew, 1)
    spit crew
    spit howBig(crew)
    spit "yo"[1]
    spit range(2, 5)
  `), ['2', '[10, 3, 4]', '3', 'o', '[2, 3, 4]']);
});

test('stashes', () => {
  same(out(`
    cop s = { a: 1, "b c": 2 }
    s.a = s.a up 1
    s["new"] = ghost
    spit s
    spit keys(s)
    spit has(s, "a") and not has(s, "zzz")
    spit howBig(s)
  `), ['{a: 2, b c: 2, new: ghost}', '["a", "b c", "new"]', 'no cap', '3']);
});

test('dip and keep it moving', () => {
  same(out(`
    run through n in range(0, 10) {
        vibe check (n % 2 twins 0) { keep it moving }
        vibe check (n > 6) { dip }
        spit n
    }
  `), ['1', '3', '5']);
});

test('moves: hoisted, recursive, first-class, see later globals', () => {
  same(out(`
    spit fact(5)
    the move fact(n) {
        vibe check (n < 2) { cash out base }
        cash out n times fact(n down 1)
    }
    cop base = 1
    the move twice(f, x) { cash out f(f(x)) }
    the move inc(x) { cash out x up 1 }
    spit twice(inc, 5)
    spit inc
    the move nothing() { cash out }
    spit nothing()
  `.replace('spit fact(5)\n', '').replace('cop base = 1', 'cop base = 1\n    spit fact(5)')),
  ['120', '7', 'the move inc', 'ghost']);
});

test('names that are JavaScript keywords are fine', () => {
  same(out('cop class = 1\ncop new = 2\ncop the = 3\ncop run = 4\nspit class up new up the up run'), ['10']);
});

test('multi-word keywords tolerate extra spaces', () => {
  same(out('vibe   check (no  cap) { spit "ok" }'), ['ok']);
});

test('a line starting with a bracket is its own statement', () => {
  fails('', 'cop f = 1\ncop g = f\n(1)', 3, "ain't doing nothing");
  same(out('cop a = [1]\ncop b = a\n[2][0] = 3\nspit a'), ['[1]']);
});

test('digits and bars conversions', () => {
  same(out('spit digits("42") up 1\nspit digits("nope")\nspit bars(5) up 5'), ['43', 'ghost', '55']);
});

test('gimme asks the host', () => {
  same(out('spit gimme("Name? ")', { gimme: (q) => q + 'G' }), ['Name? G']);
  same(out('spit gimme()'), ['ghost']);
});

test('on god passes quietly', () => same(out('on god 1 up 1 twins 2\nspit "ok"'), ['ok']));

// --- Compile-time errors ----------------------------------------------------

fails('undeclared name, with a suggestion', 'cop paddle = 1\nspit padle', 2, 'Did you mean `paddle`?');
fails('undeclared name, no suggestion', 'spit zzzzzz', 1, 'Never heard of `zzzzzz`.');
fails('reassigning a locked', 'locked x = 1\nx = 2', 2, 'is locked');
fails('reassigning a move', 'the move f() {}\nf = 2', 2, 'is a move');
fails('redeclaring', 'cop x = 1\ncop x = 2', 2, 'already copped');
fails('shadowing a built-in', 'cop min = 1', 1, 'is a built-in');
fails('wrong arg count: move', 'the move f(a, b) {}\nf(1)', 2, 'takes 2, you gave it 1');
fails('wrong arg count: built-in', 'spit min(1)', 1, 'takes 2, you gave it 1');
fails('cash out at top level', 'cash out 1', 1, 'only works inside a move');
fails('dip outside a loop', 'dip', 1, 'only works inside a loop');
fails('dip inside a move inside a loop', 'spin the block while (cap) {\nthe move f() { dip }\n}', 2, 'only works inside a loop');
fails('on repeat must be top level', 'vibe check (no cap) {\non repeat {}\n}', 2, 'top level');
fails('use before declaration in same scope', 'spit x\ncop x = 1', 1, 'Never heard of');
fails('block scope ends', 'vibe check (no cap) { cop x = 1 }\nspit x', 2, 'Never heard of');
fails('plus sign', 'spit 1 + 2', 1, 'Say `up`');
fails('double equals', 'spit 1 == 2', 1, 'Say `twins`');
fails('binary minus', 'spit 5 - 2', 1, 'Say `down`');
fails('curly quotes', 'spit “hey”', 1, 'curly quotes');
fails('unclosed bars', 'spit "hey', 1, 'never got closed');
fails('unclosed block', 'vibe check (no cap) {\nspit 1', 1, 'never got closed');
fails('stray closer', 'spit 1\n}', 2, 'no `{` to close');
fails('keyword as a name', 'cop up = 1', 1, 'already S-lang');
fails('stray nah', 'nah { }', 1, 'needs a `vibe check`');
fails('useless line', 'cop x = 1\nx up 1', 2, "ain't doing nothing");
fails('duplicate stash key', 'cop s = { a: 1, a: 2 }', 1, 'twice');

test('every problem is reported in one pass', () => {
  same(problems('spit a\nspit b\nlocked c = 1\nc = 2').length, 3);
});

// --- Runtime errors ---------------------------------------------------------

fails('no coercion: times', 'cop a = "5"\nspit a times 2', 2, 'Both gotta be digits');
fails('no coercion: up needs digits or bars', 'spit 1 up ghost', 1, "Can't `up`");
fails('no coercion: compare', 'spit "a" < 1', 1, 'Both gotta be digits');
fails('conditions need a boolean', 'vibe check (1) { }', 1, 'Need no cap or cap');
fails('and needs booleans', 'spit no cap and 1', 1, 'Need no cap or cap');
fails('split by zero', 'spit 1 split 0', 1, 'by zero');
fails('out of bounds', 'cop c = [1]\n\nspit c[1]', 3, 'outta bounds');
fails('fractional spot', 'spit [1][0.5]', 1, 'whole number');
fails('missing key: dot', 'cop s = { a: 1 }\nspit s.b', 2, "Ain't no `b`");
fails('missing key: dot write', 'cop s = { a: 1 }\ns.b = 2', 2, "Ain't no `b`");
fails('missing key: brackets', 'cop s = { a: 1 }\nspit s["b"]', 2, "Ain't no `b`");
fails('dot on a non-stash', 'cop n = 5\nspit n.x', 2, 'Only a stash');
fails('locked is deep: stash', 'locked s = { a: { b: 1 } }\ncop inner = s.a\ninner.b = 2', 3, "That's locked");
fails('locked is deep: crew', 'locked c = [1]\npullUp(c, 2)', 2, "That's locked");
fails('run through needs a crew', 'run through x in 5 { }', 1, 'Expected a crew');
fails('infinite loop is stopped', 'spin the block while (no cap) { }', 1, 'spinning too long');
fails('runaway recursion', 'the move f() { cash out f() }\nf()', 1, 'Stack blew up');
fails('calling a non-move', 'cop x = 5\nx()', 2, "ain't a move");
fails('move used before its globals exist', 'spit f()\ncop g = 1\nthe move f() { cash out g }', 3, 'before it was copped');
fails('dynamic arity', 'the move f(a) {}\ncop g = f\ng(1, 2)', 3, 'takes 1, you gave it 2');
fails('built-in argument types', 'spit floor("x")', 1, 'wants digits in spot 1');
fails('on god fails loudly', 'cop x = 1\non god x twins 2', 2, 'On god? Nah. `x twins 2` is cap.');
fails('stage is missing outside the playground', 'stage(1, 1)', 1, 'needs the stage');

test('line number survives a call into a move', () => {
  same(problems('the move f() {\ncash out 1\n}\n\nspit f() up ghost times 2'), ["5: Can't `times` ghost and digits. Both gotta be digits."]);
});

// --- The examples -----------------------------------------------------------

test('tour runs and keeps every promise', () => {
  const lines = out(example('tour'));
  same(lines[lines.length - 1], 'Every promise kept. No cap.');
});

// Pang, played headlessly: a fake stage, a scripted player, and a lot of frames.
// `player(frame, input)` works the controls; play stops early once `until(tags)`
// is true for the text drawn that frame.
function playPang(frames, player, until) {
  const calls = { box: 0, beep: 0 };
  let tags = [];
  const input = { keys: new Set(), finger: null };
  const stage = {
    stage: (w, h) => same([w, h], [800, 500]),
    wipe: () => {}, dot: () => {},
    box: () => { calls.box++; },
    beep: () => { calls.beep++; },
    tag: (text) => { tags.push(String(text)); },
    pressed: (k) => input.keys.has(k),
    fingerX: () => null,
    fingerY: () => input.finger,
  };
  const program = Slang.run(example('pang'), { spit: () => {}, stage });
  for (let f = 0; f < frames; f++) {
    player(f, input);
    tags = [];
    program.frame(f % 7 === 0 ? 1 / 30 : 1 / 60);   // uneven frames, like a real browser
    if (until && until(tags)) break;
  }
  return { calls, tags };
}

const tapSpace = (f, input) => (f % 30 === 0 ? input.keys.add('space') : input.keys.delete('space'));

test('pang: waits for a serve, then plays', () => {
  const idle = playPang(10, () => {});
  same(idle.tags, ['0', '0', 'PANG', 'space or tap to serve']);
  same(idle.calls.beep, 0);

  const played = playPang(40, (f, input) => { if (f === 5) input.keys.add('space'); });
  same(played.tags, ['0', '0']);           // no banner: the ball is live
  same(played.calls.beep, 1);              // held space served exactly once
});

test('pang: a player parked in the corner loses, and the game ends', () => {
  const game = playPang(60 * 600, (f, input) => { input.keys.add('w'); tapSpace(f, input); },
    (tags) => tags.includes('CPU WINS') || tags.includes('YOU WIN'));
  same(game.tags.slice(1), ['7', 'CPU WINS', 'space or tap to run it back']);
});

test('pang: a thumb on the glass moves the paddle and serves', () => {
  const boxes = [];
  const stage = {
    stage: () => {}, wipe: () => {}, dot: () => {}, tag: () => {}, beep: () => {},
    box: (x, y) => { if (x === 30) boxes.push(y); },
    pressed: () => false, fingerX: () => 100, fingerY: () => 400,
  };
  Slang.run(example('pang'), { spit: () => {}, stage }).frame(1 / 60);
  same(boxes, [355]);                      // paddle centered on the finger
});

// --- Tokenizer (loose mode feeds the editor) --------------------------------

test('loose tokenizer never throws and keeps comments', () => {
  const toks = Slang.tokenize('cop x = "unclosed\n+ “ peep: hi\n// yo', true);
  same(toks.map((t) => t.t), ['kw', 'id', 'op', 'str', 'bad', 'bad', 'com', 'com']);
});

test('loose tokens cover their source text exactly', () => {
  const src = example('pang');
  Slang.tokenize(src, true).forEach((t) => {
    if (t.end <= t.start) throw new Error('empty token at ' + t.start);
  });
});

// ---------------------------------------------------------------------------

failures.forEach((f) => console.log('FAIL  ' + f + '\n'));
console.log(passed + ' passed, ' + failures.length + ' failed');
process.exit(failures.length ? 1 : 0);
