// Login System for Veldrith
class LoginSystem {
	constructor() {
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
		
		// Always validate with server (single-session enforcement)
		this.checkUserCredentials(username, password);
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

			if (response.ok && result.success) {
				const type = (result.user && result.user.type) || 'user';
				this.loginUser(type, username, result.session);
			} else {
				this.showError(result.error || 'Login failed');
			}
		} catch (error) {
			console.error('Error checking user credentials:', error);
			this.showError('Error connecting to server. Please try again.');
		}
	}
	
	
	
	loginUser(type, username, serverSession) {
		// Use server-provided session when available
		const session = serverSession || {
			username,
			token: this.generateToken(),
			loginTime: new Date().toISOString(),
			lastSeen: new Date().toISOString(),
			type
		};

		localStorage.setItem('veldrith_session', JSON.stringify(session));
		
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
					// Redirect to proxy page
					window.location.href = '/&';
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

	// No-op demo initializer to avoid runtime errors; server manages users
	initializeDemoUser() {}
	
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