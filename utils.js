var numSquares = 64;
var pieceTypes = ["-", "P", "N", "B", "R", "Q", "K"];
var pieceValues = [0, 100, 300, 325, 500, 900, 3950];
var order = [4, 2, 3, 5, 6, 3, 2, 4];
var rookPaths = [-8, -1, 1, 8];
var bishopPaths = [-9, -7, 7, 9];
var whitePawnPaths = [7, 9];
var blackPawnPaths = [-7, -9];
var queenPaths = [-9, -8, -7, -1, 1, 7, 8, 9];
var kingPaths = [-9, -8, -7, -1, 1, 7, 8, 9];
var knightPaths = [-17,-15,-10,-6, 6, 10, 15, 17];
var file = ["a", "b", "c", "d", "e", "f", "g", "h"];

function findPieceId(pieceIds, pieceId){
	for(var i=0; i<numSquares; i++){
		if(pieceIds[i]===pieceId){return i;}
	}
	return -1;
}

function adjustPosition(pos, delta){
	var file = (pos & 7)+((delta+20) & 7) - 4;
	var finalNum; 
	if(file<8 && file>=0){
		finalNum = pos+delta;
		if(finalNum<numSquares && finalNum>=0){
			return finalNum;
		}
	}
	return -1;
}

function groupPieceIdsByType(pieceIds){
	var types = [[],[],[],[],[],[]];
	for(var i=0; i<numSquares; i++){
		if(pieceIds[i]!==0){
			types[Math.abs(pieceIds[i]) - 1].push(i);
		}
	}
	return types;
}

function genControllingArr(pieceIds, controllingPieceIds){
	var arrLength = controllingPieceIds.length;
	var num, j;
	var arr = new Array(arrLength);
	for(var i=0; i<arrLength; i++){	
		num = pieceIds[controllingPieceIds[i]];
		j = i;
		while(j >= 1 && Math.abs(arr[j-1]) > Math.abs(num)){
			arr[j] = arr[j-1];
			j--;
		}	
		arr[j] = num;
	}
	return arr;
}

function getCell(x, y){
	var row = Math.ceil((-y+10)/52)+7;
	var col = Math.floor((x-10)/52);
	return col+row*8;
}

function addPiece(pieceId, position, piecesDOM){
	var left = (12 + 52*(position%8)).toString();
	var top = (7*52 + 12 - 52*(position>>3)).toString();
	var color;
	if(pieceId<0){
		color = "b";
	}else{
		color = "w";	
	}
	var image = pieceTypes[Math.abs(pieceId)].toLowerCase()+color;
	return '<img src="images/'+image+'.png" id="piece-'+position+'" style="position:absolute; left:'+left+'px;top:'+top+'px;'
	+'" onclick="startMove('+position+','+Math.sign(pieceId)+')"></img>';
}

function getPosFromId(id){
	return file[id&7]+((id>>3)+1);
}

function genRandomNum(n){
	return Math.floor(Math.random()*n);
}

function copyArr(arr){
	var arr2 = [];
	var arrLength = arr.length;
	for(var i=0; i<arrLength; i++){
		arr2.push(arr[i]);
	}
	return arr2;
}

function genNumAllMoves(allMoves){
	var numAllMoves = [];
	for(var i=0; i<numSquares; i++){
		numAllMoves[i] = allMoves[i].length;
	}
	return numAllMoves;
}

function genControllingList(pieceIds, allMoves){
	var controllingPieces = [];
	var numMoves, pieceMoves;
	for(var i=0; i<numSquares; i++){
		controllingPieces[i] = [];
	}
	for(var k=0; k<numSquares; k++){
		pieceMoves = allMoves[k];
		numMoves = pieceMoves.length;
		for(var j=0; j<numMoves; j++){
			controllingPieces[pieceMoves[j]].push(k);
		}
	}
	return controllingPieces;
}

 function init_zobrist(maxInt){
	var randNum;
	var sideSeed = [];
	var randZTable = [];
	for(var i=0; i<70; i++){
		randZTable.push([]);
		if(i<numSquares){
			for(var j=0; j<13; j++){
				randNum = genRandomNum(maxInt);
				randZTable[i][j] = randNum;
			}
		}else{
			randNum = genRandomNum(maxInt);
			randZTable[i].push(randNum);
		}
	}
	randNum = genRandomNum(maxInt);
    randZTable.push(randNum);
	randNum = genRandomNum(maxInt);
	randZTable.push(randNum);
	return randZTable;
 }

 function genKingSafetyTable(pieceIds, side, validMoves){
	var checkTable = [];
	for(var i=0; i<numSquares; i++){
		if(pieceIds[i]*side<=0 || pieceIds[i] === 6*side){
			checkTable[i] = 0;
		}else{
			checkTable[i] = -1;
		}
		if(pieceIds[i]*side<0){
			if(pieceIds[i]!==-side){
				for(var j=0; j<validMoves[i].length; j++){	
					checkTable[validMoves[i][j]] = -1;			
				}
			}else{
				if(i&7 < 7){
					checkTable[i-8*side+1] = -1;
				}
				if(i&7 > 0){
					checkTable[i-8*side-1] = -1;
				}
			}
		}
	}
	return checkTable;
}

