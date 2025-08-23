import fs from 'fs';
import path from 'path';

class UserManager {
	constructor() {
		this.usersFile = path.join(process.cwd(), 'data', 'users.json');
		this.sessionsFile = path.join(process.cwd(), 'data', 'sessions.json');
		this.searchesFile = path.join(process.cwd(), 'data', 'searches.json');
		this.ensureDataDirectory();
		this.loadUsers();
		this.loadSessions();
		this.loadSearches();
	}

	ensureDataDirectory() {
		const dataDir = path.dirname(this.usersFile);
		if (!fs.existsSync(dataDir)) {
			fs.mkdirSync(dataDir, { recursive: true });
		}
	}

	loadUsers() {
		try {
			if (fs.existsSync(this.usersFile)) {
				const data = fs.readFileSync(this.usersFile, 'utf8');
				this.users = JSON.parse(data);
			} else {
				this.users = [];
				// Create default admin user
				this.users.push({
					username: 'Admin-Ranch',
					password: 'yBdqe2ah',
					type: 'admin',
					createdAt: new Date().toISOString(),
					expiresAt: null // Admin never expires
				});
				this.saveUsers();
			}
		} catch (error) {
			console.error('Error loading users:', error);
			this.users = [];
		}
	}

	saveUsers() {
		try {
			fs.writeFileSync(this.usersFile, JSON.stringify(this.users, null, 2));
		} catch (error) {
			console.error('Error saving users:', error);
		}
	}

	// Session management
	loadSessions() {
		try {
			if (fs.existsSync(this.sessionsFile)) {
				const data = fs.readFileSync(this.sessionsFile, 'utf8');
				this.activeSessions = JSON.parse(data);
			} else {
				this.activeSessions = {};
				this.saveSessions();
			}
		} catch (error) {
			console.error('Error loading sessions:', error);
			this.activeSessions = {};
		}
	}

	saveSessions() {
		try {
			fs.writeFileSync(this.sessionsFile, JSON.stringify(this.activeSessions, null, 2));
		} catch (error) {
			console.error('Error saving sessions:', error);
		}
	}

	generateToken() {
		return 'tok_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
	}

	getUserType(username) {
		const user = this.users.find(u => u.username === username);
		return user ? user.type : 'user';
	}

	getNowIso() {
		return new Date().toISOString();
	}

	getSession(username) {
		return this.activeSessions[username];
	}

	// Consider a session inactive if no heartbeat in the last 5 minutes
	isSessionExpired(session) {
		if (!session) return true;
		const lastSeen = new Date(session.lastSeen || session.loginTime);
		const now = new Date();
		const diffMs = now - lastSeen;
		const fiveMinutesMs = 5 * 60 * 1000;
		return diffMs > fiveMinutesMs;
	}

	isSessionActive(username) {
		const session = this.getSession(username);
		return !!session && !this.isSessionExpired(session);
	}

	createSession(username) {
		const token = this.generateToken();
		this.activeSessions[username] = {
			username,
			token,
			loginTime: this.getNowIso(),
			lastSeen: this.getNowIso(),
			type: this.getUserType(username)
		};
		this.saveSessions();
		return this.activeSessions[username];
	}

	isValidSession(username, token) {
		const session = this.getSession(username);
		if (!session) return false;
		if (this.isSessionExpired(session)) return false;
		return session.token === token;
	}

	heartbeat(username, token) {
		const session = this.getSession(username);
		if (!session) return { success: false, error: 'No active session' };
		if (session.token !== token) return { success: false, error: 'Invalid token' };
		if (this.isSessionExpired(session)) return { success: false, error: 'Session expired' };
		this.activeSessions[username].lastSeen = this.getNowIso();
		this.saveSessions();
		return { success: true };
	}

	clearSession(username) {
		if (this.activeSessions[username]) {
			delete this.activeSessions[username];
			this.saveSessions();
			return { success: true };
		}
		return { success: false, error: 'No active session' };
	}

