// To keep fast memory access
const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';
let lastHash = GENESIS_HASH;

// Determine the logs-microservice URL based on environment
const LOGS_SERVICE_URL = process.env.LOGS_SERVICE_URL || 'http://localhost:4000';

// Recupera el último hash desde otro microservicio
async function fetchLastHashFromMicroservice(url) {
	try {
		const res = await fetch(url);
		if (!res.ok) throw new Error('No se pudo recuperar el hash');
		const data = await res.json();
		// Asume que el hash viene en data.hash
		return data.hash || GENESIS_HASH;
	} catch (err) {
		console.error('Error fetching last hash:', err.message);
		return GENESIS_HASH;
	}
}

const hashCache = {
	// Recupera el último hash local
	getLastHash: () => lastHash,
	// Inserta un nuevo hash
	insertHash: (newHash) => {
		lastHash = newHash;
	},
	// Recupera el último hash desde microservicio y actualiza el cache
	fetchAndSetLastHash: async (url) => {
		const hash = await fetchLastHashFromMicroservice(url);
		lastHash = hash;
		return hash;
	}
};

hashCache.fetchAndSetLastHash(`${LOGS_SERVICE_URL}/logs/last-hash`).catch(err => {
	console.warn('Failed to initialize hash cache on startup:', err.message);
});

export default hashCache;


