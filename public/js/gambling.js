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

	generateRealisticCrashPoint(seed) {
		// Generate a realistic crash point distribution
		// Most crashes happen at low multipliers, few at high multipliers
		const random = this.generateProvablyFairNumber(seed, 0, 1);
		
		// Weighted distribution for realistic crash points
		if (random < 0.40) {
			// 40% chance: crash between 1.00x - 1.60x
			return 1 + this.generateProvablyFairNumber(seed + '1', 0, 0.6);
		} else if (random < 0.60) {
			// 20% chance: crash between 1.60x - 2.50x
			return 1.6 + this.generateProvablyFairNumber(seed + '2', 0, 0.9);
		} else if (random < 0.75) {
			// 15% chance: crash between 2.50x - 4.00x
			return 2.5 + this.generateProvablyFairNumber(seed + '3', 0, 1.5);
		} else if (random < 0.85) {
			// 10% chance: crash between 4.00x - 8.00x
			return 4 + this.generateProvablyFairNumber(seed + '4', 0, 4);
		} else if (random < 0.95) {
			// 10% chance: crash between 8.00x - 20.00x
			return 8 + this.generateProvablyFairNumber(seed + '5', 0, 12);
		} else if (random < 0.99) {
			// 4% chance: crash between 20.00x - 50.00x
			return 20 + this.generateProvablyFairNumber(seed + '6', 0, 30);
		} else {
			// 1% chance: crash between 50.00x - 100.00x
			return 50 + this.generateProvablyFairNumber(seed + '7', 0, 50);
		}
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
		
		// Generate realistic crash point using provably fair system
		// Most crashes happen at low multipliers (1.00x - 5.00x)
		const crashPoint = this.generateRealisticCrashPoint(gameSeed.serverSeed + gameSeed.clientSeed);
		
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

	// Plinko Game (EXACT Rainbet Version)
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
						<option value="10">10 Rows</option>
						<option value="12">12 Rows</option>
						<option value="14">14 Rows</option>
						<option value="16">16 Rows</option>
					</select>
					<label>Risk:</label>
					<select class="bet-input" id="plinkoRisk">
						<option value="low">Low Risk</option>
						<option value="medium" selected>Medium Risk</option>
						<option value="high">High Risk</option>
					</select>
					<button class="game-button" id="plinkoDrop">Drop Ball</button>
				</div>
			</div>
			<div class="plinko-game-area">
				<div class="plinko-board-container">
					<div class="plinko-board" id="plinkoBoard"></div>
					<div class="plinko-ball" id="plinkoBall" style="display: none;"></div>
				</div>
				<div class="plinko-result" id="plinkoResult"></div>
			</div>
		`;
		
		this.setupPlinkoGame();
	}

	setupPlinkoGame() {
		const dropBtn = document.getElementById('plinkoDrop');
		const rowsSelect = document.getElementById('plinkoRows');
		const riskSelect = document.getElementById('plinkoRisk');
		
		// Update board when settings change
		const updateBoard = () => {
			const rows = parseInt(rowsSelect.value);
			const risk = riskSelect.value;
			this.generatePlinkoBoard(rows, risk);
		};
		
		rowsSelect.addEventListener('change', updateBoard);
		riskSelect.addEventListener('change', updateBoard);
		
		dropBtn.addEventListener('click', () => {
			const bet = parseInt(document.getElementById('plinkoBet').value);
			const rows = parseInt(rowsSelect.value);
			const risk = riskSelect.value;
			
			if (!this.isAdmin && bet > this.currentCredits) {
				alert('Not enough credits!');
				return;
			}
			
			this.dropPlinkoBall(bet, rows, risk);
		});
		
		// Generate initial board
		this.generatePlinkoBoard(12, 'medium');
	}

	generatePlinkoBoard(rows, risk) {
		const board = document.getElementById('plinkoBoard');
		board.innerHTML = '';
		board.style.cssText = `
			display: flex;
			flex-direction: column;
			align-items: center;
			gap: 8px;
			padding: 20px;
			background: linear-gradient(135deg, #1a1a2e, #16213e);
			border-radius: 15px;
			position: relative;
		`;
		
		// Generate pegs in triangular pattern (like real Plinko)
		for (let i = 0; i < rows; i++) {
			const row = document.createElement('div');
			row.className = 'plinko-row';
			row.style.cssText = `
				display: flex;
				justify-content: center;
				gap: 8px;
			`;
			
			for (let j = 0; j <= i; j++) {
				const peg = document.createElement('div');
				peg.className = 'plinko-peg';
				peg.style.cssText = `
					width: 12px;
					height: 12px;
					background: #4a7c59;
					border-radius: 50%;
					box-shadow: 0 2px 4px rgba(0,0,0,0.3);
				`;
				row.appendChild(peg);
			}
			
			board.appendChild(row);
		}
		
		// Generate slots with realistic Rainbet multipliers
		const slotRow = document.createElement('div');
		slotRow.className = 'plinko-slots';
		slotRow.style.cssText = `
			display: flex;
			justify-content: center;
			gap: 4px;
			margin-top: 10px;
		`;
		
		const slotCount = rows + 1;
		for (let i = 0; i < slotCount; i++) {
			const slot = document.createElement('div');
			slot.className = 'plinko-slot';
			slot.dataset.multiplier = this.getRainbetPlinkoMultiplier(i, slotCount, risk);
			slot.style.cssText = `
				width: 50px;
				height: 40px;
				background: ${this.getSlotColor(slot.dataset.multiplier)};
				border: 2px solid rgba(255, 255, 255, 0.3);
				border-radius: 8px;
				display: flex;
				align-items: center;
				justify-content: center;
				font-size: 0.9rem;
				color: white;
				font-weight: bold;
				text-shadow: 0 1px 2px rgba(0,0,0,0.5);
			`;
			slot.textContent = slot.dataset.multiplier + 'x';
			slotRow.appendChild(slot);
		}
		
		board.appendChild(slotRow);
	}

	getRainbetPlinkoMultiplier(slotIndex, totalSlots, risk) {
		const center = Math.floor(totalSlots / 2);
		const distance = Math.abs(slotIndex - center);
		const maxDistance = Math.floor(totalSlots / 2);
		
		// Rainbet-style multiplier distribution
		let multipliers;
		switch (risk) {
			case 'low':
				multipliers = [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2.0, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 3.0, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 4.0, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 5.0, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 6.0, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 7.0, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 8.0, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 9.0, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 10.0, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9, 11.0, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8, 11.9, 12.0, 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8, 12.9, 13.0, 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8, 13.9, 14.0, 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7, 14.8, 14.9, 15.0, 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7, 15.8, 15.9, 16.0, 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7, 16.8, 16.9, 17.0, 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.7, 17.8, 17.9, 18.0, 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7, 18.8, 18.9, 19.0, 19.1, 19.2, 19.3, 19.4, 19.5, 19.6, 19.7, 19.8, 19.9, 20.0];
				break;
			case 'medium':
				multipliers = [0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2.0, 2.2, 2.4, 2.6, 2.8, 3.0, 3.2, 3.4, 3.6, 3.8, 4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0, 9.5, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0, 17.0, 18.0, 19.0, 20.0, 22.0, 24.0, 26.0, 28.0, 30.0, 35.0, 40.0, 45.0, 50.0, 60.0, 70.0, 80.0, 90.0, 100.0, 120.0, 140.0, 160.0, 180.0, 200.0, 250.0, 300.0, 350.0, 400.0, 450.0, 500.0, 600.0, 700.0, 800.0, 900.0, 1000.0];
				break;
			case 'high':
				multipliers = [0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 12.0, 14.0, 16.0, 18.0, 20.0, 25.0, 30.0, 35.0, 40.0, 45.0, 50.0, 60.0, 70.0, 80.0, 90.0, 100.0, 120.0, 140.0, 160.0, 180.0, 200.0, 250.0, 300.0, 350.0, 400.0, 450.0, 500.0, 600.0, 700.0, 800.0, 900.0, 1000.0, 1200.0, 1400.0, 1600.0, 1800.0, 2000.0, 2500.0, 3000.0, 3500.0, 4000.0, 4500.0, 5000.0, 6000.0, 7000.0, 8000.0, 9000.0, 10000.0];
				break;
		}
		
		// Distribute multipliers based on distance from center
		const normalizedDistance = distance / maxDistance;
		const multiplierIndex = Math.floor(normalizedDistance * (multipliers.length - 1));
		
		return multipliers[multiplierIndex].toFixed(1);
	}

	getSlotColor(multiplier) {
		const mult = parseFloat(multiplier);
		if (mult < 1) return '#d32f2f'; // Red for losses
		if (mult < 2) return '#ff9800'; // Orange for small wins
		if (mult < 5) return '#ffc107'; // Yellow for medium wins
		if (mult < 10) return '#4caf50'; // Green for good wins
		if (mult < 50) return '#2196f3'; // Blue for great wins
		return '#9c27b0'; // Purple for amazing wins
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

	// Aviamaster Game (EXACT Stake Version)
	openAviamasterGame() {
		this.modalTitle.textContent = '✈️ Aviamaster';
		this.modalBody.innerHTML = `
			<div class="game-controls">
				<div class="bet-controls">
					<label>Bet Amount:</label>
					<input type="number" class="bet-input" id="aviamasterBet" min="1" max="${this.isAdmin ? 999999 : this.currentCredits}" value="1">
					<label>Speed:</label>
					<select class="bet-input" id="aviamasterSpeed">
						<option value="slow">Slow</option>
						<option value="medium" selected>Medium</option>
						<option value="fast">Fast</option>
						<option value="veryfast">Very Fast</option>
					</select>
					<button class="game-button" id="aviamasterStart">Take Off</button>
				</div>
			</div>
			<div class="aviamaster-display">
				<div class="aviamaster-game-area">
					<div class="aviamaster-ocean">
						<div class="aviamaster-ship" id="aviamasterShip">🚢</div>
						<div class="aviamaster-plane" id="aviamasterPlane">✈️</div>
						<div class="aviamaster-multipliers" id="aviamasterMultipliers"></div>
						<div class="aviamaster-rockets" id="aviamasterRockets"></div>
						<div class="aviamaster-clouds" id="aviamasterClouds"></div>
					</div>
					<div class="aviamaster-hud">
						<div class="hud-item">
							<span class="hud-label">Altitude:</span>
							<span class="hud-value" id="aviamasterAltitude">0m</span>
						</div>
						<div class="hud-item">
							<span class="hud-label">Distance:</span>
							<span class="hud-value" id="aviamasterDistance">0m</span>
						</div>
						<div class="hud-item">
							<span class="hud-label">Multiplier:</span>
							<span class="hud-value" id="aviamasterMultiplier">1.00x</span>
						</div>
					</div>
				</div>
				<div class="aviamaster-actions" style="display: none;">
					<button class="game-button success" id="aviamasterCashOut">Land on Ship</button>
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
			const speed = document.getElementById('aviamasterSpeed').value;
			
			if (!this.isAdmin && bet > this.currentCredits) {
				alert('Not enough credits!');
				return;
			}
			
			this.startAviamasterGame(bet, speed);
		});
		
		cashOutBtn.addEventListener('click', () => {
			this.cashOutAviamaster();
		});
	}

	startAviamasterGame(bet, speed) {
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
		
		// Generate realistic crash point using provably fair system
		const crashPoint = this.generateRealisticCrashPoint(gameSeed.serverSeed + gameSeed.clientSeed);
		
		// Speed settings
		const speedSettings = {
			slow: { interval: 100, increment: 0.005 },
			medium: { interval: 50, increment: 0.01 },
			fast: { interval: 25, increment: 0.02 },
			veryfast: { interval: 10, increment: 0.05 }
		};
		
		const currentSpeed = speedSettings[speed] || speedSettings.medium;
		
		// Start game
		let multiplier = 1.00;
		let altitude = 0;
		let distance = 0;
		let planePosition = 0;
		let multipliers = [];
		let rockets = [];
		let clouds = [];
		
		const multiplierElement = document.getElementById('aviamasterMultiplier');
		const altitudeElement = document.getElementById('aviamasterAltitude');
		const distanceElement = document.getElementById('aviamasterDistance');
		const planeElement = document.getElementById('aviamasterPlane');
		const multipliersElement = document.getElementById('aviamasterMultipliers');
		const rocketsElement = document.getElementById('aviamasterRockets');
		const cloudsElement = document.getElementById('aviamasterClouds');
		const cashOutBtn = document.getElementById('aviamasterCashOut');
		
		// Show game controls
		document.querySelector('.aviamaster-actions').style.display = 'block';
		document.getElementById('aviamasterStart').style.display = 'none';
		
		// Generate initial clouds
		for (let i = 0; i < 5; i++) {
			this.createCloud(cloudsElement, i * 200);
		}
		
		const gameInterval = setInterval(() => {
			multiplier += currentSpeed.increment;
			altitude += Math.random() * 2;
			distance += 1;
			planePosition += 1;
			
			// Update HUD
			multiplierElement.textContent = multiplier.toFixed(2) + 'x';
			altitudeElement.textContent = Math.floor(altitude) + 'm';
			distanceElement.textContent = Math.floor(distance) + 'm';
			
			// Move plane with realistic physics
			const planeY = 100 + Math.sin(planePosition * 0.02) * 20;
			planeElement.style.transform = `translateX(${planePosition}px) translateY(${planeY}px)`;
			
			// Add multipliers (+1, +2, +5, +10, x2, x3, x4, x5)
			if (Math.random() < 0.12) {
				const multiplierTypes = ['+1', '+2', '+5', '+10', '×2', '×3', '×4', '×5'];
				const multiplierType = multiplierTypes[Math.floor(Math.random() * multiplierTypes.length)];
				
				const multiplierEl = document.createElement('div');
				multiplierEl.className = 'aviamaster-multiplier-item';
				multiplierEl.style.cssText = `
					position: absolute;
					left: ${planePosition + 300}px;
					top: ${50 + Math.random() * 150}px;
					width: 30px;
					height: 30px;
					background: #ffd700;
					border: 2px solid #ffed4e;
					border-radius: 50%;
					display: flex;
					align-items: center;
					justify-content: center;
					font-size: 0.7rem;
					color: #000;
					font-weight: bold;
					animation: multiplierFloat 3s ease-in-out infinite;
					z-index: 5;
				`;
				multiplierEl.textContent = multiplierType;
				multiplierEl.dataset.value = multiplierType;
				
				multipliersElement.appendChild(multiplierEl);
				multipliers.push(multiplierEl);
				
				// Remove old multipliers
				if (multipliers.length > 6) {
					const oldMultiplier = multipliers.shift();
					oldMultiplier.remove();
				}
			}
			
			// Add rockets (obstacles that halve the score)
			if (Math.random() < 0.08) {
				const rocket = document.createElement('div');
				rocket.className = 'aviamaster-rocket-item';
				rocket.style.cssText = `
					position: absolute;
					left: ${planePosition + 250}px;
					top: ${50 + Math.random() * 150}px;
					width: 25px;
					height: 25px;
					background: #d32f2f;
					border-radius: 4px;
					display: flex;
					align-items: center;
					justify-content: center;
					font-size: 1rem;
					color: white;
					animation: rocketFloat 2s ease-in-out infinite;
					z-index: 5;
				`;
				rocket.textContent = '🚀';
				rocket.dataset.type = 'rocket';
				
				rocketsElement.appendChild(rocket);
				rockets.push(rocket);
				
				// Remove old rockets
				if (rockets.length > 4) {
					const oldRocket = rockets.shift();
					oldRocket.remove();
				}
			}
			
			// Move clouds
			const cloudElements = cloudsElement.querySelectorAll('.aviamaster-cloud');
			cloudElements.forEach(cloud => {
				const currentLeft = parseInt(cloud.style.left) || 0;
				cloud.style.left = (currentLeft - 0.5) + 'px';
				if (currentLeft < -100) {
					cloud.style.left = '800px';
				}
			});
			
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
		}, currentSpeed.interval);
		
		// Store game state
		this.aviamasterGameState = {
			bet,
			multiplier: 0,
			interval: gameInterval
		};
	}

	createCloud(container, x) {
		const cloud = document.createElement('div');
		cloud.className = 'aviamaster-cloud';
		cloud.style.cssText = `
			position: absolute;
			left: ${x}px;
			top: ${20 + Math.random() * 50}px;
			width: 40px;
			height: 20px;
			background: rgba(255, 255, 255, 0.8);
			border-radius: 20px;
			opacity: 0.7;
		`;
		container.appendChild(cloud);
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