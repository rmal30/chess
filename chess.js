var boardPieces;
var game;
var file = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
var order = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];
var ids = ["RQ", "NQ", "BQ", "Q", "K", "BK", "NK", "RK"];
var values = [5, 3, 3.5, 9, 39, 3.5, 3, 5];
var abc = {a:0, b:1, c:2, d:3, e:4, f:5, g:6, h:7};
var color = ['w', 'b'];
var color2 = ['W', 'B'];
var colorToSide = {'W':0, 'B':1};
var moveHistory;
var gameNotation;
var boardTable = {};
var noPiece = "--";
var bestMoves;
var allowPlay = false;
var numCalls = {eval:0,evalB:0, p:0, k:0, n:0, moves:0, check:0, umt:0, umtm:0, fcp:0};
var currentSide, pendingMove;
function init(){
	boardPieces = {};
	moveHistory=[];
	gameNotation = [];
	currentSide=0;
	pendingMove = false;
	for(var i=0; i<8; i++){
		boardPieces["W"+ids[i]] = {type:order[i], side:0, position:file[i]+'1', id:"W"+ids[i], moved:false, value: values[i]};
		boardPieces["WP"+i] 	= {type:'P', side:0, position:file[i]+'2', id:"WP"+i, moved:false, value:1};
		boardPieces["BP"+i] 	= {type:'P', side:1, position:file[i]+'7', id:"BP"+i, moved:false, value:1};
		boardPieces["B"+ids[i]] = {type:order[i], side:1, position:file[i]+'8', id:"B"+ids[i], moved:false, value: values[i]};
	}
	game = [JSON.parse(JSON.stringify(boardPieces))];
	setupBoard(boardPieces);
	updateStatus();
}
function undo(){
	document.getElementById("moves").innerHTML="";
	if(game.length>1){
		currentSide = 1-currentSide;
		game.pop();
		moveHistory.pop();
		gameNotation.pop();
		boardPieces = JSON.parse(JSON.stringify(game[game.length-1]));
		setupBoard(boardPieces);
		updateStatus();
	}
}
function play(){
    var level = parseInt(document.getElementById("level").value);
	var posIds = findPosIds(boardPieces);
	bestMoves = findBestMoves(boardPieces, posIds, findValidMoves(boardPieces, posIds), currentSide, level, level, -100, 100);
	if(bestMoves.length>0){
		bestMove = bestMoves[Math.floor(bestMoves.length*Math.random())];
		applyMove(bestMove);
	}
	updateStatus();
}

function findValidMoves(board, pieceIds){
	validMoves = {};
	for(var id in board){
		validMoves[id] = findValidPieceMoves(board[id], board, pieceIds,true);
	}
	return validMoves;
}

function startGame(){
    init();
    doPlay();
}

function doPlay(){
    var compPlayer= document.getElementById("compPlayer").value;
    
    if(compPlayer==currentSide || compPlayer==2){
        document.getElementById("pending").style.visibility = "visible";
        setTimeout(play, 200);
    }else{
        document.getElementById("pending").style.visibility = "hidden";
    }
}

function evaluateScore(board, validMoves, pieceIds, side){
	var scores = evaluateBoard(board,validMoves, pieceIds);
	var score;
	if(side===0){
		score = scores[0] - scores[1];
	}else{
		score = scores[1] - scores[0];
	}		
	return score;
}

function findAllPieceMoves(piece){
	var position = piece.position;
	var pieceType = piece.type;
	var positions = [];
	var vectors;
	var direction=1;
	if(piece.side===1){direction=-1;}
	var numPaths;
	switch(pieceType){
		case 'R': vectors = [[-1, 0], [0, 1], [0, -1], [1, 0]]; numPaths = 4; break;
		case 'B': vectors = [[-1, 1], [1, 1], [-1, -1], [1, -1]]; numPaths = 4; break;
		case 'Q': vectors = [[1, 0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]]; numPaths = 8; break;
	}
	
	switch(pieceType){
		case 'R':
		case 'B':
		case 'Q':
			var pos = piece.position;
			for(var i=0; i<numPaths; i++){
				pos = piece.position;
				while(pos!==undefined){
					pos = adjustPosition(pos, vectors[i][0], vectors[i][1]);
					if(pos!==undefined){
						positions.push(pos);
					}
				}
			}
			break;
		case 'N':
			var options = [[2, 1],[1, 2],[-1, 2],[-2, 1],[-2, -1],[-1, -2],[1, -2],[2, -1]];
			var possibleMove;
			var pos = piece.position;
			for(var i=0; i<8; i++){
				possibleMove = adjustPosition(pos, options[i][0], options[i][1]);
				if(possibleMove!==undefined){
					positions.push(possibleMove);
				}
			}	
			break;
		case 'K':
			var options = [[1, 0],[1, 1],[0, 1],[-1, 1],[-1, 0],[-1, -1],[0, -1],[1, -1]];
			var possibleMove;
			var pos = piece.position;
			for(var i=0; i<8; i++){
				possibleMove = adjustPosition(pos, options[i][0], options[i][1]);
				if(possibleMove!==undefined){
					positions.push(possibleMove);
				}
			}	
			break;
		case 'P':
			var options = [[0, direction],[0, 2*direction],[-1, direction],[1, direction]];
			var possibleMove;
			var pos = piece.position;
			for(var i=0; i<4; i++){
				possibleMove = adjustPosition(pos, options[i][0], options[i][1]);
				if(possibleMove!==undefined){
					positions.push(possibleMove);
				}
			}	
			break;
	default:
    }	
	return positions;

}


