peep: FizzBuzz, straight out of the v1.0 manual. Not a character changed.

the move fizzBuzz(limit) {
    cop count = 1

    spin the block while (count < limit up 1) {
        cop byThree = (count % 3) twins 0
        cop byFive = (count % 5) twins 0

        vibe check (byThree and byFive) {
            spit "FizzBuzz"
        } nah vibe check (byThree) {
            spit "Fizz"
        } nah vibe check (byFive) {
            spit "Buzz"
        } nah {
            spit count
        }

        count = count up 1
    }
}

spit "Starting the FizzBuzz test..."
fizzBuzz(15)
spit "We done here."
