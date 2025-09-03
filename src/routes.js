import express from 'express';
import path from 'path';
import rateLimit from 'express-rate-limit';
import UserManager from './user-manager.js';
const router = express.Router();

let __dirname = process.cwd();


const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 25000, 
});

router.use(limiter);

router.get('/', (req, res) => {
	res.sendFile(path.join(__dirname, 'public/index.html'));
});

router.get('/&', (req, res) => {
	res.sendFile(path.join(__dirname, 'public/&.html'));
});

router.get('/~', (req, res) => {
	res.sendFile(path.join(__dirname, 'public/~.html'));
});

router.get('/g', (req, res) => {
	res.sendFile(path.join(__dirname, 'public/g.html'));
});

router.get('/a', (req, res) => {
	res.sendFile(path.join(__dirname, 'public/a.html'));
});

router.get('/err', (req, res) => {
	res.sendFile(path.join(__dirname, 'public/err.html'));
});

router.get('/500', (req, res) => {
	res.sendFile(path.join(__dirname, 'public/500.html'));
});

router.get('/a', (req, res) => {
	res.sendFile(path.join(__dirname, 'public/a.html'));
});
router.get('/g', (req, res) => {
	res.sendFile(path.join(__dirname, 'public/g.html'));
});

router.get('/a', (req, res) => {
	res.sendFile(path.join(__dirname, 'public/a.html'));
});

// Initialize user manager
const userManager = new UserManager();

// Clean up expired users periodically
setInterval(() => {
	userManager.cleanupExpiredUsers();
}, 60000); // Check every minute

// API endpoints for user management
router.post('/api/users/create', (req, res) => {
	try {
		const { username, expirationDays } = req.body;
		
		if (!username || !expirationDays) {
			return res.status(400).json({ success: false, error: 'Missing username or expiration days' });
		}

		const result = userManager.createUser(username, parseInt(expirationDays));
		
		if (result.success) {
			res.json(result);
		} else {
			res.status(400).json(result);
		}
	} catch (error) {
		console.error('Error creating user:', error);
		res.status(500).json({ success: false, error: 'Internal server error' });
	}
});

router.get('/api/users', (req, res) => {
	try {
		const users = userManager.getAllUsers();
		res.json({ success: true, users });
	} catch (error) {
		console.error('Error getting users:', error);
		res.status(500).json({ success: false, error: 'Internal server error' });
	}
});

router.delete('/api/users/:username', (req, res) => {
	try {
		const { username } = req.params;
		const result = userManager.deleteUser(username);
		
		if (result.success) {
			res.json(result);
		} else {
			res.status(404).json(result);
		}
	} catch (error) {
		console.error('Error deleting user:', error);
		res.status(500).json({ success: false, error: 'Internal server error' });
	}
});

router.post('/api/auth/login', (req, res) => {
	try {
		const { username, password } = req.body;
		
		if (!username || !password) {
			return res.status(400).json({ success: false, error: 'Missing username or password' });
		}

		const result = userManager.validateUser(username, password);
		
		if (!result.valid) {
			return res.status(401).json({ success: false, error: result.error });
		}

		// Enforce single active session per username
		if (userManager.isSessionActive(username)) {
			return res.status(423).json({ success: false, error: 'Session currently in use' });
		}

		const session = userManager.createSession(username);
		return res.json({ success: true, user: result.user, session });
	} catch (error) {
		console.error('Error authenticating user:', error);
		res.status(500).json({ success: false, error: 'Internal server error' });
	}
});

// Session heartbeat to keep session active and verify token
router.post('/api/auth/heartbeat', (req, res) => {
	try {
		const { username, token } = req.body;
		if (!username || !token) {
			return res.status(400).json({ success: false, error: 'Missing username or token' });
		}
		const result = userManager.heartbeat(username, token);
		if (!result.success) {
			return res.status(401).json(result);
		}
		return res.json({ success: true });
	} catch (error) {
		console.error('Error in heartbeat:', error);
		res.status(500).json({ success: false, error: 'Internal server error' });
	}
});

// Logout endpoint to clear active session
router.post('/api/auth/logout', (req, res) => {
	try {
		const { username, token } = req.body;
		if (!username || !token) {
			return res.status(400).json({ success: false, error: 'Missing username or token' });
		}
		if (!userManager.isValidSession(username, token)) {
			return res.status(401).json({ success: false, error: 'Invalid session' });
		}
		userManager.clearSession(username);
		return res.json({ success: true });
	} catch (error) {
		console.error('Error in logout:', error);
		res.status(500).json({ success: false, error: 'Internal server error' });
	}
});

// Admin: get active sessions
router.get('/api/sessions', (req, res) => {
	try {
		const sessions = userManager.getActiveSessions();
		return res.json({ success: true, sessions });
	} catch (error) {
		console.error('Error getting sessions:', error);
		res.status(500).json({ success: false, error: 'Internal server error' });
	}
});

// Admin: force clear a user's session by username
router.delete('/api/sessions/:username', (req, res) => {
	try {
		const { username } = req.params;
		const result = userManager.clearSession(username);
		if (result.success) return res.json({ success: true });
		return res.status(404).json(result);
	} catch (error) {
		console.error('Error clearing session:', error);
		res.status(500).json({ success: false, error: 'Internal server error' });
	}
});