function checkRelations(posArray, pieceType){
	if(pieceType=="R"){
		var valid = true;
		for(var i=1; i<posArray.length; i++){
			if(posArray[i][0]!=posArray[0][0]){valid=false; break;}
		}
		if(!valid){
			valid = true;
			for(var i=1; i<posArray.length; i++){
				if(posArray[i][1]!=posArray[0][1]){valid=false; break;}
			}
		}
		return valid;
	}else if(pieceType=="B"){
		var valid = true;
		for(var i=1; i<posArray.length; i++){
			if(findCol(posArray[i][0]) + parseInt(posArray[i][1])!=findCol(posArray[0][0]) + parseInt(posArray[0][1])){valid=false; break;}
		}
		if(!valid){
			valid = true
			for(var i=1; i<posArray.length; i++){
				if(findCol(posArray[i][0]) - parseInt(posArray[i][1])!=findCol(posArray[0][0]) - parseInt(posArray[0][1])){valid=false; break;}
			}
		}
		return valid;
	}else if(pieceType=="Q"){
		return checkRelations(posArray, "R") || checkRelations(posArray, "B");
	}else{
		return false;
	}
	
}

function parseObject(objStr){
	return JSON.parse(objStr);
}

function posToNum(pos){
	return findCol(pos[0])+(pos[1]-1)*8;
}

function findBestMoves(board,pieceIds, validMoves, side, depth,maxDepth, a, b){
	var bestScore = -1000;
	var bestMoves = [];
	var allOptions;
	var captured;
	var validMove;
	var numMoves, numCaptures;
	var initPos, newScore;
	var totalMoves;
	var replies;
	var movingPiece;
	var legalMoves;
	var unknownPiece;
	var k;
	var oppKingId;
	var validMoves2 = {};
	var board2 = {};
	var pieceIds2 = [];
	var validMovesStr = JSON.stringify(validMoves);
	var boardStr = JSON.stringify(board);
	//var pieceIdsStr = JSON.stringify(pieceIds);
	if(side===0){oppKingId = "BK";}else{oppKingId = "WK";}
	for(var pieceId in board){
		if(board[pieceId].side==side){
			validMoves2 = parseObject(validMovesStr);
			movingPiece = board[pieceId];
			allOptions = validMoves[pieceId];
			initPos = movingPiece.position;
			pieceIds[posToNum(initPos)]=noPiece;
			var unknownPieces1 = findControllingPieces(board, pieceIds, initPos);
			for(var i=0; i<unknownPieces1.length; i++){
				validMoves2[unknownPieces1[i]] = findValidPieceMoves(board[unknownPieces1[i]], board, pieceIds, false);	
			}
			pieceIds[posToNum(initPos)] = pieceId;
			numCaptures = allOptions[1].length;
			numMoves = allOptions[0].length;
			for(var i=0; i<numCaptures; i++){
				allOptions[0].push(allOptions[1][i]);
			}
			totalMoves = allOptions[0].length;
			var validMoves2Str = JSON.stringify(validMoves2);
			var validMoves3 = {};
			for(var j=0; j<totalMoves; j++){
				validMove = allOptions[0][j];
				board2 = parseObject(boardStr);
				pieceIds2 = pieceIds.slice();
				validMoves3 = parseObject(validMoves2Str);
				makeMove(board2,pieceIds2, validMoves3, {origin:initPos, dest:validMove, pieceId:pieceId});
				var unknownPieces2 = findControllingPieces(board2, pieceIds2, validMove);
				for(var i=0; i<unknownPieces2.length; i++){
					unknownPiece = unknownPieces2[i];
					validMoves3[unknownPiece] = findValidPieceMoves(board2[unknownPiece], board2, pieceIds2, false);	
				}
				validMoves3[pieceId] = findValidPieceMoves(board2[pieceId], board2, pieceIds2, false);
				
				/*
				if(board2[oppKingId]!=undefined){
					if(checkRelations([validMove, board2[oppKingId].position], movingPiece.type)){
						var potentialPins = validMoves3[pieceIds2[validMove]][1];
						for(var k=0; k<potentialPins.length; k++){
							if(checkRelations([potentialPins[k] ,validMove, board2[oppKingId].position], movingPiece.type)){
								validMoves3[pieceIds2[potentialPins[k]]] = findValidPieceMoves(board2[pieceIds2[potentialPins[k]]], board2, pieceIds2, false);
								break;
							}
						}
					}
					validMoves3[oppKingId] = findValidPieceMoves(board2[oppKingId], board2, pieceIds2, false);
				}
				*/
				if(depth>1){
					replies = findBestMoves(board2,pieceIds2,validMoves3,1-side, depth-1, maxDepth, -b, -a);
					if(replies.length>0){
						newScore = - replies[0].score;
					}else{
						newScore = 1000;
					}
				}else{
					newScore = evaluateScore(board2,validMoves3, pieceIds2, side);
				}
				if(newScore>bestScore){
					bestScore = newScore;
					bestMoves = [];
				}
				if(newScore>=bestScore){
					//move.score = newScore;
					bestMoves.push({origin:initPos, dest:validMove, pieceId:pieceId, score:newScore});
				}
				if(bestScore>a){a = bestScore;}
				if(a>=b){ return bestMoves;}
			}				
		}
	}
	
	return bestMoves;	
}
function updateStatus(){
	var pieceIds = findPosIds(boardPieces);
	var scores = deepEvaluation(boardPieces, pieceIds);
	document.getElementById("history").innerHTML = gameNotation.join(" ");
	document.getElementById("scores").innerHTML="White: "+scores[0]+", Black: "+scores[1];
	if(detectCheck(boardPieces,pieceIds,0) || detectCheck(boardPieces,pieceIds, 1)){
		if(scores[0]===0){
			document.getElementById("status").innerHTML="Checkmate! Black wins!";
		}else if(scores[1]===0){
			document.getElementById("status").innerHTML="Checkmate! White wins!";
		}else{
			document.getElementById("status").innerHTML="Check!";
		}
	}else{
		if(scores[0]===0 || scores[1]===0){
			document.getElementById("status").innerHTML="Stalemate!";
		}else{
			document.getElementById("status").innerHTML="";
		}
	}
}


