// Route Guard for Veldrith - Protects all proxy pages
class RouteGuard {
	constructor() {
		this.init();
	}

	init() {
		// Check authentication immediately when page loads
		this.checkAuth();
		
		// Also check when the page becomes visible (in case user navigates back)
		document.addEventListener('visibilitychange', () => {
			if (!document.hidden) {
				this.checkAuth();
			}
		});
	}

	checkAuth() {
		// Get current session
		const session = localStorage.getItem('veldrith_session');
		
		if (!session) {
			// No session found, redirect to login
			this.redirectToLogin();
			return;
		}

		try {
			const sessionData = JSON.parse(session);
			
			// Check if session is expired (24 hours)
			const loginTime = new Date(sessionData.loginTime);
			const now = new Date();
			const hoursDiff = (now - loginTime) / (1000 * 60 * 60);
			
			if (hoursDiff > 24) {
				// Session expired, clear it and redirect to login
				localStorage.removeItem('veldrith_session');
				this.redirectToLogin();
				return;
			}

			// Session is valid, allow access
			this.showUserInfo(sessionData);
			
		} catch (error) {
			console.error('Error parsing session:', error);
			// Invalid session, redirect to login
			localStorage.removeItem('veldrith_session');
			this.redirectToLogin();
		}
	}

	redirectToLogin() {
		// Redirect to login page
		window.location.href = '/login.html';
	}

	showUserInfo(sessionData) {
		// Show user info if there's a user display element
		const userDisplay = document.querySelector('.user-info') || document.querySelector('.current-user');
		if (userDisplay) {
			userDisplay.textContent = `Welcome, ${sessionData.username}`;
		}
		
		// Add user info to the page header if it exists
		const header = document.querySelector('.header');
		if (header && !document.querySelector('.user-welcome')) {
			const userWelcome = document.createElement('div');
			userWelcome.className = 'user-welcome';
			userWelcome.style.cssText = 'position: absolute; top: 20px; right: 20px; background: rgba(74, 124, 89, 0.9); color: white; padding: 8px 16px; border-radius: 20px; font-size: 14px; backdrop-filter: blur(10px);';
			userWelcome.textContent = `Welcome, ${sessionData.username}`;
			header.appendChild(userWelcome);
		}
	}
}

// Initialize route guard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
	new RouteGuard();
});

// Also check auth immediately for faster response
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', () => {
		new RouteGuard();
	});
} else {
	new RouteGuard();
}