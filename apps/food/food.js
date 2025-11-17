 // App state
        let choices = [];
        let results = null;
        let resultIndex = 0;

        // Questions data - ORDER IS CRUCIAL FOR KEYS
        const questions = [
            {
                id: 'temperature', // hot/cold
                question: 'How do you want your food?',
                options: ['Hot', 'Cold'],
                icons: ['flame', 'ice-cream']
            },
            {
                id: 'location', // at home/takeout
                question: 'Where do you want to eat?',
                options: ['At Home', 'Takeout'],
                icons: ['home', 'shopping-bag']
            },
            {
                id: 'time', // quick/take your time
                question: 'How much time do you have?',
                options: ['Quick', 'Take My Time'],
                icons: ['zap', 'clock']
            },
            {
                id: 'heaviness', // light/hearty
                question: 'How hungry are you?',
                options: ['Light Meal', 'Hearty Meal'], // Matched to light/hearty
                icons: ['salad', 'pizza']
            },
            {
                id: 'protein', // Meat/Fish or Veggie/Vegan
                question: 'What sounds good?',
                options: ['Meat/Fish', 'Veggie/Vegan'],
                icons: ['drumstick', 'salad']
            },
            {
                id: 'difficulty', // easy/fancy
                question: 'How much effort?',
                options: ['Easy', 'Fancy'],
                icons: ['coffee', 'fish']
            },
            {
                id: 'cuisine', // familiar/adventurous
                question: 'What kind of flavors?',
                options: ['Familiar', 'Adventurous'],
                icons: ['home', 'soup']
            }
        ];

        // Mock Food Suggestions Database
        // Key order: temperature,location,time,heaviness,protein,difficulty,cuisine
        const foodDatabase = {};

        function addFoodItem(tags, foodName) {
            const key = tags.join(',');
            if (!foodDatabase[key]) {
                foodDatabase[key] = [];
            }
            // Avoid adding the exact same food item multiple times to the same list
            if (!foodDatabase[key].includes(foodName)) {
                foodDatabase[key].push(foodName);
            }
        }

        // Helper to create tags and add food item
        // Input tags order: temp (hot/cold), famAdv (familiar/adventurous), quickTime (quick/take your time),
        //                   homeTakeout (at home/takeout), easyFancy (easy/fancy), lightHearty (light/hearty)
        function createTagsAndAdd(foodName, temp, famAdv, quickTime, homeTakeout, easyFancy, lightHearty, inferredProtein) {
            const temperature = temp === 'hot' ? 'Hot' : 'Cold';
            const location = homeTakeout === 'at home' ? 'At Home' : 'Takeout';
            const time = quickTime === 'quick' ? 'Quick' : 'Take My Time';
            const heaviness = lightHearty === 'light' ? 'Light Meal' : 'Hearty Meal';
            // inferredProtein is already 'Meat/Fish' or 'Veggie/Vegan'
            const difficulty = easyFancy === 'easy' ? 'Easy' : 'Fancy';
            const cuisine = famAdv === 'familiar' ? 'Familiar' : 'Adventurous';

            addFoodItem([temperature, location, time, heaviness, inferredProtein, difficulty, cuisine], foodName);
        }

        // Function to shuffle an array (Fisher-Yates algorithm)
