# S-lang v2: The Official Manual

S-lang is a small programming language with zero cap. If you can talk the talk, you can write the code.

Version 2 keeps everything from v1.0 and adds the pieces a real program needs. It also got strict: S-lang never guesses what you meant. A mistake is caught before the program runs when it can be, and stopped with a line number when it can't.

- **Play with it:** open the playground at `/apps/slang/`.
- **Run a file:** `node apps/slang/slang.js program.slang`
- **Check without running:** `node apps/slang/slang.js program.slang --check`
- **See the JavaScript it becomes:** `node apps/slang/slang.js program.slang --js`
- **Run the tests:** `node apps/slang/test.js`

## 1. Values

| Name | What it is | Looks like |
| --- | --- | --- |
| **bars** | Text. Always double quotes. | `"Hello World"` |
| **digits** | Numbers, whole or not. | `100`, `3.14`, `-5` |
| **no cap** | True. | `no cap` |
| **cap** | False. | `cap` |
| **ghost** | Nothing. The value left the chat. | `ghost` |
| **crew** | An ordered list. | `["Dre", "Snoop"]` |
| **stash** | Named values kept together. | `{ x: 1, y: 2 }` |

Inside bars, `\"` is a quote, `\\` is a backslash, `\n` is a new line.

## 2. Stashing variables

You don't declare variables. You acquire them.

```
cop myMoney = 100        // can change later
locked myName = "G"      // locked in for good

myMoney = myMoney up 50
```

`locked` is deep. A locked crew or stash can't be changed at all, not just reassigned.

A name lives inside the `{ }` block where it was copped, and you can't cop the same name twice in one block.

## 3. Comments

```
// this is a comment
peep: so is this
```

## 4. Spitting output

```
spit "We out here!"
spit 40 times 25
```

## 5. Operators

| S-lang | Means | Example |
| --- | --- | --- |
| `up` | add, or join with bars | `5 up 2`, `"Day " up 3` |
| `down` | subtract | `5 down 2` |
| `times` | multiply | `5 times 2` |
| `split` | divide | `10 split 2` |
| `%` | remainder | `7 % 3` |
| `twins` | equal | `x twins y` |
| `beefin` | not equal | `x beefin y` |
| `<` `>` `<=` `>=` | compare digits | `x > 600` |
| `and` `or` `not` | logic | `a and not b` |
| `-` | negative, in front of a value only | `-5` |

Tightest first: `-`, then `times split %`, then `up down`, then comparisons, then `not`, then `and`, then `or`. Parentheses override.

There is one way to say each thing. `+`, `==`, `&&` and friends are errors that tell you the word to use.

**No guessing.** `up` adds two digits, or joins when either side is bars. Everything else needs digits on both sides. `"5" times 2` is an error, not `10` and not `"55"`. Conditions need a real `no cap` or `cap`; `vibe check (1)` is an error.

`twins` on crews and stashes asks whether they are the same one, not whether they look alike.

## 6. Vibe checks

```
vibe check (creditScore twins 800) {
    spit "You good to go."
} nah vibe check (creditScore > 600) {
    spit "You cutting it close, but bet."
} nah {
    spit "Bro you broke."
}
```

## 7. Spinning the block

```
cop hustle = 0
spin the block while (hustle < 5) {
    spit "Grinding... day " up hustle
    hustle = hustle up 1
}

run through homie in ["Dre", "Snoop", "Pac"] {
    spit "Shoutout to " up homie
}

run through n in range(0, 10) {
    vibe check (n % 2 twins 0) { keep it moving }   // skip to the next lap
    vibe check (n > 6) { dip }                      // leave the loop
    spit n
}
```

A loop that never ends gets stopped for you instead of freezing the page.

## 8. Moves

A function is a move. When the move is done, you cash out.

```
the move getPaid(hours, rate) {
    vibe check (hours twins 0) {
        cash out ghost
    }
    cash out hours times rate
}

spit "Secured the bag: $" up getPaid(40, 25)
```

- A move can be called above where it's written.
- A move that never cashes out gives back `ghost`.
- Calling a move with the wrong number of things is an error.
- A move is a value. You can hand it to another move.

## 9. Crews

```
cop homies = ["Dre", "Snoop"]
pullUp(homies, "Pac")        // joins the end
spit homies[0]               // Dre. Spots start at 0.
homies[1] = "Nate"
spit bounce(homies, 0)       // Dre leaves, and you get him back
spit howBig(homies)          // 2
```

