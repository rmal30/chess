# chess.js v1.0
A chess engine in javascript
Click here to play: https://rmal30.github.io/chess.js


Chess.js is a web app which can play chess. It features an AI that uses minimax to find the best move. It uses many heuristics to improve playing performance such as:
 - Alpha beta pruning
 - Transposition tables
 - MTD(f)
 - Move ordering
 - Iterative deepening

The program evaluates the board on 4 criteria:
 - Piece values
 - Board control
 - Pawn advancement
 - King freedom (for the endgame only)

Features:
 - Board history in PGN
 - Undo and redo
 - Choosing levels from 1 to 10
 - Allows 2 humans or computers to play
