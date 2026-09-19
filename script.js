"use strict";

/*
 * ============================================================
 *  VANILLA JAVASCRIPT CHESS
 * ============================================================
 *
 *  Features:
 *  - Complete standard chess movement
 *  - Legal move validation
 *  - Check / checkmate / stalemate
 *  - Castling
 *  - En passant
 *  - Promotion
 *  - Pinned pieces
 *  - Discovered checks
 *  - Double check
 *  - SAN-style move notation
 *  - Undo with complete state restoration
 *  - Captured pieces
 *  - 10-minute chess clocks
 *  - Human vs Human
 *
 *  No external libraries or dependencies.
 * ============================================================
 */

const BOARD_SIZE = 8;
const INITIAL_TIME_MS = 10 * 60 * 1000;

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

const PIECE_SYMBOLS = {
    w: {
        k: "♔",
        q: "♕",
        r: "♖",
        b: "♗",
        n: "♘",
        p: "♙"
    },
    b: {
        k: "♚",
        q: "♛",
        r: "♜",
        b: "♝",
        n: "♞",
        p: "♟"
    }
};

const PIECE_NAMES = {
    q: "Queen",
    r: "Rook",
    b: "Bishop",
    n: "Knight"
};

const PIECE_VALUES = {
    p: 1,
    n: 3,
    b: 3,
    r: 5,
    q: 9,
    k: 0
};

const PIECE_LETTERS = {
    p: "",
    n: "N",
    b: "B",
    r: "R",
    q: "Q",
    k: "K"
};

const game = {
    board: [],
    turn: "w",

    castlingRights: {
        wK: true,
        wQ: true,
        bK: true,
        bQ: true
    },

    enPassant: null,

    halfmoveClock: 0,
    fullmoveNumber: 1,

    selectedSquare: null,
    legalMovesForSelection: [],

    lastMove: null,

    moveHistory: [],
    snapshots: [],

    captured: {
        w: [],
        b: []
    },

    gameOver: false,
    status: "White to move",

    clocks: {
        w: INITIAL_TIME_MS,
        b: INITIAL_TIME_MS
    },

    clockRunning: false,
    clockInterval: null,
    lastClockTimestamp: null,

    pendingPromotion: null
};

const chessBoard = document.getElementById("chessBoard");
const statusText = document.getElementById("statusText");
const gameStatus = document.getElementById("gameStatus");

const whiteClock = document.getElementById("whiteClock");
const blackClock = document.getElementById("blackClock");

const whitePlayerStatus = document.getElementById("whitePlayerStatus");
const blackPlayerStatus = document.getElementById("blackPlayerStatus");

const moveHistoryElement = document.getElementById("moveHistory");
const moveCountElement = document.getElementById("moveCount");

const whiteCapturedElement = document.getElementById("whiteCaptured");
const blackCapturedElement = document.getElementById("blackCaptured");

const undoButton = document.getElementById("undoButton");

const newGameButton = document.getElementById("newGameButton");
const newGameButtonSecondary =
    document.getElementById("newGameButtonSecondary");

const promotionModal = document.getElementById("promotionModal");
const promotionChoices = document.getElementById("promotionChoices");

const newGameModal = document.getElementById("newGameModal");
const cancelNewGame = document.getElementById("cancelNewGame");
const confirmNewGame = document.getElementById("confirmNewGame");

/*
 * ------------------------------------------------------------
 * Utility functions
 * ------------------------------------------------------------
 */

function createPiece(color, type) {
    return {
        color,
        type
    };
}

function clonePiece(piece) {
    if (!piece) {
        return null;
    }

    return {
        color: piece.color,
        type: piece.type
    };
}

function cloneBoard(board) {
    return board.map((row) =>
        row.map((piece) => clonePiece(piece))
    );
}

function cloneCastlingRights(rights) {
    return {
        wK: rights.wK,
        wQ: rights.wQ,
        bK: rights.bK,
        bQ: rights.bQ
    };
}

function squareKey(row, col) {
    return `${row},${col}`;
}

function sameSquare(a, b) {
    return (
        a &&
        b &&
        a.row === b.row &&
        a.col === b.col
    );
}

function isInsideBoard(row, col) {
    return (
        row >= 0 &&
        row < BOARD_SIZE &&
        col >= 0 &&
        col < BOARD_SIZE
    );
}

function oppositeColor(color) {
    return color === "w" ? "b" : "w";
}

function colorName(color) {
    return color === "w" ? "White" : "Black";
}

function squareName(row, col) {
    return `${FILES[col]}${8 - row}`;
}

function parseSquare(name) {
    return {
        row: 8 - Number(name[1]),
        col: FILES.indexOf(name[0])
    };
}