Reaching for a spot that isn't there is an error: `You're outta bounds.`

## 10. Stashes

```
cop whip = { make: "Chevy", year: 1964 }
whip.year = whip.year up 1
spit whip.make
```

A dot is a promise that the key exists. Read or write a key that isn't there and you get an error, so a typo can't quietly make a new one.

Brackets are for keys you only know at run time, and they are how you add one:

```
whip["color"] = "candy red"
spit has(whip, "color")      // no cap
spit keys(whip)              // ["make", "year", "color"]
```

## 11. On god

`on god` is a promise. If it's cap, the program stops and tells you which promise broke.

```
on god getPaid(40, 25) twins 1000
```

```
Line 12: On god? Nah. `getPaid(40, 25) twins 1000` is cap.
```

Put a few next to any move you write. That's your test suite.

## 12. The plug: built-in moves

| Move | Does |
| --- | --- |
| `howBig(x)` | How many in a crew, bars or stash |
| `pullUp(crew, x)` | Add `x` to the end |
| `bounce(crew, spot)` | Remove the one at `spot` and give it back |
| `range(from, to)` | Crew of digits from `from` up to, not including, `to` |
| `has(stash, key)` | Is the key there? |
| `keys(stash)` | Crew of the keys |
| `bars(x)` | Anything, as bars |
| `digits(x)` | Bars as digits, or `ghost` if they aren't a number |
| `gimme(question)` | Ask the person. Gives bars, or `ghost` if they bail |
| `floor(n)` `round(n)` `abs(n)` `sqrt(n)` `sin(n)` `cos(n)` | Math |
| `min(a, b)` `max(a, b)` | Smaller, bigger |
| `random()` | Digits from 0 up to, not including, 1 |

These names are taken. You can't cop a variable called `min`.

## 13. The stage: games

In the playground a program can draw, listen and make noise.

| Move | Does |
| --- | --- |
| `stage(w, h)` | Open a stage `w` wide and `h` tall |
| `wipe(color)` | Fill the whole stage |
| `box(x, y, w, h, color)` | Rectangle, from its top-left corner |
| `dot(x, y, r, color)` | Circle, from its center |
| `tag(what, x, y, size, color)` | Write something, centered on `x, y` |
| `pressed(key)` | Is this key held? `"w"`, `"up"`, `"down"`, `"left"`, `"right"`, `"space"`, `"enter"` |
| `fingerX()` `fingerY()` | Where the finger or mouse is pressing, or `ghost` if it isn't |
| `beep(pitch, ms)` | A beep at `pitch` hertz for `ms` milliseconds |

Colors are bars: `"#ffd60a"`, `"white"`.

`on repeat` runs its block every frame. `dt` is how many seconds went by since the last one, so multiply your speeds by it and the game runs the same on every screen.

```
stage(400, 300)
cop x = 0

on repeat (dt) {
    x = (x up 120 times dt) % 400
    wipe("black")
    dot(x, 150, 20, "#ffd60a")
}
```

One `on repeat` per program, at the top level. `cash out` leaves the frame early.

`examples/pang.slang` is a whole game written this way.

## 14. Layout

Line breaks and indentation are up to you, with one rule: the `(` of a call and the `[` of a spot go on the same line as what they follow. A line that starts with a bracket is always a new statement.

## 15. Words you can't use as names

```
cop locked spit up down times split twins beefin and or not nah cap ghost in dip
```

The longer phrases (`vibe check`, `the move`, `cash out`, `run through`, `spin the block while`, `keep it moving`, `no cap`, `on repeat`, `on god`) only count when the words sit together, so `the`, `run` and `check` are fine names on their own.

## 16. When it goes wrong

Naming mistakes are all found before the program starts, in one pass:

```
Line 2: Never heard of `padle`. Did you mean `paddle`?
Line 9: `score` is locked. Can't change it.
Line 14: `getPaid` takes 2, you gave it 1.
```

Everything else stops the program on the line where it happened:

```
Line 7: Can't `times` bars and digits. Both gotta be digits.
Line 21: You're outta bounds. Spot 3, but there are only 3.
Line 30: Ain't no `colour` in that stash.
```

## 17. The whole grammar

```
program    = statement*
statement  = ("cop" | "locked") NAME "=" expr
           | target "=" expr
           | "spit" expr
           | "vibe check" expr block ("nah" "vibe check" expr block)* ("nah" block)?
           | "spin the block while" expr block
           | "run through" NAME "in" expr block
           | "the move" NAME "(" names? ")" block
           | "cash out" expr?
           | "dip" | "keep it moving"
           | "on repeat" ("(" NAME ")")? block
           | "on god" expr
           | call
block      = "{" statement* "}"
target     = NAME | expr "[" expr "]" | expr "." NAME

expr       = and ("or" and)*
and        = not ("and" not)*
not        = "not" not | compare
compare    = sum (("twins" | "beefin" | "<" | ">" | "<=" | ">=") sum)*
sum        = product (("up" | "down") product)*
product    = unary (("times" | "split" | "%") unary)*
unary      = "-" unary | postfix
postfix    = primary ("(" exprs? ")" | "[" expr "]" | "." NAME)*
primary    = DIGITS | BARS | "no cap" | "cap" | "ghost" | NAME
           | "(" expr ")" | "[" exprs? "]" | "{" (key ":" expr),* "}"
key        = NAME | BARS
```

## 18. What changed since v1.0

Every v1.0 program still runs. New: `not`, negative digits, `dip`, `keep it moving`, stashes, `on god`, `on repeat`, the plug and the stage.

Stricter than v1.0 implied: no mixing types in math, conditions must be `no cap` or `cap`, names are checked before running, `locked` is deep.

Left out on purpose: `+` style aliases, `x += 1` shortcuts, nameless moves, classes, and try/catch. One way to say each thing.
