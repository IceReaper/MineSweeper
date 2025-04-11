const Sprite = {
    tileSize: [12, 12],
    tileNumberOffset: 0,
    tileStateOffset: 1,
    tileStates: {
        normal: [0, null, 0, null],
        mine: [1, "mine", 2, "shine"],
        wrong: [1, "mine", 3, "wrong"],
        flag: [4, "pole", 5, "flag"],
        question: [6, "question", 0, null],
        revealed: null
    },

    digitSize: [13, 23],
    digitOffset: 24,
    digitLength: 3,

    faceSize: [22, 22],
    faceOffset: 47,
    faceStates: {
        normal: 0,
        danger: 1,
        lost: 2,
        won: 3
    },
};

class MineSweeper {
    /** @type {number} */
    #width = 0;
    /** @type {number} */
    #height = 0;
    /** @type {number} */
    #mines = 0;

    /** @type {number} */
    #playTimer;

    /** @type {Display} */
    timeDisplay;
    /** @type {Face} */
    face;
    /** @type {Display} */
    minesDisplay;
    /** @type {Grid} */
    grid;

    /** @type {HTMLElement} */
    element;

    constructor() {
        this.element = document.createElement("div");
        this.element.classList.add("minesweeper", "border-thick-up");

        const header = document.createElement("div");
        header.classList.add("header", "border-thick-down");
        this.element.appendChild(header);

        this.minesDisplay = new Display();
        header.appendChild(this.minesDisplay.element);

        this.face = new Face(this);
        header.appendChild(this.face.element);

        this.timeDisplay = new Display();
        header.appendChild(this.timeDisplay.element);
    }

    /**
     * @param width {number}
     * @param height {number}
     * @param mines {number}
     */
    start(width, height, mines) {
        this.#width = width;
        this.#height = height;
        this.#mines = mines;
        this.playing = true;

        this.minesDisplay.setValue(mines)

        this.face.setState(Sprite.faceStates.normal);

        clearInterval(this.#playTimer);
        this.timeDisplay.setValue(0);

        this.#playTimer = setInterval(() => {
            if (this.playing) {
                this.timeDisplay.increment();
            }
        }, 1000);

        if (this.grid !== undefined) {
            this.element.removeChild(this.grid.element);
        }

        this.grid = new Grid(this, width, height, mines);
        this.element.appendChild(this.grid.element);
    }

    restart() {
        this.start(this.#width, this.#height, this.#mines);
    }
}

class Display {
    /** @type {number} */
    #value = 0;
    /** @type {HTMLElement[]} */
    #digits = [];

    /** @type {HTMLElement} */
    element;