function formatClock(milliseconds) {
    const safeMilliseconds = Math.max(0, milliseconds);
    const totalSeconds = Math.ceil(safeMilliseconds / 1000);

    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(
        seconds
    ).padStart(2, "0")}`;
}

function copyMove(move) {
    if (!move) {
        return null;
    }

    return {
        from: {
            row: move.from.row,
            col: move.from.col
        },
        to: {
            row: move.to.row,
            col: move.to.col
        },
        piece: clonePiece(move.piece),
        captured: clonePiece(move.captured),
        promotion: move.promotion || null,
        isEnPassant: Boolean(move.isEnPassant),
        isCastle: Boolean(move.isCastle),
        castleSide: move.castleSide || null
    };
}

/*
 * ------------------------------------------------------------
 * Initial board
 * ------------------------------------------------------------
 */

function createInitialBoard() {
    const board = Array.from(
        { length: BOARD_SIZE },
        () => Array(BOARD_SIZE).fill(null)
    );

    const backRank = ["r", "n", "b", "q", "k", "b", "n", "r"];

    for (let col = 0; col < BOARD_SIZE; col += 1) {
        board[0][col] = createPiece("b", backRank[col]);
        board[1][col] = createPiece("b", "p");

        board[6][col] = createPiece("w", "p");
        board[7][col] = createPiece("w", backRank[col]);
    }

    return board;
}

/*
 * ------------------------------------------------------------
 * Board rendering
 * ------------------------------------------------------------
 */

function renderBoard() {
    chessBoard.innerHTML = "";

    for (let row = 0; row < BOARD_SIZE; row += 1) {
        for (let col = 0; col < BOARD_SIZE; col += 1) {
            const square = document.createElement("button");

            square.type = "button";
            square.className =
                `square ${(row + col) % 2 === 0 ? "light" : "dark"}`;

            square.dataset.row = String(row);
            square.dataset.col = String(col);

            square.setAttribute(
                "aria-label",
                createSquareAriaLabel(row, col)
            );

            square.addEventListener("click", handleSquareClick);

            if (
                game.lastMove &&
                (
                    sameSquare(game.lastMove.from, { row, col }) ||
                    sameSquare(game.lastMove.to, { row, col })
                )
            ) {
                square.classList.add("last-move");
            }

            if (
                game.selectedSquare &&
                sameSquare(game.selectedSquare, { row, col })
            ) {
                square.classList.add("selected");
            }

            const legalMove = game.legalMovesForSelection.find(
                (move) =>
                    move.to.row === row &&
                    move.to.col === col
            );

            if (legalMove) {
                if (
                    game.board[row][col] ||
                    legalMove.isEnPassant
                ) {
                    square.classList.add("capture-move");
                } else {
                    square.classList.add("legal-move");
                }
            }

            const piece = game.board[row][col];

            if (piece) {
                const pieceElement = document.createElement("span");

                pieceElement.className =
                    `piece ${piece.color === "w" ? "white" : "black"}`;

                pieceElement.textContent =
                    PIECE_SYMBOLS[piece.color][piece.type];

                pieceElement.setAttribute(
                    "aria-hidden",
                    "true"
                );

                square.appendChild(pieceElement);
            }

            if (col === 0) {
                const rank = document.createElement("span");

                rank.className = "coordinate rank-coordinate";
                rank.textContent = String(8 - row);

                square.appendChild(rank);
            }

            if (row === 7) {
                const file = document.createElement("span");

                file.className = "coordinate file-coordinate";
                file.textContent = FILES[col];

                square.appendChild(file);
            }

            const kingInCheck =
                piece &&
                piece.type === "k" &&
                isSquareAttacked(
                    game.board,
                    row,
                    col,
                    oppositeColor(piece.color)
                );

            if (kingInCheck) {
                square.classList.add("in-check");
            }

            chessBoard.appendChild(square);
        }
    }
}

function createSquareAriaLabel(row, col) {
    const piece = game.board[row][col];
    const name = squareName(row, col);

    if (!piece) {
        return `${name}, empty`;
    }

    return `${name}, ${colorName(piece.color)} ${getPieceName(piece.type)}`;
}

function getPieceName(type) {
    const names = {
        k: "king",
        q: "queen",
        r: "rook",
        b: "bishop",
        n: "knight",
        p: "pawn"
    };

    return names[type];
}

/*
 * ------------------------------------------------------------
 * Chess attack detection
 * ------------------------------------------------------------
 *
 * This is deliberately separate from legal move generation.
 * A square is attacked even if the attacking piece itself
 * would be pinned.
 * ------------------------------------------------------------
 */

function isSquareAttacked(board, targetRow, targetCol, byColor) {
    const pawnDirection = byColor === "w" ? -1 : 1;
    const pawnRow = targetRow - pawnDirection;

    for (const pawnCol of [
        targetCol - 1,
        targetCol + 1
    ]) {
        if (!isInsideBoard(pawnRow, pawnCol)) {
            continue;
        }

        const piece = board[pawnRow][pawnCol];

        if (
            piece &&
            piece.color === byColor &&
            piece.type === "p"
        ) {
            return true;
        }
    }

    const knightOffsets = [
        [-2, -1],
        [-2, 1],
        [-1, -2],
        [-1, 2],
        [1, -2],
        [1, 2],
        [2, -1],
        [2, 1]
    ];

    for (const [dr, dc] of knightOffsets) {
        const row = targetRow + dr;
        const col = targetCol + dc;

        if (!isInsideBoard(row, col)) {
            continue;
        }

        const piece = board[row][col];

        if (
            piece &&
            piece.color === byColor &&
            piece.type === "n"
        ) {
            return true;
        }
    }

    const kingOffsets = [
        [-1, -1],
        [-1, 0],
        [-1, 1],
        [0, -1],
        [0, 1],
        [1, -1],
        [1, 0],
        [1, 1]
    ];

    for (const [dr, dc] of kingOffsets) {
        const row = targetRow + dr;
        const col = targetCol + dc;

        if (!isInsideBoard(row, col)) {
            continue;
        }

        const piece = board[row][col];

        if (
            piece &&
            piece.color === byColor &&
            piece.type === "k"
        ) {
            return true;
        }
    }

    const rookDirections = [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1]
    ];

    for (const [dr, dc] of rookDirections) {
        let row = targetRow + dr;
        let col = targetCol + dc;

        while (isInsideBoard(row, col)) {
            const piece = board[row][col];

            if (piece) {
                if (
                    piece.color === byColor &&
                    (
                        piece.type === "r" ||
                        piece.type === "q"
                    )
                ) {
                    return true;
                }

                break;
            }

            row += dr;
            col += dc;
        }
    }

    const bishopDirections = [
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1]
    ];

    for (const [dr, dc] of bishopDirections) {
        let row = targetRow + dr;
        let col = targetCol + dc;

        while (isInsideBoard(row, col)) {
            const piece = board[row][col];

            if (piece) {
                if (
                    piece.color === byColor &&
                    (
                        piece.type === "b" ||
                        piece.type === "q"
                    )
                ) {
                    return true;
                }

                break;
            }

            row += dr;
            col += dc;
        }
    }

    return false;
}

function findKing(board, color) {
    for (let row = 0; row < BOARD_SIZE; row += 1) {
        for (let col = 0; col < BOARD_SIZE; col += 1) {
            const piece = board[row][col];

            if (
                piece &&
                piece.color === color &&
                piece.type === "k"
            ) {
                return { row, col };
            }
        }
    }

    return null;
}

function isKingInCheck(board, color) {
    const king = findKing(board, color);

    if (!king) {
        return true;
    }

    return isSquareAttacked(
        board,
        king.row,
        king.col,
        oppositeColor(color)
    );
}

/*
 * ------------------------------------------------------------
 * Pseudo-legal moves
 * ------------------------------------------------------------
 */

function generatePseudoLegalMoves(board, color, state) {
    const moves = [];

    for (let row = 0; row < BOARD_SIZE; row += 1) {
        for (let col = 0; col < BOARD_SIZE; col += 1) {
            const piece = board[row][col];

            if (!piece || piece.color !== color) {
                continue;
            }

            if (piece.type === "p") {
                generatePawnMoves(
                    board,
                    row,
                    col,
                    piece,
                    state,
                    moves
                );
            } else if (piece.type === "n") {
                generateKnightMoves(
                    board,
                    row,
                    col,
                    piece,
                    moves
                );
            } else if (piece.type === "b") {
                generateSlidingMoves(
                    board,
                    row,
                    col,
                    piece,
                    moves,
                    [
                        [-1, -1],
                        [-1, 1],
                        [1, -1],
                        [1, 1]
                    ]
                );
            } else if (piece.type === "r") {
                generateSlidingMoves(
                    board,
                    row,
                    col,
                    piece,
                    moves,
                    [
                        [-1, 0],
                        [1, 0],
                        [0, -1],
                        [0, 1]
                    ]
                );
            } else if (piece.type === "q") {
                generateSlidingMoves(
                    board,
                    row,
                    col,
                    piece,
                    moves,
                    [
                        [-1, -1],
                        [-1, 1],
                        [1, -1],
                        [1, 1],
                        [-1, 0],
                        [1, 0],
                        [0, -1],
                        [0, 1]
                    ]
                );
            } else if (piece.type === "k") {
                generateKingMoves(
                    board,
                    row,
                    col,
                    piece,
                    state,
                    moves
                );
            }
        }
    }

    return moves;
}

function generatePawnMoves(
    board,
    row,
    col,
    piece,
    state,
    moves
) {
    const direction = piece.color === "w" ? -1 : 1;
    const startingRow = piece.color === "w" ? 6 : 1;
    const promotionRow = piece.color === "w" ? 0 : 7;

    const oneRow = row + direction;

    if (
        isInsideBoard(oneRow, col) &&
        !board[oneRow][col]
    ) {
        if (oneRow === promotionRow) {
            addPromotionMoves(
                row,
                col,
                oneRow,
                col,
                piece,
                null,
                moves
            );
        } else {
            moves.push(
                createMove(
                    row,
                    col,
                    oneRow,
                    col,
                    piece
                )
            );
        }

        const twoRow = row + direction * 2;

        if (
            row === startingRow &&
            !board[twoRow][col]
        ) {
            moves.push(
                createMove(
                    row,
                    col,
                    twoRow,
                    col,
                    piece
                )
            );
        }
    }

    for (const captureCol of [
        col - 1,
        col + 1
    ]) {
        if (!isInsideBoard(oneRow, captureCol)) {
            continue;
        }

        const target = board[oneRow][captureCol];

        if (
            target &&
            target.color !== piece.color
        ) {
            if (oneRow === promotionRow) {
                addPromotionMoves(
                    row,
                    col,
                    oneRow,
                    captureCol,
                    piece,
                    target,
                    moves
                );
            } else {
                moves.push(
                    createMove(
                        row,
                        col,
                        oneRow,
                        captureCol,
                        piece,
                        target
                    )
                );
            }
        }

        if (
            state.enPassant &&
            state.enPassant.row === oneRow &&
            state.enPassant.col === captureCol
        ) {
            const capturedPawn =
                board[row][captureCol];

            if (
                capturedPawn &&
                capturedPawn.color !== piece.color &&
                capturedPawn.type === "p"
            ) {
                moves.push(
                    createMove(
                        row,
                        col,
                        oneRow,
                        captureCol,
                        piece,
                        capturedPawn,
                        {
                            isEnPassant: true
                        }
                    )
                );
            }
        }
    }
}

function addPromotionMoves(
    fromRow,
    fromCol,
    toRow,
    toCol,
    piece,
    captured,
    moves
) {
    for (const promotion of ["q", "r", "b", "n"]) {
        moves.push(
            createMove(
                fromRow,
                fromCol,
                toRow,
                toCol,
                piece,
                captured,
                {
                    promotion
                }
            )
        );
    }
}

function generateKnightMoves(
    board,
    row,
    col,
    piece,
    moves
) {
    const offsets = [
        [-2, -1],
        [-2, 1],
        [-1, -2],
        [-1, 2],
        [1, -2],
        [1, 2],
        [2, -1],
        [2, 1]
    ];

    for (const [dr, dc] of offsets) {
        const toRow = row + dr;
        const toCol = col + dc;

        if (!isInsideBoard(toRow, toCol)) {
            continue;
        }

        const target = board[toRow][toCol];

        if (
            !target ||
            target.color !== piece.color
        ) {
            moves.push(
                createMove(
                    row,
                    col,
                    toRow,
                    toCol,
                    piece,
                    target
                )
            );
        }
    }
}

function generateSlidingMoves(
    board,
    row,
    col,
    piece,
    moves,
    directions
) {
    for (const [dr, dc] of directions) {
        let toRow = row + dr;
        let toCol = col + dc;

        while (isInsideBoard(toRow, toCol)) {
            const target = board[toRow][toCol];

            if (!target) {
                moves.push(
                    createMove(
                        row,
                        col,
                        toRow,
                        toCol,
                        piece
                    )
                );
            } else {
                if (target.color !== piece.color) {
                    moves.push(
                        createMove(
                            row,
                            col,
                            toRow,
                            toCol,
                            piece,
                            target
                        )
                    );
                }

                break;
            }

            toRow += dr;
            toCol += dc;
        }
    }
}

function generateKingMoves(
    board,
    row,
    col,
    piece,
    state,
    moves
) {
    const offsets = [
        [-1, -1],
        [-1, 0],
        [-1, 1],
        [0, -1],
        [0, 1],
        [1, -1],
        [1, 0],
        [1, 1]
    ];

    for (const [dr, dc] of offsets) {
        const toRow = row + dr;
        const toCol = col + dc;

        if (!isInsideBoard(toRow, toCol)) {
            continue;
        }

        const target = board[toRow][toCol];

        if (
            !target ||
            target.color !== piece.color
        ) {
            moves.push(
                createMove(
                    row,
                    col,
                    toRow,
                    toCol,
                    piece,
                    target
                )
            );
        }
    }

    /*
     * Castling.
     *
     * The king may not:
     * - currently be in check
     * - pass through an attacked square
     * - land on an attacked square
     *
     * The rook must also be present.
     */

    if (piece.color === "w" && row === 7 && col === 4) {
        if (
            state.castlingRights.wK &&
            board[7][5] === null &&
            board[7][6] === null &&
            board[7][7] &&
            board[7][7].color === "w" &&
            board[7][7].type === "r" &&
            !isSquareAttacked(board, 7, 4, "b") &&
            !isSquareAttacked(board, 7, 5, "b") &&
            !isSquareAttacked(board, 7, 6, "b")
        ) {
            moves.push(
                createMove(
                    7,
                    4,
                    7,
                    6,
                    piece,
                    null,
                    {
                        isCastle: true,
                        castleSide: "king"
                    }
                )
            );
        }

        if (
            state.castlingRights.wQ &&
            board[7][1] === null &&
            board[7][2] === null &&
            board[7][3] === null &&
            board[7][0] &&
            board[7][0].color === "w" &&
            board[7][0].type === "r" &&
            !isSquareAttacked(board, 7, 4, "b") &&
            !isSquareAttacked(board, 7, 3, "b") &&
            !isSquareAttacked(board, 7, 2, "b")
        ) {
            moves.push(
                createMove(
                    7,
                    4,
                    7,
                    2,
                    piece,
                    null,
                    {
                        isCastle: true,
                        castleSide: "queen"
                    }
                )
            );
        }
    }

    if (piece.color === "b" && row === 0 && col === 4) {
        if (
            state.castlingRights.bK &&
            board[0][5] === null &&
            board[0][6] === null &&
            board[0][7] &&
            board[0][7].color === "b" &&
            board[0][7].type === "r" &&
            !isSquareAttacked(board, 0, 4, "w") &&
            !isSquareAttacked(board, 0, 5, "w") &&
            !isSquareAttacked(board, 0, 6, "w")
        ) {
            moves.push(
                createMove(
                    0,
                    4,
                    0,
                    6,
                    piece,
                    null,
                    {
                        isCastle: true,
                        castleSide: "king"
                    }
                )
            );
        }

        if (
            state.castlingRights.bQ &&
            board[0][1] === null &&
            board[0][2] === null &&
            board[0][3] === null &&
            board[0][0] &&
            board[0][0].color === "b" &&
            board[0][0].type === "r" &&
            !isSquareAttacked(board, 0, 4, "w") &&
            !isSquareAttacked(board, 0, 3, "w") &&
            !isSquareAttacked(board, 0, 2, "w")
        ) {
            moves.push(
                createMove(
                    0,
                    4,
                    0,
                    2,
                    piece,
                    null,
                    {
                        isCastle: true,
                        castleSide: "queen"
                    }
                )
            );
        }
    }
}

function createMove(
    fromRow,
    fromCol,
    toRow,
    toCol,
    piece,
    captured = null,
    options = {}
) {
    return {
        from: {
            row: fromRow,
            col: fromCol
        },

        to: {
            row: toRow,
            col: toCol
        },

        piece: clonePiece(piece),
        captured: clonePiece(captured),

        promotion: options.promotion || null,
        isEnPassant: Boolean(options.isEnPassant),
        isCastle: Boolean(options.isCastle),
        castleSide: options.castleSide || null
    };
}

/*
 * ------------------------------------------------------------
 * Legal move generation
 * ------------------------------------------------------------
 */

function getLegalMoves(color = game.turn) {
    const state = {
        castlingRights: game.castlingRights,
        enPassant: game.enPassant
    };

    const pseudoMoves =
        generatePseudoLegalMoves(
            game.board,
            color,
            state
        );

    const legalMoves = [];

    for (const move of pseudoMoves) {
        const simulatedBoard =
            cloneBoard(game.board);

        applyMoveToBoard(
            simulatedBoard,
            move
        );

        if (
            !isKingInCheck(
                simulatedBoard,
                color
            )
        ) {
            legalMoves.push(move);
        }
    }

    return legalMoves;
}

/*
 * Apply only the board transformation.
 * Game-level state is handled separately.
 */

function applyMoveToBoard(board, move) {
    const movingPiece =
        clonePiece(board[move.from.row][move.from.col]);

    board[move.from.row][move.from.col] = null;

    if (move.isEnPassant) {
        const capturedPawnRow = move.from.row;
        const capturedPawnCol = move.to.col;

        board[capturedPawnRow][capturedPawnCol] = null;
    }

    if (move.isCastle) {
        if (move.to.col === 6) {
            board[move.from.row][5] =
                board[move.from.row][7];

            board[move.from.row][7] = null;
        } else if (move.to.col === 2) {
            board[move.from.row][3] =
                board[move.from.row][0];

            board[move.from.row][0] = null;
        }
    }

    if (move.promotion) {
        board[move.to.row][move.to.col] =
            createPiece(
                movingPiece.color,
                move.promotion
            );
    } else {
        board[move.to.row][move.to.col] =
            movingPiece;
    }
}

/*
 * ------------------------------------------------------------
 * State snapshots
 * ------------------------------------------------------------
 */

function createSnapshot() {
    return {
        board: cloneBoard(game.board),
        turn: game.turn,
        castlingRights:
            cloneCastlingRights(game.castlingRights),
        enPassant: game.enPassant
            ? {
                row: game.enPassant.row,
                col: game.enPassant.col
            }
            : null,

        halfmoveClock: game.halfmoveClock,
        fullmoveNumber: game.fullmoveNumber,

        lastMove: copyMove(game.lastMove),

        moveHistory: [...game.moveHistory],

        captured: {
            w: game.captured.w.map(clonePiece),
            b: game.captured.b.map(clonePiece)
        },

        clocks: {
            w: game.clocks.w,
            b: game.clocks.b
        },

        gameOver: game.gameOver,
        status: game.status
    };
}

function restoreSnapshot(snapshot) {
    game.board = cloneBoard(snapshot.board);
    game.turn = snapshot.turn;

    game.castlingRights =
        cloneCastlingRights(snapshot.castlingRights);

    game.enPassant = snapshot.enPassant
        ? {
            row: snapshot.enPassant.row,
            col: snapshot.enPassant.col
        }
        : null;

    game.halfmoveClock =
        snapshot.halfmoveClock;

    game.fullmoveNumber =
        snapshot.fullmoveNumber;

    game.lastMove =
        copyMove(snapshot.lastMove);

    game.moveHistory =
        [...snapshot.moveHistory];

    game.captured = {
        w: snapshot.captured.w.map(clonePiece),
        b: snapshot.captured.b.map(clonePiece)
    };

    game.clocks = {
        w: snapshot.clocks.w,
        b: snapshot.clocks.b
    };

    game.gameOver = snapshot.gameOver;
    game.status = snapshot.status;

    game.selectedSquare = null;
    game.legalMovesForSelection = [];
    game.pendingPromotion = null;
}

/*
 * ------------------------------------------------------------
 * Castling rights
 * ------------------------------------------------------------
 */

function updateCastlingRights(move) {
    const piece = move.piece;

    if (piece.type === "k") {
        if (piece.color === "w") {
            game.castlingRights.wK = false;
            game.castlingRights.wQ = false;
        } else {
            game.castlingRights.bK = false;
            game.castlingRights.bQ = false;
        }
    }

    if (piece.type === "r") {
        if (
            piece.color === "w" &&
            move.from.row === 7 &&
            move.from.col === 0
        ) {
            game.castlingRights.wQ = false;
        }

        if (
            piece.color === "w" &&
            move.from.row === 7 &&
            move.from.col === 7
        ) {
            game.castlingRights.wK = false;
        }

        if (
            piece.color === "b" &&
            move.from.row === 0 &&
            move.from.col === 0
        ) {
            game.castlingRights.bQ = false;
        }

        if (
            piece.color === "b" &&
            move.from.row === 0 &&
            move.from.col === 7
        ) {
            game.castlingRights.bK = false;
        }
    }

    /*
     * Capturing a rook on its original square also removes
     * that side's corresponding castling right.
     */

    if (move.captured && move.captured.type === "r") {
        if (
            move.to.row === 7 &&
            move.to.col === 0
        ) {
            game.castlingRights.wQ = false;
        }

        if (
            move.to.row === 7 &&
            move.to.col === 7
        ) {
            game.castlingRights.wK = false;
        }

        if (
            move.to.row === 0 &&
            move.to.col === 0
        ) {
            game.castlingRights.bQ = false;
        }

        if (
            move.to.row === 0 &&
            move.to.col === 7
        ) {
            game.castlingRights.bK = false;
        }
    }
}

/*
 * ------------------------------------------------------------
 * Move execution
 * ------------------------------------------------------------
 */

function executeMove(move) {
    /*
     * Clock time must be updated before the snapshot so that
     * undo restores the exact position and thinking time at
     * the moment immediately before the move.
     */

    updateRunningClock();

    const snapshot = createSnapshot();

    game.snapshots.push(snapshot);

    const movingColor = game.turn;

    const san = createSanNotation(
        move,
        movingColor
    );

    if (move.captured) {
        /*
         * Captured pieces are stored under the colour that
         * owned the captured piece.
         */
        game.captured[move.captured.color].push(
            clonePiece(move.captured)
        );
    }

    updateCastlingRights(move);

    applyMoveToBoard(game.board, move);

    /*
     * Set en-passant target only after a two-square pawn move.
     */
    game.enPassant = null;

    if (
        move.piece.type === "p" &&
        Math.abs(
            move.to.row - move.from.row
        ) === 2
    ) {
        game.enPassant = {
            row:
                (move.from.row + move.to.row) / 2,
            col: move.from.col
        };
    }

    if (
        move.piece.type === "p" ||
        move.captured
    ) {
        game.halfmoveClock = 0;
    } else {
        game.halfmoveClock += 1;
    }

    if (movingColor === "b") {
        game.fullmoveNumber += 1;
    }

    game.turn = oppositeColor(movingColor);
    game.lastMove = copyMove(move);

    game.moveHistory.push(san);

    game.selectedSquare = null;
    game.legalMovesForSelection = [];

    renderAll();

    evaluateGameState();

    /*
     * A legal first move starts the clock.
     * Once running, it switches to the next player.
     */
    if (!game.gameOver) {
        if (!game.clockRunning) {
            startClock();
        } else {
            game.lastClockTimestamp =
                performance.now();
        }
    }

    updateUndoButton();
}

/*
 * ------------------------------------------------------------
 * SAN notation
 * ------------------------------------------------------------
 */

function createSanNotation(move, color) {
    if (move.isCastle) {
        return move.to.col === 6
            ? appendCheckSuffix(
                "O-O",
                move,
                color
            )
            : appendCheckSuffix(
                "O-O-O",
                move,
                color
            );
    }

    const pieceType = move.piece.type;

    let notation =
        PIECE_LETTERS[pieceType];

    const isCapture =
        Boolean(move.captured) ||
        move.isEnPassant;

    /*
     * Disambiguation for pieces other than pawns.
     */
    if (
        pieceType !== "p" &&
        pieceType !== "k"
    ) {
        const allLegalMoves =
            getLegalMoves(color);

        const competingMoves =
            allLegalMoves.filter(
                (candidate) =>
                    candidate.from.row !== move.from.row ||
                    candidate.from.col !== move.from.col
            ).filter(
                (candidate) =>
                    candidate.to.row === move.to.row &&
                    candidate.to.col === move.to.col
            ).filter(
                (candidate) =>
                    candidate.piece.type === pieceType
            );

        if (competingMoves.length > 0) {
            const sameFile =
                competingMoves.some(
                    (candidate) =>
                        candidate.from.col ===
                        move.from.col
                );

            const sameRank =
                competingMoves.some(
                    (candidate) =>
                        candidate.from.row ===
                        move.from.row
                );

            if (!sameFile) {
                notation +=
                    FILES[move.from.col];
            } else if (!sameRank) {
                notation +=
                    String(8 - move.from.row);
            } else {
                notation +=
                    squareName(
                        move.from.row,
                        move.from.col
                    );
            }
        }
    }

    if (pieceType === "p" && isCapture) {
        notation += FILES[move.from.col];
    }

    if (isCapture) {
        notation += "x";
    }

    notation += squareName(
        move.to.row,
        move.to.col
    );

    if (move.promotion) {
        notation +=
            `=${PIECE_LETTERS[move.promotion]}`;
    }

    return appendCheckSuffix(
        notation,
        move,
        color
    );
}

function appendCheckSuffix(
    notation,
    move,
    movingColor
) {
    const simulatedBoard =
        cloneBoard(game.board);

    applyMoveToBoard(
        simulatedBoard,
        move
    );

    const enemyColor =
        oppositeColor(movingColor);

    if (
        !isKingInCheck(
            simulatedBoard,
            enemyColor
        )
    ) {
        return notation;
    }

    const enemyState = {
        castlingRights: game.castlingRights,
        enPassant: null
    };

    const enemyPseudoMoves =
        generatePseudoLegalMoves(
            simulatedBoard,
            enemyColor,
            enemyState
        );

    let enemyHasLegalMove = false;

    for (const enemyMove of enemyPseudoMoves) {
        const testBoard =
            cloneBoard(simulatedBoard);

        applyMoveToBoard(
            testBoard,
            enemyMove
        );

        if (
            !isKingInCheck(
                testBoard,
                enemyColor
            )
        ) {
            enemyHasLegalMove = true;
            break;
        }
    }

    return enemyHasLegalMove
        ? `${notation}+`
        : `${notation}#`;
}

