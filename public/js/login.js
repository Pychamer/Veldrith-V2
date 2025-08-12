// Login System for Veldrith
class LoginSystem {
	constructor() {
		this.adminCredentials = {
			username: 'Admin-Ranch',
			password: 'yBdqe2ah'
		};
		
		this.init();
	}
	
	init() {
		this.form = document.getElementById('loginForm');
		this.errorMessage = document.getElementById('errorMessage');
		
		if (this.form) {
			this.form.addEventListener('submit', (e) => this.handleLogin(e));
		}
		
		// Check if user is already logged in
		this.checkAuthStatus();
		
		// Initialize demo user if none exist
		this.initializeDemoUser();
	}
	
	handleLogin(e) {
		e.preventDefault();
		
		const username = document.getElementById('username').value.trim();
		const password = document.getElementById('password').value;
		
		if (!username || !password) {
			this.showError('Please fill in all fields');
			return;
		}
		
		// Check admin credentials
		if (username === this.adminCredentials.username && password === this.adminCredentials.password) {
			this.loginUser('admin', username);
		} else {
			// Check if it's a valid user account
			this.checkUserCredentials(username, password);
		}
	}
	
	async checkUserCredentials(username, password) {
		try {
			// Call server API to validate credentials
			const response = await fetch('/api/auth/login', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ username, password })
			});

			const result = await response.json();

			if (result.success) {
				this.loginUser('user', username);
			} else {
				this.showError(result.error);
			}
		} catch (error) {
			console.error('Error checking user credentials:', error);
			this.showError('Error connecting to server. Please try again.');
		}
	}
	

	
	loginUser(type, username) {
		// Check if user is already logged in elsewhere
		const activeSessions = localStorage.getItem('veldrith_active_sessions') || '{}';
		const sessions = JSON.parse(activeSessions);
		
		if (sessions[username]) {
			// User is already logged in, invalidate old session
			const oldSession = sessions[username];
			const oldSessionTime = new Date(oldSession.loginTime);
			const now = new Date();
			const hoursDiff = (now - oldSessionTime) / (1000 * 60 * 60);
			
			// If old session is less than 1 hour old, prevent new login
			if (hoursDiff < 1) {
				this.showError('This account is already in use. Please wait 1 hour or contact admin.');
				return;
			}
		}
		
		// Store login session
		const session = {
			type: type,
			username: username,
			loginTime: new Date().toISOString(),
			token: this.generateToken()
		};
		
		localStorage.setItem('veldrith_session', JSON.stringify(session));
		
		// Update active sessions
		sessions[username] = session;
		localStorage.setItem('veldrith_active_sessions', JSON.stringify(sessions));
		
		// Redirect based on user type
		if (type === 'admin') {
			window.location.href = '/&'; // Admin goes to proxy page
		} else {
			window.location.href = '/&'; // Regular users also go to proxy page
		}
	}
	
	generateToken() {
		return 'veldrith_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
	}
	
	checkAuthStatus() {
		const session = localStorage.getItem('veldrith_session');
		if (session) {
			try {
				const sessionData = JSON.parse(session);
				// Check if session is still valid (24 hours)
				const loginTime = new Date(sessionData.loginTime);
				const now = new Date();
				const hoursDiff = (now - loginTime) / (1000 * 60 * 60);
				
				if (hoursDiff < 24) {
					// Redirect to appropriate page
					if (sessionData.type === 'admin') {
						window.location.href = '/~';
					} else {
						window.location.href = '/';
					}
				} else {
					// Session expired, clear it
					localStorage.removeItem('veldrith_session');
				}
			} catch (error) {
				console.error('Error parsing session:', error);
				localStorage.removeItem('veldrith_session');
			}
		}
	}
	
	showError(message) {
		this.errorMessage.textContent = message;
		this.errorMessage.classList.remove('hidden');
		
		// Auto-hide after 5 seconds
		setTimeout(() => {
			this.errorMessage.classList.add('hidden');
		}, 5000);
	}
	

}

// Initialize login system when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
	new LoginSystem();
});

// Add some visual feedback for form interactions
document.addEventListener('DOMContentLoaded', () => {
	const inputs = document.querySelectorAll('.input-group input');
	
	inputs.forEach(input => {
		input.addEventListener('focus', () => {
			input.parentElement.classList.add('focused');
		});
		
		input.addEventListener('blur', () => {
			input.parentElement.classList.remove('focused');
		});
	});
});