    constructor() {
        this.element = document.createElement("div");
        this.element.classList.add("display", "border-thin-down");

        for (let i = 0; i < Sprite.digitLength; i++) {
            const digit = document.createElement("div");
            digit.style.width = `${Sprite.digitSize[0]}px`;
            digit.style.height = `${Sprite.digitSize[1]}px`;
            digit.classList.add("digit", "sprite");
            this.element.appendChild(digit);

            this.#digits.push(digit);
        }

        this.setValue(this.#value);
    }

    increment() {
        this.setValue(this.#value + 1);
    }

    decrement() {
        this.setValue(this.#value - 1);
    }

    /** @param value {number} */
    setValue(value) {
        this.#value = value;

        const maxPositive = parseInt("9".repeat(Sprite.digitLength));
        const maxNegative = -parseInt("9".repeat(Sprite.digitLength - 1));

        const digits = Math.abs(Math.min(Math.max(this.#value, maxNegative), maxPositive)).toString();
        const displayed = this.#value < 0 ? `-${digits.padStart(Sprite.digitLength - 1, '0')}` : digits.padStart(Sprite.digitLength, '0');

        for (let i = 0; i < Sprite.digitLength; i++) {
            const digit = displayed[i] === "-" ? 10 : parseInt(displayed[i]);
            this.#digits[i].style.backgroundPosition = `-${digit * Sprite.digitSize[0]}px -${Sprite.digitOffset}px`;
            this.#digits[i].style.maskPosition = this.#digits[i].style.backgroundPosition;
        }
    }
}

class Face {
    /** @type {MineSweeper} */
    #mineSweeper;

    /** @type {number} */
    #state = Sprite.faceStates.normal;

    /** @type {HTMLElement} */
    #sprite;

    /** @type {HTMLElement} */
    element;

    /** @param mineSweeper {MineSweeper} */
    constructor(mineSweeper) {
        this.#mineSweeper = mineSweeper;

        this.element = document.createElement("div");
        this.element.classList.add("face");

        this.#sprite = document.createElement("div");
        this.#sprite.style.width = `${Sprite.faceSize[0]}px`;
        this.#sprite.style.height = `${Sprite.faceSize[1]}px`;
        this.#sprite.classList.add("sprite");
        this.element.appendChild(this.#sprite);

        this.element.addEventListener("mousedown", this.#mouseDownMove.bind(this));
        this.element.addEventListener("mousemove", this.#mouseDownMove.bind(this));
        this.element.addEventListener("mouseout", this.#mouseOut.bind(this));
        this.element.addEventListener("mouseup", this.#mouseUp.bind(this));

        this.setState(this.#state);
    }

    /** @param event {MouseEvent} */
    #mouseDownMove(event) {
        event.preventDefault();

        if (event.buttons % 2 === 0) {
            return;
        }

        this.element.classList.add("active");
    }

    /** @param event {MouseEvent} */
    #mouseOut(event) {
        if (event.buttons % 2 === 0) {
            return;
        }

        this.element.classList.remove("active");
    }

    /** @param event {MouseEvent} */
    #mouseUp(event) {
        if (event.button !== 0) {
            return;
        }

        this.element.classList.remove("active");
        this.#mineSweeper.restart();
    }

    /** @param state {number} */
    setState(state) {
        this.#state = state;
        this.#sprite.style.backgroundPosition = `${this.#state * -Sprite.faceSize[0]}px ${-Sprite.faceOffset}px`;
        this.#sprite.style.maskPosition = this.#sprite.style.backgroundPosition;
    }
}

class Grid {
    /** @type {MineSweeper} */
    #mineSweeper;

    /** @type {number} */
    #width = 0;
    /** @type {number} */
    #height = 0;
    /** @type {number} */
    #mines = 0;
    /** @type {Tile[][]} */
    #tiles = [];
    /** @type {boolean} */
    #started = false;

    /** @type {HTMLElement} */
    element;

    /**
     * @param mineSweeper {MineSweeper}
     * @param width {number}
     * @param height {number}
     * @param mines {number}
     */
    constructor(mineSweeper, width, height, mines) {
        this.#mineSweeper = mineSweeper;
        this.#width = width;
        this.#height = height;
        this.#mines = mines;

        this.element = document.createElement("table");
        this.element.classList.add("grid", "border-thick-down");

        this.generate();
    }

    generate() {
        const tiles = [];

        for (let i = 0; i < this.#width * this.#height; i++) {
            let tile = new Tile(this.#mineSweeper);
            tile.isMine = i < this.#mines;
            tiles.push(tile);
        }

        this.#shuffleTiles(tiles);
        this.#generateCells(tiles);
        this.#detectMines();
        this.#generateGrid();
    }

    /** @param tiles {Tile[]} */
    #shuffleTiles(tiles) {
        for (let i = 0; i < tiles.length; i++) {
            let current = Math.floor(Math.random() * tiles.length);
            let tmp = tiles[current];
            tiles[current] = tiles[i];
            tiles[i] = tmp;
        }
    }

    /** @param tiles {Tile[]} */
    #generateCells(tiles) {
        this.#tiles = [];

        for (let i = 0; i < this.#width; i++) {
            this.#tiles.push(tiles.splice(0, this.#height));
        }
    }

    #detectMines() {
        for (let y = 0; y < this.#height; y++) {
            for (let x = 0; x < this.#width; x++) {
                if (this.#tiles[x][y].isMine) {
                    continue;
                }

                let mines = 0;

                for (const sibling of this.#GetSiblings(x, y)) {
                    const siblingTile = this.#tiles[sibling.x][sibling.y];

                    if (!siblingTile.isMine) {
                        continue;
                    }

                    mines++;
                }

                this.#tiles[x][y].mineCount = mines;
            }
        }
    }

    #generateGrid() {
        this.element.innerHTML = "";

        for (let y = 0; y < this.#height; y++) {
            const row = document.createElement("tr");
            this.element.appendChild(row);

            for (let x = 0; x < this.#width; x++) {
                row.appendChild(this.#tiles[x][y].element);
            }
        }
    }

    /** @param tile {Tile} */
    revealTile(tile) {
        for (let y = 0; y < this.#height; y++) {
            for (let x = 0; x < this.#width; x++) {
                if (this.#tiles[x][y] !== tile) {
                    continue;
                }

                this.#ensureStartedOrNoMine(x, y);
                this.#revealCell(x, y);

                if (this.#mineSweeper.playing) {
                    this.#checkWon();
                }

                return;
            }
        }
    }

    /**
     * @param x {number}
     * @param y {number}
     */
    #revealCell(x, y) {
        const tile = this.#tiles[x][y];
        tile.reveal(false);

        if (tile.state === Sprite.tileStates.mine) {
            this.#lost();
            return;
        }

        if (!(tile.state === Sprite.tileStates.revealed && tile.mineCount !== 0)) {
            for (const sibling of this.#GetSiblings(x, y)) {
                const siblingTile = this.#tiles[sibling.x][sibling.y];

                if (siblingTile.isRevealed) {
                    continue;
                }

                this.#revealCell(sibling.x, sibling.y);
            }
        }
    }

    /**
     * @param centerX {number}
     * @param centerY {number}
     * @returns {{ x: number, y: number}[]}
     */
    #GetSiblings(centerX, centerY) {
        const siblings = [];

        for (let y = centerY - 1; y <= centerY + 1; y++) {
            for (let x = centerX - 1; x <= centerX + 1; x++) {
                if (x >= 0 && x < this.#width && y >= 0 && y < this.#height && (x !== centerX || y !== centerY)) {
                    siblings.push({x: x, y: y});
                }
            }
        }

        return siblings;
    }

    /**
     * @param x {number}
     * @param y {number}
     */
    #ensureStartedOrNoMine(x, y) {
        if (this.#started) {
            return;
        }

        this.#started = true;

        while (this.#tiles[x][y].isMine) {
            this.generate();
        }
    }

    #lost() {
        this.#mineSweeper.playing = false;
        this.#mineSweeper.face.setState(Sprite.faceStates.lost);

        for (let y = 0; y < this.#height; y++) {
            for (let x = 0; x < this.#width; x++) {
                this.#tiles[x][y].reveal(true);
            }
        }
    }

    #checkWon() {
        for (let y = 0; y < this.#height; y++) {
            for (let x = 0; x < this.#width; x++) {
                const tile = this.#tiles[x][y];

                if (!tile.isMine && !tile.isRevealed) {
                    return;
                }
            }
        }

        for (let y = 0; y < this.#height; y++) {
            for (let x = 0; x < this.#width; x++) {
                this.#tiles[x][y].reveal(true);
            }
        }

        this.#mineSweeper.playing = false;
        this.#mineSweeper.face.setState(Sprite.faceStates.won);
    }
}

class Tile {
    /** @type {MineSweeper} */
    #mineSweeper;

    /** @type {boolean} */
    isMine = false;
    /** @type {boolean} */
    isRevealed = false;
    /** @type {[number, string, number, string] | null} */
    state = Sprite.tileStates.normal;
    /** @type {number} */
    mineCount = 0;

    /** @type {HTMLElement} */
    #sprite1;
    /** @type {HTMLElement} */
    #sprite2;

    /** @type {HTMLElement} */
    element;

    /** @param mineSweeper {MineSweeper} */
    constructor(mineSweeper) {
        this.#mineSweeper = mineSweeper;

        this.element = document.createElement("td");
        this.element.classList.add("tile");

        const stack = document.createElement("div");
        stack.style.width = `${Sprite.tileSize[0]}px`;
        stack.style.height = `${Sprite.tileSize[1]}px`;
        stack.classList.add("stack");
        this.element.appendChild(stack);

        this.#sprite1 = document.createElement("div");
        this.#sprite1.classList.add("sprite");
        stack.appendChild(this.#sprite1);

        this.#sprite2 = document.createElement("div");
        this.#sprite2.classList.add("sprite", "overlay");
        stack.appendChild(this.#sprite2);

        this.element.addEventListener("mousedown", this.#mouseDownMove.bind(this));
        this.element.addEventListener("mousemove", this.#mouseDownMove.bind(this));
        this.element.addEventListener("mouseout", this.#mouseOut.bind(this));
        this.element.addEventListener("mouseup", this.#mouseUp.bind(this));
        this.element.addEventListener("contextmenu", this.#contextMenu.bind(this));

        this.setState(this.state);
    }

    /** @param event {MouseEvent} */
    #mouseDownMove(event) {
        event.preventDefault();

        if (event.buttons % 2 === 0 || this.isRevealed || this.state === Sprite.tileStates.flag) {
            return;
        }

        this.#mineSweeper.face.setState(Sprite.faceStates.danger);
        this.element.classList.add("active");
    }

    /** @param event {MouseEvent} */
    #mouseOut(event) {
        if (event.buttons % 2 === 0 || this.isRevealed || this.state === Sprite.tileStates.flag) {
            return;
        }

        this.#mineSweeper.face.setState(Sprite.faceStates.normal);
        this.element.classList.remove("active");
    }

    /** @param event {MouseEvent} */
    #mouseUp(event) {
        if (event.button !== 0 || this.isRevealed || this.state === Sprite.tileStates.flag) {
            return;
        }

        this.#mineSweeper.face.setState(Sprite.faceStates.normal);
        this.element.classList.remove("active");

        this.#mineSweeper.grid.revealTile(this);
    }

    /** @param event {MouseEvent} */
    #contextMenu(event) {
        event.preventDefault();

        if (this.isRevealed) {
            return;
        }

        if (this.state === Sprite.tileStates.normal) {
            this.setState(Sprite.tileStates.flag);
            this.#mineSweeper.minesDisplay.decrement();
        } else if (this.state === Sprite.tileStates.flag) {
            this.setState(Sprite.tileStates.question);
            this.#mineSweeper.minesDisplay.increment();
        } else if (this.state === Sprite.tileStates.question) {
            this.setState(Sprite.tileStates.normal);
        }
    }

    /** @param gameOver {boolean} */
    reveal(gameOver) {
        if (this.isRevealed) {
            return
        }

        this.isRevealed = true;
        this.element.classList.add("active");

        if (this.state === Sprite.tileStates.flag) {
            if (!this.isMine && gameOver) {
                this.setState(Sprite.tileStates.wrong);
            }
        } else if (this.isMine) {
            this.setState(Sprite.tileStates.mine);
            if (!gameOver) {
                this.element.classList.add("mark");
            }
        } else {
            this.setState(Sprite.tileStates.revealed);
        }
    }

    /** @param state {[number, string, number, string] | null} */
    setState(state) {
        this.state = state;

        const drawState = this.state === Sprite.tileStates.revealed ? {
                y1: Sprite.tileNumberOffset,
                x1: this.mineCount,
                c1: `number${this.mineCount}`,
                y2: Sprite.tileStateOffset,
                x2: Sprite.tileStates.normal[2],
                c2: Sprite.tileStates.normal[3]
            } :
            {
                y1: Sprite.tileStateOffset,
                x1: this.state[0],
                c1: this.state[1],
                y2: Sprite.tileStateOffset,
                x2: this.state[2],
                c2: this.state[3],
            };

        this.#sprite1.style.backgroundPosition = `${drawState.x1 * -Sprite.tileSize[0]}px -${drawState.y1 * Sprite.tileSize[1]}px`;
        this.#sprite2.style.backgroundPosition = `${drawState.x2 * -Sprite.tileSize[0]}px -${drawState.y2 * Sprite.tileSize[1]}px`;

        this.#sprite1.style.maskPosition = this.#sprite1.style.backgroundPosition;
        this.#sprite2.style.maskPosition = this.#sprite2.style.backgroundPosition;

        this.#sprite1.style.backgroundColor = `var(--${drawState.c1}Color)`;
        this.#sprite2.style.backgroundColor = `var(--${drawState.c2}Color)`;
    }
}