/*
 * ------------------------------------------------------------
 * Game state evaluation
 * ------------------------------------------------------------
 */

function evaluateGameState() {
    const currentColor = game.turn;

    const inCheck =
        isKingInCheck(
            game.board,
            currentColor
        );

    const legalMoves =
        getLegalMoves(currentColor);

    if (legalMoves.length === 0) {
        stopClock();
        game.gameOver = true;

        if (inCheck) {
            const winner =
                oppositeColor(currentColor);

            game.status =
                `Checkmate — ${colorName(winner)} wins`;
        } else {
            game.status =
                "Stalemate — Draw";
        }

        renderAll();
        return;
    }

    if (isInsufficientMaterial()) {
        stopClock();
        game.gameOver = true;
        game.status =
            "Draw by insufficient material";

        renderAll();
        return;
    }

    if (game.halfmoveClock >= 100) {
        stopClock();
        game.gameOver = true;
        game.status =
            "Draw by 50-move rule";

        renderAll();
        return;
    }

    game.gameOver = false;

    if (inCheck) {
        game.status =
            `Check! ${colorName(currentColor)} to move`;
    } else {
        game.status =
            `${colorName(currentColor)} to move`;
    }

    renderAll();
}

/*
 * ------------------------------------------------------------
 * Insufficient material
 * ------------------------------------------------------------
 *
 * Standard practical cases:
 * - King vs King
 * - King + Bishop vs King
 * - King + Knight vs King
 * - King + Bishop vs King + Bishop when all bishops
 *   are on the same colour square
 *
 * We also treat K+B vs K+B same-colour bishops as insufficient.
 */