function highlightMoves(rays){
	document.getElementById("moves").innerHTML="";
	var moves;
	for(var i=0; i<rays.length; i++){
		moves = rays[i];
		for(var j=0; j<rays[i].length;j++){
			var left = (8+52*findCol(moves[j][0])).toString();
			var top = (416 + 8-52*parseInt(moves[j][1])).toString();
			document.getElementById("moves").innerHTML+='<div style="position:absolute; left:'+left+'px;top:'+top+'px; height:52px; width:52px; background-color: rgba(255, 255, 0, 0.2)"></div>';
		}
	}
}
function getCell(x, y){
	var row = Math.ceil((416 - y+10)/52);
	var col = Math.floor((x-10)/52);
	return file[col]+row;
}
function findCol(c){
	return abc[c];
}


function makeMove(board, pieceIds, validMoves,move){
	var captureMade = false;
	pieceIds[posToNum(move.origin)] = noPiece;
	if(pieceIds[posToNum(move.dest)]!==noPiece){
		captureMade = true;
		delete board[pieceIds[posToNum(move.dest)]];
		delete validMoves[pieceIds[posToNum(move.dest)]];
	}
	pieceIds[posToNum(move.dest)] = move.pieceId;
	
	if(Math.abs(move.origin[1] - move.dest[1])===1 && Math.abs(findCol(move.origin[0]) - findCol(move.dest[0]))===1 && !captureMade &&move.pieceId[1]==='P'){
		delete board[pieceIds[posToNum(move.dest[0]+move.origin[1])]];
		delete validMoves[pieceIds[posToNum(move.dest[0]+move.origin[1])]];
		pieceIds[posToNum(move.dest[0]+move.origin[1])] = noPiece;
	}
	if(move.origin==="e"+move.origin[1] && move.dest==="c"+move.origin[1] && move.pieceId[1]==='K'){
		board[move.id[0]+"RQ"].position = "d"+move.origin[1];
		pieceIds[posToNum("a"+move.origin[1])] = noPiece;
		pieceIds[posToNum("d"+move.origin[1])] = move.id[0]+"RQ";
	}	
	if(move.origin==="e"+move.origin[1] && move.dest==="g"+move.origin[1] && move.pieceId[1]==='K'){
		board[move.id[0]+"RK"].position = "f"+move.origin[1];
		pieceIds[posToNum("h"+move.origin[1])] = noPiece;
		pieceIds[posToNum("f"+move.origin[1])] = move.id[0]+"RK";
	}
	if((move.pieceId[0]==='B' && move.dest[1]==="1") || (move.pieceId[0]==='W' && move.dest[1]==="8")){
		if(move.pieceId[1]==='P'){
			var piece = board[move.pieceId];
			piece.type='Q';
			piece.value=9;
		}
	}
	board[move.pieceId].position = move.dest;
}