function shuffleArray(array) {
    let currentIndex = array.length;
    const newArray = [...array]; // Create a copy to not mutate the original
    let randomIndex;

    // While there remain elements to shuffle.
    while (currentIndex !== 0) {
        // Pick a remaining element.
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        // And swap it with the current element.
        [newArray[currentIndex], newArray[randomIndex]] = [
            newArray[randomIndex], newArray[currentIndex]];
    }
    return newArray;
}

        // Populating the database with 162 items
        // Grains & Breads
        createTagsAndAdd("Bread", "cold", "familiar", "quick", "at home", "easy", "light", "Veggie/Vegan");
        createTagsAndAdd("Baguette", "cold", "familiar", "quick", "at home", "easy", "light", "Veggie/Vegan");
        createTagsAndAdd("Bagel", "hot", "familiar", "quick", "at home", "easy", "hearty", "Veggie/Vegan");
        createTagsAndAdd("Croissant", "hot", "familiar", "take your time", "at home", "fancy", "hearty", "Veggie/Vegan");
        createTagsAndAdd("Tortilla", "hot", "familiar", "quick", "at home", "easy", "light", "Veggie/Vegan");
        createTagsAndAdd("Naan", "hot", "familiar", "quick", "at home", "fancy", "hearty", "Veggie/Vegan");
        createTagsAndAdd("Pita", "cold", "familiar", "quick", "at home", "easy", "light", "Veggie/Vegan");
        createTagsAndAdd("Sourdough", "cold", "adventurous", "take your time", "at home", "fancy", "hearty", "Veggie/Vegan");
        createTagsAndAdd("Brioche", "cold", "adventurous", "take your time", "at home", "fancy", "hearty", "Veggie/Vegan");
        createTagsAndAdd("Focaccia", "hot", "adventurous", "take your time", "at home", "fancy", "hearty", "Veggie/Vegan");
        createTagsAndAdd("Cornbread", "hot", "familiar", "take your time", "at home", "easy", "hearty", "Veggie/Vegan");
        createTagsAndAdd("Muffin", "hot", "familiar", "quick", "at home", "easy", "hearty", "Veggie/Vegan");
        createTagsAndAdd("Pancake", "hot", "familiar", "take your time", "at home", "easy", "hearty", "Veggie/Vegan");
        createTagsAndAdd("Waffle", "hot", "familiar", "take your time", "at home", "fancy", "hearty", "Veggie/Vegan");
        createTagsAndAdd("Cracker", "cold", "familiar", "quick", "at home", "easy", "light", "Veggie/Vegan");
        createTagsAndAdd("Pretzel", "cold", "familiar", "quick", "takeout", "easy", "light", "Veggie/Vegan");
        createTagsAndAdd("Rice", "hot", "familiar", "quick", "at home", "easy", "hearty", "Veggie/Vegan");
        createTagsAndAdd("Oatmeal", "hot", "familiar", "quick", "at home", "easy", "hearty", "Veggie/Vegan");

        // Proteins & Meats
        createTagsAndAdd("Chicken", "hot", "familiar", "quick", "at home", "easy", "light", "Meat/Fish");
        createTagsAndAdd("Beef", "hot", "familiar", "take your time", "at home", "fancy", "hearty", "Meat/Fish");
        createTagsAndAdd("Pork", "hot", "familiar", "take your time", "at home", "easy", "hearty", "Meat/Fish");
        createTagsAndAdd("Lamb", "hot", "adventurous", "take your time", "at home", "fancy", "hearty", "Meat/Fish");
        createTagsAndAdd("Turkey", "hot", "familiar", "take your time", "at home", "easy", "hearty", "Meat/Fish");
        createTagsAndAdd("Bacon", "hot", "familiar", "quick", "at home", "easy", "hearty", "Meat/Fish");
        createTagsAndAdd("Ham", "hot", "familiar", "take your time", "at home", "easy", "hearty", "Meat/Fish"); // Assuming served hot as part of a meal
        createTagsAndAdd("Sausage", "hot", "familiar", "quick", "at home", "easy", "hearty", "Meat/Fish");
        createTagsAndAdd("Meatball", "hot", "familiar", "take your time", "at home", "easy", "hearty", "Meat/Fish");
        createTagsAndAdd("Steak", "hot", "familiar", "take your time", "at home", "fancy", "hearty", "Meat/Fish");
        createTagsAndAdd("Meatloaf", "hot", "familiar", "take your time", "at home", "easy", "hearty", "Meat/Fish");
        createTagsAndAdd("Chicken wings", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Meat/Fish");
        createTagsAndAdd("Shrimp", "hot", "familiar", "quick", "at home", "fancy", "light", "Meat/Fish");
        createTagsAndAdd("Salmon", "hot", "familiar", "take your time", "at home", "fancy", "light", "Meat/Fish");
        createTagsAndAdd("Tuna", "cold", "familiar", "quick", "at home", "easy", "light", "Meat/Fish"); // e.g. tuna salad
        createTagsAndAdd("Crab", "cold", "adventurous", "take your time", "at home", "fancy", "light", "Meat/Fish"); // e.g. crab salad, cold crab legs
        createTagsAndAdd("Tofu", "cold", "adventurous", "quick", "at home", "easy", "light", "Veggie/Vegan"); // Can be hot too, but tagged cold
        createTagsAndAdd("Tempeh", "hot", "adventurous", "quick", "at home", "fancy", "light", "Veggie/Vegan");

        // Dairy & Eggs
        createTagsAndAdd("Milk", "cold", "familiar", "quick", "at home", "easy", "light", "Veggie/Vegan");
        createTagsAndAdd("Yogurt", "cold", "familiar", "quick", "at home", "easy", "light", "Veggie/Vegan");
        createTagsAndAdd("Cheese", "cold", "familiar", "quick", "at home", "fancy", "light", "Veggie/Vegan"); // 'fancy' for general cheese board idea
        createTagsAndAdd("Butter", "cold", "familiar", "quick", "at home", "easy", "light", "Veggie/Vegan");
        createTagsAndAdd("Cream", "cold", "adventurous", "take your time", "at home", "fancy", "light", "Veggie/Vegan");
        createTagsAndAdd("Sour cream", "cold", "familiar", "quick", "at home", "easy", "light", "Veggie/Vegan");
        createTagsAndAdd("Ice cream", "cold", "familiar", "quick", "at home", "easy", "light", "Veggie/Vegan"); // also in sweets
        createTagsAndAdd("Cottage cheese", "cold", "familiar", "quick", "at home", "easy", "light", "Veggie/Vegan");
        createTagsAndAdd("Mozzarella", "cold", "familiar", "quick", "at home", "easy", "light", "Veggie/Vegan");
        createTagsAndAdd("Cheddar", "cold", "familiar", "quick", "at home", "easy", "light", "Veggie/Vegan");
        createTagsAndAdd("Parmesan", "cold", "adventurous", "quick", "at home", "fancy", "light", "Veggie/Vegan");
        createTagsAndAdd("Brie", "cold", "adventurous", "take your time", "at home", "fancy", "light", "Veggie/Vegan");
        createTagsAndAdd("Feta", "cold", "adventurous", "quick", "at home", "easy", "light", "Veggie/Vegan");
        createTagsAndAdd("Goat cheese", "cold", "adventurous", "take your time", "at home", "fancy", "light", "Veggie/Vegan");
        createTagsAndAdd("Scrambled eggs", "hot", "familiar", "quick", "at home", "easy", "hearty", "Veggie/Vegan");
        createTagsAndAdd("Omelet", "hot", "familiar", "take your time", "at home", "fancy", "hearty", "Veggie/Vegan");
        createTagsAndAdd("Boiled egg", "cold", "familiar", "quick", "at home", "easy", "light", "Veggie/Vegan");
        createTagsAndAdd("Poached egg", "hot", "adventurous", "take your time", "at home", "fancy", "light", "Veggie/Vegan");

        // Fruits
        createTagsAndAdd("Apple", "cold", "familiar", "quick", "at home", "easy", "light", "Veggie/Vegan");
        createTagsAndAdd("Banana", "cold", "familiar", "quick", "at home", "easy", "light", "Veggie/Vegan");
        createTagsAndAdd("Orange", "cold", "familiar", "quick", "at home", "easy", "light", "Veggie/Vegan");
        createTagsAndAdd("Strawberry", "cold", "familiar", "quick", "at home", "easy", "light", "Veggie/Vegan");
        createTagsAndAdd("Blueberry", "cold", "familiar", "quick", "at home", "easy", "light", "Veggie/Vegan");
        createTagsAndAdd("Raspberry", "cold", "familiar", "quick", "at home", "easy", "light", "Veggie/Vegan");
        createTagsAndAdd("Mango", "cold", "adventurous", "take your time", "at home", "fancy", "light", "Veggie/Vegan");
        createTagsAndAdd("Pineapple", "cold", "familiar", "take your time", "at home", "easy", "light", "Veggie/Vegan");
        createTagsAndAdd("Watermelon", "cold", "familiar", "take your time", "at home", "easy", "light", "Veggie/Vegan");
        createTagsAndAdd("Melon", "cold", "familiar", "take your time", "at home", "easy", "light", "Veggie/Vegan"); // General melon
        createTagsAndAdd("Peach", "cold", "familiar", "take your time", "at home", "easy", "light", "Veggie/Vegan");
        createTagsAndAdd("Cherry", "cold", "familiar", "quick", "at home", "easy", "light", "Veggie/Vegan");
        createTagsAndAdd("Grape", "cold", "familiar", "quick", "at home", "easy", "light", "Veggie/Vegan");
        createTagsAndAdd("Kiwi", "cold", "adventurous", "quick", "at home", "easy", "light", "Veggie/Vegan");
        createTagsAndAdd("Pear", "cold", "familiar", "take your time", "at home", "easy", "light", "Veggie/Vegan");
        createTagsAndAdd("Apricot", "cold", "adventurous", "quick", "at home", "easy", "light", "Veggie/Vegan");
        createTagsAndAdd("Avocado", "cold", "adventurous", "take your time", "at home", "fancy", "light", "Veggie/Vegan");
        createTagsAndAdd("Dragonfruit", "cold", "adventurous", "take your time", "at home", "fancy", "light", "Veggie/Vegan");

        // Vegetables
        createTagsAndAdd("Carrot", "cold", "familiar", "quick", "at home", "easy", "light", "Veggie/Vegan");
        createTagsAndAdd("Broccoli", "hot", "familiar", "quick", "at home", "easy", "light", "Veggie/Vegan");
        createTagsAndAdd("Cauliflower", "hot", "familiar", "take your time", "at home", "easy", "light", "Veggie/Vegan");
        createTagsAndAdd("Spinach", "cold", "familiar", "quick", "at home", "easy", "light", "Veggie/Vegan"); // Can be hot, tagged as cold
        createTagsAndAdd("Kale", "cold", "adventurous", "take your time", "at home", "easy", "light", "Veggie/Vegan"); // Can be hot, tagged as cold
        createTagsAndAdd("Lettuce", "cold", "familiar", "quick", "at home", "easy", "light", "Veggie/Vegan");
        createTagsAndAdd("Tomato", "cold", "familiar", "quick", "at home", "easy", "light", "Veggie/Vegan");
        createTagsAndAdd("Cucumber", "cold", "familiar", "quick", "at home", "easy", "light", "Veggie/Vegan");
        createTagsAndAdd("Bell pepper", "cold", "familiar", "quick", "at home", "easy", "light", "Veggie/Vegan"); // Can be hot, tagged as cold
        createTagsAndAdd("Onion", "hot", "familiar", "quick", "at home", "easy", "light", "Veggie/Vegan");
        createTagsAndAdd("Garlic", "hot", "adventurous", "quick", "at home", "easy", "light", "Veggie/Vegan");
        createTagsAndAdd("Potato", "hot", "familiar", "quick", "at home", "easy", "hearty", "Veggie/Vegan");
        createTagsAndAdd("Sweet potato", "hot", "familiar", "take your time", "at home", "easy", "hearty", "Veggie/Vegan");
        createTagsAndAdd("Peas", "hot", "familiar", "quick", "at home", "easy", "light", "Veggie/Vegan");
        createTagsAndAdd("Corn", "hot", "familiar", "quick", "at home", "easy", "hearty", "Veggie/Vegan");
        createTagsAndAdd("Zucchini", "hot", "familiar", "quick", "at home", "easy", "light", "Veggie/Vegan");
        createTagsAndAdd("Eggplant", "hot", "adventurous", "take your time", "at home", "fancy", "hearty", "Veggie/Vegan");
        createTagsAndAdd("Mushroom", "hot", "adventurous", "quick", "at home", "easy", "light", "Veggie/Vegan");

        // Soups & Stews
        createTagsAndAdd("Chicken noodle soup", "hot", "familiar", "take your time", "at home", "easy", "light", "Meat/Fish");
        createTagsAndAdd("Tomato soup", "hot", "familiar", "quick", "at home", "easy", "light", "Veggie/Vegan");
        createTagsAndAdd("Clam chowder", "hot", "familiar", "take your time", "at home", "fancy", "hearty", "Meat/Fish");
        createTagsAndAdd("Minestrone", "hot", "familiar", "take your time", "at home", "easy", "hearty", "Veggie/Vegan");
        createTagsAndAdd("Lentil soup", "hot", "adventurous", "take your time", "at home", "easy", "light", "Veggie/Vegan");
        createTagsAndAdd("French onion soup", "hot", "adventurous", "take your time", "at home", "fancy", "light", "Veggie/Vegan");
        createTagsAndAdd("Pho", "hot", "adventurous", "take your time", "takeout", "fancy", "light", "Meat/Fish");
        createTagsAndAdd("Pho", "hot", "adventurous", "take your time", "takeout", "fancy", "light", "Veggie/Vegan");
        createTagsAndAdd("Ramen", "hot", "adventurous", "take your time", "takeout", "fancy", "hearty", "Meat/Fish");
        createTagsAndAdd("Ramen", "hot", "adventurous", "take your time", "takeout", "fancy", "hearty", "Veggie/Vegan");
        createTagsAndAdd("Beef stew", "hot", "familiar", "take your time", "at home", "easy", "hearty", "Meat/Fish");
        createTagsAndAdd("Chili", "hot", "familiar", "take your time", "at home", "easy", "hearty", "Meat/Fish"); // Defaulting to meat version
        createTagsAndAdd("Chili", "hot", "familiar", "take your time", "at home", "easy", "hearty", "Veggie/Vegan"); // Adding veggie chili option
        createTagsAndAdd("Split pea soup", "hot", "adventurous", "take your time", "at home", "easy", "hearty", "Veggie/Vegan"); // often w/ ham, but base is veggie
        createTagsAndAdd("Miso soup", "hot", "adventurous", "quick", "at home", "easy", "light", "Veggie/Vegan");
        createTagsAndAdd("Gazpacho", "cold", "adventurous", "quick", "at home", "fancy", "light", "Veggie/Vegan");
        createTagsAndAdd("Bouillon", "hot", "familiar", "quick", "at home", "easy", "light", "Veggie/Vegan");
        createTagsAndAdd("Goulash", "hot", "adventurous", "take your time", "at home", "fancy", "hearty", "Meat/Fish");
        createTagsAndAdd("Curry", "hot", "adventurous", "take your time", "at home", "fancy", "hearty", "Meat/Fish");
        createTagsAndAdd("Curry", "hot", "adventurous", "take your time", "at home", "fancy", "hearty", "Veggie/Vegan");
        createTagsAndAdd("Gumbo", "hot", "adventurous", "take your time", "at home", "fancy", "hearty", "Meat/Fish");
        createTagsAndAdd("Borscht", "cold", "adventurous", "take your time", "at home", "fancy", "light", "Veggie/Vegan");

        // Sandwiches & Wraps
        createTagsAndAdd("BLT", "cold", "familiar", "quick", "takeout", "easy", "light", "Meat/Fish");
        createTagsAndAdd("Club sandwich", "cold", "familiar", "quick", "takeout", "easy", "hearty", "Meat/Fish");
        createTagsAndAdd("Grilled cheese", "hot", "familiar", "quick", "at home", "easy", "hearty", "Veggie/Vegan");
        createTagsAndAdd("Reuben", "hot", "familiar", "take your time", "takeout", "fancy", "hearty", "Meat/Fish");
        createTagsAndAdd("Philly cheesesteak", "hot", "adventurous", "take your time", "takeout", "fancy", "hearty", "Meat/Fish");
        createTagsAndAdd("Hamburger", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Meat/Fish");
        createTagsAndAdd("Hot dog", "hot", "familiar", "quick", "takeout", "easy", "light", "Meat/Fish");
        createTagsAndAdd("Tuna sandwich", "cold", "familiar", "quick", "takeout", "easy", "light", "Meat/Fish");
        createTagsAndAdd("Egg salad sandwich", "cold", "familiar", "quick", "at home", "easy", "light", "Veggie/Vegan");
        createTagsAndAdd("Chicken salad sandwich", "cold", "familiar", "quick", "at home", "easy", "light", "Meat/Fish");
        createTagsAndAdd("Turkey sandwich", "cold", "familiar", "quick", "takeout", "easy", "light", "Meat/Fish");
        createTagsAndAdd("Pulled pork sandwich", "hot", "familiar", "take your time", "takeout", "fancy", "hearty", "Meat/Fish");
        createTagsAndAdd("Meatball sub", "hot", "familiar", "take your time", "takeout", "fancy", "hearty", "Meat/Fish");
        createTagsAndAdd("Falafel wrap", "cold", "adventurous", "quick", "takeout", "easy", "light", "Veggie/Vegan"); // Can be hot too
        createTagsAndAdd("Burrito", "hot", "adventurous", "quick", "takeout", "easy", "hearty", "Meat/Fish");
        createTagsAndAdd("Burrito", "hot", "adventurous", "quick", "takeout", "easy", "hearty", "Veggie/Vegan");
        createTagsAndAdd("Quesadilla", "hot", "familiar", "quick", "at home", "easy", "hearty", "Meat/Fish");
        createTagsAndAdd("Quesadilla", "hot", "familiar", "quick", "at home", "easy", "hearty", "Veggie/Vegan");
        createTagsAndAdd("Taco", "hot", "familiar", "quick", "takeout", "easy", "light", "Meat/Fish");
        createTagsAndAdd("Taco", "hot", "familiar", "quick", "takeout", "easy", "light", "Veggie/Vegan");
        createTagsAndAdd("Gyro", "hot", "adventurous", "quick", "takeout", "fancy", "hearty", "Meat/Fish");

        // Pasta & Noodles
        createTagsAndAdd("Spaghetti", "hot", "familiar", "quick", "at home", "easy", "hearty", "Veggie/Vegan"); // Assuming marinara/basic
        createTagsAndAdd("Spaghetti with meatballs", "hot", "familiar", "take your time", "at home", "easy", "hearty", "Meat/Fish"); // More specific
        createTagsAndAdd("Fettuccine Alfredo", "hot", "familiar", "take your time", "at home", "fancy", "hearty", "Veggie/Vegan");
        createTagsAndAdd("Fettuccine Alfredo with Chicken", "hot", "familiar", "take your time", "at home", "fancy", "hearty", "Meat/Fish");
        createTagsAndAdd("Mac and cheese", "hot", "familiar", "quick", "at home", "easy", "hearty", "Veggie/Vegan");
        createTagsAndAdd("Lasagna", "hot", "familiar", "take your time", "at home", "fancy", "hearty", "Meat/Fish"); // Usually meat
        createTagsAndAdd("Vegetable Lasagna", "hot", "familiar", "take your time", "at home", "fancy", "hearty", "Veggie/Vegan");
        createTagsAndAdd("Ravioli", "hot", "adventurous", "take your time", "at home", "fancy", "hearty", "Meat/Fish"); // (e.g. meat ravioli)
        createTagsAndAdd("Ravioli", "hot", "adventurous", "take your time", "at home", "fancy", "hearty", "Veggie/Vegan"); // (e.g. cheese/spinach ravioli)
        createTagsAndAdd("Penne", "hot", "familiar", "quick", "at home", "easy", "hearty", "Veggie/Vegan"); // The pasta itself
        createTagsAndAdd("Linguine", "hot", "adventurous", "take your time", "at home", "fancy", "hearty", "Veggie/Vegan"); // The pasta itself
        createTagsAndAdd("Carbonara", "hot", "adventurous", "take your time", "at home", "fancy", "hearty", "Meat/Fish");
        createTagsAndAdd("Bolognese", "hot", "familiar", "take your time", "at home", "fancy", "hearty", "Meat/Fish");
        createTagsAndAdd("Pesto pasta", "hot", "adventurous", "quick", "at home", "fancy", "light", "Veggie/Vegan");
        createTagsAndAdd("Pad Thai", "hot", "adventurous", "take your time", "takeout", "fancy", "light", "Meat/Fish");
        createTagsAndAdd("Pad Thai", "hot", "adventurous", "take your time", "takeout", "fancy", "light", "Veggie/Vegan");
        createTagsAndAdd("Chow mein", "hot", "adventurous", "quick", "takeout", "easy", "light", "Meat/Fish");
        createTagsAndAdd("Chow mein", "hot", "adventurous", "quick", "takeout", "easy", "light", "Veggie/Vegan");
        createTagsAndAdd("Udon", "hot", "adventurous", "take your time", "at home", "fancy", "hearty", "Meat/Fish");
        createTagsAndAdd("Udon", "hot", "adventurous", "take your time", "at home", "fancy", "hearty", "Veggie/Vegan");
        createTagsAndAdd("Soba", "hot", "adventurous", "quick", "at home", "easy", "light", "Meat/Fish"); // Can be served cold too
        createTagsAndAdd("Soba", "hot", "adventurous", "quick", "at home", "easy", "light", "Veggie/Vegan");
        createTagsAndAdd("Soba (cold)", "cold", "adventurous", "quick", "at home", "easy", "light", "Veggie/Vegan");
        createTagsAndAdd("Macaroni salad", "cold", "familiar", "quick", "at home", "easy", "light", "Veggie/Vegan");
        createTagsAndAdd("Ziti", "hot", "familiar", "quick", "at home", "easy", "hearty", "Veggie/Vegan"); // e.g. Baked Ziti (cheese)
        createTagsAndAdd("Ramen noodles", "hot", "familiar", "quick", "at home", "easy", "hearty", "Veggie/Vegan"); // Instant noodles
        createTagsAndAdd("Orzo", "hot", "adventurous", "quick", "at home", "easy", "light", "Veggie/Vegan");

        // Snacks & Sweets
        createTagsAndAdd("Chocolate chip cookie", "cold", "familiar", "quick", "at home", "easy", "light", "Veggie/Vegan");
        createTagsAndAdd("Brownie", "cold", "familiar", "quick", "at home", "easy", "hearty", "Veggie/Vegan");
        createTagsAndAdd("Cupcake", "cold", "familiar", "quick", "at home", "easy", "light", "Veggie/Vegan");
        createTagsAndAdd("Doughnut", "cold", "familiar", "quick", "at home", "easy", "hearty", "Veggie/Vegan");
        // Ice cream already added in Dairy
        createTagsAndAdd("Cake", "cold", "familiar", "take your time", "at home", "fancy", "hearty", "Veggie/Vegan");
        createTagsAndAdd("Pie", "cold", "familiar", "take your time", "at home", "fancy", "hearty", "Veggie/Vegan"); // Can be hot too
        createTagsAndAdd("Apple Pie (hot)", "hot", "familiar", "take your time", "at home", "fancy", "hearty", "Veggie/Vegan");
        createTagsAndAdd("Mochi", "cold", "adventurous", "quick", "at home", "fancy", "light", "Veggie/Vegan");
        createTagsAndAdd("Candy bar", "cold", "familiar", "quick", "at home", "easy", "light", "Veggie/Vegan");
        createTagsAndAdd("Popcorn", "hot", "familiar", "quick", "at home", "easy", "light", "Veggie/Vegan");
        createTagsAndAdd("Potato chips", "cold", "familiar", "quick", "at home", "easy", "light", "Veggie/Vegan");
        createTagsAndAdd("Trail mix", "cold", "adventurous", "quick", "at home", "easy", "light", "Veggie/Vegan");
        createTagsAndAdd("Granola bar", "cold", "familiar", "quick", "at home", "easy", "light", "Veggie/Vegan");
        createTagsAndAdd("Yogurt parfait", "cold", "adventurous", "quick", "at home", "easy", "light", "Veggie/Vegan");
        createTagsAndAdd("Fruit salad", "cold", "familiar", "quick", "at home", "easy", "light", "Veggie/Vegan");
        createTagsAndAdd("Churros", "hot", "adventurous", "quick", "takeout", "easy", "light", "Veggie/Vegan");
        createTagsAndAdd("Tiramisu", "cold", "adventurous", "take your time", "at home", "fancy", "light", "Veggie/Vegan");
        createTagsAndAdd("Macaron", "cold", "adventurous", "take your time", "at home", "fancy", "light", "Veggie/Vegan");

// --- NEW TAKEOUT & RESTAURANT ITEMS ---

// McDonald's
createTagsAndAdd("McCrispy™ (McDonald's)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Big Mac® (McDonald's)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Chicken McNuggets® (McDonald's)", "hot", "familiar", "quick", "takeout", "easy", "light", "Meat/Fish");
createTagsAndAdd("Quarter Pounder® with Cheese (McDonald's)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("McChicken® (McDonald's)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("McDouble® (McDonald's)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Double Cheeseburger (McDonald's)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Triple Cheeseburger (McDonald's)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Filet-O-Fish® (McDonald's)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Egg McMuffin® (McDonald's)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Sausage Burrito (McDonald's)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Sausage Biscuit (McDonald's)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Hotcakes (McDonald's)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Veggie/Vegan");
createTagsAndAdd("Bacon, Egg & Cheese Biscuit (McDonald's)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Hash Browns (McDonald's)", "hot", "familiar", "quick", "takeout", "easy", "light", "Veggie/Vegan");
createTagsAndAdd("French Fries (McDonald's)", "hot", "familiar", "quick", "takeout", "easy", "light", "Veggie/Vegan");
createTagsAndAdd("Baked Apple Pie (McDonald's)", "hot", "familiar", "quick", "takeout", "easy", "light", "Veggie/Vegan");
createTagsAndAdd("McFlurry® (McDonald's)", "cold", "familiar", "quick", "takeout", "easy", "light", "Veggie/Vegan");

// Burger King
createTagsAndAdd("Whopper (Burger King)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Big King (Burger King)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Bacon King (Burger King)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Double Whopper (Burger King)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Impossible Whopper (Burger King)", "hot", "adventurous", "quick", "takeout", "easy", "hearty", "Veggie/Vegan");
createTagsAndAdd("BK Chicken Fries (Burger King)", "hot", "familiar", "quick", "takeout", "easy", "light", "Meat/Fish");
createTagsAndAdd("BK Stacker (Burger King)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Rodeo King (Burger King)", "hot", "adventurous", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Original Chicken Sandwich (Burger King)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Chicken Nuggets (Burger King)", "hot", "familiar", "quick", "takeout", "easy", "light", "Meat/Fish");
createTagsAndAdd("Fish Sandwich (Burger King)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("BK Veggie Burger", "hot", "adventurous", "quick", "takeout", "easy", "light", "Veggie/Vegan");
createTagsAndAdd("French Fries (Burger King)", "hot", "familiar", "quick", "takeout", "easy", "light", "Veggie/Vegan");
createTagsAndAdd("Onion Rings (Burger King)", "hot", "familiar", "quick", "takeout", "easy", "light", "Veggie/Vegan");
createTagsAndAdd("Hershey’s Sundae Pie (Burger King)", "cold", "familiar", "quick", "takeout", "easy", "light", "Veggie/Vegan");
createTagsAndAdd("Breakfast Croissan’wich (Burger King)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Pancakes (Burger King)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Veggie/Vegan");

// Wendy's
createTagsAndAdd("Dave’s Single (Wendy's)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Dave’s Double (Wendy's)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Jr. Bacon Cheeseburger (Wendy's)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Double Stack (Wendy's)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Baconator (Wendy's)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Spicy Chicken Sandwich (Wendy’s)", "hot", "adventurous", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Asiago Ranch Chicken Club (Wendy’s)", "hot", "adventurous", "quick", "takeout", "fancy", "hearty", "Meat/Fish");
createTagsAndAdd("Pretzel Bacon Pub Cheeseburger (Wendy’s)", "hot", "adventurous", "quick", "takeout", "fancy", "hearty", "Meat/Fish");
createTagsAndAdd("Grilled Chicken Sandwich (Wendy’s)", "hot", "familiar", "quick", "takeout", "easy", "light", "Meat/Fish");
createTagsAndAdd("Crispy Chicken BLT (Wendy’s)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Baked Potato (Wendy’s)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Veggie/Vegan");
createTagsAndAdd("Chili (Wendy’s)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Frosty (Wendy's)", "cold", "familiar", "quick", "takeout", "easy", "light", "Veggie/Vegan");
createTagsAndAdd("Chicken Nuggets (Wendy’s)", "hot", "familiar", "quick", "takeout", "easy", "light", "Meat/Fish");
createTagsAndAdd("Bacon Mushroom Melt (Wendy's)", "hot", "adventurous", "quick", "takeout", "fancy", "hearty", "Meat/Fish");
createTagsAndAdd("Apple Pecan Chicken Salad (Wendy's)", "cold", "adventurous", "quick", "takeout", "fancy", "light", "Meat/Fish");
createTagsAndAdd("Parmesan Caesar Salad (Wendy's)", "cold", "familiar", "quick", "takeout", "fancy", "light", "Meat/Fish"); // Caesar usually has chicken
createTagsAndAdd("Garden Salad (Wendy's)", "cold", "familiar", "quick", "takeout", "easy", "light", "Veggie/Vegan");

// Chick-fil-A
createTagsAndAdd("Chick-fil-A Chicken Sandwich", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Spicy Chicken Sandwich (Chick-fil-A)", "hot", "adventurous", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Chick-fil-A Nuggets", "hot", "familiar", "quick", "takeout", "easy", "light", "Meat/Fish");
createTagsAndAdd("Grilled Nuggets (Chick-fil-A)", "hot", "adventurous", "quick", "takeout", "easy", "light", "Meat/Fish");
createTagsAndAdd("Chick-n-Strips (Chick-fil-A)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Grilled Chicken Club (Chick-fil-A)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Chicken Biscuit (Chick-fil-A)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Spicy Chicken Biscuit (Chick-fil-A)", "hot", "adventurous", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Hash Brown Scramble Burrito (Chick-fil-A)", "hot", "adventurous", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Hash Brown Scramble Bowl (Chick-fil-A)", "hot", "adventurous", "quick", "takeout", "easy", "hearty", "Meat/Fish");

// Popeyes
createTagsAndAdd("Classic Chicken Sandwich (Popeyes)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Spicy Chicken Sandwich (Popeyes)", "hot", "adventurous", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Bonafide Bone-In Chicken (Popeyes)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Blackened Tenders (Popeyes)", "hot", "adventurous", "quick", "takeout", "easy", "light", "Meat/Fish");
createTagsAndAdd("Popcorn Shrimp (Popeyes)", "hot", "adventurous", "quick", "takeout", "easy", "light", "Meat/Fish");
createTagsAndAdd("Red Beans & Rice (Popeyes)", "hot", "adventurous", "quick", "takeout", "easy", "hearty", "Veggie/Vegan");
createTagsAndAdd("Cajun Fries (Popeyes)", "hot", "adventurous", "quick", "takeout", "easy", "light", "Veggie/Vegan");
createTagsAndAdd("Mashed Potatoes with Cajun Gravy (Popeyes)", "hot", "adventurous", "quick", "takeout", "easy", "hearty", "Veggie/Vegan");
createTagsAndAdd("Biscuit (Popeyes)", "hot", "familiar", "quick", "takeout", "easy", "light", "Veggie/Vegan");
createTagsAndAdd("Mac & Cheese (Popeyes)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Veggie/Vegan");

// Raising Cane's
createTagsAndAdd("The Box Combo (Raising Cane’s)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("The Caniac Combo (Raising Cane’s)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Meat/Fish");

// Domino's
createTagsAndAdd("ExtravaganZZa Specialty Pizza (Domino's)", "hot", "adventurous", "take your time", "takeout", "fancy", "hearty", "Meat/Fish");
createTagsAndAdd("Philly Cheese Steak Pizza (Domino's)", "hot", "adventurous", "take your time", "takeout", "fancy", "hearty", "Meat/Fish");
createTagsAndAdd("Pacific Veggie Pizza (Domino's)", "hot", "adventurous", "take your time", "takeout", "fancy", "light", "Veggie/Vegan");
createTagsAndAdd("Buffalo Chicken Pizza (Domino's)", "hot", "adventurous", "take your time", "takeout", "fancy", "hearty", "Meat/Fish");
createTagsAndAdd("Cheeseburger Pizza (Domino's)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("MeatZZa Pizza (Domino's)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Pepperoni Stuffed Cheesy Bread (Domino's)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Cheddar Bacon Loaded Tots (Domino's)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Melty 3-Cheese Loaded Tots (Domino's)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Veggie/Vegan");
createTagsAndAdd("Chocolate Lava Crunch Cake (Domino's)", "hot", "familiar", "quick", "takeout", "fancy", "light", "Veggie/Vegan");
createTagsAndAdd("Breadsticks (Domino’s)", "hot", "familiar", "quick", "takeout", "easy", "light", "Veggie/Vegan");
createTagsAndAdd("Boneless Wings (Domino's)", "hot", "familiar", "quick", "takeout", "easy", "light", "Meat/Fish");

// Pizza Hut
createTagsAndAdd("Cheese Pizza (Pizza Hut)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Veggie/Vegan");
createTagsAndAdd("Pepperoni Pizza (Pizza Hut)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Supreme Pizza (Pizza Hut)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Meat Lover’s® Pizza (Pizza Hut)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Ultimate Cheese Lover’s Pizza (Pizza Hut)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Veggie/Vegan");
createTagsAndAdd("Triple Treat Box (Pizza Hut)", "hot", "familiar", "take your time", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Breadsticks (Pizza Hut)", "hot", "familiar", "quick", "takeout", "easy", "light", "Veggie/Vegan");
createTagsAndAdd("Cheese Sticks (Pizza Hut)", "hot", "familiar", "quick", "takeout", "easy", "light", "Veggie/Vegan");
createTagsAndAdd("Cinnamon Sticks (Pizza Hut)", "hot", "familiar", "quick", "takeout", "easy", "light", "Veggie/Vegan");
createTagsAndAdd("8-piece Wings (Pizza Hut)", "hot", "familiar", "quick", "takeout", "easy", "light", "Meat/Fish");

// Papa John's
createTagsAndAdd("Pepperoni Pizza (Papa John’s)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("The Works Pizza (Papa John’s)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("BBQ Chicken Pizza (Papa John’s)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Garden Fresh Pizza (Papa John’s)", "hot", "adventurous", "quick", "takeout", "easy", "light", "Veggie/Vegan");
createTagsAndAdd("Parmesan Bread Bites (Papa John’s)", "hot", "adventurous", "quick", "takeout", "easy", "light", "Veggie/Vegan");
createTagsAndAdd("Stuffed Cheesy Bread (Papa John’s)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Veggie/Vegan");
createTagsAndAdd("Chicken Poppers (Papa John’s)", "hot", "familiar", "quick", "takeout", "easy", "light", "Meat/Fish");
createTagsAndAdd("Garlic Knots (Papa John’s)", "hot", "familiar", "quick", "takeout", "easy", "light", "Veggie/Vegan");
createTagsAndAdd("Cinnamon Pull-Apart Slices (Papa John’s)", "hot", "familiar", "quick", "takeout", "easy", "light", "Veggie/Vegan");

// Taco Bell
createTagsAndAdd("Crunchy Taco (Taco Bell)", "hot", "familiar", "quick", "takeout", "easy", "light", "Meat/Fish");
createTagsAndAdd("Soft Taco (Taco Bell)", "hot", "familiar", "quick", "takeout", "easy", "light", "Meat/Fish");
createTagsAndAdd("Chalupa Supreme (Taco Bell)", "hot", "adventurous", "quick", "takeout", "easy", "light", "Meat/Fish");
createTagsAndAdd("Crunchwrap Supreme® (Taco Bell)", "hot", "adventurous", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Quesadilla (Taco Bell)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Nachos BellGrande® (Taco Bell)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Cheesy Gordita Crunch (Taco Bell)", "hot", "adventurous", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Doritos® Locos Taco (Taco Bell)", "hot", "adventurous", "quick", "takeout", "easy", "light", "Meat/Fish");
createTagsAndAdd("Cheesy Roll Up (Taco Bell)", "hot", "familiar", "quick", "takeout", "easy", "light", "Veggie/Vegan");
createTagsAndAdd("Beefy 5-Layer Burrito (Taco Bell)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Meat/Fish");

// Chipotle & Moe's
createTagsAndAdd("Chicken Burrito (Chipotle)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Steak Burrito Bowl (Chipotle)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Sofritas Burrito (Chipotle)", "hot", "adventurous", "quick", "takeout", "easy", "hearty", "Veggie/Vegan");
createTagsAndAdd("Barbacoa Salad (Chipotle)", "cold", "adventurous", "quick", "takeout", "easy", "light", "Meat/Fish");
createTagsAndAdd("Quesabirria Tacos", "hot", "adventurous", "quick", "takeout", "fancy", "light", "Meat/Fish");
createTagsAndAdd("Nachos", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("3-Cheese Nachos (Moe's)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Veggie/Vegan");
createTagsAndAdd("Smoked Brisket Burrito (Moe's)", "hot", "adventurous", "quick", "takeout", "fancy", "hearty", "Meat/Fish");
createTagsAndAdd("Homewrecker Burrito (Moe's)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Joey Bag of Donuts (Moe's)", "hot", "familiar", "quick", "takeout", "easy", "light", "Meat/Fish"); // This is a burrito name

// Subway
createTagsAndAdd("Italian B.M.T.® (Subway)", "cold", "familiar", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Turkey Breast Sub (Subway)", "cold", "familiar", "quick", "takeout", "easy", "light", "Meat/Fish");
createTagsAndAdd("Meatball Marinara Sub (Subway)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Tuna Sub (Subway)", "cold", "familiar", "quick", "takeout", "easy", "light", "Meat/Fish");
createTagsAndAdd("Veggie Delite® (Subway)", "cold", "adventurous", "quick", "takeout", "easy", "light", "Veggie/Vegan");
createTagsAndAdd("Oven Roasted Chicken Sub (Subway)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Meat/Fish");

// Panda Express
createTagsAndAdd("Orange Chicken (Panda Express)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Beijing Beef (Panda Express)", "hot", "adventurous", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Kung Pao Chicken (Panda Express)", "hot", "adventurous", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Broccoli Beef (Panda Express)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Honey Walnut Shrimp (Panda Express)", "hot", "adventurous", "quick", "takeout", "fancy", "light", "Meat/Fish");
createTagsAndAdd("Chow Mein (Panda Express)", "hot", "familiar", "quick", "takeout", "easy", "light", "Veggie/Vegan");

// Noodles & Company
createTagsAndAdd("Wisconsin Mac & Cheese (Noodles & Co.)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Veggie/Vegan");
createTagsAndAdd("Alfredo MontAmore (Noodles & Co.)", "hot", "familiar", "take your time", "takeout", "fancy", "hearty", "Meat/Fish"); // Has chicken
createTagsAndAdd("Japanese Pan Noodles (Noodles & Co.)", "hot", "adventurous", "take your time", "takeout", "fancy", "light", "Veggie/Vegan");
createTagsAndAdd("Fettuccine Alfredo (Noodles & Co.)", "hot", "familiar", "take your time", "takeout", "fancy", "hearty", "Veggie/Vegan");

// Olive Garden
createTagsAndAdd("Chicken Parmigiana (Olive Garden)", "hot", "familiar", "take your time", "takeout", "fancy", "hearty", "Meat/Fish");
createTagsAndAdd("Tour of Italy (Olive Garden)", "hot", "adventurous", "take your time", "takeout", "fancy", "hearty", "Meat/Fish");
createTagsAndAdd("Lasagna Classico (Olive Garden)", "hot", "familiar", "take your time", "takeout", "fancy", "hearty", "Meat/Fish");
createTagsAndAdd("Zuppa Toscana (Olive Garden)", "hot", "familiar", "take your time", "takeout", "fancy", "light", "Meat/Fish");
createTagsAndAdd("Shrimp Scampi (Olive Garden)", "hot", "familiar", "take your time", "takeout", "fancy", "light", "Meat/Fish");

// Red Lobster
createTagsAndAdd("Admiral’s Feast (Red Lobster)", "hot", "familiar", "take your time", "takeout", "fancy", "hearty", "Meat/Fish");
createTagsAndAdd("Ultimate Feast® (Red Lobster)", "hot", "familiar", "take your time", "takeout", "fancy", "hearty", "Meat/Fish");
createTagsAndAdd("Shrimp Linguini Alfredo (Red Lobster)", "hot", "familiar", "take your time", "takeout", "fancy", "hearty", "Meat/Fish");
createTagsAndAdd("Lobster Roll (Red Lobster)", "cold", "adventurous", "quick", "takeout", "fancy", "light", "Meat/Fish");
createTagsAndAdd("Crab Linguini Alfredo (Red Lobster)", "hot", "familiar", "take your time", "takeout", "fancy", "hearty", "Meat/Fish");
createTagsAndAdd("Seafood-Stuffed Mushrooms (Red Lobster)", "hot", "adventurous", "take your time", "takeout", "fancy", "light", "Meat/Fish");

// Outback Steakhouse
createTagsAndAdd("Bloomin’ Onion (Outback)", "hot", "familiar", "take your time", "takeout", "fancy", "hearty", "Veggie/Vegan");
createTagsAndAdd("Victoria’s Filet Mignon (Outback)", "hot", "familiar", "take your time", "takeout", "fancy", "hearty", "Meat/Fish");
createTagsAndAdd("Alice Springs Chicken (Outback)", "hot", "familiar", "take your time", "takeout", "fancy", "hearty", "Meat/Fish");
createTagsAndAdd("Steakhouse Mac & Cheese (Outback)", "hot", "familiar", "take your time", "takeout", "fancy", "hearty", "Veggie/Vegan");
createTagsAndAdd("Grilled Shrimp on the Barbie (Outback)", "hot", "adventurous", "take your time", "takeout", "fancy", "light", "Meat/Fish");

// Buffalo Wild Wings
createTagsAndAdd("Traditional Wings (BWW)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Boneless Wings (BWW)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Ultimate Nachos (BWW)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Cheese Curds (BWW)", "hot", "adventurous", "quick", "takeout", "easy", "light", "Veggie/Vegan");

// IHOP
createTagsAndAdd("Original Buttermilk Pancakes (IHOP)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Veggie/Vegan");
createTagsAndAdd("New York Cheesecake Pancakes (IHOP)", "hot", "adventurous", "take your time", "takeout", "fancy", "hearty", "Veggie/Vegan");
createTagsAndAdd("Belgian Waffles (IHOP)", "hot", "familiar", "take your time", "takeout", "fancy", "hearty", "Veggie/Vegan");
createTagsAndAdd("Chicken & Waffles (IHOP)", "hot", "adventurous", "take your time", "takeout", "fancy", "hearty", "Meat/Fish");
createTagsAndAdd("Omelette Sampler (IHOP)", "hot", "familiar", "take your time", "takeout", "fancy", "hearty", "Meat/Fish");
createTagsAndAdd("French Toast (IHOP)", "hot", "familiar", "take your time", "takeout", "easy", "hearty", "Veggie/Vegan");

// Denny's & Waffle House
createTagsAndAdd("Grand Slam (Denny's)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Moons Over My Hammy (Denny's)", "hot", "adventurous", "take your time", "takeout", "fancy", "hearty", "Meat/Fish");
createTagsAndAdd("Lumberjack Slam (Denny's)", "hot", "familiar", "take your time", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Country-Fried Steak & Eggs (Denny's)", "hot", "familiar", "take your time", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("All-Star Special (Waffle House)", "hot", "familiar", "take your time", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Texas Bacon Cheesesteak Melt (Waffle House)", "hot", "adventurous", "quick", "takeout", "fancy", "hearty", "Meat/Fish");

// Panera Bread & Starbucks
createTagsAndAdd("Broccoli Cheddar Soup (Panera)", "hot", "familiar", "quick", "takeout", "easy", "light", "Veggie/Vegan");
createTagsAndAdd("Bacon Turkey Bravo Sandwich (Panera)", "cold", "familiar", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Mac & Cheese (Panera)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Veggie/Vegan");
createTagsAndAdd("Steak & Arugula Salad (Panera)", "cold", "adventurous", "quick", "takeout", "fancy", "light", "Meat/Fish");
createTagsAndAdd("You Pick Two® Combo (Panera)", "hot", "familiar", "quick", "takeout", "easy", "light", "Meat/Fish"); // Can be many things, using as a general tag
createTagsAndAdd("Bagels & Cream Cheese (Panera)", "cold", "familiar", "quick", "takeout", "easy", "light", "Veggie/Vegan");
createTagsAndAdd("Bacon, Gouda & Egg Sandwich (Starbucks)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Meat/Fish");

// Dairy Queen
createTagsAndAdd("Chicken Strip Basket (DQ)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("FlameThrower GrillBurger (DQ)", "hot", "adventurous", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Blizzard® Treat (DQ)", "cold", "familiar", "quick", "takeout", "easy", "light", "Veggie/Vegan");

// --- NEW ENTRIES: LOCAL RESTAURANTS (32563 AREA) & GOURMET OPTIONS ---

// --- Local & Regional Restaurants (Takeout) ---
createTagsAndAdd("Blackened Redfish (Broussard's)", "hot", "adventurous", "take your time", "takeout", "fancy", "hearty", "Meat/Fish");
createTagsAndAdd("Shrimp & Grits (Broussard's)", "hot", "familiar", "take your time", "takeout", "fancy", "hearty", "Meat/Fish");
createTagsAndAdd("Oysters Broussard", "hot", "adventurous", "take your time", "takeout", "fancy", "light", "Meat/Fish");
createTagsAndAdd("Grouper Margarita (Cactus Flower Cafe)", "hot", "adventurous", "take your time", "takeout", "fancy", "hearty", "Meat/Fish");
createTagsAndAdd("Puffy Tacos (Cactus Flower Cafe)", "hot", "adventurous", "take your time", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("The Grand Marlin Praline Grouper", "hot", "adventurous", "take your time", "takeout", "fancy", "hearty", "Meat/Fish");
createTagsAndAdd("Lobster Fingers (The Grand Marlin)", "hot", "adventurous", "take your time", "takeout", "fancy", "light", "Meat/Fish");
createTagsAndAdd("Snapper Pontchartrain (The Grand Marlin)", "hot", "adventurous", "take your time", "takeout", "fancy", "hearty", "Meat/Fish");
createTagsAndAdd("Grilled Amberjack Sandwich (Dewey Destin's)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Fried Crab Claws (Dewey Destin's)", "hot", "familiar", "quick", "takeout", "easy", "light", "Meat/Fish");
createTagsAndAdd("Steamed Royal Red Shrimp (Dewey Destin's)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Reuben Eggrolls (McGuire's Irish Pub)", "hot", "adventurous", "take your time", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Senate Bean Soup (McGuire's Irish Pub)", "hot", "familiar", "take your time", "takeout", "easy", "light", "Meat/Fish");
createTagsAndAdd("Shepherd's Pie (McGuire's Irish Pub)", "hot", "familiar", "take your time", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Wood-Fired Pizza (Pizza On The Bayou)", "hot", "familiar", "take your time", "takeout", "fancy", "hearty", "Meat/Fish");
createTagsAndAdd("Tuna Poke Bowl (The Slippery Mermaid)", "cold", "adventurous", "quick", "takeout", "fancy", "light", "Meat/Fish");
createTagsAndAdd("Dragon Roll Sushi (The Slippery Mermaid)", "cold", "adventurous", "quick", "takeout", "fancy", "light", "Meat/Fish");
createTagsAndAdd("Seafood Gumbo (Stewby's Seafood Shanty)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Smoked Tuna Dip (Stewby's Seafood Shanty)", "cold", "familiar", "quick", "takeout", "easy", "light", "Meat/Fish");
createTagsAndAdd("Beignets (Taste of New Orleans)", "hot", "adventurous", "quick", "takeout", "easy", "light", "Veggie/Vegan");
createTagsAndAdd("Jambalaya (Taste of New Orleans)", "hot", "adventurous", "take your time", "takeout", "easy", "hearty", "Meat/Fish");

// --- Adventurous, Fancy & Cold "At Home" Options ---

// --- Fancy "At Home" - Hot Meals ---
createTagsAndAdd("Homemade Beef Wellington", "hot", "adventurous", "take your time", "at home", "fancy", "hearty", "Meat/Fish");
createTagsAndAdd("Pan-Seared Duck Breast with Berry Sauce", "hot", "adventurous", "take your time", "at home", "fancy", "hearty", "Meat/Fish");
createTagsAndAdd("Homemade Lobster Thermidor", "hot", "adventurous", "take your time", "at home", "fancy", "hearty", "Meat/Fish");
createTagsAndAdd("Seared Scallops with Risotto", "hot", "adventurous", "take your time", "at home", "fancy", "light", "Meat/Fish");
createTagsAndAdd("Mushroom Bourguignon (Vegan)", "hot", "adventurous", "take your time", "at home", "fancy", "hearty", "Veggie/Vegan");
createTagsAndAdd("Homemade Paella with Seafood", "hot", "adventurous", "take your time", "at home", "fancy", "hearty", "Meat/Fish");
createTagsAndAdd("Vegan Paella", "hot", "adventurous", "take your time", "at home", "fancy", "hearty", "Veggie/Vegan");
createTagsAndAdd("Braised Short Ribs", "hot", "familiar", "take your time", "at home", "fancy", "hearty", "Meat/Fish");
createTagsAndAdd("Gourmet Mac & Cheese with Truffle Oil", "hot", "adventurous", "take your time", "at home", "fancy", "hearty", "Veggie/Vegan");
createTagsAndAdd("Cacio e Pepe", "hot", "adventurous", "quick", "at home", "fancy", "light", "Veggie/Vegan");
createTagsAndAdd("Homemade Potato Gnocchi with Sage Butter", "hot", "adventurous", "take your time", "at home", "fancy", "hearty", "Veggie/Vegan");
createTagsAndAdd("Rack of Lamb with Herb Crust", "hot", "adventurous", "take your time", "at home", "fancy", "hearty", "Meat/Fish");
createTagsAndAdd("Jackfruit 'Pulled Pork' Sandwiches", "hot", "adventurous", "take your time", "at home", "easy", "hearty", "Veggie/Vegan");
createTagsAndAdd("Chicken Cordon Bleu", "hot", "familiar", "take your time", "at home", "fancy", "hearty", "Meat/Fish");
createTagsAndAdd("Osso Buco", "hot", "adventurous", "take your time", "at home", "fancy", "hearty", "Meat/Fish");

// --- Adventurous & Cold "At Home" Options ---
createTagsAndAdd("Homemade Tuna Poke Bowl", "cold", "adventurous", "quick", "at home", "fancy", "light", "Meat/Fish");
createTagsAndAdd("Steak Tartare", "cold", "adventurous", "quick", "at home", "fancy", "hearty", "Meat/Fish");
createTagsAndAdd("Classic Ceviche", "cold", "adventurous", "take your time", "at home", "fancy", "light", "Meat/Fish");
createTagsAndAdd("Prosciutto and Melon", "cold", "adventurous", "quick", "at home", "easy", "light", "Meat/Fish");
createTagsAndAdd("Salade Niçoise", "cold", "adventurous", "take your time", "at home", "fancy", "hearty", "Meat/Fish");
createTagsAndAdd("Thai Larb Gai (Chicken Salad)", "cold", "adventurous", "quick", "at home", "easy", "light", "Meat/Fish");
createTagsAndAdd("Watermelon, Feta, and Mint Salad", "cold", "adventurous", "quick", "at home", "easy", "light", "Veggie/Vegan");
createTagsAndAdd("Spanish White Gazpacho (Ajoblanco)", "cold", "adventurous", "quick", "at home", "fancy", "light", "Veggie/Vegan");
createTagsAndAdd("Vietnamese Summer Rolls with Peanut Sauce", "cold", "adventurous", "take your time", "at home", "easy", "light", "Meat/Fish");
createTagsAndAdd("Vegan Vietnamese Summer Rolls", "cold", "adventurous", "take your time", "at home", "easy", "light", "Veggie/Vegan");
createTagsAndAdd("Cucumber and Avocado Cold Soup", "cold", "adventurous", "quick", "at home", "easy", "light", "Veggie/Vegan");
createTagsAndAdd("Gourmet Cheese & Charcuterie Board", "cold", "adventurous", "take your time", "at home", "fancy", "hearty", "Meat/Fish");
createTagsAndAdd("Gourmet Cheese Board", "cold", "adventurous", "take your time", "at home", "fancy", "hearty", "Veggie/Vegan");
createTagsAndAdd("Beef Carpaccio", "cold", "adventurous", "quick", "at home", "fancy", "light", "Meat/Fish");
createTagsAndAdd("Smoked Salmon Blinis with Dill Cream", "cold", "adventurous", "quick", "at home", "fancy", "light", "Meat/Fish");
createTagsAndAdd("Tabbouleh Salad", "cold", "adventurous", "quick", "at home", "easy", "light", "Veggie/Vegan");

// --- More Solid "At Home" Options ---
createTagsAndAdd("Homemade Pizza on the Grill", "hot", "familiar", "take your time", "at home", "fancy", "hearty", "Meat/Fish");
createTagsAndAdd("Cast Iron Skillet Steak", "hot", "familiar", "quick", "at home", "fancy", "hearty", "Meat/Fish");
createTagsAndAdd("Beer Can Chicken", "hot", "adventurous", "take your time", "at home", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Sheet Pan Fajitas", "hot", "familiar", "quick", "at home", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Sheet Pan Veggie Fajitas", "hot", "familiar", "quick", "at home", "easy", "hearty", "Veggie/Vegan");
createTagsAndAdd("Slow Cooker Pulled Pork", "hot", "familiar", "take your time", "at home", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Instant Pot Butter Chicken", "hot", "adventurous", "take your time", "at home", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Stuffed Bell Peppers", "hot", "familiar", "take your time", "at home", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Quinoa Stuffed Bell Peppers", "hot", "familiar", "take your time", "at home", "easy", "hearty", "Veggie/Vegan");
createTagsAndAdd("Chicken and Dumplings", "hot", "familiar", "take your time", "at home", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Frittata with Goat Cheese and Spinach", "hot", "familiar", "quick", "at home", "easy", "light", "Veggie/Vegan");
createTagsAndAdd("Shakshuka", "hot", "adventurous", "quick", "at home", "easy", "hearty", "Veggie/Vegan");
createTagsAndAdd("Homemade Fish and Chips", "hot", "familiar", "take your time", "at home", "fancy", "hearty", "Meat/Fish");
createTagsAndAdd("Classic Pot Roast", "hot", "familiar", "take your time", "at home", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Gourmet Grilled Cheese with Fig Jam", "hot", "adventurous", "quick", "at home", "fancy", "light", "Veggie/Vegan");

// --- NEW ENTRIES: MORE GENERAL RESTAURANTS (GULF BREEZE, PENSACOLA, PACE, MILTON) ---

// --- Pensacola & Gulf Breeze Area Restaurants ---
createTagsAndAdd("Seville Quarter Steak (The District)", "hot", "familiar", "take your time", "takeout", "fancy", "hearty", "Meat/Fish");
createTagsAndAdd("Chicken and Waffles (Five Sisters Blues Cafe)", "hot", "familiar", "take your time", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Smothered Fried Pork Chops (Five Sisters Blues Cafe)", "hot", "familiar", "take your time", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Drunken Shrimp (Global Grill)", "hot", "adventurous", "take your time", "takeout", "fancy", "light", "Meat/Fish");
createTagsAndAdd("Tapas Platter (Global Grill)", "hot", "adventurous", "take your time", "takeout", "fancy", "hearty", "Meat/Fish");
createTagsAndAdd("Palafox Street Tacos (Taco Rock)", "hot", "familiar", "quick", "takeout", "easy", "light", "Meat/Fish");
createTagsAndAdd("The Pensacola Burger (The Tin Cow)", "hot", "adventurous", "take your time", "takeout", "fancy", "hearty", "Meat/Fish");
createTagsAndAdd("Ahi Tuna Melt (The Tin Cow)", "hot", "adventurous", "take your time", "takeout", "fancy", "hearty", "Meat/Fish");
createTagsAndAdd("Grits a Ya Ya (The Fish House)", "hot", "adventurous", "take your time", "takeout", "fancy", "hearty", "Meat/Fish");
createTagsAndAdd("World-Famous Fish Tacos (The Fish House)", "hot", "familiar", "take your time", "takeout", "fancy", "hearty", "Meat/Fish");
createTagsAndAdd("The Godfather Pizza (Georgio's Pizza)", "hot", "familiar", "take your time", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Gyro Platter (Georgio's Pizza)", "hot", "familiar", "take your time", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Chicken Shawarma Plate (Jordanian Cuisine)", "hot", "adventurous", "take your time", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Falafel Sandwich (Jordanian Cuisine)", "hot", "adventurous", "quick", "takeout", "easy", "light", "Veggie/Vegan");
createTagsAndAdd("Firecracker Shrimp (Shaggy's Harbor Bar)", "hot", "adventurous", "quick", "takeout", "easy", "light", "Meat/Fish");
createTagsAndAdd("Beach Burger (Shaggy's Harbor Bar)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Pad Thai (Siam Thai)", "hot", "familiar", "take your time", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Green Curry (Siam Thai)", "hot", "adventurous", "take your time", "takeout", "easy", "hearty", "Veggie/Vegan");

// --- Milton & Pace Area Restaurants ---
createTagsAndAdd("Smoked Pork Plate (Smokin' In The Square BBQ)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Brisket Sandwich (Smokin' In The Square BBQ)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("The Big Italy Pizza (The PizzaPlex)", "hot", "adventurous", "take your time", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Calzone (The PizzaPlex)", "hot", "familiar", "take your time", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Country Fried Steak (The Ole Hickory)", "hot", "familiar", "take your time", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Fried Green Tomatoes (The Ole Hickory)", "hot", "familiar", "quick", "takeout", "easy", "light", "Veggie/Vegan");
createTagsAndAdd("Blackwater Burger (Blackwater Bistro)", "hot", "familiar", "take your time", "takeout", "fancy", "hearty", "Meat/Fish");
createTagsAndAdd("Shrimp and Scallop Pasta (Blackwater Bistro)", "hot", "adventurous", "take your time", "takeout", "fancy", "hearty", "Meat/Fish");
createTagsAndAdd("Hibachi Chicken (Nikko Japanese Steak House)", "hot", "familiar", "take your time", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Volcano Roll (Nikko Japanese Steak House)", "cold", "adventurous", "take your time", "takeout", "fancy", "light", "Meat/Fish");
createTagsAndAdd("Carne Asada (La Hacienda)", "hot", "familiar", "take your time", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Chiles Poblanos (La Hacienda)", "hot", "adventurous", "take your time", "takeout", "fancy", "hearty", "Veggie/Vegan");
createTagsAndAdd("Gator Bites (Gator's)", "hot", "adventurous", "quick", "takeout", "easy", "light", "Meat/Fish");
createTagsAndAdd("Philly Cheesesteak (Gator's)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Meat/Fish");


// --- NEW ENTRIES: MORE LOCAL RESTAURANTS (GULF BREEZE, NAVARRE, MIDWAY, PENSACOLA, MILTON, PACE) ---

// --- Navarre Area Restaurants ---
createTagsAndAdd("Sailor's Platter (Sailor's Grill, Navarre)", "hot", "familiar", "take your time", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Ahi Tuna Nachos (Sailor's Grill, Navarre)", "hot", "adventurous", "quick", "takeout", "fancy", "hearty", "Meat/Fish");
createTagsAndAdd("Key Lime Pie (Sailor's Grill, Navarre)", "cold", "familiar", "quick", "takeout", "easy", "light", "Veggie/Vegan");
createTagsAndAdd("Grouper Sandwich (Juana's Pagodas, Navarre Beach)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Island Chicken Salad (Juana's Pagodas, Navarre Beach)", "cold", "familiar", "quick", "takeout", "easy", "light", "Meat/Fish");
createTagsAndAdd("Volleyball Nachos (Juana's Pagodas, Navarre Beach)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Shrimp Po' Boy (TC's Front Porch, Navarre)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Crawfish Étouffée (TC's Front Porch, Navarre)", "hot", "adventurous", "take your time", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Artisan Bread Loaf (Navarre Bakery & Creamery)", "cold", "familiar", "quick", "takeout", "easy", "light", "Veggie/Vegan"); // Eaten at home
createTagsAndAdd("Gourmet Cupcakes (Navarre Bakery & Creamery)", "cold", "familiar", "quick", "takeout", "easy", "light", "Veggie/Vegan");
createTagsAndAdd("Truffle Burger (The Grey Taproom, Navarre)", "hot", "adventurous", "take your time", "takeout", "fancy", "hearty", "Meat/Fish");
createTagsAndAdd("Charcuterie Board (The Grey Taproom, Navarre)", "cold", "adventurous", "take your time", "takeout", "fancy", "hearty", "Meat/Fish");
createTagsAndAdd("Fried Mullet Dinner (Windjammers on the Pier, Navarre)", "hot", "familiar", "take your time", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Oyster Sampler (Windjammers on the Pier, Navarre)", "hot", "adventurous", "take your time", "takeout", "fancy", "light", "Meat/Fish");

// --- Gulf Breeze Area Restaurants ---
createTagsAndAdd("The Maui Wowi Pizza (Rotolo's Pizzeria, Gulf Breeze)", "hot", "adventurous", "take your time", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Spicy Italian Sandwich (Rotolo's Pizzeria, Gulf Breeze)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Sesame Seared Tuna Salad (The Pointe, Gulf Breeze)", "cold", "adventurous", "take your time", "takeout", "fancy", "light", "Meat/Fish");
createTagsAndAdd("Crab Cake Sandwich (The Pointe, Gulf Breeze)", "hot", "familiar", "take your time", "takeout", "fancy", "hearty", "Meat/Fish");
createTagsAndAdd("Oysters Rockefeller (The Pointe, Gulf Breeze)", "hot", "adventurous", "take your time", "takeout", "fancy", "light", "Meat/Fish");
createTagsAndAdd("Country Benedict (Gulf Breeze Cafe)", "hot", "familiar", "take your time", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Mediterranean Veggie Wrap (Gulf Breeze Cafe)", "cold", "familiar", "quick", "takeout", "easy", "light", "Veggie/Vegan");
createTagsAndAdd("Homemade Chicken Salad Plate (Gulf Breeze Cafe)", "cold", "familiar", "quick", "takeout", "easy", "light", "Meat/Fish");
createTagsAndAdd("Kalua Pork Plate (Aloha Grill, Gulf Breeze)", "hot", "adventurous", "take your time", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Loco Moco (Aloha Grill, Gulf Breeze)", "hot", "adventurous", "take your time", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Spam Musubi (Aloha Grill, Gulf Breeze)", "hot", "adventurous", "quick", "takeout", "easy", "light", "Meat/Fish");
createTagsAndAdd("Beef Brisket Plate (Blue Wahoos Grill, Pensacola/Stadium)", "hot", "familiar", "take your time", "takeout", "easy", "hearty", "Meat/Fish"); // Close enough to GB
createTagsAndAdd("Grilled Salmon with Dill Sauce (Hemingway's Island Grill, Pensacola Beach)", "hot", "familiar", "take your time", "takeout", "fancy", "hearty", "Meat/Fish"); // Popular spot often visited by GB/Navarre locals
createTagsAndAdd("Jumbo Lump Crab Cakes (Hemingway's Island Grill, Pensacola Beach)", "hot", "familiar", "take your time", "takeout", "fancy", "hearty", "Meat/Fish");

// --- Pensacola (more unique options, not covered by chains already) ---
createTagsAndAdd("Polonza Bistro Burger (Polonza Bistro)", "hot", "adventurous", "take your time", "takeout", "fancy", "hearty", "Meat/Fish");
createTagsAndAdd("Duck Confit (Restaurant IRON)", "hot", "adventurous", "take your time", "takeout", "fancy", "hearty", "Meat/Fish");
createTagsAndAdd("Seasonal Vegetable Plate (Restaurant IRON)", "hot", "adventurous", "take your time", "takeout", "fancy", "light", "Veggie/Vegan");
createTagsAndAdd("Fried Chicken Thigh Sandwich (Union Public House)", "hot", "familiar", "take your time", "takeout", "fancy", "hearty", "Meat/Fish");
createTagsAndAdd("Pork Belly Buns (Union Public House)", "hot", "adventurous", "quick", "takeout", "fancy", "light", "Meat/Fish");
createTagsAndAdd("Oxtail Pho (Saigon Oriental Market & Deli)", "hot", "adventurous", "take your time", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Banh Mi Dac Biet (Saigon Oriental Market & Deli)", "cold", "adventurous", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Gnocchi al Pesto (Bonelli's Cafe Italia)", "hot", "familiar", "take your time", "takeout", "fancy", "hearty", "Veggie/Vegan");
createTagsAndAdd("Veal Piccata (Bonelli's Cafe Italia)", "hot", "familiar", "take your time", "takeout", "fancy", "hearty", "Meat/Fish");

// --- Midway, Pace, Milton (more local options) ---
createTagsAndAdd("The 'Godfather' Sandwich (Subs N Such, Milton)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Philly Cheesesteak (Oval Office Pub & Grub, Pace)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Blackened Mahi Tacos (Cosse's Place, Milton)", "hot", "adventurous", "quick", "takeout", "easy", "light", "Meat/Fish");
createTagsAndAdd("Shrimp Creole (Cosse's Place, Milton)", "hot", "familiar", "take your time", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Loaded Baked Potato (The Spud Shack, Pace)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("BBQ Pulled Pork Potato (The Spud Shack, Pace)", "hot", "familiar", "quick", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Chicken Alfredo Pizza (Milton Quality Bakery)", "hot", "adventurous", "take your time", "takeout", "easy", "hearty", "Meat/Fish"); // Assuming they do pizzas
createTagsAndAdd("Glazed Donuts (Milton Quality Bakery)", "cold", "familiar", "quick", "takeout", "easy", "light", "Veggie/Vegan");
createTagsAndAdd("Catfish Platter (David's Catfish House, Milton/Pace)", "hot", "familiar", "take your time", "takeout", "easy", "hearty", "Meat/Fish");
createTagsAndAdd("Cole Slaw (David's Catfish House, Milton/Pace)", "cold", "familiar", "quick", "takeout", "easy", "light", "Veggie/Vegan"); // A notable side

        const getFoodSuggestions = (key) => {
    const suggestionsFromDB = foodDatabase[key]; // Get suggestions from your main database

    if (suggestionsFromDB && suggestionsFromDB.length > 0) {
        return shuffleArray(suggestionsFromDB); // Shuffle the suggestions before returning
    } else {
        // Fallback if a specific combination yields no results
        const fallbackSuggestions = [
            'Pizza (customizable)', 'Pasta with your favorite sauce', 'A hearty Salad', 'Stir-fry with available veggies/protein',
            'Sandwich or Wrap', 'Omelette or Scrambled Eggs', 'Soup (canned or quick)', 'Rice bowl with toppings',
            'Tacos or Burrito Bowl', 'Grilled Chicken or Fish', 'Veggie Burger', 'Fruit Smoothie'
        ];
        // You can shuffle fallback suggestions too if you like
        return shuffleArray(fallbackSuggestions);
    }
};

        // DOM elements
        const questionSection = document.getElementById('question-section');
        const resultsSection = document.getElementById('results-section');
        const questionCounter = document.getElementById('question-counter');
        const progressBar = document.getElementById('progress-bar');
        const questionText = document.getElementById('question-text');
        const optionsGrid = document.getElementById('options-grid');
        const backBtn = document.getElementById('back-btn');
        const foodSuggestionsEl = document.getElementById('food-suggestions'); // Renamed to avoid conflict
        const showMoreBtn = document.getElementById('show-more-btn');
        const startOverBtn = document.getElementById('start-over-btn');

        // Event handlers
        const handleChoice = (option) => {
            choices.push(option);
            if (choices.length === questions.length) {
                const key = choices.join(',');
                results = getFoodSuggestions(key); // results is already an array
                resultIndex = 0;
                showResults();
            } else {
                renderQuestion();
            }
        };

        const goBack = () => {
            if (choices.length > 0) {
                choices.pop();
                resultsSection.classList.add('hidden');
                questionSection.classList.remove('hidden');
                renderQuestion();
            }
        };

        const showMore = () => {
            resultIndex++;
            renderResults();
        };

        const reset = () => {
            choices = [];
            results = null;
            resultIndex = 0;
            resultsSection.classList.add('hidden');
            questionSection.classList.remove('hidden');
            renderQuestion();
        };

        // Render functions
        const renderQuestion = () => {
            if (choices.length >= questions.length) {
                showResults();
                return;
            }
            const currentQuestion = questions[choices.length];
            const progress = (choices.length / questions.length) * 100;

            questionCounter.textContent = `Question ${choices.length + 1} of ${questions.length}`;
            progressBar.style.width = `${progress}%`;
            questionText.textContent = currentQuestion.question;
            backBtn.classList.toggle('hidden', choices.length === 0);
            optionsGrid.innerHTML = '';

            currentQuestion.options.forEach((option, index) => {
                const button = document.createElement('button');
                button.className = 'option-btn';
                button.onclick = () => handleChoice(option);
                button.innerHTML = `
                    <i data-lucide="${currentQuestion.icons[index]}" class="icon" style="width: 2rem; height: 2rem;"></i>
                    <span class="font-medium text-gray-800">${option}</span>
                `;
                optionsGrid.appendChild(button);
            });
            lucide.createIcons();
        };

        const renderResults = () => {
            const itemsPerPage = 3;
            const startIdx = resultIndex * itemsPerPage;
            const endIdx = startIdx + itemsPerPage;
            const currentSuggestions = results.slice(startIdx, endIdx);

            foodSuggestionsEl.innerHTML = ''; // Clear previous suggestions
            if (startIdx === 0) foodSuggestionsEl.innerHTML = ''; // Clear only on first page load

            currentSuggestions.forEach(food => {
                const div = document.createElement('div');
                div.className = 'food-suggestion';
                div.textContent = food;
                // Future: Add image here if available food.image
                // Future: Add click to search on food app
                div.onclick = () => {
                    const query = encodeURIComponent(food);
                    // Example: Open Google search in a new tab.
                    // You can change this to a specific food app deep link if available.
                    window.open(`https://www.google.com/search?q=${query}`, '_blank');
                };
                foodSuggestionsEl.appendChild(div);
            });

            const remainingCount = results.length - endIdx;
            if (remainingCount > 0) {
                showMoreBtn.classList.remove('hidden');
                showMoreBtn.textContent = `See More Options (${remainingCount} more)`;
            } else {
                showMoreBtn.classList.add('hidden');
            }

            if (results.length === 0) {
                 foodSuggestionsEl.innerHTML = '<p class="text-gray-600">No specific suggestions found for this combination. Try our general ideas or start over!</p>';
            }
        };

        const showResults = () => {
            questionSection.classList.add('hidden');
            resultsSection.classList.remove('hidden');
            renderResults();
        };

        // Event listeners
        backBtn.addEventListener('click', goBack);
        showMoreBtn.addEventListener('click', showMore);
        startOverBtn.addEventListener('click', reset);

        // Initialize app
        document.addEventListener('DOMContentLoaded', () => {
            renderQuestion();
        });