function isInsufficientMaterial() {
    const pieces = [];

    for (let row = 0; row < BOARD_SIZE; row += 1) {
        for (let col = 0; col < BOARD_SIZE; col += 1) {
            const piece = game.board[row][col];

            if (piece) {
                pieces.push({
                    piece,
                    row,
                    col
                });
            }
        }
    }

    const nonKings =
        pieces.filter(
            (entry) => entry.piece.type !== "k"
        );

    if (nonKings.length === 0) {
        return true;
    }

    if (nonKings.length === 1) {
        return (
            nonKings[0].piece.type === "b" ||
            nonKings[0].piece.type === "n"
        );
    }

    if (
        nonKings.length === 2 &&
        nonKings.every(
            (entry) =>
                entry.piece.type === "b"
        )
    ) {
        const colours =
            nonKings.map(
                (entry) =>
                    (entry.row + entry.col) % 2
            );

        return colours[0] === colours[1];
    }

    return false;
}

/*
 * ------------------------------------------------------------
 * Selection and user interaction
 * ------------------------------------------------------------
 */

function handleSquareClick(event) {
    if (game.gameOver) {
        return;
    }

    if (game.pendingPromotion) {
        return;
    }

    const row =
        Number(event.currentTarget.dataset.row);

    const col =
        Number(event.currentTarget.dataset.col);

    const clickedPiece =
        game.board[row][col];

    /*
     * If a piece is selected and the clicked square is a legal
     * destination, make the move.
     */
    const selectedMove =
        game.legalMovesForSelection.find(
            (move) =>
                move.to.row === row &&
                move.to.col === col
        );

    if (selectedMove) {
        if (selectedMove.promotion) {
            openPromotionDialog(
                selectedMove
            );
        } else {
            executeMove(selectedMove);
        }

        return;
    }

    /*
     * Clicking the currently selected square deselects it.
     */
    if (
        game.selectedSquare &&
        sameSquare(
            game.selectedSquare,
            { row, col }
        )
    ) {
        clearSelection();
        renderBoard();
        return;
    }

    /*
     * Selecting one of the current player's pieces.
     */
    if (
        clickedPiece &&
        clickedPiece.color === game.turn
    ) {
        selectSquare(row, col);
        return;
    }

    /*
     * Clicking elsewhere clears selection.
     */
    clearSelection();
    renderBoard();
}

