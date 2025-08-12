import fs from 'fs';
import path from 'path';

class UserManager {
	constructor() {
		this.usersFile = path.join(process.cwd(), 'data', 'users.json');
		this.ensureDataDirectory();
		this.loadUsers();
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