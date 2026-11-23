peep: The tour. Every piece of S-lang in one sitting.
peep: Every `on god` line is a promise. If one is cap, the run stops right there.

peep: --- stashing values ---
cop money = 100             // cop: can change later
locked name = "G"           // locked: can't
cop facts = no cap          // true
cop wallet = ghost          // nothing there

money = money up 50
spit name up " got $" up money

peep: --- math ---
on god 7 up 3 twins 10
on god 7 down 3 twins 4
on god 7 times 3 twins 21
on god 9 split 3 twins 3
on god 7 % 3 twins 1
on god 2 up 3 times 4 twins 14          // times and split go first
on god -5 up 5 twins 0

peep: --- vibe checks ---
vibe check (money > 1000) {
    spit "Balling."
} nah vibe check (money > 100) {
    spit "Doing alright."
} nah {
    spit "Bro you broke."
}

on god not (facts and wallet twins "full")
on god wallet twins ghost or money < 0

peep: --- crews ---
cop homies = ["Dre", "Snoop"]
pullUp(homies, "Pac")
on god howBig(homies) twins 3
on god homies[0] twins "Dre"

run through homie in homies {
    spit "Shoutout to " up homie
}

peep: --- stashes ---
cop whip = { make: "Chevy", year: 1964, clean: no cap }
whip.year = whip.year up 1
on god whip.year twins 1965
whip["color"] = "candy red"             // brackets add a new key
on god has(whip, "color")
spit whip

peep: --- spinning the block ---
cop lap = 0
spin the block while (no cap) {
    lap = lap up 1
    vibe check (lap % 2 twins 0) {
        keep it moving                  // skip the even laps
    }
    vibe check (lap > 6) {
        dip                             // and we out
    }
    spit "Lap " up lap
}

peep: --- moves ---
the move getPaid(hours, rate) {
    vibe check (hours twins 0) {
        cash out ghost
    }
    cash out hours times rate
}

on god getPaid(40, 25) twins 1000
on god getPaid(0, 25) twins ghost

the move stack(n) {
    vibe check (n < 2) {
        cash out n
    }
    cash out stack(n down 1) up stack(n down 2)
}

cop bread = []
run through n in range(0, 10) {
    pullUp(bread, stack(n))
}
spit "Stacking: " up bread

spit "Every promise kept. No cap."
