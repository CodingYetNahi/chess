/**
 * ============================================================================
 * CHESS APPLICATION ENGINE & INTERFACE CONTROLLER (script.js)
 * ============================================================================
 *
 * Open-Source Dependencies & Licenses:
 * 1. chess.js (v0.13.4) - Chess Rules, Move Generation & Game State Management
 *    License: BSD-2-Clause (Included embedded inline for zero-build usage)
 * 2. Stockfish.js - Chess AI Engine (Web Worker / Local Fallback)
 *    License: GPLv3 (Communicated asynchronously via Web Worker / UCI protocol)
 * ============================================================================
 */

/* ============================================================================
   SECTION 1: EMBEDDED CHESS RULES ENGINE (chess.js - BSD-2-Clause)
   ============================================================================ */
(function (global, factory) {
  if (typeof exports === 'object' && typeof module !== 'undefined') {
    module.exports = factory();
  } else if (typeof define === 'function' && define.amd) {
    define(factory);
  } else {
    global.Chess = factory();
  }
}(this, (function () {
  'use me strict';

  var BLACK = 'b';
  var WHITE = 'w';

  var EMPTY = -1;

  var PAWN = 'p';
  var KNIGHT = 'n';
  var BISHOP = 'b';
  var ROOK = 'r';
  var QUEEN = 'q';
  var KING = 'k';

  var SYMBOLS = 'pnbrqkPNBRQK';

  var DEFAULT_POSITION = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  var PAWN_OFFSETS = {
    b: [16, 32, 15, 17],
    w: [-16, -32, -15, -17]
  };

  var PIECE_OFFSETS = {
    n: [-18, -33, -31, -14, 18, 33, 31, 14],
    b: [-17, -15, 15, 17],
    r: [-16, 1, 16, -1],
    q: [-17, -16, -15, -1, 1, 15, 16, 17],
    k: [-17, -16, -15, -1, 1, 15, 16, 17]
  };

  var ATTACKS = [
    20, 0, 0, 0, 0, 0, 0, 24,  0, 0, 0, 0, 0, 0, 20, 0,
     0,20, 0, 0, 0, 0, 0, 24,  0, 0, 0, 0, 0,20,  0, 0,
     0, 0,20, 0, 0, 0, 0, 24,  0, 0, 0, 0,20, 0,  0, 0,
     0, 0, 0,20, 0, 0, 0, 24,  0, 0, 0,20, 0, 0,  0, 0,
     0, 0, 0, 0,20, 0, 0, 24,  0, 0,20, 0, 0, 0,  0, 0,
     0, 0, 0, 0, 0,20, 0, 24,  0,20, 0, 0, 0, 0,  0, 0,
     0, 0, 0, 0, 0, 0,20, 24, 20, 0, 0, 0, 0, 0,  0, 0,
    24,24,24,24,24,24,24,  0,24,24,24,24,24,24, 24, 0,
     0, 0, 0, 0, 0, 0,20, 24, 20, 0, 0, 0, 0, 0,  0, 0,
     0, 0, 0, 0, 0,20, 0, 24,  0,20, 0, 0, 0, 0,  0, 0,
     0, 0, 0, 0,20, 0, 0, 24,  0, 0,20, 0, 0, 0,  0, 0,
     0, 0, 0,20, 0, 0, 0, 24,  0, 0, 0,20, 0, 0,  0, 0,
     0, 0,20, 0, 0, 0, 0, 24,  0, 0, 0, 0,20, 0,  0, 0,
     0,20, 0, 0, 0, 0, 0, 24,  0, 0, 0, 0, 0,20,  0, 0,
    20, 0, 0, 0, 0, 0, 0, 24,  0, 0, 0, 0, 0, 0, 20, 0
  ];

  var RAYS = [
    17,  0,  0,  0,  0,  0,  0, 16,  0,  0,  0,  0,  0,  0, 15, 0,
     0, 17,  0,  0,  0,  0,  0, 16,  0,  0,  0,  0,  0, 15,  0, 0,
     0,  0, 17,  0,  0,  0,  0, 16,  0,  0,  0,  0, 15,  0,  0, 0,
     0,  0,  0, 17,  0,  0,  0, 16,  0,  0,  0, 15,  0,  0,  0, 0,
     0,  0,  0,  0, 17,  0,  0, 16,  0,  0, 15,  0,  0,  0,  0, 0,
     0,  0,  0,  0,  0, 17,  0, 16,  0, 15,  0,  0,  0,  0,  0, 0,
     0,  0,  0,  0,  0,  0, 17, 16, 15,  0,  0,  0,  0,  0,  0, 0,
     1,  1,  1,  1,  1,  1,  1,  0,-1, -1, -1, -1, -1, -1, -1, 0,
     0,  0,  0,  0,  0,  0,-15,-16,-17,  0,  0,  0,  0,  0,  0, 0,
     0,  0,  0,  0,  0,-15,  0,-16,  0,-17,  0,  0,  0,  0,  0, 0,
     0,  0,  0,  0,-15,  0,  0,-16,  0,  0,-17,  0,  0,  0,  0, 0,
     0,  0,  0,-15,  0,  0,  0,-16,  0,  0,  0,-17,  0,  0,  0, 0,
     0,  0,-15,  0,  0,  0,  0,-16,  0,  0,  0,  0,-17,  0,  0, 0,
     0,-15,  0,  0,  0,  0,  0,-16,  0,  0,  0,  0,  0,-17,  0, 0,
   -15,  0,  0,  0,  0,  0,  0,-16,  0,  0,  0,  0,  0,  0,-17, 0
  ];

  var SHIFTS = { p: 0, n: 1, b: 2, r: 3, q: 4, k: 5 };

  var FLAGS = {
    NORMAL: 'n',
    CAPTURE: 'c',
    BIG_PAWN: 'b',
    EP_CAPTURE: 'e',
    PROMOTION: 'p',
    KSIDE_CASTLE: 'k',
    QSIDE_CASTLE: 'q'
  };

  var BITS = {
    NORMAL: 1,
    CAPTURE: 2,
    BIG_PAWN: 4,
    EP_CAPTURE: 8,
    PROMOTION: 16,
    KSIDE_CASTLE: 32,
    QSIDE_CASTLE: 64
  };

  var RANK_1 = 7;
  var RANK_2 = 6;
  var RANK_7 = 1;
  var RANK_8 = 0;

  var SQUARES = {
    a8:   0, b8:   1, c8:   2, d8:   3, e8:   4, f8:   5, g8:   6, h8:   7,
    a7:  16, b7:  17, c7:  18, d7:  19, e7:  20, f7:  21, g7:  22, h7:  23,
    a6:  32, b6:  33, c6:  34, d6:  35, e6:  36, f6:  37, g6:  38, h6:  39,
    a5:  48, b5:  49, c5:  50, d5:  51, e5:  52, f5:  53, g5:  54, h5:  55,
    a4:  64, b4:  65, c4:  66, d4:  67, e4:  68, f4:  69, g4:  70, h4:  71,
    a3:  80, b3:  81, c3:  82, d3:  83, e3:  84, f3:  85, g3:  86, h3:  87,
    a2:  96, b2:  97, c2:  98, d2:  99, e2: 100, f2: 101, g2: 102, h2: 103,
    a1: 112, b1: 113, c1: 114, d1: 115, e1: 116, f1: 117, g1: 118, h1: 119
  };

  var ROOKS = {
    w: [{ square: SQUARES.a1, flag: BITS.QSIDE_CASTLE }, { square: SQUARES.h1, flag: BITS.KSIDE_CASTLE }],
    b: [{ square: SQUARES.a8, flag: BITS.QSIDE_CASTLE }, { square: SQUARES.h8, flag: BITS.KSIDE_CASTLE }]
  };

  var Chess = function (fen) {
    var board = new Array(128);
    var kings = { w: EMPTY, b: EMPTY };
    var turn = WHITE;
    var castling = { w: 0, b: 0 };
    var ep_square = EMPTY;
    var half_moves = 0;
    var move_number = 1;
    var history = [];
    var header = {};

    if (typeof fen === 'undefined') {
      load(DEFAULT_POSITION);
    } else {
      load(fen);
    }

    function clear() {
      board = new Array(128);
      kings = { w: EMPTY, b: EMPTY };
      turn = WHITE;
      castling = { w: 0, b: 0 };
      ep_square = EMPTY;
      half_moves = 0;
      move_number = 1;
      history = [];
      header = {};
      update_setup(generate_fen());
    }

    function load(fen) {
      var tokens = fen.split(/\s+/);
      var position = tokens[0];
      var square = 0;

      clear();

      for (var i = 0; i < position.length; i++) {
        var piece = position.charAt(i);
        if (piece === '/') {
          square += 8;
        } else if (is_digit(piece)) {
          square += parseInt(piece, 10);
        } else {
          var color = (piece === piece.toUpperCase()) ? WHITE : BLACK;
          put({ type: piece.toLowerCase(), color: color }, algebra(square));
          square++;
        }
      }

      turn = tokens[1];

      if (tokens[2].indexOf('K') > -1) { castling.w |= BITS.KSIDE_CASTLE; }
      if (tokens[2].indexOf('Q') > -1) { castling.w |= BITS.QSIDE_CASTLE; }
      if (tokens[2].indexOf('k') > -1) { castling.b |= BITS.KSIDE_CASTLE; }
      if (tokens[2].indexOf('q') > -1) { castling.b |= BITS.QSIDE_CASTLE; }

      ep_square = (tokens[3] === '-') ? EMPTY : SQUARES[tokens[3]];
      half_moves = parseInt(tokens[4], 10);
      move_number = parseInt(tokens[5], 10);

      update_setup(generate_fen());
      return true;
    }

    function is_digit(c) { return '0123456789'.indexOf(c) !== -1; }

    function generate_fen() {
      var empty = 0;
      var fen = '';

      for (var i = SQUARES.a8; i <= SQUARES.h1; i++) {
        if (board[i] == null) {
          empty++;
        } else {
          if (empty > 0) {
            fen += empty;
            empty = 0;
          }
          var color = board[i].color;
          var piece = board[i].type;
          fen += (color === WHITE) ? piece.toUpperCase() : piece.toLowerCase();
        }

        if ((i + 1) & 0x88) {
          if (empty > 0) { fen += empty; }
          if (i !== SQUARES.h1) { fen += '/'; }
          empty = 0;
          i += 8;
        }
      }

      var cflags = '';
      if (castling[WHITE] & BITS.KSIDE_CASTLE) { cflags += 'K'; }
      if (castling[WHITE] & BITS.QSIDE_CASTLE) { cflags += 'Q'; }
      if (castling[BLACK] & BITS.KSIDE_CASTLE) { cflags += 'k'; }
      if (castling[BLACK] & BITS.QSIDE_CASTLE) { cflags += 'q'; }
      if (cflags === '') { cflags = '-'; }

      var ep = (ep_square === EMPTY) ? '-' : algebra(ep_square);

      return [fen, turn, cflags, ep, half_moves, move_number].join(' ');
    }

    function algebra(sq) {
      var f = sq & 0x7, r = sq >> 4;
      return 'abcdefgh'.charAt(f) + '87654321'.charAt(r);
    }

    function put(piece, square) {
      if (!('type' in piece && 'color' in piece)) { return false; }
      if (SYMBOLS.indexOf(piece.type.toLowerCase()) === -1) { return false; }
      if (!(square in SQUARES)) { return false; }

      var sq = SQUARES[square];
      board[sq] = { type: piece.type, color: piece.color };
      if (piece.type === KING) { kings[piece.color] = sq; }
      update_setup(generate_fen());
      return true;
    }

    function update_setup(fen) {
      if (history.length > 0) { return; }
      if (fen !== DEFAULT_POSITION) {
        header['SetUp'] = '1';
        header['FEN'] = fen;
      } else {
        delete header['SetUp'];
        delete header['FEN'];
      }
    }

    function build_move(board, from, to, flags, promotion) {
      var move = {
        color: turn,
        from: from,
        to: to,
        flags: flags,
        piece: board[from].type
      };

      if (promotion) {
        move.flags |= BITS.PROMOTION;
        move.promotion = promotion;
      }

      if (board[to]) {
        move.captured = board[to].type;
      } else if (flags & BITS.EP_CAPTURE) {
        move.captured = PAWN;
      }
      return move;
    }

    function generate_moves(options) {
      function add_move(board, moves, from, to, flags) {
        if (board[from].type === PAWN && (rank(to) === RANK_8 || rank(to) === RANK_1)) {
          var pieces = [QUEEN, ROOK, BISHOP, KNIGHT];
          for (var i = 0; i < pieces.length; i++) {
            moves.push(build_move(board, from, to, flags, pieces[i]));
          }
        } else {
          moves.push(build_move(board, from, to, flags));
        }
      }

      var moves = [];
      var us = turn;
      var them = (us === WHITE) ? BLACK : WHITE;
      var second_rank = { w: RANK_2, b: RANK_7 };

      var first_sq = SQUARES.a8;
      var last_sq = SQUARES.h1;
      var single_square = false;

      var legal = (options && 'legal' in options) ? options.legal : true;

      if (options && 'square' in options) {
        if (options.square in SQUARES) {
          first_sq = last_sq = SQUARES[options.square];
          single_square = true;
        } else {
          return [];
        }
      }

      for (var i = first_sq; i <= last_sq; i++) {
        if (i & 0x88) { i += 7; continue; }

        var piece = board[i];
        if (piece == null || piece.color !== us) { continue; }

        if (piece.type === PAWN) {
          var square = i + PAWN_OFFSETS[us][0];
          if (board[square] == null) {
            add_move(board, moves, i, square, BITS.NORMAL);
            square = i + PAWN_OFFSETS[us][1];
            if (second_rank[us] === rank(i) && board[square] == null) {
              add_move(board, moves, i, square, BITS.BIG_PAWN);
            }
          }

          for (var j = 2; j < 4; j++) {
            var square = i + PAWN_OFFSETS[us][j];
            if (square & 0x88) { continue; }

            if (board[square] != null && board[square].color === them) {
              add_move(board, moves, i, square, BITS.CAPTURE);
            } else if (square === ep_square) {
              add_move(board, moves, i, ep_square, BITS.EP_CAPTURE);
            }
          }
        } else {
          for (var j = 0, len = PIECE_OFFSETS[piece.type].length; j < len; j++) {
            var offset = PIECE_OFFSETS[piece.type][j];
            var square = i;

            while (true) {
              square += offset;
              if (square & 0x88) { break; }

              if (board[square] == null) {
                add_move(board, moves, i, square, BITS.NORMAL);
              } else {
                if (board[square].color === us) { break; }
                add_move(board, moves, i, square, BITS.CAPTURE);
                break;
              }
              if (piece.type === KNIGHT || piece.type === KING) { break; }
            }
          }
        }
      }

      if (!single_square || last_sq === kings[us]) {
        if (castling[us] & BITS.KSIDE_CASTLE) {
          var castling_from = kings[us];
          var castling_to = castling_from + 2;
          if (board[castling_from + 1] == null && board[castling_from + 2] == null &&
              !attacked(them, kings[us]) && !attacked(them, castling_from + 1) &&
              !attacked(them, castling_to)) {
            add_move(board, moves, kings[us], castling_to, BITS.KSIDE_CASTLE);
          }
        }
        if (castling[us] & BITS.QSIDE_CASTLE) {
          var castling_from = kings[us];
          var castling_to = castling_from - 2;
          if (board[castling_from - 1] == null && board[castling_from - 2] == null &&
              board[castling_from - 3] == null && !attacked(them, kings[us]) &&
              !attacked(them, castling_from - 1) && !attacked(them, castling_to)) {
            add_move(board, moves, kings[us], castling_to, BITS.QSIDE_CASTLE);
          }
        }
      }

      if (!legal) { return moves; }

      var legal_moves = [];
      for (var i = 0, len = moves.length; i < len; i++) {
        make_move(moves[i]);
        if (!king_attacked(us)) { legal_moves.push(moves[i]); }
        undo_move();
      }

      return legal_moves;
    }

    function rank(i) { return i >> 4; }

    function attacked(color, square) {
      for (var i = SQUARES.a8; i <= SQUARES.h1; i++) {
        if (i & 0x88) { i += 7; continue; }
        if (board[i] == null || board[i].color !== color) { continue; }

        var piece = board[i];
        var difference = i - square;
        var index = difference + 119;

        if (ATTACKS[index] & (1 << SHIFTS[piece.type])) {
          if (piece.type === PAWN) {
            if (difference > 0) {
              if (piece.color === WHITE) return true;
            } else {
              if (piece.color === BLACK) return true;
            }
            continue;
          }
          if (piece.type === KNIGHT || piece.type === KING) return true;

          var offset = RAYS[index];
          var j = i + offset;
          var blocked = false;
          while (j !== square) {
            if (board[j] != null) { blocked = true; break; }
            j += offset;
          }
          if (!blocked) return true;
        }
      }
      return false;
    }

    function king_attacked(color) {
      return attacked((color === WHITE) ? BLACK : WHITE, kings[color]);
    }

    function in_check() { return king_attacked(turn); }

    function in_checkmate() { return in_check() && generate_moves().length === 0; }

    function in_stalemate() { return !in_check() && generate_moves().length === 0; }

    function insufficient_material() {
      var pieces = {};
      var number_of_pieces = 0;
      var sq_color = 0;

      for (var i = SQUARES.a8; i <= SQUARES.h1; i++) {
        sq_color = (sq_color + 1) % 2;
        if (i & 0x88) { i += 7; continue; }
        var piece = board[i];
        if (piece) {
          pieces[piece.type] = (piece.type in pieces) ? pieces[piece.type] + 1 : 1;
          number_of_pieces++;
        }
      }

      if (number_of_pieces === 2) { return true; }
      else if (number_of_pieces === 3 && (pieces[BISHOP] === 1 || pieces[KNIGHT] === 1)) { return true; }
      return false;
    }

    function make_move(move) {
      var us = turn;
      var them = (us === WHITE) ? BLACK : WHITE;

      history.push({
        move: move,
        kings: { w: kings.w, b: kings.b },
        turn: turn,
        castling: { w: castling.w, b: castling.b },
        ep_square: ep_square,
        half_moves: half_moves,
        move_number: move_number
      });

      board[move.to] = board[move.from];
      board[move.from] = null;

      if (move.flags & BITS.PROMOTION) {
        board[move.to] = { type: move.promotion, color: us };
      }

      if (board[move.to].type === KING) {
        kings[us] = move.to;

        if (move.flags & BITS.KSIDE_CASTLE) {
          var castling_to = move.to - 1;
          var castling_from = move.to + 1;
          board[castling_to] = board[castling_from];
          board[castling_from] = null;
        } else if (move.flags & BITS.QSIDE_CASTLE) {
          var castling_to = move.to + 1;
          var castling_from = move.to - 2;
          board[castling_to] = board[castling_from];
          board[castling_from] = null;
        }

        castling[us] = 0;
      }

      if (castling[us]) {
        for (var i = 0, len = ROOKS[us].length; i < len; i++) {
          if (move.from === ROOKS[us][i].square && (castling[us] & ROOKS[us][i].flag)) {
            castling[us] ^= ROOKS[us][i].flag;
            break;
          }
        }
      }

      if (castling[them]) {
        for (var i = 0, len = ROOKS[them].length; i < len; i++) {
          if (move.to === ROOKS[them][i].square && (castling[them] & ROOKS[them][i].flag)) {
            castling[them] ^= ROOKS[them][i].flag;
            break;
          }
        }
      }

      if (move.flags & BITS.EP_CAPTURE) {
        if (us === BLACK) {
          board[move.to - 16] = null;
        } else {
          board[move.to + 16] = null;
        }
      }

      if (move.flags & BITS.BIG_PAWN) {
        if (us === 'b') {
          ep_square = move.to - 16;
        } else {
          ep_square = move.to + 16;
        }
      } else {
        ep_square = EMPTY;
      }

      if (move.piece === PAWN || (move.flags & (BITS.CAPTURE | BITS.EP_CAPTURE))) {
        half_moves = 0;
      } else {
        half_moves++;
      }

      if (us === BLACK) { move_number++; }
      turn = (us === WHITE) ? BLACK : WHITE;
    }

    function undo_move() {
      var old = history.pop();
      if (old == null) { return null; }

      var move = old.move;
      kings = old.kings;
      turn = old.turn;
      castling = old.castling;
      ep_square = old.ep_square;
      half_moves = old.half_moves;
      move_number = old.move_number;

      var us = turn;
      var them = (us === WHITE) ? BLACK : WHITE;

      board[move.from] = board[move.to];
      board[move.from].type = move.piece;
      board[move.to] = null;

      if (move.flags & BITS.CAPTURE) {
        board[move.to] = { type: move.captured, color: them };
      } else if (move.flags & BITS.EP_CAPTURE) {
        var index;
        if (us === BLACK) {
          index = move.to - 16;
        } else {
          index = move.to + 16;
        }
        board[index] = { type: PAWN, color: them };
      }

      if (move.flags & (BITS.KSIDE_CASTLE | BITS.QSIDE_CASTLE)) {
        var castling_to, castling_from;
        if (move.flags & BITS.KSIDE_CASTLE) {
          castling_to = move.to + 1;
          castling_from = move.to - 1;
        } else if (move.flags & BITS.QSIDE_CASTLE) {
          castling_to = move.to - 2;
          castling_from = move.to + 1;
        }
        board[castling_to] = board[castling_from];
        board[castling_from] = null;
      }

      return move;
    }

    function move_to_san(move) {
      var output = '';
      if (move.flags & BITS.KSIDE_CASTLE) {
        output = 'O-O';
      } else if (move.flags & BITS.QSIDE_CASTLE) {
        output = 'O-O-O';
      } else {
        var disambiguator = get_disambiguator(move);
        if (move.piece !== PAWN) {
          output += move.piece.toUpperCase() + disambiguator;
        }

        if (move.flags & (BITS.CAPTURE | BITS.EP_CAPTURE)) {
          if (move.piece === PAWN) { output += algebra(move.from)[0]; }
          output += 'x';
        }

        output += algebra(move.to);

        if (move.flags & BITS.PROMOTION) {
          output += '=' + move.promotion.toUpperCase();
        }
      }

      make_move(move);
      if (in_check()) {
        if (in_checkmate()) {
          output += '#';
        } else {
          output += '+';
        }
      }
      undo_move();

      return output;
    }

    function get_disambiguator(move) {
      var moves = generate_moves();
      var from = move.from;
      var to = move.to;
      var piece = move.piece;

      var ambiguities = 0;
      var same_rank = 0;
      var same_file = 0;

      for (var i = 0, len = moves.length; i < len; i++) {
        var ambig_from = moves[i].from;
        var ambig_to = moves[i].to;
        var ambig_piece = moves[i].piece;

        if (piece === ambig_piece && from !== ambig_from && to === ambig_to) {
          ambiguities++;
          if (rank(from) === rank(ambig_from)) { same_rank++; }
          if ((from & 0x7) === (ambig_from & 0x7)) { same_file++; }
        }
      }

      if (ambiguities > 0) {
        if (same_rank > 0 && same_file > 0) {
          return algebra(from);
        } else if (same_file > 0) {
          return algebra(from)[1];
        } else {
          return algebra(from)[0];
        }
      }
      return '';
    }

    return {
      WHITE: WHITE,
      BLACK: BLACK,
      PAWN: PAWN,
      KNIGHT: KNIGHT,
      BISHOP: BISHOP,
      ROOK: ROOK,
      QUEEN: QUEEN,
      KING: KING,
      SQUARES: SQUARES,
      FLAGS: FLAGS,
      reset: function () { return load(DEFAULT_POSITION); },
      load: function (fen) { return load(fen); },
      moves: function (options) {
        var move_objects = generate_moves(options);
        var moves = [];
        for (var i = 0; i < move_objects.length; i++) {
          if (typeof options !== 'undefined' && options.verbose) {
            moves.push(move_objects[i]);
          } else {
            moves.push(move_to_san(move_objects[i]));
          }
        }
        return moves;
      },
      in_check: function () { return in_check(); },
      in_checkmate: function () { return in_checkmate(); },
      in_stalemate: function () { return in_stalemate(); },
      in_draw: function () { return half_moves >= 100 || in_stalemate() || insufficient_material(); },
      game_over: function () { return half_moves >= 100 || in_checkmate() || in_stalemate() || insufficient_material(); },
      get: function (square) {
        if (!(square in SQUARES)) return null;
        var piece = board[SQUARES[square]];
        return piece ? { type: piece.type, color: piece.color } : null;
      },
      move: function (move, options) {
        var moves = generate_moves();
        var move_obj = null;

        if (typeof move === 'string') {
          for (var i = 0; i < moves.length; i++) {
            if (move_to_san(moves[i]) === move) {
              move_obj = moves[i];
              break;
            }
          }
        } else if (typeof move === 'object') {
          for (var i = 0; i < moves.length; i++) {
            if (move.from === algebra(moves[i].from) && move.to === algebra(moves[i].to)) {
              if (!('promotion' in moves[i]) || move.promotion === moves[i].promotion) {
                move_obj = moves[i];
                break;
              }
            }
          }
        }

        if (!move_obj) { return null; }

        var pretty_move = {
          color: move_obj.color,
          from: algebra(move_obj.from),
          to: algebra(move_obj.to),
          flags: move_obj.flags,
          piece: move_obj.piece,
          san: move_to_san(move_obj)
        };
        if (move_obj.captured) pretty_move.captured = move_obj.captured;
        if (move_obj.promotion) pretty_move.promotion = move_obj.promotion;

        make_move(move_obj);
        return pretty_move;
      },
      undo: function () {
        var move = undo_move();
        return move ? {
          from: algebra(move.from),
          to: algebra(move.to),
          piece: move.piece,
          color: move.color,
          captured: move.captured,
          promotion: move.promotion
        } : null;
      },
      clear: function () { clear(); },
      fen: function () { return generate_fen(); },
      turn: function () { return turn; },
      history: function () {
        var history_copy = [];
        for (var i = 0; i < history.length; i++) {
          history_copy.push(move_to_san(history[i].move));
        }
        return history_copy;
      }
    };
  };

  return Chess;
})));


