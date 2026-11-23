peep: Pang. Pong, but make it S-lang.
peep: W/S or the arrow keys to move. On a phone, drag your thumb.
peep: First to 7 takes it.

locked W = 800
locked H = 500
locked PAD_W = 14
locked PAD_H = 90
locked BALL = 14
locked GOAL = 7
locked YOU_X = 30
locked CPU_X = W down 30 down PAD_W

cop you = { y: 205, score: 0 }
cop cpu = { y: 205, score: 0 }
cop ball = { x: 0, y: 0, vx: 0, vy: 0 }

cop live = cap          // is the ball in play?
cop pace = 0            // how fast the ball is moving
cop serveTo = 1         // 1 heads to the cpu, -1 heads to you
cop wasGo = cap         // was serve held last frame?
cop banner = "PANG"
cop hint = "space or tap to serve"

the move clamp(n, low, high) {
    cash out max(low, min(high, n))
}

the move center() {
    ball.x = (W down BALL) split 2
    ball.y = (H down BALL) split 2
    ball.vx = 0
    ball.vy = 0
    live = cap
}

the move serve() {
    vibe check (you.score twins GOAL or cpu.score twins GOAL) {
        you.score = 0
        cpu.score = 0
    }
    pace = 380
    ball.vx = pace times serveTo
    ball.vy = (random() times 2 down 1) times 200
    live = no cap
    beep(440, 60)
}

peep: Is the ball level with a paddle whose top is at padY?
the move lined(padY) {
    cash out ball.y up BALL > padY and ball.y < padY up PAD_H
}

peep: Send the ball back. Where it struck the paddle sets the angle:
peep: -1 is the top edge, 0 is dead center, 1 is the bottom edge.
the move hit(padY, dir) {
    cop middle = padY up PAD_H split 2
    cop spot = clamp((ball.y up BALL split 2 down middle) split (PAD_H split 2), -1, 1)
    pace = min(900, pace times 1.06)
    ball.vx = dir times pace times cos(spot times 0.9)
    ball.vy = pace times sin(spot times 0.9)
    beep(520, 40)
}

the move scored(who, nextServe) {
    who.score = who.score up 1
    serveTo = nextServe
    center()
    beep(180, 250)

    vibe check (who.score twins GOAL) {
        vibe check (who twins you) {
            banner = "YOU WIN"
        } nah {
            banner = "CPU WINS"
        }
        hint = "space or tap to run it back"
    } nah {
        banner = ""
        hint = "space or tap to serve"
    }
}

the move moveYou(dt) {
    cop finger = fingerY()
    vibe check (finger beefin ghost) {
        you.y = finger down PAD_H split 2
    } nah vibe check (pressed("w") or pressed("up")) {
        you.y = you.y down 520 times dt
    } nah vibe check (pressed("s") or pressed("down")) {
        you.y = you.y up 520 times dt
    }
    you.y = clamp(you.y, 0, H down PAD_H)
}

peep: The cpu chases the ball when it's coming, drifts home when it ain't.
peep: It can only move so fast, which is how you beat it.
the move moveCpu(dt) {
    cop aim = H split 2
    vibe check (ball.vx > 0) {
        aim = ball.y up BALL split 2
    }
    cop gap = aim down (cpu.y up PAD_H split 2)
    cop step = clamp(gap, -330 times dt, 330 times dt)
    cpu.y = clamp(cpu.y up step, 0, H down PAD_H)
}

the move moveBall(dt) {
    cop was = ball.x
    ball.x = ball.x up ball.vx times dt
    ball.y = ball.y up ball.vy times dt

    peep: walls
    vibe check (ball.y < 0) {
        ball.y = 0
        ball.vy = abs(ball.vy)
        beep(330, 30)
    } nah vibe check (ball.y > H down BALL) {
        ball.y = H down BALL
        ball.vy = -abs(ball.vy)
        beep(330, 30)
    }

    peep: paddles. Checking that the ball crossed the paddle's face this
    peep: frame means it can't slip through, however fast it gets.
    locked youFace = YOU_X up PAD_W
    locked cpuFace = CPU_X down BALL
    vibe check (was >= youFace and ball.x < youFace and lined(you.y)) {
        ball.x = youFace
        hit(you.y, 1)
    } nah vibe check (was <= cpuFace and ball.x > cpuFace and lined(cpu.y)) {
        ball.x = cpuFace
        hit(cpu.y, -1)
    }

    peep: out the back
    vibe check (ball.x < -BALL) {
        scored(cpu, -1)
    } nah vibe check (ball.x > W) {
        scored(you, 1)
    }
}

the move draw() {
    wipe("#0b0b0f")
    run through i in range(0, 13) {
        box(W split 2 down 2, i times 40 up 9, 4, 22, "#26262e")
    }
    tag(you.score, W split 2 down 90, 64, 56, "#f5f5f7")
    tag(cpu.score, W split 2 up 90, 64, 56, "#f5f5f7")
    box(YOU_X, you.y, PAD_W, PAD_H, "#f5f5f7")
    box(CPU_X, cpu.y, PAD_W, PAD_H, "#f5f5f7")
    box(ball.x, ball.y, BALL, BALL, "#ffd60a")

    vibe check (not live) {
        tag(banner, W split 2, 200, 76, "#ffd60a")
        tag(hint, W split 2, 300, 22, "#8e8e93")
    }
}

stage(W, H)
center()

on repeat (dt) {
    moveYou(dt)
    moveCpu(dt)

    cop go = pressed("space") or fingerY() beefin ghost
    vibe check (live) {
        moveBall(dt)
    } nah vibe check (go and not wasGo) {
        serve()
    }
    wasGo = go

    draw()
}