function getNotation(board, move){
	var promotion = "";
	var pieceIds = findPosIds(board);
	var finalPosId = pieceIds[posToNum(move.dest)];
	var capture = "";
	var pieceType=move.pieceId[1];
	var idLetters = pieceType;

	if(finalPosId!==noPiece){
		capture="x";
	}else{
		if(Math.abs(move.origin[1] - move.dest[1])===1 && Math.abs(findCol(move.origin[0]) - findCol(move.dest[0]))===1 && pieceType=="P"){
			return move.origin[0]+"x"+move.dest+"e.p.";
		}
	}

	if(pieceType==="P"){
		if(capture==="x"){idLetters=move.origin[0];}else{idLetters="";}
		if(move.dest[1]=="1" || move.dest[1]=="8"){
			promotion="=Q";
		}
	}else{
		idLetters=pieceType;
	}

	if(pieceType=="R" || pieceType=="Q" || pieceType=="B" || pieceType=="N"){
		var moves;
		var initPositions = [];
		for(var pieceId2 in board){
			if(pieceId2[1]==pieceType && pieceId2[0]==move.pieceId[0] && move.pieceId!=pieceId2){
				moves = findValidPieceMoves(board[pieceId2], board, pieceIds, true);
				if(moves[0].indexOf(move.dest)!==-1 || moves[1].indexOf(move.dest)!==-1){
					initPositions.push(board[pieceId2].position);
				}
			}
		}
		var sameFile = false;
		var sameRank = false;
		for(var i=0; i<initPositions.length; i++){
			if(initPositions[i][0]==move.origin[0]){
				sameFile = true;
			}
			if(initPositions[i][1]==move.origin[1]){
				sameRank = true;
			}
		}
		if(initPositions.length>0){
			if(!sameFile){idLetters+=move.origin[0];}
			else if(!sameRank){idLetters+=move.origin[1];}
			else{
				idLetters+=move.origin;
			}
		}
	}
	if(pieceType==="K" && move.origin[0]=="e"){
		if(move.dest[0]=="g"){
			return "O-O";
		}else if(move.dest[0]=="c"){
			return "O-O-O";
		}
	}

	return idLetters+capture+move.dest+promotion;
}


function applyMove(move){
	gameNotation.push(getNotation(boardPieces, move));
	makeMove(boardPieces,findPosIds(boardPieces), findValidMoves(boardPieces,findPosIds(boardPieces)), move);
	moveHistory.push(move);
	currentSide = 1 - currentSide;
	game.push(JSON.parse(JSON.stringify(boardPieces)));
	setupBoard(boardPieces);
	updateStatus();
	doPlay();
}

function startMove(id, side){
	if(side===currentSide && !pendingMove){
		pendingMove = true;
		var movingPiece = boardPieces[id];
		var initPos = movingPiece.position;
		document.getElementById("piece-"+side+"-"+id).style.WebkitFilter='drop-shadow(1px 1px 0 yellow) drop-shadow(-1px 1px 0 yellow) drop-shadow(1px -1px 0 yellow) drop-shadow(-1px -1px 0 yellow)';
		var possibleRays = findValidPieceMoves(movingPiece, boardPieces, findPosIds(boardPieces), true);
		highlightMoves(possibleRays);
		document.addEventListener('mouseup', function fmove() {
			var cell = getCell(event.clientX,event.clientY);
			if(cell!==movingPiece.position){
				var valid = false;
				for(var i=0; i<possibleRays.length; i++){
					for(var j=0; j<possibleRays[i].length; j++){
						if(possibleRays[i][j]===cell){
							valid = true;
						}	
					}
				}
				if(valid){
					applyMove({pieceId:id, origin:initPos, dest:cell});
				}else{
					document.getElementById("piece-"+side+"-"+id).style.WebkitFilter='none';
					
					document.removeEventListener('mouseup', fmove);
				}
				document.getElementById("moves").innerHTML="";	
			}
			pendingMove=false;
			document.removeEventListener('mouseup', fmove);
		});
	}
}
function findPosIds(board){
	var pieceIds = [];
	for(var i=0; i<8; i++){
		for(var j=0; j<8; j++){
			var position = file[i]+(j+1).toString();	
			pieceIds[posToNum(position)]=noPiece;
		}
	}
	
	for(var id in board){
		pieceIds[posToNum(board[id].position)]=id;
	}
	return pieceIds;
}

