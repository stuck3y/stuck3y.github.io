// slang.js — the S-lang compiler.
//
// One file, zero dependencies. Source goes through four small stages:
//
//   tokenize  text    -> tokens
//   parse     tokens  -> tree
//   check     tree    -> every naming mistake, found before anything runs
//   emit      tree    -> strict-mode JavaScript
//
// and `run` executes that JavaScript against a small runtime that refuses to
// guess: no silent coercion, no undefined, every error carries a line number.
//
// Browser:  <script src="./slang.js"></script>  then  Slang.run(source, host)
// Node:     node slang.js program.slang [--check | --js]
//
// The language itself is documented in MANUAL.md.

(function (root) {
  'use strict';

  // --- Errors --------------------------------------------------------------
  // One error type for everything. `problems` is a list so the checker can
  // report every mistake in one pass instead of one per run.
  class SlangError extends Error {
    constructor(problems) {
      super(problems.map((p) => 'Line ' + p.line + ': ' + p.msg).join('\n'));
      this.name = 'SlangError';
      this.problems = problems;
    }
  }

  const fail = (at, msg) => {
    throw new SlangError([{ line: at.line, col: at.col || 1, msg }]);
  };

  // --- Vocabulary ----------------------------------------------------------
  // Multi-word keywords are matched whole, so `the`, `run` and `no` stay free
  // to be ordinary names.
  const PHRASES = [
    'spin the block while', 'keep it moving', 'vibe check', 'the move',
    'cash out', 'run through', 'no cap', 'on repeat', 'on god',
  ];
  const WORDS = [
    'cop', 'locked', 'spit', 'up', 'down', 'times', 'split', 'twins', 'beefin',
    'and', 'or', 'not', 'nah', 'cap', 'ghost', 'in', 'dip',
  ];
  const PHRASE_RES = PHRASES.map(
    (p) => new RegExp(p.split(' ').join('[ \\t]+') + '(?![A-Za-z0-9_])', 'y')
  );
  const WORD_RE = /[A-Za-z_][A-Za-z0-9_]*/y;
  const NUM_RE = /\d+(\.\d+)?/y;
  const PEEP_RE = /peep[ \t]*:/y;

  // Operators people will reach for out of habit, and what to say instead.
  const SAY_INSTEAD = {
    '+': 'up', '*': 'times', '/': 'split', '==': 'twins', '!=': 'beefin',
    '&&': 'and', '||': 'or', '!': 'not',
  };
  const SYMBOLS = ['<=', '>=', '(', ')', '{', '}', '[', ']', ',', '.', ':', '=', '<', '>', '%', '-'];
  const ESCAPES = { n: '\n', t: '\t', '"': '"', '\\': '\\' };

  // Built-ins: name -> argument types. n = digits, s = bars, a = anything.
  // A trailing ? makes the last argument optional. The checker reads arity
  // from here; the runtime reads the types.
  const CORE = {
    howBig: 'a', pullUp: 'aa', bounce: 'an', range: 'nn', bars: 'a', digits: 'a',
    has: 'as', keys: 'a', gimme: 'a?', floor: 'n', round: 'n', abs: 'n',
    sqrt: 'n', sin: 'n', cos: 'n', min: 'nn', max: 'nn', random: '',
  };
  const STAGE = {
    stage: 'nn', wipe: 's', box: 'nnnns', dot: 'nnns', tag: 'annns',
    pressed: 's', fingerX: '', fingerY: '', beep: 'nn',
  };
  const BUILTINS = Object.assign({}, CORE, STAGE);

  // --- Tokenize ------------------------------------------------------------
  // Token: { t, v, line, col, start, end, nl } where `nl` means a newline came
  // before it. `loose` never throws and keeps comments — the editor's
  // highlighter uses it on half-typed code.
  function tokenize(src, loose) {
    const toks = [];
    let i = 0, line = 1, lineStart = 0, nl = false;

    const push = (t, v, start) => {
      toks.push({ t, v, line, col: start - lineStart + 1, start, end: i, nl });
      nl = false;
    };
    const oops = (start, msg) => {
      if (!loose) fail({ line, col: start - lineStart + 1 }, msg);
      push('bad', src.slice(start, i), start);
    };
    const match = (re) => {
      re.lastIndex = i;
      const m = re.exec(src);
      return m ? m[0] : null;
    };
    const comment = (start) => {
      while (i < src.length && src[i] !== '\n') i++;
      if (loose) push('com', src.slice(start, i), start);
    };

    while (i < src.length) {
      const c = src[i], start = i;

      if (c === '\n') { i++; line++; lineStart = i; nl = true; continue; }
      if (c === ' ' || c === '\t' || c === '\r') { i++; continue; }
      if (c === '/' && src[i + 1] === '/') { comment(start); continue; }

      if (/[A-Za-z_]/.test(c)) {
        if (match(PEEP_RE)) { comment(start); continue; }
        const k = PHRASE_RES.findIndex((re) => match(re));
        if (k !== -1) { i += match(PHRASE_RES[k]).length; push('kw', PHRASES[k], start); continue; }
        const word = match(WORD_RE);
        i += word.length;
        push(WORDS.includes(word) ? 'kw' : 'id', word, start);
        continue;
      }

      if (/\d/.test(c)) {
        const num = match(NUM_RE);
        i += num.length;
        push('num', Number(num), start);
        continue;
      }

      if (c === '"') {
        let value = '', closed = false;
        i++;
        while (i < src.length && src[i] !== '\n') {
          const ch = src[i++];
          if (ch === '"') { closed = true; break; }
          if (ch !== '\\') { value += ch; continue; }
          const esc = src[i++];
          value += esc in ESCAPES ? ESCAPES[esc] : '\\' + (esc || '');
        }
        if (closed) push('str', value, start);
        else if (loose) push('str', value, start);
        else oops(start, 'Finish your bars. That " never got closed.');
        continue;
      }

      if ('“”‘’'.includes(c)) {
        i++;
        oops(start, 'Those are curly quotes. Bars need straight ones: "like this".');
        continue;
      }

      const two = src.slice(i, i + 2);
      const wrong = two in SAY_INSTEAD ? two : c in SAY_INSTEAD ? c : null;
      if (wrong) {
        i += wrong.length;
        oops(start, "S-lang don't do `" + wrong + '`. Say `' + SAY_INSTEAD[wrong] + '`.');
        continue;
      }

      const sym = SYMBOLS.find((s) => src.startsWith(s, i));
      if (sym) { i += sym.length; push('op', sym, start); continue; }

      i++;
      oops(start, "Don't know what `" + c + '` is supposed to be.');
    }

    if (!loose) { nl = true; push('eof', null, i); }
    return toks;
  }

  // --- Parse ---------------------------------------------------------------
  // Recursive descent. Binary operators, loosest first; 'not' sits between
  // `and` and the comparisons.
  const LEVELS = [
    ['or'], ['and'], 'not',
    ['twins', 'beefin', '<', '>', '<=', '>='],
    ['up', 'down'],
    ['times', 'split', '%'],
  ];

  function parse(src) {
    const toks = tokenize(src);
    let p = 0;

    const peek = () => toks[p];
    const next = () => toks[p++];
    const is = (t, v) => toks[p].t === t && (v === undefined || toks[p].v === v);
    const kw = (v) => is('kw', v);
    const op = (v) => is('op', v);
    const eat = (t, v) => (is(t, v) ? next() : null);
    const say = (tok) =>
      tok.t === 'eof' ? 'the end of the file' : tok.t === 'str' ? 'bars' : '`' + tok.v + '`';
    const need = (t, v, what) =>
      is(t, v) ? next() : fail(peek(), 'Expected ' + what + ' but got ' + say(peek()) + '.');
    const name = () => {
      if (is('kw')) fail(peek(), '`' + peek().v + '` is already S-lang. Pick another name.');
      return need('id', undefined, 'a name').v;
    };
    const at = (tok) => ({ line: tok.line, col: tok.col });

    // Comma-separated items up to a closing symbol; trailing comma allowed.
    function list(close, item) {
      const items = [];
      while (!op(close)) {
        items.push(item());
        if (!eat('op', ',')) break;
      }
      need('op', close, '`' + close + '`');
      return items;
    }

    function block() {
      const open = need('op', '{', '`{`');
      const body = [];
      while (!op('}')) {
        if (is('eof')) fail(open, 'This `{` never got closed.');
        body.push(statement());
      }
      next();
      return body;
    }

    function vibeCheck() {
      const tok = next();
      const node = { type: 'If', cond: expr(), then: block(), otherwise: null, ...at(tok) };
      if (eat('kw', 'nah')) node.otherwise = kw('vibe check') ? [vibeCheck()] : block();
      return node;
    }

    function statement() {
      const tok = peek();
      const here = at(tok);

      if (kw('cop') || kw('locked')) {
        next();
        const n = name();
        need('op', '=', '`=`');
        return { type: 'Decl', locked: tok.v === 'locked', name: n, init: expr(), ...here };
      }
      if (eat('kw', 'spit')) return { type: 'Spit', value: expr(), ...here };
      if (kw('vibe check')) return vibeCheck();
      if (eat('kw', 'spin the block while')) return { type: 'While', cond: expr(), body: block(), ...here };
      if (eat('kw', 'run through')) {
        const n = name();
        need('kw', 'in', '`in`');
        return { type: 'For', name: n, crew: expr(), body: block(), ...here };
      }
      if (eat('kw', 'the move')) {
        const n = name();
        need('op', '(', '`(`');
        const params = list(')', name);
        const twice = params.find((x, i) => params.indexOf(x) !== i);
        if (twice) fail(tok, '`' + n + '` has two things named `' + twice + '`.');
        return { type: 'Move', name: n, params, body: block(), ...here };
      }
      if (eat('kw', 'cash out')) {
        const bare = op('}') || is('eof') || peek().nl;
        return { type: 'Return', value: bare ? null : expr(), ...here };
      }
      if (eat('kw', 'dip')) return { type: 'Break', ...here };
      if (eat('kw', 'keep it moving')) return { type: 'Continue', ...here };
      if (eat('kw', 'on repeat')) {
        let param = null;
        if (eat('op', '(')) { param = name(); need('op', ')', '`)`'); }
        return { type: 'Repeat', param, body: block(), ...here };
      }
      if (eat('kw', 'on god')) {
        const first = peek();
        const cond = expr();
        return { type: 'Assert', cond, text: src.slice(first.start, toks[p - 1].end), ...here };
      }
      if (kw('nah')) fail(tok, '`nah` needs a `vibe check` right before it.');

      const e = expr();
      if (eat('op', '=')) {
        if (!['Id', 'Index', 'Member'].includes(e.type)) fail(tok, "Can't assign to that.");
        return { type: 'Assign', target: e, value: expr(), ...here };
      }
      if (e.type !== 'Call') {
        fail(tok, "That line ain't doing nothing. Did you mean to `spit` it or `cop` it?");
      }
      return { type: 'Do', expr: e, ...here };
    }

    const expr = () => binary(0);

    function binary(level) {
      if (level === LEVELS.length) return unary();
      if (LEVELS[level] === 'not') {
        const tok = eat('kw', 'not');
        return tok ? { type: 'Not', arg: binary(level), ...at(tok) } : binary(level + 1);
      }
      let left = binary(level + 1);
      while ((is('kw') || is('op')) && LEVELS[level].includes(peek().v)) {
        const tok = next();
        left = { type: 'Bin', op: tok.v, left, right: binary(level + 1), ...at(tok) };
      }
      if (op('-') && !peek().nl) fail(peek(), 'Say `down` for minus.');
      return left;
    }

    function unary() {
      const tok = eat('op', '-');
      return tok ? { type: 'Neg', arg: unary(), ...at(tok) } : postfix();
    }

    // A call `(` or index `[` must sit on the same line as what it follows,
    // so a line that starts with a bracket is never glued to the one above.
    function postfix() {
      let e = primary();
      for (;;) {
        const tok = peek();
        if (op('(') && !tok.nl) { next(); e = { type: 'Call', callee: e, args: list(')', expr), ...at(tok) }; }
        else if (op('[') && !tok.nl) { next(); e = { type: 'Index', obj: e, index: expr(), ...at(tok) }; need('op', ']', '`]`'); }
        else if (op('.')) { next(); e = { type: 'Member', obj: e, key: name(), ...at(tok) }; }
        else return e;
      }
    }

    function primary() {
      const tok = next();
      const here = at(tok);
      if (tok.t === 'num') return { type: 'Num', value: tok.v, ...here };
      if (tok.t === 'str') return { type: 'Str', value: tok.v, ...here };
      if (tok.t === 'id') return { type: 'Id', name: tok.v, ...here };
      if (tok.t === 'kw' && tok.v === 'no cap') return { type: 'Bool', value: true, ...here };
      if (tok.t === 'kw' && tok.v === 'cap') return { type: 'Bool', value: false, ...here };
      if (tok.t === 'kw' && tok.v === 'ghost') return { type: 'Ghost', ...here };
      if (tok.t === 'op' && tok.v === '(') {
        const e = expr();
        need('op', ')', '`)`');
        return e;
      }
      if (tok.t === 'op' && tok.v === '[') return { type: 'Crew', items: list(']', expr), ...here };
      if (tok.t === 'op' && tok.v === '{') {
        const entries = list('}', () => {
          const key = is('str') ? next().v : name();
          need('op', ':', '`:`');
          return { key, value: expr() };
        });
        const twice = entries.find((e, i) => entries.findIndex((x) => x.key === e.key) !== i);
        if (twice) fail(tok, 'That stash has `' + twice.key + '` twice.');
        return { type: 'Stash', entries, ...here };
      }
      p--;
      return fail(tok, 'Expected a value but got ' + say(tok) + '.');
    }

    const body = [];
    while (!is('eof')) {
      if (op('}')) fail(peek(), 'This `}` has no `{` to close.');
      body.push(statement());
    }
    return body;
  }

  // --- Check ---------------------------------------------------------------
  // Resolves every name before anything runs, and collects all the problems
  // rather than stopping at the first. Marks built-in names on the tree for
  // the emitter.
  function distance(a, b) {
    let row = Array.from({ length: b.length + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i++) {
      const prev = row;
      row = [i];
      for (let j = 1; j <= b.length; j++) {
        row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
    }
    return row[b.length];
  }

  function check(program) {
    const problems = [];
    const bad = (node, msg) => problems.push({ line: node.line, col: node.col || 1, msg });
    let scope = null;                       // { names: Map, parent, later: [] }
    let ctx = { move: false, loops: 0 };    // what's legal right here
    let repeats = 0;

    const lookup = (n) => {
      for (let s = scope; s; s = s.parent) if (s.names.has(n)) return s.names.get(n);
      return null;
    };

    function declare(node, n, info) {
      if (n in BUILTINS) bad(node, '`' + n + '` is a built-in. Pick another name.');
      else if (scope.names.has(n)) bad(node, '`' + n + '` is already copped in this block.');
      else scope.names.set(n, info);
    }

    function unknown(node) {
      const seen = Object.keys(BUILTINS);
      for (let s = scope; s; s = s.parent) seen.push(...s.names.keys());
      const close = seen
        .map((n) => [distance(node.name, n), n])
        .filter(([d]) => d <= Math.min(2, Math.floor(node.name.length / 3)))
        .sort((a, b) => a[0] - b[0])[0];
      bad(node, 'Never heard of `' + node.name + '`.' + (close ? ' Did you mean `' + close[1] + '`?' : ''));
    }

    // Moves are declared up front so they can be called before they appear,
    // and their bodies are checked last so they can see names copped below.
    function block(stmts, setup) {
      scope = { names: new Map(), parent: scope, later: [] };
      if (setup) setup();
      stmts.forEach((s) => {
        if (s.type === 'Move') declare(s, s.name, { kind: 'move', arity: s.params.length });
      });
      stmts.forEach(stmt);
      scope.later.forEach((run) => run());
      scope = scope.parent;
    }

    function body(node, params) {
      scope.later.push(() => {
        const outer = ctx;
        ctx = { move: true, loops: 0 };
        block(node.body, () => params.forEach((n) => declare(node, n, { kind: 'cop' })));
        ctx = outer;
      });
    }

    function loop(node, setup) {
      ctx.loops++;
      block(node.body, setup);
      ctx.loops--;
    }

    function stmt(s) {
      switch (s.type) {
        case 'Decl':
          expr(s.init);
          return declare(s, s.name, { kind: s.locked ? 'locked' : 'cop' });
        case 'Spit': return expr(s.value);
        case 'Assert': return expr(s.cond);
        case 'Do': return expr(s.expr);
        case 'If':
          expr(s.cond);
          block(s.then);
          if (s.otherwise) block(s.otherwise);
          return;
        case 'While':
          expr(s.cond);
          return loop(s);
        case 'For':
          expr(s.crew);
          return loop(s, () => declare(s, s.name, { kind: 'loop' }));
        case 'Move': return body(s, s.params);
        case 'Repeat':
          if (scope.parent || ctx.move) bad(s, '`on repeat` goes at the top level, not inside anything.');
          if (++repeats > 1) bad(s, 'One `on repeat` per program.');
          return body(s, s.param ? [s.param] : []);
        case 'Return':
          if (!ctx.move) bad(s, '`cash out` only works inside a move.');
          if (s.value) expr(s.value);
          return;
        case 'Break':
          if (!ctx.loops) bad(s, '`dip` only works inside a loop.');
          return;
        case 'Continue':
          if (!ctx.loops) bad(s, '`keep it moving` only works inside a loop.');
          return;
        case 'Assign': {
          expr(s.value);
          if (s.target.type !== 'Id') return expr(s.target);
          const n = s.target.name;
          const info = lookup(n);
          if (!info) return n in BUILTINS ? bad(s, "`" + n + "` is a built-in. Can't change it.") : unknown(s.target);
          if (info.kind === 'locked') bad(s, "`" + n + "` is locked. Can't change it.");
          if (info.kind === 'move') bad(s, "`" + n + "` is a move. Can't change it.");
          if (info.kind === 'loop') bad(s, "`" + n + "` belongs to the loop. Can't change it.");
          return;
        }
      }
    }

    function expr(e) {
      switch (e.type) {
        case 'Id':
          if (lookup(e.name)) return;
          if (e.name in BUILTINS) { e.builtin = true; return; }
          return unknown(e);
        case 'Bin': expr(e.left); return expr(e.right);
        case 'Not': case 'Neg': return expr(e.arg);
        case 'Index': expr(e.obj); return expr(e.index);
        case 'Member': return expr(e.obj);
        case 'Crew': return e.items.forEach(expr);
        case 'Stash': return e.entries.forEach((x) => expr(x.value));
        case 'Call': {
          expr(e.callee);
          e.args.forEach(expr);
          if (e.callee.type !== 'Id') return;
          const info = lookup(e.callee.name);
          const sig = BUILTINS[e.callee.name];
          const got = e.args.length;
          let min = null, max = null;
          if (info && info.kind === 'move') min = max = info.arity;
          else if (!info && sig !== undefined) { max = sig.replace('?', '').length; min = sig.endsWith('?') ? max - 1 : max; }
          if (min !== null && (got < min || got > max)) {
            const want = min === max ? min : min + ' or ' + max;
            bad(e, '`' + e.callee.name + '` takes ' + want + ', you gave it ' + got + '.');
          }
        }
      }
    }

    block(program);
    if (problems.length) {
      throw new SlangError(problems.sort((a, b) => a.line - b.line || a.col - b.col));
    }
  }

  // --- Emit ----------------------------------------------------------------
  // The tree becomes strict-mode JavaScript. User names get a `_` prefix so
  // they can never collide with JS keywords or the runtime (`$`). Every
  // statement records its line in `$.l`, which is where runtime errors get
  // their line number.
  const HELPER = { up: 'up', down: 'down', times: 'times', split: 'split', '%': 'mod', '<': 'lt', '>': 'gt', '<=': 'le', '>=': 'ge' };

  function emit(program) {
    const lines = (stmts) => stmts.map((s) => '$.l=' + s.line + ';' + S(s)).join('\n');
    const B = (stmts) => '{\n' + lines(stmts) + '\n}';
    const q = JSON.stringify;

    // Emit a body, remembering whether a `cash out` in it leaves a move
    // (which restores the caller's line) or the `on repeat` body (which doesn't).
    let inMove = false;
    const within = (move, stmts) => {
      const outer = inMove;
      inMove = move;
      const js = B(stmts);
      inMove = outer;
      return js;
    };

    function E(e) {
      switch (e.type) {
        case 'Num': return String(e.value);
        case 'Str': return q(e.value);
        case 'Bool': return String(e.value);
        case 'Ghost': return 'null';
        case 'Id': return e.builtin ? '$.b.' + e.name : '_' + e.name;
        case 'Not': return '(!$.t(' + E(e.arg) + '))';
        case 'Neg': return '$.neg(' + E(e.arg) + ')';
        case 'Call': return E(e.callee) + '(' + e.args.map(E).join(',') + ')';
        case 'Index': return '$.at(' + E(e.obj) + ',' + E(e.index) + ')';
        case 'Member': return '$.get(' + E(e.obj) + ',' + q(e.key) + ')';
        case 'Crew': return '[' + e.items.map(E).join(',') + ']';
        case 'Stash': return '({__proto__:null,' + e.entries.map((x) => q(x.key) + ':' + E(x.value)).join(',') + '})';
        case 'Bin': {
          const a = E(e.left), b = E(e.right);
          if (e.op === 'twins') return '(' + a + '===' + b + ')';
          if (e.op === 'beefin') return '(' + a + '!==' + b + ')';
          if (e.op === 'and') return '($.t(' + a + ')&&$.t(' + b + '))';
          if (e.op === 'or') return '($.t(' + a + ')||$.t(' + b + '))';
          return '$.' + HELPER[e.op] + '(' + a + ',' + b + ')';
        }
      }
    }

    function S(s) {
      switch (s.type) {
        case 'Decl': return s.locked ? 'const _' + s.name + '=$.lock(' + E(s.init) + ');' : 'let _' + s.name + '=' + E(s.init) + ';';
        case 'Spit': return '$.spit(' + E(s.value) + ');';
        case 'Assert': return '$.onGod(' + E(s.cond) + ',' + q(s.text) + ');';
        case 'Do': return E(s.expr) + ';';
        case 'If': return 'if($.t(' + E(s.cond) + '))' + B(s.then) + (s.otherwise ? 'else' + B(s.otherwise) : '');
        case 'While': return 'while(($.l=' + s.line + ',$.t(' + E(s.cond) + '))){$.tick();\n' + lines(s.body) + '\n}';
        case 'For': return 'for(const _' + s.name + ' of $.crew(' + E(s.crew) + ')){$.tick();\n' + lines(s.body) + '\n}';
        case 'Return': {
          const v = s.value ? E(s.value) : 'null';
          return inMove ? '{const $r=' + v + ';$.l=$s;return $r;}' : 'return ' + v + ';';
        }
        case 'Break': return 'break;';
        case 'Continue': return 'continue;';
        case 'Repeat': return '$.repeat(function(' + (s.param ? '_' + s.param : '') + ')' + within(false, s.body) + ');';
        case 'Move': {
          const n = s.params.length;
          // A move puts the caller's line back in $.l when it returns, so
          // whatever is left of the calling statement reports the right line.
          // If it throws instead, $.l stays on the line that threw.
          return 'function _' + s.name + '(' + s.params.map((x) => '_' + x).join(',') + '){' +
            'if(arguments.length!==' + n + ')$.arity(' + q(s.name) + ',' + n + ',arguments.length);' +
            'const $s=$.l;' + within(true, s.body) + '$.l=$s;return null;}';
        }
        case 'Assign': {
          const t = s.target, v = E(s.value);
          if (t.type === 'Id') return '_' + t.name + '=' + v + ';';
          if (t.type === 'Index') return '$.put(' + E(t.obj) + ',' + E(t.index) + ',' + v + ');';
          return '$.set(' + E(t.obj) + ',' + q(t.key) + ',' + v + ');';
        }
      }
    }

    return '"use strict";\n' + lines(program);
  }

  function compile(src) {
    const program = parse(src);
    check(program);
    return emit(program);
  }

  // --- Runtime -------------------------------------------------------------
  // What compiled code leans on. Strict on purpose: operators only take the
  // types they are for, and a missing spot or key is an error, never undefined.
  const LOOP_BUDGET = 1e7; // loop turns allowed per run, or per frame

  function show(v, quoted) {
    if (v === null || v === undefined) return 'ghost';
    if (v === true) return 'no cap';
    if (v === false) return 'cap';
    if (typeof v === 'number') return String(Number.isFinite(v) ? +v.toPrecision(12) : v);
    if (typeof v === 'string') return quoted ? JSON.stringify(v) : v;
    if (typeof v === 'function') return 'the move ' + v.name.replace(/^_/, '');
    if (Array.isArray(v)) return '[' + v.map((x) => show(x, true)).join(', ') + ']';
    return '{' + Object.keys(v).map((k) => k + ': ' + show(v[k], true)).join(', ') + '}';
  }

  function kind(v) {
    if (v === null || v === undefined) return 'ghost';
    if (typeof v === 'number') return 'digits';
    if (typeof v === 'string') return 'bars';
    if (typeof v === 'boolean') return show(v);
    if (typeof v === 'function') return 'a move';
    return Array.isArray(v) ? 'a crew' : 'a stash';
  }

  function runtime(host) {
    let turns = 0;
    const oops = (msg) => { throw new SlangError([{ line: $.l, col: 1, msg }]); };
    const isStash = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
    const num = (v) => typeof v === 'number';

    const math = (word, fn) => (a, b) => {
      if (!num(a) || !num(b)) oops("Can't `" + word + '` ' + kind(a) + ' and ' + kind(b) + '. Both gotta be digits.');
      return fn(a, b);
    };
    const nonzero = (word, fn) => math(word, (a, b) => (b === 0 ? oops("Can't `" + word + '` by zero.') : fn(a, b)));

    // A valid spot in a crew or bars.
    const spot = (o, i) => {
      if (!Number.isInteger(i)) oops('A spot is a whole number, got ' + show(i, true) + '.');
      if (i < 0 || i >= o.length) oops("You're outta bounds. Spot " + i + ', but there ' + (o.length === 1 ? 'is' : 'are') + ' only ' + o.length + '.');
      return i;
    };
    const unlocked = (o) => { if (Object.isFrozen(o)) oops("That's locked. Can't change it."); return o; };
    const lock = (v) => {
      if (v !== null && typeof v === 'object' && !Object.isFrozen(v)) {
        Object.freeze(v);
        Object.values(v).forEach(lock);
      }
      return v;
    };

    const core = {
      howBig: (v) => (Array.isArray(v) || typeof v === 'string' ? v.length : isStash(v) ? Object.keys(v).length : oops('`howBig` wants a crew, bars or a stash, got ' + kind(v) + '.')),
      pullUp: (crew, v) => { unlocked($.crew(crew)).push(v); },
      bounce: (crew, i) => unlocked($.crew(crew)).splice(spot(crew, i), 1)[0],
      range: (from, to) => {
        if (to - from > LOOP_BUDGET) oops("That range is way too big.");
        const out = [];
        for (let n = from; n < to; n++) out.push(n);
        return out;
      },
      bars: (v) => show(v),
      digits: (v) => {
        if (num(v)) return v;
        const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
        return Number.isFinite(n) ? n : null;
      },
      has: (stash, key) => (isStash(stash) ? key in stash : oops('`has` wants a stash, got ' + kind(stash) + '.')),
      keys: (stash) => (isStash(stash) ? Object.keys(stash) : oops('`keys` wants a stash, got ' + kind(stash) + '.')),
      gimme: (ask) => (host.gimme ? host.gimme(ask === undefined ? '' : show(ask)) : null),
      floor: Math.floor, round: Math.round, abs: Math.abs, sin: Math.sin, cos: Math.cos,
      sqrt: (n) => (n < 0 ? oops("Can't `sqrt` a negative.") : Math.sqrt(n)),
      min: Math.min, max: Math.max, random: Math.random,
    };

    // Wrap each built-in with a check of its argument types.
    const TYPE = { n: ['digits', num], s: ['bars', (v) => typeof v === 'string'], a: ['', () => true] };
    const builtin = (name, sig, fn) => (...args) => {
      const types = sig.replace('?', '');
      const min = sig.endsWith('?') ? types.length - 1 : types.length;
      if (args.length < min || args.length > types.length) $.arity(name, min, args.length);
      args.forEach((v, i) => {
        const [word, ok] = TYPE[types[i]];
        if (!ok(v)) oops('`' + name + '` wants ' + word + ' in spot ' + (i + 1) + ', got ' + kind(v) + '.');
      });
      const out = fn(...args);
      return out === undefined ? null : out;
    };

    const b = {};
    Object.keys(CORE).forEach((name) => { b[name] = builtin(name, CORE[name], core[name]); });
    Object.keys(STAGE).forEach((name) => {
      b[name] = builtin(name, STAGE[name], (...args) =>
        host.stage ? host.stage[name](...args) : oops('`' + name + '` needs the stage. Run this in the playground.'));
    });

    const $ = {
      l: 0,
      b,
      frame: null,
      reset: () => { turns = 0; },
      tick: () => { if (++turns > LOOP_BUDGET) oops('This block been spinning too long. Infinite loop?'); },
      t: (v) => (typeof v === 'boolean' ? v : oops('Need no cap or cap here, got ' + kind(v) + '.')),
      up: (a, b) => {
        if (num(a) && num(b)) return a + b;
        if (typeof a === 'string' || typeof b === 'string') return show(a) + show(b);
        return oops("Can't `up` " + kind(a) + ' and ' + kind(b) + '. Needs digits, or bars on one side.');
      },
      down: math('down', (a, b) => a - b),
      times: math('times', (a, b) => a * b),
      split: nonzero('split', (a, b) => a / b),
      mod: nonzero('%', (a, b) => a % b),
      lt: math('<', (a, b) => a < b),
      gt: math('>', (a, b) => a > b),
      le: math('<=', (a, b) => a <= b),
      ge: math('>=', (a, b) => a >= b),
      neg: (a) => (num(a) ? -a : oops("Can't put a minus on " + kind(a) + '.')),
      at: (o, i) => {
        if (Array.isArray(o) || typeof o === 'string') return o[spot(o, i)];
        if (!isStash(o)) oops("Can't reach into " + kind(o) + '.');
        if (typeof i !== 'string') oops('A stash is keyed by bars, got ' + kind(i) + '.');
        return i in o ? o[i] : oops("Ain't no `" + i + '` in that stash.');
      },
      put: (o, i, v) => {
        if (Array.isArray(o)) unlocked(o)[spot(o, i)] = v;
        else if (!isStash(o)) oops("Can't put anything into " + kind(o) + '.');
        else if (typeof i !== 'string') oops('A stash is keyed by bars, got ' + kind(i) + '.');
        else unlocked(o)[i] = v;
      },
      get: (o, key) => {
        if (!isStash(o)) oops('Only a stash has `.' + key + '`, and this is ' + kind(o) + '.');
        return key in o ? o[key] : oops("Ain't no `" + key + '` in that stash.');
      },
      set: (o, key, v) => {
        if (!isStash(o)) oops('Only a stash has `.' + key + '`, and this is ' + kind(o) + '.');
        if (!(key in o)) oops("Ain't no `" + key + '` in that stash. Add new keys with stash["' + key + '"].');
        unlocked(o)[key] = v;
      },
      lock,
      crew: (v) => (Array.isArray(v) ? v : oops('Expected a crew, got ' + kind(v) + '.')),
      spit: (v) => host.spit(show(v)),
      arity: (name, want, got) => oops('`' + name + '` takes ' + want + ', you gave it ' + got + '.'),
      onGod: (v, text) => { if (!$.t(v)) oops('On god? Nah. `' + text + '` is cap.'); },
      repeat: (fn) => { $.frame = fn; },
    };
    return $;
  }

  // Errors thrown by JavaScript itself, said the S-lang way.
  function translate(e, line) {
    if (e instanceof SlangError) return e;
    const text = String(e && e.message);
    let msg = text;
    if (e instanceof RangeError) msg = 'Stack blew up. A move keeps calling itself forever.';
    else if (/before initialization|uninitialized/.test(text)) {
      const n = /_(\w+)/.exec(text);
      msg = (n ? '`' + n[1] + '`' : 'Something') + ' got used before it was copped.';
    } else if (/not a function/.test(text)) msg = "You tried to call something that ain't a move.";
    return new SlangError([{ line, col: 1, msg }]);
  }

  // Compile and run. Returns `{ frame }`: the program's `on repeat` body as
  // `frame(dt)`, or null if it has none. The host decides how to drive it.
  //
  // host.spit(text)     required — where output goes
  // host.gimme(prompt)  optional — returns bars or null
  // host.stage          optional — object implementing the STAGE built-ins
  function run(src, host) {
    const js = compile(src);
    const $ = runtime(host);
    const guarded = (fn) => (...args) => {
      $.reset();
      try { return fn(...args); } catch (e) { throw translate(e, $.l); }
    };
    guarded(new Function('$', js))($);
    return { frame: $.frame ? guarded($.frame) : null };
  }

  const Slang = { run, compile, tokenize, show, SlangError, BUILTINS };

  // --- Node: module + command line -----------------------------------------
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Slang;
    if (require.main === module) {
      const args = process.argv.slice(2);
      const file = args.find((a) => !a.startsWith('--'));
      if (!file) {
        console.log('usage: node slang.js program.slang [--check | --js]');
        process.exit(1);
      }
      try {
        const src = require('fs').readFileSync(file, 'utf8');
        if (args.includes('--js')) console.log(compile(src));
        else if (args.includes('--check')) { compile(src); console.log('No cap, ' + file + ' checks out.'); }
        else if (run(src, { spit: (text) => console.log(text) }).frame) {
          console.log('(`on repeat` needs the playground. Ran the setup only.)');
        }
      } catch (e) {
        console.error(e instanceof SlangError ? e.message : e);
        process.exit(1);
      }
    }
  } else {
    root.Slang = Slang;
  }
})(typeof self !== 'undefined' ? self : this);
