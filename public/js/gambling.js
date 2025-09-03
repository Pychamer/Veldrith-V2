// Gambling System for Veldrith
class GamblingSystem {
	constructor() {
		this.currentCredits = 0;
		this.currentGame = null;
		this.gameModal = document.getElementById('gameModal');
		this.modalTitle = document.getElementById('modalTitle');
		this.modalBody = document.getElementById('modalBody');
		this.creditDisplay = document.getElementById('creditAmount');
		this.isAdmin = false;
		
		this.init();
	}

	// Provably Fair System
	generateGameSeed() {
		// Generate a server seed (in real implementation, this would come from server)
		const serverSeed = this.generateRandomString(32);
		const clientSeed = Date.now().toString();
		const nonce = Math.floor(Math.random() * 1000000);
		
		return {
			serverSeed,
			clientSeed,
			nonce,
			hash: this.hashString(serverSeed + clientSeed + nonce)
		};
	}

	generateRandomString(length) {
		const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
		let result = '';
		for (let i = 0; i < length; i++) {
			result += chars.charAt(Math.floor(Math.random() * chars.length));
		}
		return result;
	}

	hashString(str) {
		// Simple hash function (in production, use crypto.subtle.digest)
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			const char = str.charCodeAt(i);
			hash = ((hash << 5) - hash) + char;
			hash = hash & hash; // Convert to 32bit integer
		}
		return Math.abs(hash).toString(16);
	}

	generateProvablyFairNumber(seed, min = 0, max = 1) {
		// Use seed to generate deterministic random number
		const hash = this.hashString(seed);
		const num = parseInt(hash.substring(0, 8), 16) / 0xffffffff;
		return min + (num * (max - min));
	}

	displayProvablyFairInfo(gameSeed) {
		// Add provably fair info to the modal
		let fairInfoDiv = document.getElementById('provablyFairInfo');
		if (!fairInfoDiv) {
			fairInfoDiv = document.createElement('div');
			fairInfoDiv.id = 'provablyFairInfo';
			fairInfoDiv.style.cssText = `
				background: rgba(74, 124, 89, 0.1);
				border: 1px solid rgba(74, 124, 89, 0.3);
				border-radius: 8px;
				padding: 10px;
				margin: 10px 0;
				font-size: 0.9rem;
				color: rgba(255, 255, 255, 0.8);
			`;
			this.modalBody.appendChild(fairInfoDiv);
		}
		
		fairInfoDiv.innerHTML = `
			<div style="font-weight: bold; color: #4a7c59; margin-bottom: 5px;">🔒 Provably Fair</div>
			<div>Server Seed: ${gameSeed.serverSeed.substring(0, 16)}...</div>
			<div>Client Seed: ${gameSeed.clientSeed}</div>
			<div>Nonce: ${gameSeed.nonce}</div>
			<div>Hash: ${gameSeed.hash}</div>
		`;
	}

	async init() {
		// Check authentication
		await this.checkAuth();
		
		// Load user credits
		await this.loadCredits();
		
		// Setup event listeners
		this.setupEventListeners();
		
		// Setup game cards
		this.setupGameCards();
	}

	async checkAuth() {
		const session = localStorage.getItem('veldrith_session');
		if (!session) {
			window.location.href = '/login.html';
			return;
		}

		try {
			const sessionData = JSON.parse(session);
			const response = await fetch('/api/auth/heartbeat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					username: sessionData.username,
					token: sessionData.token
				})
			});

			if (!response.ok) {
				localStorage.removeItem('veldrith_session');
				window.location.href = '/login.html';
				return;
			}
		} catch (error) {
			console.error('Auth check failed:', error);
			window.location.href = '/login.html';
		}
	}

	async loadCredits() {
		try {
			const session = JSON.parse(localStorage.getItem('veldrith_session'));
			const response = await fetch('/api/users');
			const data = await response.json();
			
			if (data.success) {
				const user = data.users.find(u => u.username === session.username);
				if (user) {
					// Check if user is admin
					if (user.type === 'admin') {
						this.currentCredits = 999999; // Infinite credits for admin
						this.isAdmin = true;
					} else {
						// Calculate remaining days
						const now = new Date();
						const expiration = new Date(user.expirationDate);
						const daysRemaining = Math.max(0, Math.ceil((expiration - now) / (1000 * 60 * 60 * 24)));
						
						this.currentCredits = daysRemaining;
						this.isAdmin = false;
					}
					
					this.updateCreditDisplay();
				}
			}
		} catch (error) {
			console.error('Failed to load credits:', error);
		}
	}

	updateCreditDisplay() {
		if (this.isAdmin) {
			this.creditDisplay.textContent = '∞';
		} else {
			this.creditDisplay.textContent = this.currentCredits;
		}
	}

	setupEventListeners() {
		// Close modal
		document.querySelector('.close-modal').addEventListener('click', () => {
			this.closeModal();
		});

		// Close modal on outside click
		this.gameModal.addEventListener('click', (e) => {
			if (e.target === this.gameModal) {
				this.closeModal();
			}
		});

		// Escape key to close modal
		document.addEventListener('keydown', (e) => {
			if (e.key === 'Escape' && this.gameModal.classList.contains('active')) {
				this.closeModal();
			}
		});
	}

	setupGameCards() {
		const gameCards = document.querySelectorAll('.game-card');
		gameCards.forEach(card => {
			card.addEventListener('click', () => {
				const game = card.dataset.game;
				this.openGame(game);
			});
		});
	}

	openGame(gameType) {
		this.currentGame = gameType;
		
		switch (gameType) {
			case 'mines':
				this.openMinesGame();
				break;
			case 'crash':
				this.openCrashGame();
				break;
			case 'blackjack':
				this.openBlackjackGame();
				break;
			case 'tower':
				this.openTowerGame();
				break;
			case 'plinko':
				this.openPlinkoGame();
				break;
			case 'aviamaster':
				this.openAviamasterGame();
				break;
		}
		
		this.gameModal.classList.add('active');
	}

	closeModal() {
		this.gameModal.classList.remove('active');
		this.currentGame = null;
	}

	// Mines Game
	openMinesGame() {
		this.modalTitle.textContent = '💣 Mines';
		this.modalBody.innerHTML = `
			<div class="game-controls">
				<div class="bet-controls">
					<label>Bet Amount:</label>
					<input type="number" class="bet-input" id="minesBet" min="1" max="${this.isAdmin ? 999999 : this.currentCredits}" value="1">
					<label>Bombs:</label>
					<select class="bet-input" id="minesBombs">
						<option value="1">1 Bomb</option>
						<option value="3">3 Bombs</option>
						<option value="5">5 Bombs</option>
						<option value="10">10 Bombs</option>
						<option value="15">15 Bombs</option>
						<option value="24">24 Bombs</option>
					</select>
					<button class="game-button" id="minesStart">Start Game</button>
				</div>
			</div>
			<div class="mines-game-area">
				<div class="mines-info">
					<div>Multiplier: <span id="minesMultiplier">1.00x</span></div>
					<div>Safe Tiles: <span id="minesSafe">0</span></div>
				</div>
				<div class="mines-grid" id="minesGrid"></div>
				<div class="mines-actions" style="display: none;">
					<button class="game-button success" id="minesCashOut">Cash Out</button>
					<button class="game-button danger" id="minesEnd">End Game</button>
				</div>
			</div>
		`;
		
		this.setupMinesGame();
	}

	setupMinesGame() {
		const startBtn = document.getElementById('minesStart');
		const cashOutBtn = document.getElementById('minesCashOut');
		const endBtn = document.getElementById('minesEnd');
		
		startBtn.addEventListener('click', () => {
			const bet = parseInt(document.getElementById('minesBet').value);
			const bombs = parseInt(document.getElementById('minesBombs').value);
			
			if (!this.isAdmin && bet > this.currentCredits) {
				alert('Not enough credits!');
				return;
			}
			
			this.startMinesGame(bet, bombs);
		});
		
		cashOutBtn.addEventListener('click', () => {
			this.cashOutMines();
		});
		
		endBtn.addEventListener('click', () => {
			this.endMinesGame();
		});
	}

	startMinesGame(bet, bombs) {
		// Deduct bet from credits (except for admin)
		if (!this.isAdmin) {
			this.currentCredits -= bet;
			this.updateCreditDisplay();
		}
		
		// Generate provably fair seed
		const gameSeed = this.generateGameSeed();
		console.log('Mines Game Seed:', gameSeed);
		
		// Display provably fair info
		this.displayProvablyFairInfo(gameSeed);
		
		// Create grid
		const grid = document.getElementById('minesGrid');
		grid.innerHTML = '';
		
		// Generate mines using provably fair system
		const minePositions = this.generateProvablyFairMines(25, bombs, gameSeed);
		
		// Create tiles
		for (let i = 0; i < 25; i++) {
			const tile = document.createElement('div');
			tile.className = 'mine-tile';
			tile.dataset.index = i;
			tile.dataset.isMine = minePositions.includes(i);
			
			tile.addEventListener('click', () => {
				this.revealMineTile(tile, bet, bombs);
			});
			
			grid.appendChild(tile);
		}
		
		// Show game controls
		document.querySelector('.mines-actions').style.display = 'block';
		document.getElementById('minesStart').style.display = 'none';
		
		// Reset stats
		document.getElementById('minesMultiplier').textContent = '1.00x';
		document.getElementById('minesSafe').textContent = '0';
	}

	generateMines(totalTiles, bombCount) {
		const mines = [];
		while (mines.length < bombCount) {
			const pos = Math.floor(Math.random() * totalTiles);
			if (!mines.includes(pos)) {
				mines.push(pos);
			}
		}
		return mines;
	}

	generateProvablyFairMines(totalTiles, bombCount, seed) {
		const mines = [];
		let nonce = 0;
		
		while (mines.length < bombCount) {
			const combinedSeed = seed.serverSeed + seed.clientSeed + nonce;
			const randomNum = this.generateProvablyFairNumber(combinedSeed, 0, totalTiles);
			const pos = Math.floor(randomNum);
			
			if (!mines.includes(pos)) {
				mines.push(pos);
			}
			nonce++;
		}
		
		return mines;
	}

	revealMineTile(tile, bet, bombs) {
		if (tile.classList.contains('revealed')) return;
		
		tile.classList.add('revealed');
		
		if (tile.dataset.isMine === 'true') {
			// Hit a mine - game over
			tile.classList.add('bomb');
			tile.textContent = '💣';
			this.endMinesGame();
			return;
		}
		
		// Safe tile
		tile.classList.add('gem');
		tile.textContent = '💎';
		
		// Update multiplier
		const safeCount = document.querySelectorAll('.mine-tile.gem').length;
		const multiplier = this.calculateMinesMultiplier(safeCount, bombs);
		
		document.getElementById('minesMultiplier').textContent = multiplier.toFixed(2) + 'x';
		document.getElementById('minesSafe').textContent = safeCount;
	}

	calculateMinesMultiplier(safeTiles, bombs) {
		// More balanced multiplier calculation
		// Base multiplier increases more gradually
		const baseMultiplier = 1 + (bombs * 0.05); // Reduced from 0.1 to 0.05
		const multiplier = Math.pow(baseMultiplier, safeTiles);
		
		// Cap the multiplier to prevent extreme values
		return Math.min(multiplier, 1000); // Max 1000x multiplier
	}

	cashOutMines() {
		const multiplier = parseFloat(document.getElementById('minesMultiplier').textContent);
		const bet = parseInt(document.getElementById('minesBet').value);
		const winnings = Math.floor(bet * multiplier);
		
		if (!this.isAdmin) {
			this.currentCredits += winnings;
			this.updateCreditDisplay();
		}
		
		alert(`Cashed out! Won ${winnings} credits (${multiplier.toFixed(2)}x multiplier)`);
		this.endMinesGame();
	}

	endMinesGame() {
		// Reveal all mines
		document.querySelectorAll('.mine-tile').forEach(tile => {
			if (tile.dataset.isMine === 'true' && !tile.classList.contains('revealed')) {
				tile.classList.add('bomb');
				tile.textContent = '💣';
			}
		});
		
		// Reset UI
		document.querySelector('.mines-actions').style.display = 'none';
		document.getElementById('minesStart').style.display = 'block';
	}

	// Crash Game
	openCrashGame() {
		this.modalTitle.textContent = '🚀 Crash';
		this.modalBody.innerHTML = `
			<div class="game-controls">
				<div class="bet-controls">
					<label>Bet Amount:</label>
					<input type="number" class="bet-input" id="crashBet" min="1" max="${this.isAdmin ? 999999 : this.currentCredits}" value="1">
					<label>Auto Cashout:</label>
					<input type="number" class="bet-input" id="crashAutoCashout" min="1.01" step="0.01" value="2.00">
					<button class="game-button" id="crashStart">Start Round</button>
				</div>
			</div>
			<div class="crash-display">
				<div class="crash-rocket" id="crashRocket">
					<div class="rocket-body"></div>
					<div class="rocket-flame"></div>
				</div>
				<div class="crash-multiplier" id="crashMultiplier">1.00x</div>
				<div class="crash-actions" style="display: none;">
					<button class="game-button success" id="crashCashOut">Cash Out</button>
				</div>
			</div>
		`;
		
		this.setupCrashGame();
	}

	setupCrashGame() {
		const startBtn = document.getElementById('crashStart');
		const cashOutBtn = document.getElementById('crashCashOut');
		
		startBtn.addEventListener('click', () => {
			const bet = parseInt(document.getElementById('crashBet').value);
			const autoCashout = parseFloat(document.getElementById('crashAutoCashout').value);
			
			if (!this.isAdmin && bet > this.currentCredits) {
				alert('Not enough credits!');
				return;
			}
			
			this.startCrashGame(bet, autoCashout);
		});
		
		cashOutBtn.addEventListener('click', () => {
			this.cashOutCrash();
		});
	}

	startCrashGame(bet, autoCashout) {
		// Deduct bet from credits (except for admin)
		if (!this.isAdmin) {
			this.currentCredits -= bet;
			this.updateCreditDisplay();
		}
		
		// Generate provably fair seed
		const gameSeed = this.generateGameSeed();
		console.log('Crash Game Seed:', gameSeed);
		
		// Display provably fair info
		this.displayProvablyFairInfo(gameSeed);
		
		// Generate crash point using provably fair system (1.00x to 100.00x)
		const crashPoint = 1 + this.generateProvablyFairNumber(gameSeed.serverSeed + gameSeed.clientSeed, 0, 99);
		
		// Start multiplier animation
		let multiplier = 1.00;
		const multiplierElement = document.getElementById('crashMultiplier');
		const cashOutBtn = document.getElementById('crashCashOut');
		
		// Show game controls
		document.querySelector('.crash-actions').style.display = 'block';
		document.getElementById('crashStart').style.display = 'none';
		
		const gameInterval = setInterval(() => {
			multiplier += 0.01;
			multiplierElement.textContent = multiplier.toFixed(2) + 'x';
			
			// Check auto cashout
			if (multiplier >= autoCashout) {
				this.cashOutCrash();
				clearInterval(gameInterval);
				return;
			}
			
			// Check crash
			if (multiplier >= crashPoint) {
				multiplierElement.textContent = 'CRASHED!';
				multiplierElement.style.color = '#d32f2f';
				cashOutBtn.disabled = true;
				clearInterval(gameInterval);
				
				setTimeout(() => {
					this.endCrashGame();
				}, 2000);
			}
		}, 50);
		
		// Store game state
		this.crashGameState = {
			bet,
			multiplier: 0,
			interval: gameInterval
		};
	}

	cashOutCrash() {
		const multiplier = parseFloat(document.getElementById('crashMultiplier').textContent);
		const bet = this.crashGameState.bet;
		const winnings = Math.floor(bet * multiplier);
		
		if (!this.isAdmin) {
			this.currentCredits += winnings;
			this.updateCreditDisplay();
		}
		
		clearInterval(this.crashGameState.interval);
		
		alert(`Cashed out! Won ${winnings} credits (${multiplier.toFixed(2)}x multiplier)`);
		this.endCrashGame();
	}

	endCrashGame() {
		// Reset UI
		document.querySelector('.crash-actions').style.display = 'none';
		document.getElementById('crashStart').style.display = 'block';
		document.getElementById('crashMultiplier').textContent = '1.00x';
		document.getElementById('crashMultiplier').style.color = '#4a7c59';
		document.getElementById('crashCashOut').disabled = false;
		
		this.crashGameState = null;
	}

	// Blackjack Game
	openBlackjackGame() {
		this.modalTitle.textContent = '🃏 Blackjack';
		this.modalBody.innerHTML = `
			<div class="game-controls">
				<div class="bet-controls">
					<label>Bet Amount:</label>
					<input type="number" class="bet-input" id="blackjackBet" min="1" max="${this.isAdmin ? 999999 : this.currentCredits}" value="1">
					<button class="game-button" id="blackjackDeal">Deal Cards</button>
				</div>
			</div>
			<div class="blackjack-game-area">
				<div class="dealer-area">
					<h3>Dealer</h3>
					<div class="blackjack-cards" id="dealerCards"></div>
					<div>Dealer Total: <span id="dealerTotal">0</span></div>
				</div>
				<div class="player-area">
					<h3>Your Hand</h3>
					<div class="blackjack-cards" id="playerCards"></div>
					<div>Your Total: <span id="playerTotal">0</span></div>
				</div>
				<div class="blackjack-actions" style="display: none;">
					<button class="game-button" id="blackjackHit">Hit</button>
					<button class="game-button" id="blackjackStand">Stand</button>
					<button class="game-button" id="blackjackDouble">Double Down</button>
				</div>
			</div>
		`;
		
		this.setupBlackjackGame();
	}

	setupBlackjackGame() {
		const dealBtn = document.getElementById('blackjackDeal');
		const hitBtn = document.getElementById('blackjackHit');
		const standBtn = document.getElementById('blackjackStand');
		const doubleBtn = document.getElementById('blackjackDouble');
		
		dealBtn.addEventListener('click', () => {
			const bet = parseInt(document.getElementById('blackjackBet').value);
			if (!this.isAdmin && bet > this.currentCredits) {
				alert('Not enough credits!');
				return;
			}
			this.dealBlackjack(bet);
		});
		
		hitBtn.addEventListener('click', () => {
			this.hitBlackjack();
		});
		
		standBtn.addEventListener('click', () => {
			this.standBlackjack();
		});
		
		doubleBtn.addEventListener('click', () => {
			this.doubleDownBlackjack();
		});
	}

	dealBlackjack(bet) {
		// Deduct bet from credits (except for admin)
		if (!this.isAdmin) {
			this.currentCredits -= bet;
			this.updateCreditDisplay();
		}
		
		// Create deck
		this.blackjackDeck = this.createDeck();
		this.shuffleDeck(this.blackjackDeck);
		
		// Deal initial cards
		this.blackjackGameState = {
			bet,
			playerCards: [this.dealCard(), this.dealCard()],
			dealerCards: [this.dealCard(), this.dealCard()],
			playerTotal: 0,
			dealerTotal: 0,
			gameOver: false
		};
		
		this.updateBlackjackDisplay();
		
		// Show game controls
		document.querySelector('.blackjack-actions').style.display = 'block';
		document.getElementById('blackjackDeal').style.display = 'none';
		
		// Check for blackjack
		if (this.calculateHandValue(this.blackjackGameState.playerCards) === 21) {
			this.endBlackjackGame();
		}
	}

	createDeck() {
		const suits = ['♠', '♥', '♦', '♣'];
		const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
		const deck = [];
		
		for (let suit of suits) {
			for (let rank of ranks) {
				deck.push({ suit, rank });
			}
		}
		
		return deck;
	}

	shuffleDeck(deck) {
		for (let i = deck.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[deck[i], deck[j]] = [deck[j], deck[i]];
		}
	}

	dealCard() {
		return this.blackjackDeck.pop();
	}

	calculateHandValue(cards) {
		let total = 0;
		let aces = 0;
		
		for (let card of cards) {
			if (card.rank === 'A') {
				aces++;
				total += 11;
			} else if (['J', 'Q', 'K'].includes(card.rank)) {
				total += 10;
			} else {
				total += parseInt(card.rank);
			}
		}
		
		// Adjust for aces
		while (total > 21 && aces > 0) {
			total -= 10;
			aces--;
		}
		
		return total;
	}

	updateBlackjackDisplay() {
		const state = this.blackjackGameState;
		
		// Update player cards
		const playerCardsDiv = document.getElementById('playerCards');
		playerCardsDiv.innerHTML = '';
		state.playerCards.forEach(card => {
			const cardDiv = document.createElement('div');
			cardDiv.className = 'card';
			if (['♥', '♦'].includes(card.suit)) {
				cardDiv.classList.add('red');
			}
			cardDiv.textContent = card.rank + card.suit;
			playerCardsDiv.appendChild(cardDiv);
		});
		
		// Update dealer cards
		const dealerCardsDiv = document.getElementById('dealerCards');
		dealerCardsDiv.innerHTML = '';
		state.dealerCards.forEach((card, index) => {
			const cardDiv = document.createElement('div');
			cardDiv.className = 'card';
			if (index === 1 && !state.gameOver) {
				cardDiv.classList.add('hidden');
				cardDiv.textContent = '?';
			} else {
				if (['♥', '♦'].includes(card.suit)) {
					cardDiv.classList.add('red');
				}
				cardDiv.textContent = card.rank + card.suit;
			}
			dealerCardsDiv.appendChild(cardDiv);
		});
		
		// Update totals
		state.playerTotal = this.calculateHandValue(state.playerCards);
		state.dealerTotal = this.calculateHandValue(state.dealerCards);
		
		document.getElementById('playerTotal').textContent = state.playerTotal;
		document.getElementById('dealerTotal').textContent = state.gameOver ? state.dealerTotal : '?';
	}

	hitBlackjack() {
		const state = this.blackjackGameState;
		state.playerCards.push(this.dealCard());
		this.updateBlackjackDisplay();
		
		if (state.playerTotal > 21) {
			// Bust
			this.endBlackjackGame();
		}
	}

	standBlackjack() {
		this.blackjackGameState.gameOver = true;
		this.dealerPlay();
	}

	doubleDownBlackjack() {
		const state = this.blackjackGameState;
		if (!this.isAdmin && state.bet > this.currentCredits) {
			alert('Not enough credits to double down!');
			return;
		}
		
		// Double the bet
		if (!this.isAdmin) {
			this.currentCredits -= state.bet;
			this.updateCreditDisplay();
		}
		state.bet *= 2;
		
		// Hit once
		state.playerCards.push(this.dealCard());
		this.updateBlackjackDisplay();
		
		// Stand automatically
		this.standBlackjack();
	}

	dealerPlay() {
		const state = this.blackjackGameState;
		
		// Dealer hits until 17 or higher
		while (state.dealerTotal < 17) {
			state.dealerCards.push(this.dealCard());
			state.dealerTotal = this.calculateHandValue(state.dealerCards);
		}
		
		this.updateBlackjackDisplay();
		this.endBlackjackGame();
	}

	endBlackjackGame() {
		const state = this.blackjackGameState;
		state.gameOver = true;
		this.updateBlackjackDisplay();
		
		let result = '';
		let winnings = 0;
		
		if (state.playerTotal > 21) {
			result = 'Bust! You lose.';
		} else if (state.dealerTotal > 21) {
			result = 'Dealer busts! You win!';
			winnings = state.bet * 2;
		} else if (state.playerTotal > state.dealerTotal) {
			result = 'You win!';
			winnings = state.bet * 2;
		} else if (state.playerTotal < state.dealerTotal) {
			result = 'Dealer wins!';
		} else {
			result = 'Push!';
			winnings = state.bet;
		}
		
		// Check for blackjack
		if (state.playerTotal === 21 && state.playerCards.length === 2) {
			result = 'Blackjack! You win!';
			winnings = Math.floor(state.bet * 2.5);
		}
		
		if (!this.isAdmin) {
			this.currentCredits += winnings;
			this.updateCreditDisplay();
		}
		
		alert(`${result} ${winnings > 0 ? `Won ${winnings} credits!` : ''}`);
		
		// Reset UI
		document.querySelector('.blackjack-actions').style.display = 'none';
		document.getElementById('blackjackDeal').style.display = 'block';
	}

	// Tower Game
	openTowerGame() {
		this.modalTitle.textContent = '🏰 Tower';
		this.modalBody.innerHTML = `
			<div class="game-controls">
				<div class="bet-controls">
					<label>Bet Amount:</label>
					<input type="number" class="bet-input" id="towerBet" min="1" max="${this.isAdmin ? 999999 : this.currentCredits}" value="1">
					<button class="game-button" id="towerStart">Start Climbing</button>
				</div>
			</div>
			<div class="tower-game-area">
				<div class="tower-info">
					<div>Level: <span id="towerLevel">0</span></div>
					<div>Multiplier: <span id="towerMultiplier">1.00x</span></div>
				</div>
				<div class="tower-levels" id="towerLevels"></div>
				<div class="tower-actions" style="display: none;">
					<button class="game-button success" id="towerCashOut">Cash Out</button>
				</div>
			</div>
		`;
		
		this.setupTowerGame();
	}

	setupTowerGame() {
		const startBtn = document.getElementById('towerStart');
		const cashOutBtn = document.getElementById('towerCashOut');
		
		startBtn.addEventListener('click', () => {
			const bet = parseInt(document.getElementById('towerBet').value);
			if (!this.isAdmin && bet > this.currentCredits) {
				alert('Not enough credits!');
				return;
			}
			this.startTowerGame(bet);
		});
		
		cashOutBtn.addEventListener('click', () => {
			this.cashOutTower();
		});
	}

	startTowerGame(bet) {
		// Deduct bet from credits (except for admin)
		if (!this.isAdmin) {
			this.currentCredits -= bet;
			this.updateCreditDisplay();
		}
		
		this.towerGameState = {
			bet,
			level: 0,
			multiplier: 1.00
		};
		
		this.generateTowerLevel();
		
		// Show game controls
		document.querySelector('.tower-actions').style.display = 'block';
		document.getElementById('towerStart').style.display = 'none';
	}

	generateTowerLevel() {
		const state = this.towerGameState;
		const levelsDiv = document.getElementById('towerLevels');
		
		// Clear previous levels
		levelsDiv.innerHTML = '';
		
		// Generate all levels up to current level
		for (let level = 0; level <= state.level; level++) {
			const levelDiv = document.createElement('div');
			levelDiv.className = 'tower-level';
			levelDiv.style.cssText = `
				display: flex;
				justify-content: center;
				gap: 15px;
				margin: 10px 0;
				position: relative;
			`;
			
			// Always 4 tiles per level (like Stake)
			const tileCount = 4;
			const safeTile = Math.floor(Math.random() * tileCount);
			
			for (let i = 0; i < tileCount; i++) {
				const tile = document.createElement('div');
				tile.className = 'tower-tile';
				tile.dataset.safe = i === safeTile;
				tile.dataset.level = level;
				tile.dataset.index = i;
				
				tile.style.cssText = `
					width: 60px;
					height: 60px;
					background: ${level < state.level ? '#4a7c59' : 'rgba(255, 255, 255, 0.1)'};
					border: 2px solid ${level < state.level ? '#6b8e23' : 'rgba(255, 255, 255, 0.3)'};
					border-radius: 12px;
					cursor: ${level === state.level ? 'pointer' : 'default'};
					transition: all 0.3s ease;
					display: flex;
					align-items: center;
					justify-content: center;
					font-size: 1.2rem;
					position: relative;
					overflow: hidden;
				`;
				
				// Add visual effects for completed levels
				if (level < state.level) {
					tile.innerHTML = '✓';
					tile.style.color = 'white';
					tile.style.boxShadow = '0 0 20px rgba(74, 124, 89, 0.5)';
				} else if (level === state.level) {
					// Current level - add hover effects
					tile.addEventListener('mouseenter', () => {
						tile.style.background = 'rgba(255, 255, 255, 0.2)';
						tile.style.transform = 'scale(1.05)';
					});
					
					tile.addEventListener('mouseleave', () => {
						tile.style.background = 'rgba(255, 255, 255, 0.1)';
						tile.style.transform = 'scale(1)';
					});
					
					tile.addEventListener('click', () => {
						this.selectTowerTile(tile);
					});
				}
				
				levelDiv.appendChild(tile);
			}
			
			levelsDiv.appendChild(levelDiv);
		}
		
		// Update display
		document.getElementById('towerLevel').textContent = state.level + 1;
		document.getElementById('towerMultiplier').textContent = state.multiplier.toFixed(2) + 'x';
	}

	selectTowerTile(tile) {
		const state = this.towerGameState;
		
		if (tile.dataset.safe === 'true') {
			// Safe tile - mark as safe and advance
			tile.style.background = '#4a7c59';
			tile.style.borderColor = '#6b8e23';
			tile.style.color = 'white';
			tile.innerHTML = '✓';
			tile.style.boxShadow = '0 0 20px rgba(74, 124, 89, 0.5)';
			
			// Advance to next level
			state.level++;
			state.multiplier = Math.pow(1.2, state.level);
			
			if (state.level >= 10) {
				// Reached the top
				setTimeout(() => {
					this.cashOutTower();
				}, 1000);
			} else {
				// Generate next level
				setTimeout(() => {
					this.generateTowerLevel();
				}, 1000);
			}
		} else {
			// Trap - game over
			tile.style.background = '#d32f2f';
			tile.style.borderColor = '#f44336';
			tile.style.color = 'white';
			tile.innerHTML = '💥';
			tile.style.boxShadow = '0 0 20px rgba(211, 47, 47, 0.5)';
			
			setTimeout(() => {
				this.endTowerGame();
			}, 1000);
		}
	}

	cashOutTower() {
		const state = this.towerGameState;
		const winnings = Math.floor(state.bet * state.multiplier);
		
		if (!this.isAdmin) {
			this.currentCredits += winnings;
			this.updateCreditDisplay();
		}
		
		alert(`Cashed out! Won ${winnings} credits (${state.multiplier.toFixed(2)}x multiplier)`);
		this.endTowerGame();
	}

	endTowerGame() {
		// Reset UI
		document.querySelector('.tower-actions').style.display = 'none';
		document.getElementById('towerStart').style.display = 'block';
		document.getElementById('towerLevel').textContent = '0';
		document.getElementById('towerMultiplier').textContent = '1.00x';
		
		this.towerGameState = null;
	}

	// Plinko Game
	openPlinkoGame() {
		this.modalTitle.textContent = '🎲 Plinko';
		this.modalBody.innerHTML = `
			<div class="game-controls">
				<div class="bet-controls">
					<label>Bet Amount:</label>
					<input type="number" class="bet-input" id="plinkoBet" min="1" max="${this.isAdmin ? 999999 : this.currentCredits}" value="1">
					<label>Rows:</label>
					<select class="bet-input" id="plinkoRows">
						<option value="8">8 Rows</option>
						<option value="12">12 Rows</option>
						<option value="16">16 Rows</option>
					</select>
					<label>Risk:</label>
					<select class="bet-input" id="plinkoRisk">
						<option value="low">Low Risk</option>
						<option value="medium">Medium Risk</option>
						<option value="high">High Risk</option>
					</select>
					<button class="game-button" id="plinkoDrop">Drop Ball</button>
				</div>
			</div>
			<div class="plinko-game-area">
				<div class="plinko-board" id="plinkoBoard"></div>
				<div class="plinko-result" id="plinkoResult"></div>
			</div>
		`;
		
		this.setupPlinkoGame();
	}

	setupPlinkoGame() {
		const dropBtn = document.getElementById('plinkoDrop');
		dropBtn.addEventListener('click', () => {
			const bet = parseInt(document.getElementById('plinkoBet').value);
			const rows = parseInt(document.getElementById('plinkoRows').value);
			const risk = document.getElementById('plinkoRisk').value;
			
			if (!this.isAdmin && bet > this.currentCredits) {
				alert('Not enough credits!');
				return;
			}
			
			this.dropPlinkoBall(bet, rows, risk);
		});
		
		// Generate initial board
		this.generatePlinkoBoard(12);
	}

	generatePlinkoBoard(rows) {
		const board = document.getElementById('plinkoBoard');
		board.innerHTML = '';
		
		// Generate pegs
		for (let i = 0; i < rows; i++) {
			const row = document.createElement('div');
			row.className = 'plinko-row';
			
			for (let j = 0; j <= i; j++) {
				const peg = document.createElement('div');
				peg.className = 'plinko-peg';
				row.appendChild(peg);
			}
			
			board.appendChild(row);
		}
		
		// Generate slots
		const slotRow = document.createElement('div');
		slotRow.className = 'plinko-row';
		
		const slotCount = rows + 1;
		for (let i = 0; i < slotCount; i++) {
			const slot = document.createElement('div');
			slot.className = 'plinko-slot';
			slot.dataset.multiplier = this.getPlinkoMultiplier(i, slotCount, 'medium');
			slot.textContent = slot.dataset.multiplier + 'x';
			slotRow.appendChild(slot);
		}
		
		board.appendChild(slotRow);
	}

	getPlinkoMultiplier(slotIndex, totalSlots, risk) {
		const center = Math.floor(totalSlots / 2);
		const distance = Math.abs(slotIndex - center);
		const maxDistance = Math.floor(totalSlots / 2);
		
		let baseMultiplier;
		switch (risk) {
			case 'low':
				baseMultiplier = 0.2 + (1 - distance / maxDistance) * 0.8;
				break;
			case 'medium':
				baseMultiplier = 0.1 + (1 - distance / maxDistance) * 1.9;
				break;
			case 'high':
				baseMultiplier = 0.05 + (1 - distance / maxDistance) * 4.95;
				break;
		}
		
		return Math.max(0.1, baseMultiplier).toFixed(2);
	}

	dropPlinkoBall(bet, rows, risk) {
		// Deduct bet from credits (except for admin)
		if (!this.isAdmin) {
			this.currentCredits -= bet;
			this.updateCreditDisplay();
		}
		
		// Generate new board
		this.generatePlinkoBoard(rows);
		
		// Animate ball drop with physics
		this.animatePlinkoBall(rows, risk, bet);
	}

	animatePlinkoBall(rows, risk, bet) {
		const board = document.getElementById('plinkoBoard');
		const ball = document.createElement('div');
		ball.className = 'plinko-ball';
		ball.style.cssText = `
			position: absolute;
			width: 12px;
			height: 12px;
			background: radial-gradient(circle, #ffd700, #ffed4e);
			border-radius: 50%;
			box-shadow: 0 2px 4px rgba(0,0,0,0.3);
			z-index: 1000;
			top: 20px;
			left: 50%;
			transform: translateX(-50%);
			transition: all 0.1s ease;
		`;
		
		board.appendChild(ball);
		
		// Simulate realistic ball physics
		let currentRow = 0;
		let currentCol = Math.floor(rows / 2); // Start in middle
		const slotWidth = 40;
		const rowHeight = 30;
		const boardWidth = rows * slotWidth;
		const startX = (boardWidth / 2) - (slotWidth / 2);
		
		const animateStep = () => {
			if (currentRow >= rows) {
				// Ball reached bottom - determine final slot
				const finalSlot = Math.max(0, Math.min(rows, Math.floor(currentCol)));
				this.finishPlinkoGame(finalSlot, risk, bet);
				ball.remove();
				return;
			}
			
			// Simulate physics - ball bounces left or right randomly
			const bounceDirection = Math.random() < 0.5 ? -1 : 1;
			currentCol += bounceDirection * 0.5;
			
			// Update ball position
			const x = startX + (currentCol * slotWidth);
			const y = 20 + (currentRow * rowHeight);
			
			ball.style.left = x + 'px';
			ball.style.top = y + 'px';
			
			currentRow += 0.1;
			
			// Continue animation
			setTimeout(animateStep, 50);
		};
		
		animateStep();
	}

	finishPlinkoGame(finalSlot, risk, bet) {
		const slots = document.querySelectorAll('.plinko-slot');
		const multiplier = parseFloat(slots[finalSlot].dataset.multiplier);
		
		const winnings = Math.floor(bet * multiplier);
		if (!this.isAdmin) {
			this.currentCredits += winnings;
			this.updateCreditDisplay();
		}
		
		// Highlight the winning slot
		slots[finalSlot].style.background = '#4a7c59';
		slots[finalSlot].style.color = 'white';
		slots[finalSlot].style.transform = 'scale(1.1)';
		
		// Show result
		const resultDiv = document.getElementById('plinkoResult');
		resultDiv.innerHTML = `
			<div style="text-align: center; margin-top: 20px; padding: 20px; background: rgba(74, 124, 89, 0.2); border-radius: 10px;">
				<h3>Ball landed in slot ${finalSlot + 1}</h3>
				<div style="font-size: 2rem; color: #4a7c59; font-weight: bold;">${multiplier}x</div>
				<div>Won ${winnings} credits!</div>
			</div>
		`;
		
		// Reset slot highlighting after 3 seconds
		setTimeout(() => {
			slots[finalSlot].style.background = 'rgba(255, 255, 255, 0.1)';
			slots[finalSlot].style.color = '#4a7c59';
			slots[finalSlot].style.transform = 'scale(1)';
		}, 3000);
	}

	// Aviamaster Game (Stake Version)
	openAviamasterGame() {
		this.modalTitle.textContent = '✈️ Aviamaster';
		this.modalBody.innerHTML = `
			<div class="game-controls">
				<div class="bet-controls">
					<label>Bet Amount:</label>
					<input type="number" class="bet-input" id="aviamasterBet" min="1" max="${this.isAdmin ? 999999 : this.currentCredits}" value="1">
					<label>Auto Cashout:</label>
					<input type="number" class="bet-input" id="aviamasterAutoCashout" min="1.01" step="0.01" value="2.00">
					<button class="game-button" id="aviamasterStart">Take Off</button>
				</div>
			</div>
			<div class="aviamaster-display">
				<div class="aviamaster-game-area">
					<div class="aviamaster-sky">
						<div class="aviamaster-plane" id="aviamasterPlane">✈️</div>
						<div class="aviamaster-multiplier" id="aviamasterMultiplier">1.00x</div>
						<div class="aviamaster-obstacles" id="aviamasterObstacles"></div>
						<div class="aviamaster-collectibles" id="aviamasterCollectibles"></div>
					</div>
					<div class="aviamaster-ground">
						<div class="aviamaster-runway"></div>
					</div>
				</div>
				<div class="aviamaster-actions" style="display: none;">
					<button class="game-button success" id="aviamasterCashOut">Land</button>
				</div>
			</div>
		`;
		
		this.setupAviamasterGame();
	}

	setupAviamasterGame() {
		const startBtn = document.getElementById('aviamasterStart');
		const cashOutBtn = document.getElementById('aviamasterCashOut');
		
		startBtn.addEventListener('click', () => {
			const bet = parseInt(document.getElementById('aviamasterBet').value);
			const autoCashout = parseFloat(document.getElementById('aviamasterAutoCashout').value);
			
			if (!this.isAdmin && bet > this.currentCredits) {
				alert('Not enough credits!');
				return;
			}
			
			this.startAviamasterGame(bet, autoCashout);
		});
		
		cashOutBtn.addEventListener('click', () => {
			this.cashOutAviamaster();
		});
	}

	startAviamasterGame(bet, autoCashout) {
		// Deduct bet from credits (except for admin)
		if (!this.isAdmin) {
			this.currentCredits -= bet;
			this.updateCreditDisplay();
		}
		
		// Generate provably fair seed
		const gameSeed = this.generateGameSeed();
		console.log('Aviamaster Game Seed:', gameSeed);
		
		// Display provably fair info
		this.displayProvablyFairInfo(gameSeed);
		
		// Generate crash point using provably fair system
		const crashPoint = 1 + this.generateProvablyFairNumber(gameSeed.serverSeed + gameSeed.clientSeed, 0, 99);
		
		// Start game
		let multiplier = 1.00;
		let planePosition = 0;
		let collectibles = [];
		let obstacles = [];
		const multiplierElement = document.getElementById('aviamasterMultiplier');
		const planeElement = document.getElementById('aviamasterPlane');
		const obstaclesElement = document.getElementById('aviamasterObstacles');
		const collectiblesElement = document.getElementById('aviamasterCollectibles');
		const cashOutBtn = document.getElementById('aviamasterCashOut');
		
		// Show game controls
		document.querySelector('.aviamaster-actions').style.display = 'block';
		document.getElementById('aviamasterStart').style.display = 'none';
		
		const gameInterval = setInterval(() => {
			multiplier += 0.01;
			planePosition += 2;
			
			// Update multiplier display
			multiplierElement.textContent = multiplier.toFixed(2) + 'x';
			
			// Move plane
			planeElement.style.transform = `translateX(${planePosition}px) translateY(${Math.sin(planePosition * 0.01) * 10}px)`;
			
			// Add collectibles (multipliers)
			if (Math.random() < 0.15) {
				const collectible = document.createElement('div');
				collectible.className = 'aviamaster-collectible';
				collectible.style.cssText = `
					position: absolute;
					left: ${planePosition + 200}px;
					top: ${50 + Math.random() * 100}px;
					width: 20px;
					height: 20px;
					background: #ffd700;
					border-radius: 50%;
					display: flex;
					align-items: center;
					justify-content: center;
					font-size: 0.8rem;
					color: #000;
					font-weight: bold;
					animation: collectibleFloat 2s ease-in-out infinite;
				`;
				
				const collectibleValue = Math.random() < 0.5 ? '+1' : '×2';
				collectible.textContent = collectibleValue;
				collectible.dataset.value = collectibleValue;
				
				collectiblesElement.appendChild(collectible);
				collectibles.push(collectible);
				
				// Remove old collectibles
				if (collectibles.length > 8) {
					const oldCollectible = collectibles.shift();
					oldCollectible.remove();
				}
			}
			
			// Add obstacles (rockets)
			if (Math.random() < 0.08) {
				const obstacle = document.createElement('div');
				obstacle.className = 'aviamaster-obstacle';
				obstacle.style.cssText = `
					position: absolute;
					left: ${planePosition + 150}px;
					top: ${50 + Math.random() * 100}px;
					width: 30px;
					height: 30px;
					background: #d32f2f;
					border-radius: 4px;
					display: flex;
					align-items: center;
					justify-content: center;
					font-size: 1.2rem;
					color: white;
					animation: obstacleFloat 1.5s ease-in-out infinite;
				`;
				obstacle.textContent = '🚀';
				obstacle.dataset.type = 'rocket';
				
				obstaclesElement.appendChild(obstacle);
				obstacles.push(obstacle);
				
				// Remove old obstacles
				if (obstacles.length > 6) {
					const oldObstacle = obstacles.shift();
					oldObstacle.remove();
				}
			}
			
			// Check auto cashout
			if (multiplier >= autoCashout) {
				this.cashOutAviamaster();
				clearInterval(gameInterval);
				return;
			}
			
			// Check crash
			if (multiplier >= crashPoint) {
				multiplierElement.textContent = 'CRASHED!';
				multiplierElement.style.color = '#d32f2f';
				planeElement.style.transform += ' rotate(45deg)';
				planeElement.style.filter = 'hue-rotate(0deg) saturate(2)';
				cashOutBtn.disabled = true;
				clearInterval(gameInterval);
				
				setTimeout(() => {
					this.endAviamasterGame();
				}, 2000);
			}
		}, 50);
		
		// Store game state
		this.aviamasterGameState = {
			bet,
			multiplier: 0,
			interval: gameInterval
		};
	}

	cashOutAviamaster() {
		const multiplier = parseFloat(document.getElementById('aviamasterMultiplier').textContent);
		const bet = this.aviamasterGameState.bet;
		const winnings = Math.floor(bet * multiplier);
		
		if (!this.isAdmin) {
			this.currentCredits += winnings;
			this.updateCreditDisplay();
		}
		
		clearInterval(this.aviamasterGameState.interval);
		
		alert(`Landed safely! Won ${winnings} credits (${multiplier.toFixed(2)}x multiplier)`);
		this.endAviamasterGame();
	}

	endAviamasterGame() {
		// Reset UI
		document.querySelector('.aviamaster-actions').style.display = 'none';
		document.getElementById('aviamasterStart').style.display = 'block';
		document.getElementById('aviamasterMultiplier').textContent = '1.00x';
		document.getElementById('aviamasterMultiplier').style.color = '#4a7c59';
		document.getElementById('aviamasterCashOut').disabled = false;
		document.getElementById('aviamasterObstacles').innerHTML = '';
		
		this.aviamasterGameState = null;
	}
}

// Initialize gambling system when page loads
document.addEventListener('DOMContentLoaded', () => {
	new GamblingSystem();
});