function findValidKingMoves(piece, board, pieceIds, noCheckAllowed){
	numCalls.k++;
	var positions = [[],[]];
	var pos = piece.position;
	var oppKing;
	var oppSide;
	if(piece.side===0){
		oppKing = board.BK;
		oppSide = "B";
	}else{
		oppKing = board.WK;
		oppSide = "W";
	}
	var options = [[1, 0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]];
	var p, possibleMove;
	for(var i=0; i<8; i++){
		possibleMove = adjustPosition(pos, options[i][0], options[i][1]);
		if(possibleMove!==undefined){
			p = pieceIds[posToNum(possibleMove)];
			if(noCheckAllowed && oppKing!==undefined){
				if(Math.abs(possibleMove[1] - oppKing.position[1])>1 || Math.abs(findCol(possibleMove[0]) - findCol(oppKing.position[0]))>1){
					if(validMove(possibleMove, piece, board, pieceIds, true)){
						if(p===noPiece){
							positions[0].push(possibleMove);
						}else if(p[0]===oppSide){
							positions[1].push(possibleMove);
						}		
					}
				}
			}else{
				if(p===noPiece){
					positions[0].push(possibleMove);
				}else if(p[0]===oppSide){
					positions[1].push(possibleMove);
				}
			}
		}
	}	
	if(!piece.moved && noCheckAllowed){
		var kingLeftPos = adjustPosition(pos, -2, 0);
		var kingRightPos = adjustPosition(pos, 2, 0);				
		var leftRook, rightRook;
		var side = piece.side;
		var row = side*7+1;
		if(side===0){leftRook = board.WQR; rightRook = board.WKR;}
		if(side===1){leftRook = board.BQR; rightRook = board.BKR;}
		if(!piece.moved && !detectCheck(board, pieceIds, side)){
			if(pieceIds[posToNum('b'+row)]===noPiece && pieceIds[posToNum('c'+row)]===noPiece && pieceIds[posToNum('d'+row)]===noPiece && leftRook!==undefined && !leftRook.moved){
				piece.position = adjustPosition(pos, -1, 0);
				if(!detectCheck(board, pieceIds, side) && validMove(kingLeftPos, piece, board, pieceIds, false)){
					positions[0].push(kingLeftPos);
				}
				piece.position = pos;
			}
			
			if(pieceIds[posToNum('f'+row)]===noPiece && pieceIds[posToNum('g'+row)]===noPiece && rightRook!==undefined && !rightRook.moved){
				piece.position = adjustPosition(pos, 1, 0);
				if(!detectCheck(board, pieceIds, side) && validMove(kingRightPos, piece, board, pieceIds, false)){
					positions[0].push(kingRightPos);
				}
				piece.position = pos;
			}
		}
	}
	return positions;
}