function selectSquare(row, col) {
    game.selectedSquare = {
        row,
        col
    };

    const allLegalMoves =
        getLegalMoves(game.turn);

    game.legalMovesForSelection =
        allLegalMoves.filter(
            (move) =>
                move.from.row === row &&
                move.from.col === col
        );

    renderBoard();
}

function clearSelection() {
    game.selectedSquare = null;
    game.legalMovesForSelection = [];
}

/*
 * ------------------------------------------------------------
 * Promotion
 * ------------------------------------------------------------
 */

function openPromotionDialog(move) {
    game.pendingPromotion = move;

    promotionChoices.innerHTML = "";

    const color = move.piece.color;

    for (const type of ["q", "r", "b", "n"]) {
        const button =
            document.createElement("button");

        button.type = "button";
        button.className = "promotion-choice";

        button.setAttribute(
            "aria-label",
            `Promote pawn to ${PIECE_NAMES[type]}`
        );

        const pieceElement =
            document.createElement("span");

        pieceElement.className =
            `promotion-piece ${
                color === "w" ? "white" : "black"
            }`;

        pieceElement.textContent =
            PIECE_SYMBOLS[color][type];

        const nameElement =
            document.createElement("span");

        nameElement.className =
            "promotion-name";

        nameElement.textContent =
            PIECE_NAMES[type];

        button.appendChild(pieceElement);
        button.appendChild(nameElement);

        button.addEventListener(
            "click",
            () => completePromotion(type)
        );

        promotionChoices.appendChild(button);
    }

    promotionModal.classList.remove("hidden");

    const firstButton =
        promotionChoices.querySelector("button");

    if (firstButton) {
        firstButton.focus();
    }
}

