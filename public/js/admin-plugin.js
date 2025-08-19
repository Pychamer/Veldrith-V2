// Admin Plugin for Veldrith
class AdminPlugin {
	constructor() {
		this.init();
	}
	
	init() {
		this.checkAdminStatus();
		this.bindEvents();
		this.loadUsers();
		this.loadSearchHistory();
		this.populateUserFilter();
		this.loadActiveSessions();
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
		const userFilter = document.getElementById('userFilter');
		const searchFilter = document.getElementById('searchFilter');
		const refreshBtn = document.getElementById('refreshAll');
		
		if (generateBtn) {
			generateBtn.addEventListener('click', () => this.generateUser());
		}
		
		if (copyBtn) {
			copyBtn.addEventListener('click', () => this.copyCredentials());
		}
		
		if (userFilter) {
			userFilter.addEventListener('change', () => this.filterSearchHistory());
		}
		
		if (searchFilter) {
			searchFilter.addEventListener('input', () => this.filterSearchHistory());
		}
		
		if (refreshBtn) {
			refreshBtn.addEventListener('click', () => this.refreshAllData());
		}
	}
	
	async generateUser() {
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

		try {
			// Call server API to create user
			const response = await fetch('/api/users/create', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ username, expirationDays })
			});

			const result = await response.json();

			if (result.success) {
				// Display credentials
				const expirationDate = new Date(result.user.expiresAt);
				this.displayCredentials(username, result.user.password, expirationDate);
				
				// Clear form
				document.getElementById('newUsername').value = '';
				document.getElementById('expirationDays').value = '';
				
				// Refresh users list
				this.loadUsers();
			} else {
				alert('Error creating user: ' + result.error);
			}
		} catch (error) {
			console.error('Error creating user:', error);
			alert('Error creating user. Please try again.');
		}
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
	

	
	async loadUsers() {
		try {
			const response = await fetch('/api/users');
			const result = await response.json();
			
			if (result.success) {
				// Filter out expired users
				const validUsers = result.users.filter(user => !user.isExpired);
				
				// Update display
				this.displayUsers(validUsers);
				
				return validUsers;
			} else {
				console.error('Error loading users:', result.error);
				return [];
			}
		} catch (error) {
			console.error('Error loading users:', error);
			return [];
		}
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
					<div class="user-expiry">Expires: ${new Date(user.expiresAt).toLocaleDateString()}</div>
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
			const response = await fetch(`/api/users/${username}`, {
				method: 'DELETE'
			});
			
			const result = await response.json();
			
			if (result.success) {
				// Refresh display
				this.loadUsers();
				console.log(`User "${username}" deleted successfully`);
			} else {
				alert('Error deleting user: ' + result.error);
			}
		} catch (error) {
			console.error('Error deleting user:', error);
			alert('Error deleting user. Please try again.');
		}
	}
	
	async populateUserFilter() {
		const userFilter = document.getElementById('userFilter');
		if (!userFilter) return;
		
		// Clear existing options except "All Users"
		userFilter.innerHTML = '<option value="">All Users</option>';
		
		// Get all users and add them to the filter
		const users = await this.loadUsersSync();
		users.forEach(user => {
			const option = document.createElement('option');
			option.value = user.username;
			option.textContent = user.username;
			userFilter.appendChild(option);
		});
	}
	
	async loadUsersSync() {
		try {
			const response = await fetch('/api/users');
			const result = await response.json();
			
			if (result.success) {
				return result.users.filter(user => !user.isExpired);
			} else {
				console.error('Error loading users:', result.error);
				return [];
			}
		} catch (error) {
			console.error('Error loading users:', error);
			return [];
		}
	}
	
	async loadSearchHistory() {
		try {
			const response = await fetch('/api/searches');
			const result = await response.json();
			if (response.ok && result.success) {
				this.displaySearchHistory(result.searches || []);
			} else {
				// Fallback to local if server not available
				const local = localStorage.getItem('veldrith_search_history') || '[]';
				this.displaySearchHistory(JSON.parse(local));
			}
		} catch (error) {
			console.error('Error loading search history:', error);
			const local = localStorage.getItem('veldrith_search_history') || '[]';
			this.displaySearchHistory(JSON.parse(local));
		}
	}
	
	displaySearchHistory(history) {
		const searchHistoryList = document.getElementById('searchHistoryList');
		if (!searchHistoryList) return;
		
		if (history.length === 0) {
			searchHistoryList.innerHTML = '<p style="color: #ccc; text-align: center;">No search history found</p>';
			return;
		}
		
		// Sort by timestamp (newest first)
		const sortedHistory = history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
		
		searchHistoryList.innerHTML = sortedHistory.map(entry => `
			<div class="search-history-item">
				<div class="user-info">${entry.username}</div>
				<div class="search-query">${entry.query}</div>
				<div class="timestamp">${new Date(entry.timestamp).toLocaleString()}</div>
			</div>
		`).join('');
	}
	
	filterSearchHistory() {
		const userFilter = document.getElementById('userFilter');
		const searchFilter = document.getElementById('searchFilter');
		const selectedUser = userFilter ? userFilter.value : '';
		const searchTerm = searchFilter ? searchFilter.value.toLowerCase() : '';
		
		try {
			const searchHistory = localStorage.getItem('veldrith_search_history') || '[]';
			let history = JSON.parse(searchHistory);
			
			// Filter by user
			if (selectedUser) {
				history = history.filter(entry => entry.username === selectedUser);
			}
			
			// Filter by search term
			if (searchTerm) {
				history = history.filter(entry => 
					entry.query.toLowerCase().includes(searchTerm)
				);
			}
			
			this.displaySearchHistory(history);
		} catch (error) {
			console.error('Error filtering search history:', error);
		}
	}
	
	async loadActiveSessions() {
		try {
			const response = await fetch('/api/sessions');
			const result = await response.json();
			if (response.ok && result.success) {
				const sessions = {};
				(result.sessions || []).forEach(s => { sessions[s.username] = s; });
				this.displayActiveSessions(sessions);
			} else {
				this.displayActiveSessions({});
			}
		} catch (error) {
			console.error('Error loading active sessions:', error);
			this.displayActiveSessions({});
		}
	}
	
	displayActiveSessions(sessions) {
		const activeSessionsList = document.getElementById('activeSessionsList');
		if (!activeSessionsList) return;
		
		const sessionEntries = Object.entries(sessions);
		
		if (sessionEntries.length === 0) {
			activeSessionsList.innerHTML = '<p style="color: #ccc; text-align: center;">No active sessions</p>';
			return;
		}
		
		activeSessionsList.innerHTML = sessionEntries.map(([username, session]) => {
			const loginTime = new Date(session.loginTime);
			const now = new Date();
			const hoursDiff = ((now - loginTime) / (1000 * 60 * 60)).toFixed(1);
			
			return `
				<div class="active-session-item">
					<div class="user-info">${username}</div>
					<div class="session-time">${hoursDiff} hours ago</div>
					<div class="session-type">${session.type}</div>
					<button class="force-logout-btn" onclick="adminPlugin.forceLogout('${username}')">
						Force Logout
					</button>
				</div>
			`;
		}).join('');
	}
	
	forceLogout(username) {
		if (confirm(`Are you sure you want to force logout user "${username}"?`)) {
			try {
				fetch(`/api/sessions/${encodeURIComponent(username)}`, { method: 'DELETE' })
					.finally(() => this.loadActiveSessions());
				
				console.log(`User "${username}" force logged out successfully`);
			} catch (error) {
				console.error('Error force logging out user:', error);
				alert('Error force logging out user. Please try again.');
			}
		}
	}
	
	refreshAllData() {
		// Refresh all data displays
		this.loadUsers();
		this.loadSearchHistory();
		this.loadActiveSessions();
		this.populateUserFilter();
		
		// Show feedback
		const refreshBtn = document.getElementById('refreshAll');
		if (refreshBtn) {
			const originalText = refreshBtn.innerHTML;
			refreshBtn.innerHTML = '<i class="fa-solid fa-check"></i> Refreshed!';
			refreshBtn.style.background = '#4caf50';
			
			setTimeout(() => {
				refreshBtn.innerHTML = originalText;
				refreshBtn.style.background = 'linear-gradient(135deg, #4a7c59 0%, #6b8e23 100%)';
			}, 2000);
		}
	}
}

// Initialize admin plugin when DOM is loaded
let adminPlugin;
document.addEventListener('DOMContentLoaded', () => {
	adminPlugin = new AdminPlugin();
});