function findValidPawnMoves(piece, board, pieceIds, noCheckAllowed){
	numCalls.p++;
	var positions = [[],[]];
	var direction, pawnSide;
	var pos = piece.position;
	var side = piece.side;
	var leftCapturePos, rightCapturePos;
	if(side===1){
		direction = -1;
	}else{
		direction = 1;
	}
	pawnSide=color2[1-side];
	var captured;
	
	if(pos[0]!=='a' && pos[1]!=='8' && pos[1]!=='1'){
		leftCapturePos = adjustPosition(pos, -1, direction);
		if(pieceIds[posToNum(leftCapturePos)][0]===pawnSide && (!noCheckAllowed || validMove(leftCapturePos, piece, board, pieceIds, true))){
			positions[1].push(leftCapturePos);	
		}
	}
	if(pos[0]!=='h' && pos[1]!=='8' && pos[1]!=='1'){
		rightCapturePos = adjustPosition(pos, 1, direction);
		if(rightCapturePos!==undefined && pieceIds[posToNum(rightCapturePos)][0]===pawnSide && (!noCheckAllowed || validMove(rightCapturePos, piece, board, pieceIds, true))){
			positions[1].push(rightCapturePos);	
		}
	}
	if((pos[1]==='4' && side===1)||(pos[1]==='5' && side===0)){
		var move = moveHistory[moveHistory.length-1];
		if(move!==undefined){
			var moveDest = move.dest;
			var moveOrigin = move.origin;
			if(moveOrigin[1]=='7' && side===0 || moveOrigin[1]=='2' && side===1){
				var enPassantLeft = adjustPosition(pos, -1, 0);
				var enPassantRight = adjustPosition(pos, 1, 0);
				var enl = pieceIds[posToNum(enPassantLeft)];
				var enr = pieceIds[posToNum(enPassantRight)];
				
				if(enPassantLeft!==undefined && enl[0]===pawnSide && moveDest===enPassantLeft && enl[1]==='P'){
					leftCapturePos = adjustPosition(pos, -1, direction);
					if(!noCheckAllowed){
						positions[1].push(leftCapturePos);
					}else{
						var initPos = piece.position;
						piece.position = leftCapturePos;
						pieceIds[posToNum(leftCapturePos)]=piece.id;
						pieceIds[posToNum(initPos)]=noPiece;
						pieceIds[posToNum(enPassantLeft)]=noPiece;
						captured = board[enl];
						delete board[enl];
						if(!detectCheck(board,pieceIds, piece.side)){
							positions[1].push(leftCapturePos);
						}
						board[enl] = captured;
						pieceIds[posToNum(enPassantLeft)] = enl;	
						piece.position = initPos;
						pieceIds[posToNum(leftCapturePos)]= noPiece;
						pieceIds[posToNum(initPos)]=piece.id;
					}
				}
				
				if(enPassantRight!==undefined && enr[0]===pawnSide && moveDest===enPassantRight && enr[1]==='P'){
					rightCapturePos = adjustPosition(pos, 1, direction);
					if(!noCheckAllowed){
						positions[1].push(rightCapturePos);
					}else{
						var initPos = piece.position;
						piece.position = rightCapturePos;
						pieceIds[posToNum(rightCapturePos)]=piece.id;
						pieceIds[posToNum(initPos)]=noPiece;
						pieceIds[posToNum(enPassantRight)]=noPiece;
						captured = board[enr];
						delete board[enr];
						if(!detectCheck(board,pieceIds, piece.side)){
							positions[1].push(rightCapturePos);
						}
						board[enr] = captured;
						pieceIds[posToNum(enPassantRight)] = enr;	
						piece.position = initPos;
						pieceIds[posToNum(rightCapturePos)]= noPiece;
						pieceIds[posToNum(initPos)]=piece.id;
					}
				}
			}
		}
	}
	var forwardPos = adjustPosition(pos, 0, direction);
	if(pieceIds[posToNum(forwardPos)]===noPiece && (!noCheckAllowed || validMove(forwardPos, piece, board, pieceIds, false))){
		positions[0].push(forwardPos);	
		if(pos[1]==='2' && side===0 || pos[1]==='7' && side===1){
			var doubleForwardPos = adjustPosition(pos, 0, 2*direction); 
			if(pieceIds[posToNum(doubleForwardPos)]===noPiece && (!noCheckAllowed || validMove(doubleForwardPos, piece, board, pieceIds, false))){
				positions[0].push(doubleForwardPos);	
			}
		}
	}
	return positions;
}

function validMove(cell, piece, board, pieceIds, checkCapture){
	var initPos = piece.position;
	var valid = true;
	var captured;
	var j = pieceIds[posToNum(cell)];
	
	if(checkCapture){
		if(j!==noPiece){
			captured = board[j];
			board[j] = undefined;
		}
	}
	
	piece.position = cell;
	pieceIds[posToNum(cell)]=piece.id;
	pieceIds[posToNum(initPos)]=noPiece;
	if(detectCheck(board,pieceIds, piece.side)){
		valid = false;
	}
	pieceIds[posToNum(cell)]= noPiece;
	piece.position = initPos;
	pieceIds[posToNum(initPos)]=piece.id;
	
	if(checkCapture){
		if(j!==noPiece){
			board[j] = captured;
			pieceIds[posToNum(cell)] = j;
		}	
	}
	
	return valid;
}

function findValidKnightMoves(piece, board, pieceIds, noCheckAllowed){
	numCalls.n++;
	var positions = [[],[]];
	var options = [[2, 1],[1, 2],[-1, 2],[-2, 1],[-2, -1],[-1, -2],[1, -2],[2, -1]];
	var p, possibleMove;
	var pos = piece.position;
	for(var i=0; i<8; i++){
		possibleMove = adjustPosition(pos, options[i][0], options[i][1]);
		if(possibleMove!==undefined){
			p = pieceIds[posToNum(possibleMove)];
			if(noCheckAllowed){
				if(p===noPiece && validMove(possibleMove, piece, board, pieceIds, false)){
					positions[0].push(possibleMove);		
				}else if(colorToSide[p[0]]!=piece.side && validMove(possibleMove, piece, board, pieceIds, true)){
					positions[1].push(possibleMove);	
				}
			}else{
				if(p===noPiece){
					positions[0].push(possibleMove);		
				}else if(colorToSide[p[0]]!=piece.side){
					positions[1].push(possibleMove);	
				}
			}
			
		}
	}	
	return positions;
}