function completePromotion(type) {
    if (!game.pendingPromotion) {
        return;
    }

    const move =
        copyMove(game.pendingPromotion);

    move.promotion = type;

    game.pendingPromotion = null;

    promotionModal.classList.add("hidden");

    executeMove(move);
}

/*
 * ------------------------------------------------------------
 * Undo
 * ------------------------------------------------------------
 */

function undoMove() {
    if (game.snapshots.length === 0) {
        return;
    }

    stopClock();

    const snapshot =
        game.snapshots.pop();

    restoreSnapshot(snapshot);

    /*
     * If the restored position is a live game and has already
     * had at least one move, the clock should continue.
     *
     * For the initial position, the clock remains stopped.
     */
    if (
        game.moveHistory.length > 0 &&
        !game.gameOver
    ) {
        startClock();
    }

    renderAll();
    updateUndoButton();
}

function updateUndoButton() {
    undoButton.disabled =
        game.snapshots.length === 0 ||
        Boolean(game.pendingPromotion);
}

/*
 * ------------------------------------------------------------
 * Chess clock
 * ------------------------------------------------------------
 */

function startClock() {
    if (game.gameOver) {
        return;
    }

    if (game.clockRunning) {
        return;
    }

    game.clockRunning = true;
    game.lastClockTimestamp =
        performance.now();

    game.clockInterval =
        window.setInterval(
            updateRunningClock,
            100
        );

    renderClocks();
}

