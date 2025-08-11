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
			
			// Create search entry
			const searchEntry = {
				username: username,
				query: query,
				timestamp: new Date().toISOString()
			};
			
			// Get existing search history
			const existingHistory = localStorage.getItem('veldrith_search_history') || '[]';
			const history = JSON.parse(existingHistory);
			
			// Add new entry
			history.push(searchEntry);
			
			// Keep only last 1000 searches to prevent localStorage from getting too large
			if (history.length > 1000) {
				history.splice(0, history.length - 1000);
			}
			
			// Save back to localStorage
			localStorage.setItem('veldrith_search_history', JSON.stringify(history));
			
			console.log('Search tracked:', searchEntry);
		} catch (error) {
			console.error('Error recording search:', error);
		}
	}
}

// Initialize search tracker when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
	new SearchTracker();
});