	getActiveSessions() {
		// Clean up expired sessions first
		for (const [user, session] of Object.entries(this.activeSessions)) {
			if (this.isSessionExpired(session)) delete this.activeSessions[user];
		}
		this.saveSessions();
		return Object.entries(this.activeSessions).map(([username, session]) => ({
			username,
			loginTime: session.loginTime,
			lastSeen: session.lastSeen,
			type: session.type
		}));
	}

	// Search history management
	loadSearches() {
		try {
			if (fs.existsSync(this.searchesFile)) {
				const data = fs.readFileSync(this.searchesFile, 'utf8');
				this.searches = JSON.parse(data);
			} else {
				this.searches = [];
				this.saveSearches();
			}
		} catch (error) {
			console.error('Error loading searches:', error);
			this.searches = [];
		}
	}

	saveSearches() {
		try {
			fs.writeFileSync(this.searchesFile, JSON.stringify(this.searches, null, 2));
		} catch (error) {
			console.error('Error saving searches:', error);
		}
	}

	addSearch(username, query, timestamp) {
		const entry = {
			username,
			query,
			timestamp: timestamp || this.getNowIso()
		};
		this.searches.push(entry);
		// Keep last 5000 entries
		if (this.searches.length > 5000) {
			this.searches.splice(0, this.searches.length - 5000);
		}
		this.saveSearches();
		return { success: true };
	}

	getSearches() {
		return this.searches;
	}

	createUser(username, expirationDays) {
		// Check if user already exists
		if (this.users.find(u => u.username === username)) {
			return { success: false, error: 'Username already exists' };
		}

		// Generate random 4-digit password
		const password = Math.floor(1000 + Math.random() * 9000).toString();
		
		// Calculate expiration date
		const expiresAt = new Date();
		expiresAt.setDate(expiresAt.getDate() + expirationDays);

		const newUser = {
			username,
			password,
			type: 'user',
			createdAt: new Date().toISOString(),
			expiresAt: expiresAt.toISOString()
		};

		this.users.push(newUser);
		this.saveUsers();

		return {
			success: true,
			user: {
				username: newUser.username,
				password: newUser.password,
				expiresAt: newUser.expiresAt
			}
		};
	}

	deleteUser(username) {
		const index = this.users.findIndex(u => u.username === username);
		if (index !== -1) {
			this.users.splice(index, 1);
			this.saveUsers();
			return { success: true };
		}
		return { success: false, error: 'User not found' };
	}

	getAllUsers() {
		return this.users.map(user => ({
			username: user.username,
			type: user.type,
			createdAt: user.createdAt,
			expiresAt: user.expiresAt,
			isExpired: user.expiresAt ? new Date(user.expiresAt) < new Date() : false
		}));
	}

	validateUser(username, password) {
		const user = this.users.find(u => u.username === username);
		
		if (!user) {
			return { valid: false, error: 'User not found' };
		}

		if (user.password !== password) {
			return { valid: false, error: 'Invalid password' };
		}

		// Check if user is expired
		if (user.expiresAt && new Date(user.expiresAt) < new Date()) {
			return { valid: false, error: 'User account has expired' };
		}

		return { 
			valid: true, 
			user: {
				username: user.username,
				type: user.type,
				expiresAt: user.expiresAt
			}
		};
	}

	cleanupExpiredUsers() {
		const now = new Date();
		const beforeCount = this.users.length;
		
		this.users = this.users.filter(user => {
			if (user.type === 'admin') return true; // Never expire admin
			if (!user.expiresAt) return true; // No expiration set
			return new Date(user.expiresAt) > now;
		});

		const afterCount = this.users.length;
		if (beforeCount !== afterCount) {
			this.saveUsers();
			console.log(`Cleaned up ${beforeCount - afterCount} expired users`);
		}
	}
}

export default UserManager;