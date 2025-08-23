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

			// Verify with server that session is active
			this.verifyAndHeartbeat(sessionData);
			
		} catch (error) {
			console.error('Error parsing session:', error);
			// Invalid session, redirect to login
			localStorage.removeItem('veldrith_session');
			this.redirectToLogin();
		}
	}

	async verifyAndHeartbeat(sessionData) {
		try {
			const resp = await fetch('/api/auth/heartbeat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username: sessionData.username, token: sessionData.token })
			});
			const result = await resp.json();
			if (!resp.ok || !result.success) {
				// Session invalid or taken elsewhere
				localStorage.removeItem('veldrith_session');
				this.redirectToLogin();
				return;
			}
			this.showUserInfo(sessionData);
			this.startHeartbeat(sessionData);
		} catch (e) {
			console.error('Heartbeat failed:', e);
		}
	}

	startHeartbeat(sessionData) {
		if (this._hb) clearInterval(this._hb);
		this._hb = setInterval(async () => {
			try {
				await fetch('/api/auth/heartbeat', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ username: sessionData.username, token: sessionData.token })
				});
			} catch {}
		}, 60000);
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
		// Welcome badge placement fix: attach to body top-right unobtrusively
		let badge = document.querySelector('.user-welcome');
		if (!badge) {
			badge = document.createElement('div');
			badge.className = 'user-welcome';
			document.body.appendChild(badge);
		}
		badge.textContent = `Welcome, ${sessionData.username}`;
		badge.style.cssText = 'position: fixed; top: 12px; right: 16px; background: rgba(74,124,89,0.9); color: #fff; padding: 6px 12px; border-radius: 14px; font-size: 12px; z-index: 2147483647; backdrop-filter: blur(8px);';
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

// Provide a global logout fallback if auth-guard is not loaded
if (typeof window !== 'undefined' && typeof window.logout !== 'function') {
	window.logout = async function () {
		try {
			const session = localStorage.getItem('veldrith_session');
			if (session) {
				const { username, token } = JSON.parse(session);
				await fetch('/api/auth/logout', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ username, token })
				});
			}
		} catch (e) {}
		localStorage.removeItem('veldrith_session');
		window.location.href = '/login.html';
	};
}