/* ============================================================================
   SECTION 2: APPLICATION INTERFACE & ENGINE CONTROLLER
   ============================================================================ */
document.addEventListener('DOMContentLoaded', function () {
  'use strict';

  // --- Element Selector Adapters (Graceful Fallback matching your HTML) ---
  function getEl(selectors) {
    for (var i = 0; i < selectors.length; i++) {
      var el = document.querySelector(selectors[i]);
      if (el) return el;
    }
    return null;
  }

  var boardEl = getEl(['#board', '.chessboard', '.board', '[data-board]']);
  var statusEl = getEl(['#status', '.status', '#game-status', '.game-status']);
  var turnEl = getEl(['#turn', '.turn', '#turn-indicator']);
  var historyEl = getEl(['#moves', '#history', '.move-history', '.moves-list']);
  var undoBtn = getEl(['#undo-btn', '#undo', '.btn-undo']);
  var resetBtn = getEl(['#reset-btn', '#new-game', '#new-game-btn', '.btn-reset']);
  var modeSelect = getEl(['#mode', '#game-mode', '#vs-computer', '.mode-select']);
  var whiteClockEl = getEl(['#white-clock', '.white-clock', '#clock-white']);
  var blackClockEl = getEl(['#black-clock', '.black-clock', '#clock-black']);

  // Piece Unicode Map
  var PIECE_UNICODE = {
    w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
    b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' }
  };

  // State
  var game = new Chess();
  var selectedSquare = null;
  var legalMovesForSelected = [];
  var lastMove = null;
  var isComputerOpponent = false;
  var computerColor = 'b';
  var isEngineThinking = false;
  var engineWorker = null;

  // Clock State
  var timeLimitMs = 5 * 60 * 1000; // 5 Minutes default
  var whiteTimeMs = timeLimitMs;
  var blackTimeMs = timeLimitMs;
  var timerInterval = null;
  var lastTickTime = null;

  /* --- Stockfish Web Worker Integration with Local Minimax Fallback --- */
  function initEngine() {
    try {
      if (window.Worker) {
        engineWorker = new Worker('engine/stockfish.js');
        engineWorker.onmessage = function (e) {
          var msg = e.data;
          if (typeof msg === 'string' && msg.indexOf('bestmove') === 0) {
            var parts = msg.split(' ');
            var bestMoveStr = parts[1];
            if (bestMoveStr && bestMoveStr !== '(none)') {
              handleEngineMoveOutput(bestMoveStr);
            }
          }
        };
        engineWorker.postMessage('uci');
        engineWorker.postMessage('isready');
      }
    } catch (err) {
      console.warn('Stockfish Web Worker unavailable. Using local engine fallback.', err);
      engineWorker = null;
    }
  }

  /* Built-in Local Minimax Fallback Engine (No Network/File dependency) */
  function getLocalMinimaxMove() {
    var moves = game.moves({ verbose: true });
    if (moves.length === 0) return null;

    var pieceValues = { p: 10, n: 30, b: 30, r: 50, q: 90, k: 900 };
    var bestMove = null;
    var bestValue = -9999;

    for (var i = 0; i < moves.length; i++) {
      var move = moves[i];
      game.move(move);
      var boardValue = 0;
      var squares = 'a8 b8 c8 d8 e8 f8 g8 h8 a7 b7 c7 d7 e7 f7 g7 h7 a6 b6 c6 d6 e6 f6 g6 h6 a5 b5 c5 d5 e5 f5 g5 h5 a4 b4 c4 d4 e4 f4 g4 h4 a3 b3 c3 d3 e3 f3 g3 h3 a2 b2 c2 d2 e2 f2 g2 h2 a1 b1 c1 d1 e1 f1 g1 h1'.split(' ');
      
      for (var s = 0; s < squares.length; s++) {
        var p = game.get(squares[s]);
        if (p) {
          var val = pieceValues[p.type] || 0;
          boardValue += (p.color === computerColor ? val : -val);
        }
      }
      game.undo();

      if (boardValue > bestValue) {
        bestValue = boardValue;
        bestMove = move;
      }
    }
    return bestMove || moves[Math.floor(Math.random() * moves.length)];
  }

  function triggerComputerMove() {
    if (game.game_over() || game.turn() !== computerColor) return;
    isEngineThinking = true;
    updateStatusDisplay();

    if (engineWorker) {
      engineWorker.postMessage('position fen ' + game.fen());
      engineWorker.postMessage('go depth 8');
    } else {
      setTimeout(function () {
        var move = getLocalMinimaxMove();
        if (move) {
          executeMove(move.from, move.to, move.promotion || 'q');
        }
        isEngineThinking = false;
        updateStatusDisplay();
      }, 300);
    }
  }

  function handleEngineMoveOutput(bestMoveStr) {
    if (!isEngineThinking) return;
    isEngineThinking = false;
    
    var from = bestMoveStr.substring(0, 2);
    var to = bestMoveStr.substring(2, 4);
    var promo = bestMoveStr.length > 4 ? bestMoveStr.substring(4, 5) : 'q';

    executeMove(from, to, promo);
  }

  /* --- UI Rendering Engine --- */
  function renderBoard() {
    if (!boardEl) return;

    var files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    var ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

    // Check if board already has square elements or needs generation
    var existingSquares = boardEl.querySelectorAll('.square, [data-square]');
    var squareMap = {};

    if (existingSquares.length === 64) {
      existingSquares.forEach(function (sq) {
        var id = sq.id || sq.getAttribute('data-square') || sq.getAttribute('data-coord');
        if (id) squareMap[id] = sq;
      });
    } else {
      boardEl.innerHTML = '';
      for (var r = 0; r < 8; r++) {
        for (var f = 0; f < 8; f++) {
          var squareId = files[f] + ranks[r];
          var sq = document.createElement('div');
          sq.className = 'square ' + ((r + f) % 2 === 0 ? 'light' : 'dark');
          sq.id = squareId;
          sq.setAttribute('data-square', squareId);
          boardEl.appendChild(sq);
          squareMap[squareId] = sq;
        }
      }
    }

    // Populate Board
    for (var r = 0; r < 8; r++) {
      for (var f = 0; f < 8; f++) {
        var squareId = files[f] + ranks[r];
        var sqEl = squareMap[squareId];
        if (!sqEl) continue;

        // Reset state classes
        sqEl.classList.remove('selected', 'legal-move', 'last-move', 'check');
        
        var pieceNode = sqEl.querySelector('.piece');
        var p = game.get(squareId);

        if (p) {
          var symbol = PIECE_UNICODE[p.color][p.type];
          if (!pieceNode) {
            pieceNode = document.createElement('span');
            pieceNode.className = 'piece';
            sqEl.appendChild(pieceNode);
          }
          pieceNode.textContent = symbol;
          pieceNode.setAttribute('data-piece', p.color + p.type);
        } else {
          if (pieceNode) sqEl.removeChild(pieceNode);
        }

        // Highlight Selected
        if (selectedSquare === squareId) {
          sqEl.classList.add('selected');
        }

        // Highlight Legal Destination
        if (legalMovesForSelected.indexOf(squareId) !== -1) {
          sqEl.classList.add('legal-move');
        }

        // Highlight Last Move
        if (lastMove && (lastMove.from === squareId || lastMove.to === squareId)) {
          sqEl.classList.add('last-move');
        }

        // Highlight Check
        if (game.in_check() && p && p.type === 'k' && p.color === game.turn()) {
          sqEl.classList.add('check');
        }
      }
    }

    updateStatusDisplay();
    updateHistoryDisplay();
  }

  /* --- Game Mechanics & User Input --- */
  function handleSquareClick(squareId) {
    if (isEngineThinking) return;
    if (isComputerOpponent && game.turn() === computerColor) return;
    if (game.game_over()) return;

    if (selectedSquare === squareId) {
      clearSelection();
      renderBoard();
      return;
    }

    if (selectedSquare && legalMovesForSelected.indexOf(squareId) !== -1) {
      // Check for promotion
      var piece = game.get(selectedSquare);
      var isPromotion = piece && piece.type === 'p' && (squareId[1] === '8' || squareId[1] === '1');
      var promoPiece = 'q';

      if (isPromotion) {
        var choice = prompt('Promote to: (q)ueen, (r)ook, (b)ishop, (k)night', 'q');
        if (choice && ['q', 'r', 'b', 'n'].indexOf(choice.toLowerCase()) !== -1) {
          promoPiece = choice.toLowerCase();
        }
      }

      executeMove(selectedSquare, squareId, promoPiece);
      clearSelection();
      return;
    }

    var p = game.get(squareId);
    if (p && p.color === game.turn()) {
      selectedSquare = squareId;
      var moves = game.moves({ square: squareId, verbose: true });
      legalMovesForSelected = moves.map(function (m) { return m.to; });
    } else {
      clearSelection();
    }

    renderBoard();
  }

  function executeMove(from, to, promotion) {
    var move = game.move({ from: from, to: to, promotion: promotion });
    if (move) {
      lastMove = move;
      switchClock();

      if (!game.game_over() && isComputerOpponent && game.turn() === computerColor) {
        triggerComputerMove();
      }
    }
    renderBoard();
  }

  function clearSelection() {
    selectedSquare = null;
    legalMovesForSelected = [];
  }

  /* --- Status & Move History Rendering --- */
  function updateStatusDisplay() {
    var statusText = '';
    var turnText = game.turn() === 'w' ? "White's Turn" : "Black's Turn";

    if (game.in_checkmate()) {
      statusText = 'Checkmate! ' + (game.turn() === 'w' ? 'Black' : 'White') + ' wins.';
      stopClock();
    } else if (game.in_stalemate()) {
      statusText = 'Draw by Stalemate.';
      stopClock();
    } else if (game.in_draw()) {
      statusText = 'Draw.';
      stopClock();
    } else if (game.in_check()) {
      statusText = turnText + ' (Check!)';
    } else if (isEngineThinking) {
      statusText = 'Computer is thinking...';
    } else {
      statusText = turnText;
    }

    if (statusEl) statusEl.textContent = statusText;
    if (turnEl) turnEl.textContent = turnText;
  }

  function updateHistoryDisplay() {
    if (!historyEl) return;
    var history = game.history();
    var html = '';

    for (var i = 0; i < history.length; i += 2) {
      var moveNumber = Math.floor(i / 2) + 1;
      var whiteMove = history[i];
      var blackMove = history[i + 1] || '';
      html += '<div class="move-row"><span class="move-num">' + moveNumber + '.</span> ' +
              '<span class="move-w">' + whiteMove + '</span> ' +
              '<span class="move-b">' + blackMove + '</span></div>';
    }

    historyEl.innerHTML = html;
    historyEl.scrollTop = historyEl.scrollHeight;
  }

  /* --- Clock Management --- */
  function formatTime(ms) {
    var totalSec = Math.max(0, Math.ceil(ms / 1000));
    var mins = Math.floor(totalSec / 60);
    var secs = totalSec % 60;
    return (mins < 10 ? '0' : '') + mins + ':' + (secs < 10 ? '0' : '') + secs;
  }

  function updateClockDisplay() {
    if (whiteClockEl) whiteClockEl.textContent = formatTime(whiteTimeMs);
    if (blackClockEl) blackClockEl.textContent = formatTime(blackTimeMs);
  }

  function startClock() {
    stopClock();
    lastTickTime = Date.now();
    timerInterval = setInterval(function () {
      var now = Date.now();
      var delta = now - lastTickTime;
      lastTickTime = now;

      if (game.turn() === 'w') {
        whiteTimeMs -= delta;
        if (whiteTimeMs <= 0) {
          whiteTimeMs = 0;
          stopClock();
          if (statusEl) statusEl.textContent = 'Black wins on time!';
        }
      } else {
        blackTimeMs -= delta;
        if (blackTimeMs <= 0) {
          blackTimeMs = 0;
          stopClock();
          if (statusEl) statusEl.textContent = 'White wins on time!';
        }
      }
      updateClockDisplay();
    }, 200);
  }

  function stopClock() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function switchClock() {
    if (!game.game_over()) {
      startClock();
    } else {
      stopClock();
    }
  }

  function resetClock() {
    stopClock();
    whiteTimeMs = timeLimitMs;
    blackTimeMs = timeLimitMs;
    updateClockDisplay();
  }

  /* --- Control Handlers (Undo & Reset) --- */
  function handleUndo() {
    if (isEngineThinking) return;

    // In AI mode, undo 2 ply (Human + AI)
    if (isComputerOpponent) {
      game.undo();
      game.undo();
    } else {
      game.undo();
    }

    lastMove = null;
    clearSelection();
    renderBoard();
  }

  function handleReset() {
    isEngineThinking = false;
    game.reset();
    lastMove = null;
    clearSelection();
    resetClock();
    renderBoard();
  }

  /* --- Event Listeners & Delegation --- */
  if (boardEl) {
    boardEl.addEventListener('click', function (e) {
      var targetSquare = e.target.closest('.square, [data-square]');
      if (targetSquare) {
        var id = targetSquare.id || targetSquare.getAttribute('data-square') || targetSquare.getAttribute('data-coord');
        if (id) handleSquareClick(id);
      }
    });

    // Touch optimization for smooth mobile interaction
    boardEl.addEventListener('touchend', function (e) {
      var touch = e.changedTouches[0];
      var el = document.elementFromPoint(touch.clientX, touch.clientY);
      if (el) {
        var targetSquare = el.closest('.square, [data-square]');
        if (targetSquare) {
          var id = targetSquare.id || targetSquare.getAttribute('data-square') || targetSquare.getAttribute('data-coord');
          if (id) {
            e.preventDefault();
            handleSquareClick(id);
          }
        }
      }
    }, { passive: false });
  }

  if (undoBtn) undoBtn.addEventListener('click', handleUndo);
  if (resetBtn) resetBtn.addEventListener('click', handleReset);
  if (modeSelect) {
    modeSelect.addEventListener('change', function (e) {
      isComputerOpponent = (e.target.value === 'vs-computer' || e.target.value === 'ai' || e.target.checked === true);
      handleReset();
    });
  }

  // Tab Visibility Handler to prevent clock drift
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && timerInterval) {
      lastTickTime = Date.now();
    }
  });

  // Initialization
  initEngine();
  resetClock();
  renderBoard();
});