function guessMoveScore(pieceIds, move, initScore, controllingList, side){
	var pieceId = move[0];
	var moveDest = move[2];
	var score = initScore;
	var destId = pieceIds[moveDest];
	if(destId!==0){
		score+=pieceValues[-destId*side];
	}
	if(pieceId===side && moveDest>>3 === 3.5+3.5*side){
		score+= pieceValues[5]-pieceValues[1];
		pieceId = 5*side;
	}
	var controllingPieces = controllingList[moveDest];
	var numMoves = controllingPieces.length;
	for(var i=0; i<numMoves; i++){
		if(pieceIds[controllingPieces[i]]*side<0){
			score-=pieceValues[pieceId*side];
			return score;
		}
	}
	return score;
}

function highlightMoves(rays){
	var DOMStr = "";
	var moves;
	for(var i=0; i<rays.length; i++){
		moves = rays[i];
		for(var j=0; j<moves.length;j++){
			var left = (8+52*(moves[j]%8)).toString();
			var top = (7*52 + 8-52*(moves[j]>>3)).toString();
			DOMStr+='<div style="position:absolute; left:'+left+'px;top:'+top+'px; height:52px; width:52px; background-color: rgba(255, 255, 0, 0.2)"></div>';
		}
	}
	return DOMStr;
}

function generateAllMovesTable(){
	var hash, vectors, numPaths, positions, rayMoves, pos;
    var allPieceMoves = [];
	for(var i=0; i<7; i++){
		for(var j=0; j<numSquares; j++){
			hash = i*numSquares+j;
			positions = [];
			numPaths = 4;
			switch(i){
				case 0: vectors = blackPawnPaths; numPaths = 2; break;
				case 1: vectors = whitePawnPaths; numPaths = 2; break;
				case 2: vectors = knightPaths; numPaths = 8; break;
				case 3: vectors = bishopPaths; break;
				case 4: vectors = rookPaths; break;
				
				case 5: 
				case 6: 
					vectors = queenPaths; numPaths = 8; break;
			}
			if(i>=3 && i<=5){
				for(var k=0; k<numPaths; k++){
					pos = j;
					rayMoves = [];
					while(pos!==-1){
						pos = adjustPosition(pos, vectors[k]);
						if(pos!==-1){
							rayMoves.push(pos);
						}
					}
					if(rayMoves.length>0){
						positions.push(rayMoves);
					}
				}
			}else{
				for(var m=0; m<numPaths; m++){
					pos = adjustPosition(j, vectors[m]);
					if(pos!==-1){
						positions.push(pos);
					}
				}
			}
			allPieceMoves[hash] = positions;
		}
	}
	return allPieceMoves;
}

function qSearch(pieceId, controllingPieces, side){
	var score = 0;
	var numControllingPieces;
	if(pieceId*side<0){
		numControllingPieces = controllingPieces.length;
		for(var i=0; i<numControllingPieces; i++){
			if(controllingPieces[i]*pieceId<0){
				score+=pieceValues[-pieceId*side];
				pieceId = controllingPieces[i];
				controllingPieces.splice(i, 1);
				score-= qSearch(pieceId, controllingPieces, -side);
				if(score>0){
					return score;
				}else{
					return 0;
				}
			}
		}
	}
	return 0;
}

function newGamePosition(){
    var pieceIds = [];
    for(var i=0; i<8; i++){
		pieceIds[i] = order[i];
		pieceIds[i+8] 	= 1;

		pieceIds[i+16] 	= 0;
		pieceIds[i+24] 	= 0;
		pieceIds[i+32] 	= 0;
		pieceIds[i+40] 	= 0;

		pieceIds[i+48] 	= -1;
		pieceIds[i+56] = -order[i];
	}
	for(var j=numSquares; j<70; j++){
		pieceIds[j] = 0;
	}
    return pieceIds;
}