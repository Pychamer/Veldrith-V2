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
		
		if (result.valid) {
			res.json({ success: true, user: result.user });
		} else {
			res.status(401).json({ success: false, error: result.error });
		}
	} catch (error) {
		console.error('Error authenticating user:', error);
		res.status(500).json({ success: false, error: 'Internal server error' });
	}
});

router.get('/password', (req, res) => {
	res.sendFile(path.join(__dirname, 'public/password.html'));
});

router.use((req, res, next) => {
	res.status(404).sendFile(path.join(__dirname, 'public/err.html'));
});

export default router;