function stopClock() {
    game.clockRunning = false;

    game.lastClockTimestamp = null;

    if (game.clockInterval !== null) {
        window.clearInterval(
            game.clockInterval
        );

        game.clockInterval = null;
    }

    renderClocks();
}

function updateRunningClock() {
    if (
        !game.clockRunning ||
        game.gameOver
    ) {
        return;
    }

    const now = performance.now();

    if (game.lastClockTimestamp === null) {
        game.lastClockTimestamp = now;
        return;
    }

    const elapsed =
        now - game.lastClockTimestamp;

    game.lastClockTimestamp = now;

    game.clocks[game.turn] -= elapsed;

    if (game.clocks[game.turn] <= 0) {
        game.clocks[game.turn] = 0;

        stopClock();

        game.gameOver = true;

        const winner =
            oppositeColor(game.turn);

        game.status =
            `${colorName(winner)} wins on time`;

        clearSelection();

        renderAll();
        return;
    }

    renderClocks();
}

function renderClocks() {
    whiteClock.textContent =
        formatClock(game.clocks.w);

    blackClock.textContent =
        formatClock(game.clocks.b);

    whiteClock.classList.toggle(
        "active-clock",
        game.clockRunning &&
        game.turn === "w" &&
        !game.gameOver
    );

    blackClock.classList.toggle(
        "active-clock",
        game.clockRunning &&
        game.turn === "b" &&
        !game.gameOver
    );

    whiteClock.classList.toggle(
        "low-time",
        game.clocks.w <= 30_000
    );

    blackClock.classList.toggle(
        "low-time",
        game.clocks.b <= 30_000
    );
}

