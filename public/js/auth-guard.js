// Authentication Guard for Veldrith
class AuthGuard {
	constructor() {
		this.init();
	}
	
	init() {
		this.checkAuth();
	}
	
	checkAuth() {
		const session = localStorage.getItem('veldrith_session');
		
		if (!session) {
			// No session, redirect to login
			this.redirectToLogin();
			return;
		}
		
		try {
			const sessionData = JSON.parse(session);
			
			// Check if session is expired (24 hours)
			const loginTime = new Date(sessionData.loginTime);
			const now = new Date();
			const hoursDiff = (now - loginTime) / (1000 * 60 * 60);
			
			if (hoursDiff >= 24) {
				// Session expired, clear it and redirect
				localStorage.removeItem('veldrith_session');
				this.redirectToLogin();
				return;
			}
			
			// Session is valid, show user info
			this.showUserInfo(sessionData);
			
		} catch (error) {
			console.error('Error parsing session:', error);
			localStorage.removeItem('veldrith_session');
			this.redirectToLogin();
		}
	}
	
	redirectToLogin() {
		// Only redirect if we're on a protected page
		if (window.location.pathname === '/~' || window.location.pathname === '/~.html') {
			window.location.href = '/login.html';
		}
	}
	
	showUserInfo(sessionData) {
		// Add logout button to the settings page
		this.addLogoutButton(sessionData);
	}
	
	addLogoutButton(sessionData) {
		// Find the navigation area to add logout button
		const nav = document.querySelector('.sideSnav');
		if (!nav) return;
		
		// Check if logout button already exists
		if (document.getElementById('logoutBtn')) return;
		
		// Create logout section
		const logoutSection = document.createElement('div');
		logoutSection.style.marginTop = '40px';
		logoutSection.style.paddingTop = '20px';
		logoutSection.style.borderTop = '1px solid rgba(255, 255, 255, 0.2)';
		
		// User info
		const userInfo = document.createElement('div');
		userInfo.style.marginBottom = '15px';
		userInfo.style.color = '#4a7c59';
		userInfo.style.fontSize = '14px';
		userInfo.innerHTML = `
			<div style="margin-bottom: 5px;">
				<strong>Logged in as:</strong> ${sessionData.username}
			</div>
			<div style="font-size: 12px; color: #ccc;">
				${sessionData.type === 'admin' ? 'Administrator' : 'User'}
			</div>
		`;
		
		// Logout button
		const logoutBtn = document.createElement('button');
		logoutBtn.id = 'logoutBtn';
		logoutBtn.innerHTML = `
			<span class="material-symbols-outlined" style="margin-right: 8px;">logout</span>
			Logout
		`;
		logoutBtn.style.cssText = `
			background: #d32f2f;
			color: white;
			border: none;
			padding: 10px 16px;
			border-radius: 8px;
			cursor: pointer;
			font-size: 14px;
			display: flex;
			align-items: center;
			transition: all 0.3s ease;
			width: 100%;
			justify-content: center;
		`;
		
		logoutBtn.addEventListener('mouseenter', () => {
			logoutBtn.style.background = '#f44336';
		});
		
		logoutBtn.addEventListener('mouseleave', () => {
			logoutBtn.style.background = '#d32f2f';
		});
		
		logoutBtn.addEventListener('click', () => this.logout());
		
		// Add to navigation
		logoutSection.appendChild(userInfo);
		logoutSection.appendChild(logoutBtn);
		nav.appendChild(logoutSection);
	}
	
	logout() {
		if (confirm('Are you sure you want to logout?')) {
			// Get current session
			const session = localStorage.getItem('veldrith_session');
			if (session) {
				try {
					const sessionData = JSON.parse(session);
					fetch('/api/auth/logout', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ username: sessionData.username, token: sessionData.token })
					}).finally(() => {
						localStorage.removeItem('veldrith_session');
						window.location.href = '/login.html';
					});
				} catch (error) {
					console.error('Error during logout:', error);
					localStorage.removeItem('veldrith_session');
					window.location.href = '/login.html';
				}
			} else {
				window.location.href = '/login.html';
			}
		}
	}

	// Global logout function for other pages
	globalLogout() {
		this.logout();
	}
}

// Initialize auth guard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
	const authGuard = new AuthGuard();
	
	// Make logout function globally available
	window.logout = () => authGuard.logout();
});