function findValidPieceMoves(piece, board, pieceIds, noCheckAllowed){
	numCalls.moves++;
	var positions = [];
	var pieceType = piece.type;
	var vectors;
	var numPaths;
	switch(pieceType){
		case 'R': vectors = [[-1, 0], [0, 1], [0, -1], [1, 0]]; numPaths = 4; break;
		case 'B': vectors = [[-1, 1], [1, 1], [-1, -1], [1, -1]]; numPaths = 4; break;
		case 'Q': vectors = [[1, 0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]]; numPaths = 8; break;
	}
	
	switch(pieceType){
		case 'R':
		case 'B':
		case 'Q':
			var pos = piece.position;
			var side = piece.side;
			
			var p;
			positions.push([]);
			positions.push([]);
			for(var i=0; i<numPaths; i++){
				pos = piece.position;
				p = noPiece;
				while(p===noPiece && pos!==undefined){
					pos = adjustPosition(pos, vectors[i][0], vectors[i][1]);
					
					if(pos!==undefined){
						p = pieceIds[posToNum(pos)];
						if(noCheckAllowed){		
							if(p===noPiece){
								if(validMove(pos, piece, board, pieceIds, false)){
									positions[0].push(pos);
								}
							}else if(board[p].side!=side && validMove(pos, piece, board, pieceIds, true)){
								positions[1].push(pos);
							}					
						}else{
							if(p===noPiece){
								positions[0].push(pos);
							}else if(board[p].side!=side){
								positions[1].push(pos);
							}	
						}
					}
				}
			}
			break;
		case 'N':
			positions = findValidKnightMoves(piece, board, pieceIds, noCheckAllowed);
			break;
		case 'K':
			positions = findValidKingMoves(piece, board, pieceIds, noCheckAllowed);
			break;
		case 'P':
			positions = findValidPawnMoves(piece, board, pieceIds, noCheckAllowed);
			break;
	default:
    }	
	return positions;
}
function adjustPosition(pos, x, y){
	var colNum = findCol(pos[0])+x;
	var rowNum = Number(pos[1])+y;
	if(colNum>=8 || colNum<0 || rowNum>8 || rowNum<=0){
		return undefined;
	}
	return file[colNum]+rowNum;
}
function evaluateBoard(pieces, validMoves, pieceIds){
	var hash = JSON.stringify(pieceIds);
	numCalls.evalB++;
	if(boardTable[hash]===undefined){
		var scores = [0, 0];
		var mobilityScore = [0,0];
		var materialScore = [0,0];
		var possibleMoves;
		var index, piece;
		var bCheck, wCheck;
		for(var id in pieces){
			piece = pieces[id];
			index = piece.side;
			possibleMoves = validMoves[id];
			mobilityScore[index]+= possibleMoves[0].length+possibleMoves[1].length;
			materialScore[index]+= piece.value;
		}
		
		if(mobilityScore[0]===0){
			materialScore[0] = 0;
			wCheck = detectCheck(pieces, pieceIds, 0);
			if(!wCheck){
				mobilityScore[1]=0;
				materialScore[1]=0;
			}
		}
		if(mobilityScore[1]===0){
			materialScore[1] = 0;
			bCheck = detectCheck(pieces, pieceIds, 1);
			if(!bCheck){
				mobilityScore[0]=0;
				materialScore[0]=0;
			}
			
		}
		
		scores[0] = mobilityScore[0]*0.05+materialScore[0];
		scores[1] = mobilityScore[1]*0.05+materialScore[1];
		numCalls.eval++;
		boardTable[hash] = scores;
	}else{
		return boardTable[hash];
	}
	return scores;
}
function deepEvaluation(pieces, pieceIds){
	var scores = [0, 0];
	var mobilityScore = [0,0];
	var materialScore = [0,0];
	var possibleMoves;
	for(var id in pieces){
		var index = pieces[id].side;
		possibleMoves = findValidPieceMoves(pieces[id], pieces, pieceIds, true);
		mobilityScore[index]+= possibleMoves[0].length+possibleMoves[1].length;
		materialScore[index]+= pieces[id].value;
	}
	
	if(mobilityScore[0]===0){
		materialScore[0] = 0;
		if(!detectCheck(pieces,pieceIds, 0)){
			mobilityScore[1]=0;
			materialScore[1]=0;
		}
	}
	if(mobilityScore[1]===0){
		materialScore[1] = 0;
		if(!detectCheck(pieces,pieceIds, 1)){
			mobilityScore[0]=0;
			materialScore[0]=0;
		}
	}
	scores[0] = mobilityScore[0]*0.05+materialScore[0];
	scores[1] = mobilityScore[1]*0.05+materialScore[1];
	return scores;
}