/*
 * ------------------------------------------------------------
 * Rendering the rest of the interface
 * ------------------------------------------------------------
 */

function renderStatus() {
    statusText.textContent = game.status;

    const currentColor =
        game.turn;

    whitePlayerStatus.textContent =
        game.gameOver
            ? "Game over"
            : currentColor === "w"
                ? "To move"
                : "Waiting";

    blackPlayerStatus.textContent =
        game.gameOver
            ? "Game over"
            : currentColor === "b"
                ? "To move"
                : "Waiting";

    if (
        game.status.startsWith("Check")
    ) {
        gameStatus.classList.add("check-status");
    } else {
        gameStatus.classList.remove("check-status");
    }
}

function renderMoveHistory() {
    moveCountElement.textContent =
        String(game.moveHistory.length);

    if (game.moveHistory.length === 0) {
        moveHistoryElement.innerHTML = `
            <div class="empty-history">
                <span class="empty-history-icon" aria-hidden="true">♟</span>
                <p>Moves will appear here.</p>
            </div>
        `;

        return;
    }

    moveHistoryElement.innerHTML = "";

    for (
        let index = 0;
        index < game.moveHistory.length;
        index += 2
    ) {
        const row =
            document.createElement("div");

        row.className = "move-row";

        const number =
            document.createElement("span");

        number.className = "move-number";
        number.textContent =
            `${Math.floor(index / 2) + 1}.`;

        const whiteMove =
            document.createElement("span");

        whiteMove.className = "move";

        whiteMove.textContent =
            game.moveHistory[index] || "";

        const blackMove =
            document.createElement("span");

        blackMove.className = "move";

        blackMove.textContent =
            game.moveHistory[index + 1] || "";

        if (
            index ===
            game.moveHistory.length - 1
        ) {
            whiteMove.classList.add("latest");
        }

        if (
            index + 1 ===
            game.moveHistory.length - 1
        ) {
            blackMove.classList.add("latest");
        }

        row.appendChild(number);
        row.appendChild(whiteMove);
        row.appendChild(blackMove);

        moveHistoryElement.appendChild(row);
    }

    moveHistoryElement.scrollTop =
        moveHistoryElement.scrollHeight;
}

function renderCapturedPieces() {
    /*
     * game.captured.w = white pieces captured by Black.
     * game.captured.b = black pieces captured by White.
     */

    whiteCapturedElement.textContent =
        game.captured.w.length
            ? game.captured.w
                .map(
                    (piece) =>
                        PIECE_SYMBOLS[
                            piece.color
                        ][piece.type]
                )
                .join(" ")
            : "—";

    blackCapturedElement.textContent =
        game.captured.b.length
            ? game.captured.b
                .map(
                    (piece) =>
                        PIECE_SYMBOLS[
                            piece.color
                        ][piece.type]
                )
                .join(" ")
            : "—";
}

function renderAll() {
    renderBoard();
    renderClocks();
    renderStatus();
    renderMoveHistory();
    renderCapturedPieces();
    updateUndoButton();
}

/*
 * ------------------------------------------------------------
 * New game
 * ------------------------------------------------------------
 */

function resetGame() {
    stopClock();

    game.board = createInitialBoard();
    game.turn = "w";

    game.castlingRights = {
        wK: true,
        wQ: true,
        bK: true,
        bQ: true
    };

    game.enPassant = null;

    game.halfmoveClock = 0;
    game.fullmoveNumber = 1;

    game.selectedSquare = null;
    game.legalMovesForSelection = [];

    game.lastMove = null;

    game.moveHistory = [];
    game.snapshots = [];

    game.captured = {
        w: [],
        b: []
    };

    game.gameOver = false;
    game.status = "White to move";

    game.clocks = {
        w: INITIAL_TIME_MS,
        b: INITIAL_TIME_MS
    };

    game.pendingPromotion = null;

    promotionModal.classList.add("hidden");

    renderAll();
}

function requestNewGame() {
    if (
        game.moveHistory.length === 0 &&
        game.snapshots.length === 0
    ) {
        resetGame();
        return;
    }

    newGameModal.classList.remove("hidden");
    cancelNewGame.focus();
}

/*
 * ------------------------------------------------------------
 * Keyboard support
 * ------------------------------------------------------------
 */

document.addEventListener("keydown", (event) => {
    if (
        event.key === "Escape" &&
        !promotionModal.classList.contains("hidden")
    ) {
        /*
         * A promotion cannot be cancelled because that would
         * leave a pawn move half-completed.
         *
         * Escape is intentionally ignored here.
         */
        return;
    }

    if (
        event.key === "Escape" &&
        !newGameModal.classList.contains("hidden")
    ) {
        newGameModal.classList.add("hidden");
        newGameButton.focus();
    }
});

/*
 * ------------------------------------------------------------
 * Button listeners
 * ------------------------------------------------------------
 */

newGameButton.addEventListener(
    "click",
    requestNewGame
);

newGameButtonSecondary.addEventListener(
    "click",
    requestNewGame
);

undoButton.addEventListener(
    "click",
    undoMove
);

cancelNewGame.addEventListener(
    "click",
    () => {
        newGameModal.classList.add("hidden");
    }
);

confirmNewGame.addEventListener(
    "click",
    () => {
        newGameModal.classList.add("hidden");
        resetGame();
    }
);

/*
 * Clicking the darkened background does not accidentally
 * discard a game. The explicit buttons are required.
 */

/*
 * ------------------------------------------------------------
 * Prevent accidental browser gestures while interacting
 * ------------------------------------------------------------
 */

chessBoard.addEventListener(
    "contextmenu",
    (event) => {
        event.preventDefault();
    }
);

/*
 * ------------------------------------------------------------
 * Start
 * ------------------------------------------------------------
 */

resetGame();