const crypto = require('crypto');



if (process.argv.length < 5) {
    console.error('Error: At least 3 dice must be provided as input.');
    console.error('Example: node game.js 2,2,4,4,9,9 6,8,1,1,8,6 7,5,3,7,5,3');
    process.exit(1);
}


const dice = process.argv.slice(2).map(arg => arg.split(',').map(Number));
let currentTurn = null;
let userChoice = null;
let computerChoice = null;
let diceUsed = new Set();
let pendingModuloInput = false;
let moduloState = null;



console.log(`Let's determine who makes the first move...`);
determineFirstPlayer();

function determineFirstPlayer() {
    const randomValue = Math.floor(Math.random() * 2);
    const hmacKey = crypto.randomBytes(32).toString('hex');
    const hmac = crypto.createHmac('sha256', hmacKey).update(randomValue.toString()).digest('hex');

    console.log(`I selected a random value in the range 0..1 (HMAC=${hmac}).`);
    console.log('Try to guess my selection:');
    console.log('0 - 0');
    console.log('1 - 1');
    console.log('X - exit');
    console.log('? - help');
    process.stdin.setEncoding('utf8');
}


process.stdin.on('data', data => {
    const input = data.trim();

    if (pendingModuloInput) {
        handleModuloInput(input);
    } else if (currentTurn === null) {
        handleFirstMoveInput(input);
    } else {
        handleGameInput(input);
    }
});

function handleFirstMoveInput(input) {
    const randomValue = Math.floor(Math.random() * 2);

    if (input === 'X') {
        console.log('Thanks for playing. Bye!');
        process.exit(0);
    } else if (input === '?') {
        console.log('Help: Try to guess the random value selected to determine who goes first.');
    } else if (['0', '1'].includes(input)) {
        const userGuess = Number(input);
        const firstPlayer = userGuess === randomValue ? 'You' : 'Computer';
        currentTurn = firstPlayer;
        console.log(`${firstPlayer} make the first move.`);
        startGame();
    } else {
        console.error('Invalid input. Please select 0, 1, X, or ?. Try again.');
    }
}

function startGame() {
    if (currentTurn === 'You') { 
        promptUserChoice();
    } else {
        computerChoice = chooseRandomDice();
        diceUsed.add(computerChoice);
        console.log(`I make the first move and choose the [${dice[computerChoice].join(',')}] dice.`);
        promptUserChoice();
    }
} 


function promptUserChoice() {
    console.log('Choose your dice:');
    dice.forEach((die, index) => {
        if (diceUsed.has(index)) {
            console.log(`${index} - [${die.join(',')}]: Selected by another player.`);
        } else {
            console.log(`${index} - [${die.join(',')}]`);
        }
    });
    console.log('X - exit');
    console.log('? - help');
}

function handleGameInput(input) {
    if (input === 'X') {
        console.log('Thanks for playing. Bye!');
        process.exit(0);
    } else if (input === '?') {
        printProbabilities();
    } else if (/^\d+$/.test(input)) {
        const choice = parseInt(input, 10);
        if (diceUsed.has(choice)) {
            console.error('This dice is unavailable. Please select another dice.');
        } else if (choice >= 0 && choice < dice.length) {
            userChoice = choice;
            diceUsed.add(userChoice);
            console.log(`You chose the [${dice[userChoice].join(',')}] dice.`);
            if (currentTurn === 'You') {
                computerChoice = chooseRandomDice();
                console.log(`I choose the [${dice[computerChoice].join(',')}] dice.`);
            }
            playRound();
        } else {
            console.error('Invalid choice. Please select a valid dice index.');
        }
    } else {
        console.error('Invalid input. Please select a valid option.');
    }
}


function playRound() {
    console.log(`I selected a random value in the range 0..5 (HMAC=${generateHmac(0)}).`);
    console.log('Add your number modulo 6:');
    console.log('0 - 0');
    console.log('1 - 1');
    console.log('2 - 2');
    console.log('3 - 3');
    console.log('4 - 4');
    console.log('5 - 5');
    console.log('X - exit');
    console.log('? - help');

    moduloState = 'user';
    pendingModuloInput = true;
}

function handleModuloInput(input) {
    if (input === 'X') {
        console.log('Thanks for playing. Bye!');
        process.exit(0);
    } else if (input === '?') {
        console.log('Help: Enter a number between 0 and 5.');
    } else if (/^[0-5]$/.test(input)) {
        const userModulo = parseInt(input, 10);
        const computerModulo = Math.floor(Math.random() * 6);

        console.log(`Your selection: ${userModulo}`);
        console.log(`My number is ${computerModulo} (KEY=${generateHmac(computerModulo)}).`);

        const moduloResult = (userModulo + computerModulo) % 6;
        console.log(`The result is ${computerModulo} + ${userModulo} = ${moduloResult} (mod 6).`);

        const userResult = dice[userChoice][moduloResult];
        const computerResult = dice[computerChoice][computerModulo];

        console.log(`Your throw is ${userResult}.`);
        console.log(`My throw is ${computerResult}.`);

        if (userResult > computerResult) {
            console.log('You win this round!');
        } else if (userResult < computerResult) {
            console.log('I win this round!');
        } else {
            console.log('It\'s a tie!');
        }

        pendingModuloInput = false;
        currentTurn = currentTurn === 'You' ? 'Computer' : 'You';
        diceUsed.clear();
        startGame();
    } else {
        console.error('Invalid input. Please select a number between 0 and 5.');
    }

}

function generateHmac(value) {
    const hmacKey = crypto.randomBytes(32).toString('hex');
    return crypto.createHmac('sha256', hmacKey).update(value.toString()).digest('hex');
}


function chooseRandomDice() {
    let choice;
    do {
        choice = Math.floor(Math.random() * dice.length);
    } while (diceUsed.has(choice));
    diceUsed.add(choice);
    return choice;
}

function probabilityCalculation() {
    const probabilities = [];
    for (let i = 0; i < dice.length; i++) {
        probabilities[i] = [];
        for (let j = 0; j < dice.length; j++) {
            if (i === j) {
                probabilities[i][j] = 0.3333; 
            } else {
                let wins = 0;
                for (const sideA of dice[i]) {
                    for (const sideB of dice[j]) {
                        if (sideA > sideB) {
                            wins++;
                        }
                    }
                }
                probabilities[i][j] = (wins / (dice[i].length * dice[j].length)).toFixed(4);
        }
        }
    }
    return probabilities;
}

function printProbabilities() {
    const probabilities = probabilityCalculation();
    const header = `+------------+${dice.map((_, i) => ` Dice ${i}    |`).join('')}`;
    console.log(header);
    probabilities.forEach((row, i) => {
        const rowStr = `| Dice ${i}     | ${row.map(p => `${p}      `.slice(0, 10)).join('|')}|`;
        console.log(rowStr);
    });
    console.log('-'.repeat(header.length));
}