// Record a search query globally (server-side)
router.post('/api/searches', (req, res) => {
	try {
		const { username, token, query, timestamp } = req.body;
		if (!username || !token || !query) {
			return res.status(400).json({ success: false, error: 'Missing fields' });
		}
		if (!userManager.isValidSession(username, token)) {
			return res.status(401).json({ success: false, error: 'Invalid session' });
		}
		userManager.addSearch(username, query, timestamp);
		return res.json({ success: true });
	} catch (error) {
		console.error('Error recording search:', error);
		res.status(500).json({ success: false, error: 'Internal server error' });
	}
});

// Get global searches (admin view)
router.get('/api/searches', (req, res) => {
	try {
		const searches = userManager.getSearches();
		return res.json({ success: true, searches });
	} catch (error) {
		console.error('Error getting searches:', error);
		res.status(500).json({ success: false, error: 'Internal server error' });
	}
});

router.get('/password', (req, res) => {
	res.sendFile(path.join(__dirname, 'public/password.html'));
});

router.get('/gambling', (req, res) => {
	res.sendFile(path.join(__dirname, 'public/gambling.html'));
});

// Gambling API endpoints
router.post('/api/gambling/bet', (req, res) => {
	try {
		const { username, token, gameType, betAmount, gameData } = req.body;
		
		if (!username || !token || !gameType || !betAmount) {
			return res.status(400).json({ success: false, error: 'Missing required fields' });
		}

		if (!userManager.isValidSession(username, token)) {
			return res.status(401).json({ success: false, error: 'Invalid session' });
		}

		// Get user and check credits
		const user = userManager.getUser(username);
		if (!user) {
			return res.status(404).json({ success: false, error: 'User not found' });
		}

		// Calculate remaining days as credits
		const now = new Date();
		const expiration = new Date(user.expirationDate);
		const currentCredits = Math.max(0, Math.ceil((expiration - now) / (1000 * 60 * 60 * 24)));

		if (betAmount > currentCredits) {
			return res.status(400).json({ success: false, error: 'Insufficient credits' });
		}

		// Process game result (simplified - in real implementation, you'd have proper game logic)
		const gameResult = processGameResult(gameType, betAmount, gameData);
		
		// Update user's expiration date based on winnings/losses
		const creditChange = gameResult.winnings - betAmount;
		const newExpiration = new Date(expiration.getTime() + (creditChange * 24 * 60 * 60 * 1000));
		
		userManager.updateUserExpiration(username, newExpiration);

		res.json({
			success: true,
			result: gameResult,
			newCredits: Math.max(0, Math.ceil((newExpiration - now) / (1000 * 60 * 60 * 24)))
		});

	} catch (error) {
		console.error('Error processing gambling bet:', error);
		res.status(500).json({ success: false, error: 'Internal server error' });
	}
});

// Helper function to process game results
function processGameResult(gameType, betAmount, gameData) {
	// This is a simplified version - in a real implementation, you'd have proper game logic
	// For now, we'll simulate some basic results
	
	switch (gameType) {
		case 'mines':
			return processMinesResult(betAmount, gameData);
		case 'crash':
			return processCrashResult(betAmount, gameData);
		case 'blackjack':
			return processBlackjackResult(betAmount, gameData);
		case 'tower':
			return processTowerResult(betAmount, gameData);
		case 'plinko':
			return processPlinkoResult(betAmount, gameData);
		case 'aviamaster':
			return processAviamasterResult(betAmount, gameData);
		default:
			return { winnings: 0, multiplier: 0 };
	}
}

function processMinesResult(betAmount, gameData) {
	const { safeTiles, bombs } = gameData;
	const multiplier = Math.pow(1 + (bombs * 0.1), safeTiles);
	return { winnings: Math.floor(betAmount * multiplier), multiplier };
}

function processCrashResult(betAmount, gameData) {
	const { cashoutMultiplier } = gameData;
	return { winnings: Math.floor(betAmount * cashoutMultiplier), multiplier: cashoutMultiplier };
}

function processBlackjackResult(betAmount, gameData) {
	const { playerTotal, dealerTotal, isBlackjack } = gameData;
	
	if (playerTotal > 21) return { winnings: 0, multiplier: 0 };
	if (dealerTotal > 21) return { winnings: betAmount * 2, multiplier: 2 };
	if (isBlackjack) return { winnings: Math.floor(betAmount * 2.5), multiplier: 2.5 };
	if (playerTotal > dealerTotal) return { winnings: betAmount * 2, multiplier: 2 };
	if (playerTotal === dealerTotal) return { winnings: betAmount, multiplier: 1 };
	return { winnings: 0, multiplier: 0 };
}

function processTowerResult(betAmount, gameData) {
	const { level } = gameData;
	const multiplier = Math.pow(1.2, level);
	return { winnings: Math.floor(betAmount * multiplier), multiplier };
}

function processPlinkoResult(betAmount, gameData) {
	const { multiplier } = gameData;
	return { winnings: Math.floor(betAmount * multiplier), multiplier };
}

function processAviamasterResult(betAmount, gameData) {
	const { cashoutMultiplier } = gameData;
	return { winnings: Math.floor(betAmount * cashoutMultiplier), multiplier: cashoutMultiplier };
}

router.use((req, res, next) => {
	res.status(404).sendFile(path.join(__dirname, 'public/err.html'));
});

export default router;
