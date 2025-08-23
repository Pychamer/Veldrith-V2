// Search Tracker for Veldrith
class SearchTracker {
	constructor() {
		this.init();
	}
	
	init() {
		this.trackSearchBar();
		this.trackURLInputs();
	}
	
	trackSearchBar() {
		// Track main search bar
		const searchInput = document.querySelector('.search-header__input');
		if (searchInput) {
			searchInput.addEventListener('keydown', (e) => {
				if (e.key === 'Enter') {
					this.recordSearch(searchInput.value.trim());
				}
			});
		}
	}
	
	trackURLInputs() {
		// Track URL inputs in various forms
		const urlInputs = document.querySelectorAll('input[type="url"], input[placeholder*="url"], input[placeholder*="URL"], input[name*="url"], input[name*="URL"]');
		urlInputs.forEach(input => {
			input.addEventListener('keydown', (e) => {
				if (e.key === 'Enter') {
					this.recordSearch(input.value.trim());
				}
			});
		});
	}
	
	recordSearch(query) {
		if (!query) return;
		
		const session = localStorage.getItem('veldrith_session');
		if (!session) return;
		
		try {
			const sessionData = JSON.parse(session);
			const username = sessionData.username;
			
			if (!username) return;
			
			// Send to server for global logging
			fetch('/api/searches', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username, token: sessionData.token, query, timestamp: new Date().toISOString() })
			}).catch(() => {});
			
			// Also keep lightweight local cache for quick UI filtering
			try {
				const searchEntry = { username, query, timestamp: new Date().toISOString() };
				const existingHistory = localStorage.getItem('veldrith_search_history') || '[]';
				const history = JSON.parse(existingHistory);
				history.push(searchEntry);
				if (history.length > 500) history.splice(0, history.length - 500);
				localStorage.setItem('veldrith_search_history', JSON.stringify(history));
			} catch {}
			
			console.log('Search tracked for', username);
		} catch (error) {
			console.error('Error recording search:', error);
		}
	}
}

// Initialize search tracker when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
	new SearchTracker();
});