// Admin Plugin for Veldrith
class AdminPlugin {
	constructor() {
		this.init();
	}
	
	init() {
		this.checkAdminStatus();
		this.bindEvents();
		this.loadUsers();
	}
	
	checkAdminStatus() {
		const session = localStorage.getItem('veldrith_session');
		if (session) {
			try {
				const sessionData = JSON.parse(session);
				if (sessionData.type === 'admin' && sessionData.username === 'Admin-Ranch') {
					this.showAdminPlugin();
				} else {
					this.hideAdminPlugin();
				}
			} catch (error) {
				console.error('Error parsing session:', error);
				this.hideAdminPlugin();
			}
		} else {
			this.hideAdminPlugin();
		}
	}
	
	showAdminPlugin() {
		const adminPlugin = document.getElementById('adminPlugin');
		const regularPlugin = document.getElementById('regularPlugin');
		
		if (adminPlugin && regularPlugin) {
			adminPlugin.style.display = 'block';
			regularPlugin.style.display = 'none';
		}
	}
	
	hideAdminPlugin() {
		const adminPlugin = document.getElementById('adminPlugin');
		const regularPlugin = document.getElementById('regularPlugin');
		
		if (adminPlugin && regularPlugin) {
			adminPlugin.style.display = 'none';
			regularPlugin.style.display = 'block';
		}
	}
	
	bindEvents() {
		const generateBtn = document.getElementById('generateUser');
		const copyBtn = document.getElementById('copyCredentials');
		
		if (generateBtn) {
			generateBtn.addEventListener('click', () => this.generateUser());
		}
		
		if (copyBtn) {
			copyBtn.addEventListener('click', () => this.copyCredentials());
		}
	}
	
	generateUser() {
		const username = document.getElementById('newUsername').value.trim();
		const expirationDays = parseInt(document.getElementById('expirationDays').value) || 30;
		
		if (!username) {
			alert('Please enter a username');
			return;
		}
		
		if (expirationDays < 1 || expirationDays > 365) {
			alert('Expiration days must be between 1 and 365');
			return;
		}
		
		// Generate 4-digit password
		const password = this.generatePassword();
		
		// Calculate expiration date
		const expirationDate = new Date();
		expirationDate.setDate(expirationDate.getDate() + expirationDays);
		
		// Create user object
		const user = {
			username: username,
			password: password,
			expirationDate: expirationDate.toISOString(),
			createdAt: new Date().toISOString(),
			createdBy: 'Admin-Ranch'
		};
		
		// Save user
		this.saveUser(user);
		
		// Display generated credentials
		this.displayCredentials(username, password, expirationDate);
		
		// Clear form
		document.getElementById('newUsername').value = '';
		document.getElementById('expirationDays').value = '';
		
		// Refresh users list
		this.loadUsers();
	}
	
	generatePassword() {
		// Generate a random 4-digit number
		return Math.floor(1000 + Math.random() * 9000).toString();
	}
	
	displayCredentials(username, password, expirationDate) {
		const credentialsDisplay = document.getElementById('generatedCredentials');
		const genUsername = document.getElementById('genUsername');
		const genPassword = document.getElementById('genPassword');
		const genExpiry = document.getElementById('genExpiry');
		
		if (credentialsDisplay && genUsername && genPassword && genExpiry) {
			genUsername.textContent = username;
			genPassword.textContent = password;
			genExpiry.textContent = expirationDate.toLocaleDateString();
			
			credentialsDisplay.classList.remove('hidden');
		}
	}
	
	copyCredentials() {
		const username = document.getElementById('genUsername').textContent;
		const password = document.getElementById('genPassword').textContent;
		const expiry = document.getElementById('genExpiry').textContent;
		
		const credentials = `Username: ${username}\nPassword: ${password}\nExpires: ${expiry}`;
		
		navigator.clipboard.writeText(credentials).then(() => {
			// Show success feedback
			const copyBtn = document.getElementById('copyCredentials');
			const originalText = copyBtn.innerHTML;
			
			copyBtn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
			copyBtn.style.background = '#4caf50';
			
			setTimeout(() => {
				copyBtn.innerHTML = originalText;
				copyBtn.style.background = '#6b8e23';
			}, 2000);
		}).catch(err => {
			console.error('Failed to copy credentials:', err);
			alert('Failed to copy credentials. Please copy manually.');
		});
	}
	
	async saveUser(user) {
		try {
			const users = await this.loadUsers();
			
			// Check if username already exists
			const existingUserIndex = users.findIndex(u => u.username === user.username);
			if (existingUserIndex !== -1) {
				// Update existing user
				users[existingUserIndex] = user;
			} else {
				// Add new user
				users.push(user);
			}
			
			localStorage.setItem('veldrith_users', JSON.stringify(users));
			console.log('User saved successfully:', user);
		} catch (error) {
			console.error('Error saving user:', error);
			alert('Error saving user. Please try again.');
		}
	}
	
	async loadUsers() {
		try {
			const usersData = localStorage.getItem('veldrith_users');
			const users = usersData ? JSON.parse(usersData) : [];
			
			// Filter out expired users
			const validUsers = users.filter(user => this.isUserValid(user));
			
			// Update display
			this.displayUsers(validUsers);
			
			return validUsers;
		} catch (error) {
			console.error('Error loading users:', error);
			return [];
		}
	}
	
	isUserValid(user) {
		if (!user.expirationDate) return false;
		
		const now = new Date();
		const expiration = new Date(user.expirationDate);
		
		return now <= expiration;
	}
	
	displayUsers(users) {
		const usersList = document.getElementById('usersList');
		if (!usersList) return;
		
		if (users.length === 0) {
			usersList.innerHTML = '<p style="color: #ccc; text-align: center;">No users found</p>';
			return;
		}
		
		usersList.innerHTML = users.map(user => `
			<div class="user-item">
				<div class="user-info">
					<div class="user-name">${user.username}</div>
					<div class="user-expiry">Expires: ${new Date(user.expirationDate).toLocaleDateString()}</div>
				</div>
				<div class="user-actions">
					<button class="delete-user" onclick="adminPlugin.deleteUser('${user.username}')">
						<i class="fa-solid fa-trash"></i>
					</button>
				</div>
			</div>
		`).join('');
	}
	
	deleteUser(username) {
		if (confirm(`Are you sure you want to delete user "${username}"?`)) {
			this.removeUser(username);
		}
	}
	
	async removeUser(username) {
		try {
			const users = await this.loadUsers();
			const filteredUsers = users.filter(user => user.username !== username);
			
			localStorage.setItem('veldrith_users', JSON.stringify(filteredUsers));
			
			// Refresh display
			this.loadUsers();
			
			console.log(`User "${username}" deleted successfully`);
		} catch (error) {
			console.error('Error deleting user:', error);
			alert('Error deleting user. Please try again.');
		}
	}
}

// Initialize admin plugin when DOM is loaded
let adminPlugin;
document.addEventListener('DOMContentLoaded', () => {
	adminPlugin = new AdminPlugin();
});