function findControllingPieces(board, pieceIds, position){
	var pos = position;
	var controllingPieces = [];
	var pieceTypes = ["R", "B", "N"];
	numCalls.fcp++;
	var threatType, pieceId, pieceType, testPiece;
	for(var j=0; j<3; j++){
		pieceType = pieceTypes[j];
		testPiece = {type:pieceType, side:2, position:position};
		possibleThreats = findValidPieceMoves(testPiece, board, pieceIds, false)[1];
		numThreats = possibleThreats.length;
		for(var i=0; i<numThreats; i++){
			pieceId = pieceIds[posToNum(possibleThreats[i])];
			if(pieceId!==noPiece){
				threatType = board[pieceId].type;
				if(threatType===pieceType || (pieceType!=='N' && threatType==='Q')){
					controllingPieces.push(pieceId);
				}
			}
		}
	}
	testPiece = {type:"K", position:position};
	var neighbours = findAllPieceMoves(testPiece);
	for(var i=0; i<neighbours.length; i++){
		pieceId = pieceIds[posToNum(neighbours[i])];
		if(pieceId!==noPiece){
			threatType = board[pieceId].type;
			if(threatType==='K'){
				controllingPieces.push(pieceId);
			}
		}
	}
	testPiece = {type:"P", position:position, side:0};
	var pawnMoves1 = findAllPieceMoves(testPiece);
	testPiece = {type:"P", position:position, side:1};
	var pawnMoves2 = findAllPieceMoves(testPiece);
	for(var i=0; i<pawnMoves1.length; i++){
		pieceId = pieceIds[posToNum(pawnMoves1[i])];
		if(pieceId!==noPiece){
			threatType = board[pieceId].type;
			if(threatType==='P' && board[pieceId].side==1){
				controllingPieces.push(pieceId);
			}
		}
	}
	for(var i=0; i<pawnMoves2.length; i++){
		pieceId = pieceIds[posToNum(pawnMoves2[i])];
		if(pieceId!==noPiece){
			threatType = board[pieceId].type;
			if(threatType==='P' && board[pieceId].side==0){
				controllingPieces.push(pieceId);
			}
		}
	}

	return controllingPieces;
}

function detectCheck(board, pieceIds,side){
	numCalls.check++;
	var kingPos;
	var direction;
	if(side===0){direction = 1;}else{direction = -1;}
	if(side===0){
		if(board.WK==undefined){
			return true;
		}
		kingPos = board.WK.position;
	}else{
		if(board.BK==undefined){
			return true;
		}
		kingPos = board.BK.position;
	}
	var possibleThreats, numThreats;
	var pos = kingPos;
	var pLeft = adjustPosition(pos, -1, direction);
	var pRight = adjustPosition(pos, 1, direction);
	var id1 = pieceIds[posToNum(pRight)];
	var id2 = pieceIds[posToNum(pLeft)];
	if((pRight!==undefined && id1!==noPiece && board[id1].side!==side && board[id1].type=='P') || (pLeft!==undefined && id2!==noPiece && board[id2].side!==side && board[id2].type=='P')){
		return true;
	} 
	var pieceTypes = ["R", "B", "N"];
	var threatType, pieceId, pieceType, testPiece;
	for(var j=0; j<3; j++){
		pieceType = pieceTypes[j];
		testPiece = {type:pieceType, side:side, position:kingPos};
		possibleThreats = findValidPieceMoves(testPiece, board, pieceIds, false)[1];
		numThreats = possibleThreats.length;
		for(var i=0; i<numThreats; i++){
			pieceId = pieceIds[posToNum(possibleThreats[i])];
			if(pieceId!==noPiece){
				threatType = board[pieceId].type;
				if(threatType===pieceType || (pieceType!=='N' && threatType==='Q')){
					return true;
				}
			}
		}
	}
	return false;
}
function setupBoard(pieces){
	document.getElementById("pieces").innerHTML="";
	for(var pieceId in pieces){
		addPiece(pieces[pieceId]);
	}
}
function addPiece(info){
	var left = (12 + 52*findCol(info.position[0])).toString();
	var top = (8*52 + 12 - 52*parseInt(info.position[1])).toString();
	var image = info.type.toLowerCase()+color[info.side];
	document.getElementById("pieces").innerHTML+='<img src="'+image+'.png" id="piece-'+info.side+"-"+info.id+'" style="position:absolute; left:'+left+'px;top:'+top+'px;'
	+'" onclick="startMove(\''+info.id+'\','+info.side+')"></img>';
} 